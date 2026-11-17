// Native illustrated F1 car — side profile, drawn like a paper sticker cut-out.
import { fontCss } from './fonts.js';
import { grainInside, applyShadow, clearShadow, isSoftShadow } from './paper.js';

const BW = 1000, BH = 290, PAD = 26;
const cache = new Map();

function drawBody(g, { color, color2, ink, number, mirrorNumber }) {
  g.save();
  g.translate(PAD, PAD);
  g.lineJoin = 'round';
  // floor / plank
  g.fillStyle = '#151515';
  g.beginPath();
  g.moveTo(70, 205); g.lineTo(930, 205); g.lineTo(920, 222); g.lineTo(90, 222); g.closePath();
  g.fill();
  // rear wing endplate + elements
  g.fillStyle = ink;
  g.fillRect(28, 30, 22, 175);
  g.fillStyle = color;
  g.fillRect(10, 30, 130, 26);
  g.fillStyle = color2;
  g.fillRect(18, 62, 112, 16);
  g.fillStyle = ink;
  g.fillRect(95, 78, 10, 80);
  // main body
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(85, 195);
  g.lineTo(90, 150);
  g.lineTo(160, 112);
  g.quadraticCurveTo(300, 70, 380, 58);
  g.lineTo(405, 48);
  g.lineTo(440, 56);
  g.lineTo(458, 96);
  g.lineTo(560, 112);
  g.quadraticCurveTo(640, 118, 700, 130);
  g.lineTo(905, 168);
  g.quadraticCurveTo(980, 178, 982, 190);
  g.lineTo(960, 203);
  g.lineTo(100, 205);
  g.closePath();
  g.fill();
  // livery sweep
  g.save();
  g.clip();
  g.fillStyle = color2;
  g.beginPath();
  g.moveTo(140, 168); g.lineTo(560, 140); g.lineTo(980, 176); g.lineTo(980, 196); g.lineTo(560, 168); g.lineTo(140, 196); g.closePath();
  g.fill();
  // sidepod inlet shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.moveTo(540, 125); g.quadraticCurveTo(600, 128, 640, 160); g.lineTo(560, 165); g.closePath();
  g.fill();
  // top highlight
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.moveTo(160, 116); g.quadraticCurveTo(300, 76, 380, 64); g.lineTo(380, 74); g.quadraticCurveTo(300, 88, 170, 126); g.closePath();
  g.fill();
  g.restore();
  // airbox inlet
  g.fillStyle = ink;
  g.beginPath(); g.ellipse(418, 60, 10, 14, 0, 0, Math.PI * 2); g.fill();
  // driver helmet
  g.fillStyle = color2;
  g.beginPath(); g.arc(486, 92, 25, 0, Math.PI * 2); g.fill();
  g.fillStyle = ink;
  g.fillRect(486, 84, 26, 10);
  // halo
  g.strokeStyle = ink;
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(452, 98); g.quadraticCurveTo(500, 50, 560, 104); g.stroke();
  // front wing
  g.fillStyle = color2;
  g.fillRect(850, 206, 140, 12);
  g.fillStyle = ink;
  g.fillRect(975, 182, 16, 40);
  g.fillStyle = color;
  g.fillRect(860, 194, 120, 10);
  // number roundel
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(700, 160, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = ink;
  g.font = fontCss('Anton', 40);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  g.translate(700, 162);
  if (mirrorNumber) g.scale(-1, 1);
  g.fillText(String(number || '1'), 0, 0);
  g.restore();
  // wheels
  const wheel = (cx, cy, R) => {
    g.fillStyle = '#121212';
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2b2b';
    g.beginPath(); g.arc(cx, cy, R * 0.62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color2;
    g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy, R * 0.8, -0.3, Math.PI * 1.25); g.stroke();
    g.strokeStyle = '#555';
    g.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55); g.stroke();
    }
    g.fillStyle = '#bbb';
    g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
  };
  wheel(205, 188, 76);
  wheel(800, 192, 70);
  g.restore();
}

function dilate(src, radius, color) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.drawImage(src, Math.cos(a) * radius, Math.sin(a) * radius);
  }
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Returns a cached sticker canvas (white cut border + paper grain)
export function carSticker({ color, color2, ink = '#111', number = '1', border = '#fbf9f3', mirrorNumber = false }) {
  const key = [color, color2, ink, number, border, mirrorNumber].join('|');
  if (cache.has(key)) return cache.get(key);
  const body = document.createElement('canvas');
  body.width = BW + PAD * 2;
  body.height = BH + PAD * 2;
  const bg = body.getContext('2d');
  drawBody(bg, { color, color2, ink, number, mirrorNumber });
  // paper grain on the car itself
  grainInside(body, 21, 0.9);
  const out = document.createElement('canvas');
  out.width = body.width; out.height = body.height;
  const og = out.getContext('2d');
  og.drawImage(dilate(body, 12, border), 0, 0);
  og.drawImage(body, 0, 0);
  cache.set(key, out);
  return out;
}

// Generic: build a silhouette (for hard shadows of any image / sticker)
const silCache = new WeakMap();
export function silhouette(src, color) {
  let m = silCache.get(src);
  if (!m) { m = new Map(); silCache.set(src, m); }
  if (m.has(color)) return m.get(color);
  const c = document.createElement('canvas');
  c.width = src.naturalWidth || src.width;
  c.height = src.naturalHeight || src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  m.set(color, c);
  return c;
}

// Draw any image-like with a hard drop shadow. Center-based, width-driven.
export function drawSticker(ctx, src, { x, y, w, rot = 0, flip = false, shadow, alpha = 1 }) {
  if (!src) return;
  const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
  if (!iw) return;
  const h = (w * ih) / iw;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  if (shadow && !isSoftShadow(shadow)) {
    const sil = silhouette(src, shadow.color);
    ctx.drawImage(sil, -w / 2 + (flip ? -shadow.dx : shadow.dx), -h / 2 + shadow.dy, w, h);
  }
  if (isSoftShadow(shadow)) applyShadow(ctx, shadow);
  ctx.drawImage(src, -w / 2, -h / 2, w, h);
  clearShadow(ctx);
  ctx.restore();
  return h;
}
