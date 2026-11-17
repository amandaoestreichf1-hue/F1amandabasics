// Frame-accurate offline export (not real-time capture), 1080x1920 with alpha.
import JSZip from 'jszip';
import { Output, WebMOutputFormat, BufferTarget, CanvasSource, QUALITY_VERY_HIGH, canEncodeVideo } from 'mediabunny';
import { renderFrame, W, H } from './renderer.js';

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { alpha: true });
  return { c, ctx };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

// Inside a claude.ai Artifact the frame can't start downloads itself: offer the file through the
// `downloads` capability (viewer confirms). Running locally (npm run dev), fall back to a normal link.
let _dlCap;
async function downloadsCap() {
  if (!window.claude?.use) return null;
  if (_dlCap === undefined) _dlCap = await window.claude.use('downloads').catch(() => null);
  return _dlCap;
}

export async function download(blob, name) {
  const cap = await downloadsCap();
  if (cap) {
    try {
      await cap.save({ filename: name, data: blob });
      return true;
    } catch (e) {
      if (e?.code === 'declined') return false;
      if (e?.code === 'rate_limited') throw new Error('Já tem um download esperando confirmação.');
      if (e?.code === 'too_large') throw new Error('Arquivo grande demais para baixar aqui.');
      // other codes: fall through to a plain link
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export async function webmAlphaSupported() {
  try {
    if (typeof VideoEncoder === 'undefined') return false;
    const ok = await canEncodeVideo('vp9', { width: W, height: H, quality: QUALITY_VERY_HIGH });
    if (!ok) return false;
    const support = await VideoEncoder.isConfigSupported({ codec: 'vp09.00.40.08', width: W, height: H, alpha: 'keep', bitrate: 8e6 });
    return !!support.supported;
  } catch {
    return false;
  }
}

export async function exportWebM(state, assets, { fps = 30, onProgress, signal } = {}) {
  const { c, ctx } = makeCanvas();
  const frames = Math.max(1, Math.round(state.duration * fps));
  if (await webmAlphaSupported()) {
    const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
    const source = new CanvasSource(c, { codec: 'vp9', bitrate: QUALITY_VERY_HIGH, alpha: 'keep', keyFrameInterval: 1 });
    output.addVideoTrack(source, { frameRate: fps });
    await output.start();
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) { await output.cancel(); throw new DOMException('cancelado', 'AbortError'); }
      renderFrame(ctx, state, assets, i / fps);
      await source.add(i / fps, 1 / fps);
      onProgress?.((i + 1) / frames);
      if (i % 4 === 0) await tick();
    }
    source.close();
    await output.finalize();
    return new Blob([output.target.buffer], { type: 'video/webm' });
  }
  return exportWebMRecorder(c, ctx, state, assets, { fps, onProgress, signal, frames });
}

// Fallback: MediaRecorder (Chrome keeps alpha with VP8/VP9 in WebM). Runs in real time.
async function exportWebMRecorder(c, ctx, state, assets, { fps, onProgress, signal, frames }) {
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('Este navegador não grava WebM. Use o Chrome/Edge no computador ou exporte em PNG.');
  renderFrame(ctx, state, assets, 0);
  const stream = c.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) { rec.stop(); throw new DOMException('cancelado', 'AbortError'); }
    renderFrame(ctx, state, assets, i / fps);
    track.requestFrame?.();
    onProgress?.((i + 1) / frames);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  rec.stop();
  await done;
  return new Blob(chunks, { type: 'video/webm' });
}

export async function exportPNGZip(state, assets, { fps = 30, onProgress, signal, baseName = 'frame' } = {}) {
  const { c, ctx } = makeCanvas();
  const frames = Math.max(1, Math.round(state.duration * fps));
  const zip = new JSZip();
  const folder = zip.folder(`${baseName}_${fps}fps`);
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) throw new DOMException('cancelado', 'AbortError');
    renderFrame(ctx, state, assets, i / fps);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    folder.file(`${baseName}_${String(i).padStart(4, '0')}.png`, blob);
    onProgress?.(((i + 1) / frames) * 0.85);
  }
  folder.file('LEIA-ME.txt',
    `Sequência PNG transparente 1080x1920 · ${fps} fps · ${frames} quadros\n\n` +
    `CapCut (computador): Mídia > Importar a pasta inteira, selecione todos os PNGs na ordem e arraste para a linha do tempo;\n` +
    `ajuste a duração de cada quadro para 1/${fps}s (ou use "Sequência de imagens" no seu editor).\n` +
    `Celular: prefira o .webm ou converta a sequência em um .mov com alpha no computador.\n`);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => onProgress?.(0.85 + (m.percent / 100) * 0.15));
  return blob;
}

export async function exportStillPNG(state, assets, time) {
  const { c, ctx } = makeCanvas();
  renderFrame(ctx, state, assets, time);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}
