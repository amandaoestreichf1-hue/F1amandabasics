// Shared building blocks for the didactic templates (F1, tennis and universal), so every card,
// pill, title and pop-in reads as one visual family and follows the active palette (lilac or mint).
import { setFont, applyShadow, clearShadow, roundRect, wrapLines, photoSlot } from '../lib/paper.js';
import { sceneBg, revealText } from './soft.js';
import { slot, ease, range, clamp } from './common.js';

export { ease, range, clamp, revealText, slot, setFont, wrapLines, photoSlot };

export const pop = (t, st, len = 0.3, over = 2) => ease.outBack(range(t, st, st + len), over);

export const fontOpts = [['head', 'Título (Acervo/Tipografia)'], ['body', 'Subtítulo (Acervo/Tipografia)'], ['Hand', 'Letra de mão'], ['Marker', 'Marcador'], ['Rounded', 'Bold largo']];
export const pickFont = (rc, v) => (v === 'head' ? rc.fonts.head : v === 'body' ? rc.fonts.body : v === 'accent' ? rc.fonts.accent || 'Script' : v || rc.fonts.head);

export const bgFields = (def = 'graph') => [
  { key: 'bg', label: 'Fundo', type: 'select', options: [['graph', 'Papel quadriculado amassado'], ['gingham', 'Xadrez (tecido)'], ['image', 'Imagem do meu acervo'], ['none', 'Sem fundo (por cima do vídeo)']], default: def, group: 'Fundo' },
  { key: 'bgImage', label: 'Imagem de fundo', type: 'image', libCategory: 'background', frames: false, group: 'Fundo', showIf: (P) => P.bg === 'image' },
  { key: 'bgEnter', label: 'Animação do fundo', type: 'select', options: [['zoom', 'Zoom suave + fade'], ['slide', 'Desliza de baixo'], ['cut', 'Corte seco']], default: 'zoom', group: 'Fundo', showIf: (P) => P.bg !== 'none' },
];
export const titleFields = (title = '', subtitle = '') => [
  { key: 'title', label: 'Título', type: 'text', default: title },
  { key: 'subtitle', label: 'Subtítulo', type: 'text', default: subtitle },
];
export const styleFields = () => [
  { key: 'titleFont', label: 'Fonte do título', type: 'select', options: fontOpts, default: 'head', group: 'Estilo' },
];

// Start time after the background settles
export const startAt = (P) => (P.bg && P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05);

// Background + exit bookkeeping. Returns null when fully exited.
export function frame(rc) {
  const { P, t, dur } = rc;
  sceneBg(rc, P.bg || 'none', { enter: P.bgEnter });
  const out = range(t, dur - 0.22, dur);
  if (out >= 1) return null;
  return { t0: startAt(P), out, fadeOut: 1 - ease.inCubic(out) };
}

export function bgCue(P) {
  return P.bg && P.bg !== 'none' ? [{ t: 0, s: 'whoosh', label: 'fundo' }] : [];
}

// Colours that follow the palette: ink for text, strong accent for lines, soft accent for fills.
export function colors(rc) {
  const { pal } = rc;
  return { ink: pal.ink, strong: pal.paper2, soft: pal.accent, paper: '#fbfaf6', line: 'rgba(47,42,54,0.16)' };
}

export function heading(rc, f, { y = 170, size = 92 } = {}) {
  const { ctx, W, P, t } = rc;
  const c = colors(rc);
  let h = 0;
  if (P.title) h += revealText(ctx, P.title, { x: W / 2, y, fontId: pickFont(rc, P.titleFont), size, color: c.ink, start: f.t0, per: 0.09, t, out: f.out, maxWidth: W * 0.9 });
  if (P.subtitle) h += revealText(ctx, P.subtitle, { x: W / 2, y: y + h - size * 0.12 + 34, fontId: 'Hand', size: 42, color: c.ink, start: f.t0 + 0.2, per: 0.06, t, out: f.out, maxWidth: W * 0.88 });
  return y + h + 20;
}

// Rounded card with soft shadow
export function card(ctx, rc, x, y, w, h, { fill = '#fbfaf6', r = 26, stroke = null, lw = 4, shadow = true } = {}) {
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, Math.min(r, h / 2, w / 2));
  ctx.fillStyle = fill;
  if (shadow && rc.shadow) applyShadow(ctx, { ...rc.shadow, blur: Math.max(10, rc.shadow.blur || 0) });
  ctx.fill();
  clearShadow(ctx);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

// Static text helper
export function text(ctx, str, x, y, { font = 'Hand', size = 40, color = '#2f2a36', align = 'center', baseline = 'middle', maxWidth } = {}) {
  if (str === undefined || str === null || str === '') return 0;
  setFont(ctx, font, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth) ctx.fillText(String(str), x, y, maxWidth);
  else ctx.fillText(String(str), x, y);
  const w = ctx.measureText(String(str)).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return maxWidth ? Math.min(w, maxWidth) : w;
}

export function measure(ctx, str, font, size) {
  setFont(ctx, font, size);
  const w = ctx.measureText(String(str)).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return w;
}

// Pill label centred at (cx, cy). Returns its width.
export function pill(ctx, rc, cx, cy, str, { font = 'Hand', size = 38, fill, color = '#ffffff', padX = 26, h, shadow = false } = {}) {
  const w = measure(ctx, str, font, size) + padX * 2;
  const hh = h || size * 1.45;
  card(ctx, rc, cx - w / 2, cy - hh / 2, w, hh, { fill: fill || colors(rc).strong, r: hh / 2, shadow });
  text(ctx, str, cx, cy + size * 0.04, { font, size, color });
  return w;
}

// Run fn with a pop-in transform around (x, y)
export function popIn(ctx, x, y, k, fn) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

// Regional-indicator flag emoji from a 2-letter country code (BR → 🇧🇷)
export function flagEmoji(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function emoji(ctx, str, x, y, size) {
  if (!str) return;
  ctx.save();
  ctx.font = `${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}

// Lines of a textarea, trimmed, non-empty
export const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);

// Photo slot helper that reads a slot key from params
export function photo(rc, key, opts) {
  const s = slot(rc, key);
  photoSlot(rc.ctx, s.img, { frame: s.frame, zoom: s.zoom, offX: s.offX, offY: s.offY, imgRot: s.imgRot, bw: s.bw, shadow: rc.shadow, ink: rc.pal.ink, ...opts });
  return s;
}

export const lerp = (a, b, k) => a + (b - a) * k;
export const fmtNumber = (n, decimals = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
void wrapLines; void clamp;
