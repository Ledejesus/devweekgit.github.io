# OpenVideo Studio

OpenVideo Studio é um protótipo open source de **text-to-video** para GitHub Pages. Ele transforma um prompt em roteiro, cenas animadas, legendas, narração via Web Speech API e exportação WebM usando apenas recursos do navegador.

## Recursos

- Geração automática de roteiro a partir do prompt.
- Vídeo vertical, quadrado ou horizontal.
- Timeline editável com título e legenda por cena.
- Motion graphics procedural em canvas, sem dependência fechada.
- Narração local com Web Speech API quando o navegador oferece suporte.
- Exportação WebM com `canvas.captureStream()` e `MediaRecorder`.
- Interface inspirada em fluxos de apps como CapCut AI, mas usando uma base aberta e hospedável estaticamente.

## Como rodar

Abra `index.html` diretamente ou sirva a pasta localmente:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Como ligar modelos open source reais

A versão atual gera motion graphics e um vídeo completo no navegador. Para incluir IA generativa real de vídeo, crie um backend e substitua/complete a função `buildScenes()` em `app.js` com chamadas a um endpoint como:

```http
POST /api/text-to-video
Content-Type: application/json

{
  "prompt": "vídeo promocional de cafeteria",
  "format": "vertical",
  "duration": 30,
  "style": "cinematic"
}
```

Modelos e ferramentas open source recomendados para o backend:

- **Stable Video Diffusion** via Hugging Face Diffusers para image-to-video.
- **AnimateDiff** via Diffusers/ComfyUI para text/image-to-video.
- **ModelScope text-to-video** para protótipos de text-to-video.
- **FFmpeg** ou **ffmpeg.wasm** para composição final com áudio, cortes, imagens e legendas queimadas.

## Limitações

- GitHub Pages não executa GPU nem jobs de IA pesados; por isso, a geração por difusão deve ficar em um backend separado.
- A exportação WebM grava o canvas. A narração por Web Speech é reproduzida localmente e pode não ser incorporada ao arquivo final em todos os navegadores.
- Para uso em produção, adicione fila de renderização, armazenamento, autenticação, créditos e políticas de moderação.

## Licença sugerida

MIT. Revise a licença de cada modelo, checkpoint, fonte, imagem, áudio ou biblioteca adicionada ao backend antes de publicar.
