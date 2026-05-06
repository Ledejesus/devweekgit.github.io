const canvas = document.querySelector('#videoCanvas');
const ctx = canvas.getContext('2d');
const promptInput = document.querySelector('#prompt');
const formatSelect = document.querySelector('#format');
const durationSelect = document.querySelector('#duration');
const styleSelect = document.querySelector('#style');
const voiceToneSelect = document.querySelector('#voiceTone');
const generateBtn = document.querySelector('#generateBtn');
const playBtn = document.querySelector('#playBtn');
const voiceBtn = document.querySelector('#voiceBtn');
const exportBtn = document.querySelector('#exportBtn');
const addSceneBtn = document.querySelector('#addSceneBtn');
const timeline = document.querySelector('#timeline');
const sceneTemplate = document.querySelector('#sceneTemplate');
const videoTitle = document.querySelector('#videoTitle');
const statusBadge = document.querySelector('#statusBadge');
const progress = document.querySelector('#progress');
const timecode = document.querySelector('#timecode');

const palettes = {
  cinematic: ['#111827', '#7c3aed', '#f59e0b', '#f8fafc'],
  social: ['#0f172a', '#ec4899', '#22d3ee', '#ffffff'],
  documentary: ['#1f2937', '#d97706', '#84cc16', '#f5f5f4'],
  neon: ['#020617', '#00f5d4', '#fb00ff', '#f8fafc'],
};

const motionWords = ['descubra', 'novo', 'hoje', 'rápido', 'moderno', 'premium', 'viral'];
let scenes = [];
let playback = {
  raf: null,
  startedAt: 0,
  elapsed: 0,
  playing: false,
};

function splitPrompt(prompt) {
  return prompt
    .replace(/\s+/g, ' ')
    .split(/[.,;!?]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function titleFromPrompt(prompt) {
  const words = prompt
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 6);
  return words.length ? words.join(' ') : 'Vídeo gerado por texto';
}

function buildScenes(prompt, totalDuration, style) {
  const parts = splitPrompt(prompt);
  const sceneCount = Math.min(6, Math.max(3, Math.ceil(totalDuration / 8)));
  const secondsPerScene = totalDuration / sceneCount;
  const title = titleFromPrompt(prompt);
  const fallback = [
    `Abertura forte sobre ${title}`,
    'Mostre o problema e gere curiosidade',
    'Apresente a solução com visual dinâmico',
    'Destaque benefícios e prova social',
    'Finalize com chamada para ação',
  ];

  return Array.from({ length: sceneCount }, (_, index) => {
    const source = parts[index] || fallback[index % fallback.length];
    const caption = makeCaption(source, index, sceneCount);
    return {
      id: crypto.randomUUID(),
      title: source.length > 52 ? `${source.slice(0, 49)}...` : source,
      caption,
      duration: secondsPerScene,
      palette: palettes[style],
      visualSeed: hash(`${prompt}-${style}-${index}`),
    };
  });
}

function makeCaption(text, index, total) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (index === 0) return `Pare o scroll: ${clean}`;
  if (index === total - 1) return `${clean} — clique, visite ou compartilhe agora.`;
  if (motionWords.some((word) => clean.toLowerCase().includes(word))) return clean.toUpperCase();
  return clean;
}

function hash(value) {
  return [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function resizeCanvas() {
  const format = formatSelect.value;
  const sizes = {
    vertical: [720, 1280],
    square: [1080, 1080],
    landscape: [1280, 720],
  };
  [canvas.width, canvas.height] = sizes[format];
  drawFrame(playback.elapsed || 0);
}

function setStatus(text, tone = 'ok') {
  statusBadge.textContent = text;
  statusBadge.style.color = tone === 'warn' ? '#fed7aa' : '#bbf7d0';
  statusBadge.style.background = tone === 'warn' ? 'rgba(249, 115, 22, 0.16)' : 'rgba(34, 197, 94, 0.16)';
}

function totalDuration() {
  return scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
}

function findScene(elapsed) {
  let cursor = 0;
  for (const [index, scene] of scenes.entries()) {
    const end = cursor + scene.duration;
    if (elapsed <= end || index === scenes.length - 1) {
      return { scene, index, localTime: elapsed - cursor, start: cursor };
    }
    cursor = end;
  }
  return { scene: scenes[0], index: 0, localTime: 0, start: 0 };
}

function drawFrame(elapsed) {
  if (!scenes.length) return;
  const duration = totalDuration();
  const safeElapsed = Math.min(elapsed, duration);
  const { scene, index, localTime } = findScene(safeElapsed);
  const sceneProgress = Math.min(1, localTime / scene.duration);
  const [bg, primary, secondary, textColor] = scene.palette;
  const w = canvas.width;
  const h = canvas.height;

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, bg);
  gradient.addColorStop(0.52, shade(primary, -36));
  gradient.addColorStop(1, shade(secondary, -28));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  drawParticles(scene.visualSeed, sceneProgress, primary, secondary);
  drawMockFootage(scene, index, sceneProgress);
  drawTextBlocks(scene, sceneProgress, textColor);
  drawCaption(scene.caption, textColor);
  drawProgressBar(safeElapsed, duration, secondary);

  progress.value = duration ? (safeElapsed / duration) * 100 : 0;
  timecode.textContent = `${formatTime(safeElapsed)} / ${formatTime(duration)}`;
}

function drawParticles(seed, sceneProgress, primary, secondary) {
  const w = canvas.width;
  const h = canvas.height;
  for (let i = 0; i < 22; i += 1) {
    const n = Math.sin(seed * (i + 1));
    const x = ((n * 9999) % 1) * w + Math.sin(sceneProgress * Math.PI * 2 + i) * 80;
    const y = (((n * 31337) % 1) * h + sceneProgress * h * 0.35) % h;
    const radius = 22 + Math.abs(n) * 90;
    ctx.globalAlpha = 0.08 + (i % 3) * 0.04;
    ctx.fillStyle = i % 2 ? primary : secondary;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMockFootage(scene, index, sceneProgress) {
  const w = canvas.width;
  const h = canvas.height;
  const cardW = w * 0.78;
  const cardH = h * 0.38;
  const x = (w - cardW) / 2;
  const y = h * 0.18 + Math.sin(sceneProgress * Math.PI) * -18;
  const zoom = 1 + sceneProgress * 0.045;

  ctx.save();
  ctx.translate(w / 2, y + cardH / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-w / 2, -(y + cardH / 2));
  roundRect(x, y, cardW, cardH, 42);
  const glass = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
  glass.addColorStop(0, 'rgba(255,255,255,0.26)');
  glass.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `800 ${Math.max(32, w * 0.06)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1).padStart(2, '0'), w / 2, y + cardH * 0.45);
  ctx.font = `700 ${Math.max(20, w * 0.031)}px Inter, sans-serif`;
  wrapText(scene.title, w / 2, y + cardH * 0.62, cardW * 0.78, Math.max(28, w * 0.04), 'center');
  ctx.restore();
}

function drawTextBlocks(scene, sceneProgress, textColor) {
  const w = canvas.width;
  const h = canvas.height;
  const intro = sceneProgress < 0.18 ? easeOut(sceneProgress / 0.18) : 1;
  ctx.save();
  ctx.globalAlpha = intro;
  ctx.translate(0, (1 - intro) * 50);
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.max(38, w * 0.075)}px Inter, sans-serif`;
  wrapText(scene.title, w / 2, h * 0.09, w * 0.86, Math.max(44, w * 0.08), 'center');
  ctx.restore();
}

function drawCaption(caption, textColor) {
  const w = canvas.width;
  const h = canvas.height;
  const boxW = w * 0.86;
  const boxX = (w - boxW) / 2;
  const boxY = h * 0.76;
  roundRect(boxX, boxY, boxW, h * 0.15, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `800 ${Math.max(26, w * 0.045)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  wrapText(caption, w / 2, boxY + h * 0.055, boxW * 0.86, Math.max(34, w * 0.055), 'center');
}

function drawProgressBar(elapsed, duration, color) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(w * 0.08, h * 0.945, w * 0.84, 12, 999);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(w * 0.08, h * 0.945, w * 0.84 * (elapsed / duration), 12, 999);
  ctx.fill();
}

function wrapText(text, x, y, maxWidth, lineHeight, align = 'left') {
  const words = text.split(' ');
  let line = '';
  ctx.textAlign = align;
  words.forEach((word, index) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && index > 0) {
      ctx.fillText(line.trim(), x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line.trim(), x, y);
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function shade(hex, percent) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const amount = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (value & 0xff) + amount));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function easeOut(t) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function renderTimeline() {
  timeline.innerHTML = '';
  scenes.forEach((scene, index) => {
    const node = sceneTemplate.content.cloneNode(true);
    const card = node.querySelector('.scene-card');
    const title = node.querySelector('.scene-title');
    const caption = node.querySelector('.scene-caption');
    node.querySelector('.scene-index').textContent = `Cena ${index + 1}`;
    node.querySelector('.scene-duration').textContent = `${scene.duration.toFixed(1)}s`;
    title.value = scene.title;
    caption.value = scene.caption;
    title.addEventListener('input', () => {
      scene.title = title.value;
      drawFrame(playback.elapsed);
    });
    caption.addEventListener('input', () => {
      scene.caption = caption.value;
      drawFrame(playback.elapsed);
    });
    card.addEventListener('click', () => {
      playback.elapsed = scenes.slice(0, index).reduce((sum, item) => sum + item.duration, 0);
      drawFrame(playback.elapsed);
    });
    timeline.appendChild(node);
  });
}

function generate() {
  stopPlayback();
  const prompt = promptInput.value.trim();
  const duration = Number(durationSelect.value);
  const style = styleSelect.value;
  scenes = buildScenes(prompt, duration, style);
  videoTitle.textContent = titleFromPrompt(prompt);
  playback.elapsed = 0;
  resizeCanvas();
  renderTimeline();
  setStatus('Gerado');
}

function play() {
  if (playback.playing) {
    stopPlayback();
    return;
  }
  playback.playing = true;
  playback.startedAt = performance.now() - playback.elapsed * 1000;
  playBtn.textContent = 'Pausar';
  setStatus('Reproduzindo');
  tick();
}

function tick() {
  const duration = totalDuration();
  playback.elapsed = (performance.now() - playback.startedAt) / 1000;
  if (playback.elapsed >= duration) {
    playback.elapsed = duration;
    drawFrame(playback.elapsed);
    stopPlayback(false);
    setStatus('Finalizado');
    return;
  }
  drawFrame(playback.elapsed);
  playback.raf = requestAnimationFrame(tick);
}

function stopPlayback(resetStatus = true) {
  playback.playing = false;
  cancelAnimationFrame(playback.raf);
  playBtn.textContent = 'Reproduzir';
  if (resetStatus) setStatus('Pronto');
}

function speakVideo() {
  if (!('speechSynthesis' in window)) {
    setStatus('Sem Web Speech', 'warn');
    return;
  }
  window.speechSynthesis.cancel();
  const text = scenes.map((scene) => scene.caption).join('. ');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceToneSelect.value;
  utterance.rate = 1.03;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  setStatus('Narrando');
}

async function exportVideo() {
  if (!('MediaRecorder' in window)) {
    setStatus('Export indisponível', 'warn');
    return;
  }
  stopPlayback(false);
  playback.elapsed = 0;
  const stream = canvas.captureStream(30);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: bestMimeType() });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoTitle.textContent.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.webm`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Exportado');
  };

  recorder.start();
  setStatus('Exportando');
  const startedAt = performance.now();
  const duration = totalDuration();

  function renderExportFrame(now) {
    playback.elapsed = Math.min((now - startedAt) / 1000, duration);
    drawFrame(playback.elapsed);
    if (playback.elapsed < duration) {
      requestAnimationFrame(renderExportFrame);
    } else {
      recorder.stop();
    }
  }

  requestAnimationFrame(renderExportFrame);
}

function bestMimeType() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';
}

function addScene() {
  const duration = Math.max(4, totalDuration() / Math.max(1, scenes.length));
  scenes.push({
    id: crypto.randomUUID(),
    title: 'Nova cena personalizada',
    caption: 'Edite esta legenda para completar o vídeo.',
    duration,
    palette: palettes[styleSelect.value],
    visualSeed: hash(`${Date.now()}-${scenes.length}`),
  });
  renderTimeline();
  drawFrame(playback.elapsed);
}

generateBtn.addEventListener('click', generate);
playBtn.addEventListener('click', play);
voiceBtn.addEventListener('click', speakVideo);
exportBtn.addEventListener('click', exportVideo);
addSceneBtn.addEventListener('click', addScene);
formatSelect.addEventListener('change', resizeCanvas);
styleSelect.addEventListener('change', generate);
durationSelect.addEventListener('change', generate);

generate();
