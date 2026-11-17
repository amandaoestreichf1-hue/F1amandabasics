// Collage primitives: torn paper, newsprint, tape, stamps, photo slots, ransom-note letters.
import { rng, hashStr } from './rng.js';
import { fontCss, fontTracking } from './fonts.js';
import { ease, clamp } from './easing.js';

// Global look knobs (set by the renderer every frame)
export const STYLE = { tear: 1 };

// Shadow fill: hard ("sombra seca") when blur = 0, soft & dreamy when blur > 0
function shadowFill(ctx, shadow) {
  if (shadow.blur) ctx.filter = `blur(${shadow.blur}px)`;
  ctx.fillStyle = shadow.color;
  ctx.fill();
  ctx.filter = 'none';
}

// ---------------------------------------------------------------------------
// Textures (generated once, lazily)
// ---------------------------------------------------------------------------
let _grain = null;
export function grainTexture() {
  if (_grain) return _grain;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = rng(1337);
  const img = g.createImageData(512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + r() * 55;
    img.data[i] = v;
    img.data[i + 1] = v - 3;
    img.data[i + 2] = v - 10;
    img.data[i + 3] = r() < 0.5 ? 70 : 25;
  }
  g.putImageData(img, 0, 0);
  // paper fibers
  g.globalAlpha = 0.14;
  g.strokeStyle = '#5a4a32';
  for (let i = 0; i < 260; i++) {
    g.lineWidth = 0.5 + r();
    g.beginPath();
    const x = r() * 512, y = r() * 512, a = r() * Math.PI * 2, l = 6 + r() * 26;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // a few blotches
  g.globalAlpha = 0.05;
  g.fillStyle = '#6b5636';
  for (let i = 0; i < 30; i++) {
    g.beginPath();
    g.arc(r() * 512, r() * 512, 10 + r() * 50, 0, Math.PI * 2);
    g.fill();
  }
  _grain = c;
  return c;
}

const _news = new Map();
// Fake newspaper page: masthead rules, columns of "text", halftone photo blocks.
export function newsprintTexture(seed = 7) {
  if (_news.has(seed)) return _news.get(seed);
  const W = 1100, H = 1500;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = rng(seed * 991 + 3);
  g.fillStyle = '#1b1b1b';
  const cols = 5, gut = 26, margin = 30;
  const colW = (W - margin * 2 - gut * (cols - 1)) / cols;
  let y0 = 40;
  // headline bars
  g.fillRect(margin, y0, W - margin * 2, 5);
  g.font = '900 64px "Playfair Display", serif';
  g.globalAlpha = 0.85;
  const words = ['GRAND PRIX', 'PADDOCK', 'POLE POSITION', 'PIT STOP', 'CHEQUERED', 'PARC FERMÉ', 'TELEMETRIA', 'UNDERCUT', 'DRS ZONE'];
  g.fillText(words[Math.floor(r() * words.length)], margin, y0 + 80);
  g.globalAlpha = 1;
  g.fillRect(margin, y0 + 100, W - margin * 2, 2);
  y0 += 130;
  for (let ci = 0; ci < cols; ci++) {
    const x = margin + ci * (colW + gut);
    let y = y0;
    while (y < H - 40) {
      const roll = r();
      if (roll < 0.06) {
        // halftone photo
        const bh = 120 + r() * 160;
        halftoneBlock(g, x, y, colW, bh, r);
        y += bh + 18;
      } else if (roll < 0.12) {
        // sub headline
        g.globalAlpha = 0.9;
        g.font = `700 ${22 + Math.floor(r() * 10)}px "Playfair Display", serif`;
        g.fillText(words[Math.floor(r() * words.length)].slice(0, 12), x, y + 26);
        y += 42;
        g.globalAlpha = 1;
      } else {
        // paragraph lines
        const lines = 4 + Math.floor(r() * 9);
        g.globalAlpha = 0.55;
        for (let li = 0; li < lines; li++) {
          let lx = x;
          const last = li === lines - 1;
          const lineW = last ? colW * (0.3 + r() * 0.5) : colW;
          while (lx < x + lineW - 8) {
            const ww = 10 + r() * 34;
            g.fillRect(lx, y, Math.min(ww, x + lineW - lx), 6);
            lx += ww + 5;
          }
          y += 13;
        }
        g.globalAlpha = 1;
        y += 10;
      }
    }
  }
  _news.set(seed, c);
  return c;
}

function halftoneBlock(g, x, y, w, h, r) {
  const step = 7;
  const cx = x + w * (0.3 + r() * 0.4), cy = y + h * (0.3 + r() * 0.4);
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      const d = Math.hypot(xx - cx, yy - cy) / (Math.max(w, h) * 0.7);
      const rad = clamp(0.4 + Math.sin(xx * 0.03 + yy * 0.02) * 0.8 + (1 - d) * 2.4, 0.2, 3.4);
      g.beginPath();
      g.arc(xx, yy, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// Torn shapes
// ---------------------------------------------------------------------------
// Build a rect path (local coords, top-left at 0,0) with jagged edges.
export function tornRectPath(ctx, w, h, { seed = 1, amp = 10, step = 18, torn = {}, expand = 0 } = {}) {
  const r = rng(seed);
  const T = { t: true, r: true, b: true, l: true, ...torn };
  const pts = [];
  const edge = (x0, y0, x1, y1, isTorn, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ex = isTorn ? expand : 0;
    if (!isTorn) {
      pts.push([x0 + nx * ex, y0 + ny * ex]);
      return;
    }
    const n = Math.max(2, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const k = i / n;
      let off = (r() - 0.5) * 2 * amp;
      if (r() < 0.12) off += amp * 1.4 * (r() < 0.5 ? -1 : 1); // occasional bite
      const along = (r() - 0.5) * step * 0.5;
      const px = x0 + (x1 - x0) * k + ((x1 - x0) / len) * along + nx * (off * 0.5 + amp * 0.3 + ex);
      const py = y0 + (y1 - y0) * k + ((y1 - y0) / len) * along + ny * (off * 0.5 + amp * 0.3 + ex);
      pts.push([px, py]);
    }
  };
  edge(0, 0, w, 0, T.t, 0, -1);
  edge(w, 0, w, h, T.r, 1, 0);
  edge(w, h, 0, h, T.b, 0, 1);
  edge(0, h, 0, 0, T.l, -1, 0);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/**
 * Draw a piece of paper. Center-based position.
 * opts: x,y (center), w,h, rot, color, seed, torn{t,r,b,l}, amp, texture: 'grain'|'news'|'lined'|'grid'|'none',
 * shadow: {dx,dy,color} | null, fiber: color|null, textureAlpha
 * inner(ctx, w, h): draw content in local coords (top-left 0,0), clipped to the paper.
 */
export function paperPiece(ctx, opts, inner) {
  const {
    x, y, w, h, rot = 0, color = '#f2ede2', seed = 1, torn, step = 18,
    texture = 'grain', shadow = null, fiber = '#fbf9f3', textureAlpha = 1, newsSeed = 3, alpha = 1, scale = 1,
  } = opts;
  const amp = opts.amp === undefined ? 9 * STYLE.tear : opts.amp * STYLE.tear;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  const shapeOpts = { seed, amp, step, torn };

  if (shadow) {
    ctx.save();
    ctx.translate(shadow.dx, shadow.dy);
    tornRectPath(ctx, w, h, { ...shapeOpts, expand: fiber ? 4 : 0 });
    shadowFill(ctx, shadow);
    ctx.restore();
  }
  if (fiber) {
    tornRectPath(ctx, w, h, { ...shapeOpts, seed: seed + 17, expand: 4 });
    ctx.fillStyle = fiber;
    ctx.fill();
  }
  tornRectPath(ctx, w, h, shapeOpts);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawTexture(ctx, texture, w, h, seed, textureAlpha, newsSeed);
  if (inner) inner(ctx, w, h);
  ctx.restore();
  ctx.restore();
}

export function drawTexture(ctx, texture, w, h, seed, a = 1, newsSeed = 3) {
  if (texture === 'none') return;
  ctx.save();
  if (texture === 'news') {
    const tex = newsprintTexture(newsSeed);
    ctx.globalAlpha *= 0.55 * a;
    ctx.globalCompositeOperation = 'multiply';
    const r = rng(seed);
    const ox = -r() * Math.max(0, tex.width - w), oy = -r() * Math.max(0, tex.height - h);
    for (let yy = oy; yy < h; yy += tex.height) for (let xx = ox; xx < w; xx += tex.width) ctx.drawImage(tex, xx, yy);
  } else if (texture === 'graph') {
    ctx.globalAlpha *= a;
    graphLines(ctx, w, h);
    const cr = crumpleTexture();
    const r = rng(seed + 9);
    ctx.drawImage(cr, -r() * Math.max(0, cr.width - w), -r() * Math.max(0, cr.height - h));
  } else if (texture === 'lined' || texture === 'grid') {
    ctx.globalAlpha *= 0.5 * a;
    ctx.strokeStyle = '#5b8fd6';
    ctx.lineWidth = 2;
    for (let yy = 90; yy < h; yy += 46) {
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
    }
    if (texture === 'grid') {
      for (let xx = 46; xx < w; xx += 46) {
        ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, h); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#e0565b';
      ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, h); ctx.stroke();
    }
  }
  // grain always on top for tactility
  const g = grainTexture();
  ctx.globalAlpha = 0.5 * a;
  ctx.globalCompositeOperation = 'multiply';
  const r = rng(seed + 5);
  const ox = -r() * 512, oy = -r() * 512;
  for (let yy = oy; yy < h; yy += 512) for (let xx = ox; xx < w; xx += 512) ctx.drawImage(g, xx, yy);
  ctx.restore();
}

export function graphLines(ctx, w, h, step = 26, color = 'rgba(120,110,100,0.22)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let yy = step; yy < h; yy += step) { ctx.moveTo(0, yy); ctx.lineTo(w, yy); }
  for (let xx = step; xx < w; xx += step) { ctx.moveTo(xx, 0); ctx.lineTo(xx, h); }
  ctx.stroke();
  ctx.restore();
}

// Crumpled-paper creases: soft light/dark facets (cached, full frame size)
let _crumple = null;
export function crumpleTexture() {
  if (_crumple) return _crumple;
  const c = document.createElement('canvas');
  c.width = 1400; c.height = 2300;
  const g = c.getContext('2d');
  const r = rng(4242);
  for (let i = 0; i < 46; i++) {
    const px = r() * c.width, py = r() * c.height, ang = r() * Math.PI;
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const L = 3000, wd = 90 + r() * 320;
    const side = (sign, col) => {
      const gr = g.createLinearGradient(px, py, px + nx * wd * sign, py + ny * wd * sign);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(px - dx * L, py - dy * L);
      g.lineTo(px + dx * L, py + dy * L);
      g.lineTo(px + dx * L + nx * wd * sign, py + dy * L + ny * wd * sign);
      g.lineTo(px - dx * L + nx * wd * sign, py - dy * L + ny * wd * sign);
      g.closePath();
      g.fill();
    };
    const k = 0.025 + r() * 0.045;
    side(1, `rgba(70,58,48,${k})`);
    side(-1, `rgba(255,255,255,${k * 1.4})`);
  }
  _crumple = c;
  return c;
}

// Linen / burlap weave (tileable)
let _weave = null;
export function weaveTexture() {
  if (_weave) return _weave;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = rng(77);
  for (let y = 0; y < 256; y += 4) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,30,30'},${0.04 + r() * 0.1})`;
    g.fillRect(0, y, 256, 2);
  }
  for (let x = 0; x < 256; x += 4) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,30,30'},${0.04 + r() * 0.1})`;
    g.fillRect(x, 0, 2, 256);
  }
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '30,20,20'},${r() * 0.12})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1);
  }
  _weave = c;
  return c;
}

export function weaveOver(ctx, w, h, a = 1) {
  const t = weaveTexture();
  ctx.save();
  ctx.globalAlpha *= a;
  for (let y = 0; y < h; y += 256) for (let x = 0; x < w; x += 256) ctx.drawImage(t, x, y);
  ctx.restore();
}

// Hand-drawn ellipse that draws itself (slightly overshoots like a real pen loop)
export function handCircle(ctx, cx, cy, rx, ry, { color = '#fff', width = 7, progress = 1, seed = 1, rot = -0.06 } = {}) {
  if (progress <= 0) return;
  const r = rng(seed);
  const turns = 1.12, steps = 90;
  const end = Math.max(2, Math.floor(steps * progress));
  const a0 = -Math.PI * 0.6 + r() * 0.4;
  const wob = [r(), r(), r()];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= end; i++) {
    const k = i / steps;
    const a = a0 + k * Math.PI * 2 * turns;
    const grow = 1 + (k - 0.5) * 0.09 + Math.sin(a * 2 + wob[0] * 6) * 0.025;
    const x = Math.cos(a) * rx * grow, y = Math.sin(a) * ry * grow;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// Thin hand-drawn arrow
export function handArrow(ctx, x0, y0, x1, y1, { color = '#c0b4fc', width = 7, progress = 1, seed = 1, bend = 0.12, head = 28 } = {}) {
  if (progress <= 0) return;
  const r = rng(seed);
  const mx = (x0 + x1) / 2 + (y1 - y0) * bend * (r() < 0.5 ? 1 : -1);
  const my = (y0 + y1) / 2 - (x1 - x0) * bend;
  const pt = (t) => [
    (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1,
    (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1,
  ];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const n = 40, end = Math.max(1, Math.floor(n * progress));
  for (let i = 0; i <= end; i++) {
    const [x, y] = pt(i / n);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  if (progress > 0.85) {
    const [ex, ey] = pt(1), [px, py] = pt(0.92);
    const a = Math.atan2(ey - py, ex - px);
    const hp = Math.min(1, (progress - 0.85) / 0.15);
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(a - 0.5) * head * hp, ey - Math.sin(a - 0.5) * head * hp);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex - Math.cos(a + 0.5) * head * hp, ey - Math.sin(a + 0.5) * head * hp);
    ctx.stroke();
  }
  ctx.restore();
}

// Apply paper grain only where a canvas already has pixels (keeps transparency intact)
export function grainInside(canvas, seed = 21, a = 0.9) {
  const mask = document.createElement('canvas');
  mask.width = canvas.width; mask.height = canvas.height;
  mask.getContext('2d').drawImage(canvas, 0, 0);
  const g = canvas.getContext('2d');
  g.save();
  drawTexture(g, 'grain', canvas.width, canvas.height, seed, a);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);
  g.restore();
}

// ---------------------------------------------------------------------------
// Tape (masking / washi)
// ---------------------------------------------------------------------------
export function tape(ctx, { x, y, w = 220, h = 62, rot = 0, color = '#f4e3a1', seed = 1, pattern = 'plain', alpha = 0.86, scale = 1 }) {
  if (scale <= 0) return;
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= alpha;
  const zig = (x0, top, bottom) => {
    const n = 5;
    const out = [];
    for (let i = 0; i <= n; i++) out.push([x0 + (r() - 0.5) * 10, top + ((bottom - top) * i) / n]);
    return out;
  };
  const left = zig(-w / 2, -h / 2, h / 2);
  const right = zig(w / 2, h / 2, -h / 2);
  ctx.beginPath();
  ctx.moveTo(left[0][0], -h / 2);
  ctx.lineTo(right[right.length - 1][0], -h / 2);
  right.forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.lineTo(left[0][0], h / 2);
  left.slice().reverse().forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (pattern === 'stripes') {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    for (let i = -w; i < w; i += 28) {
      ctx.beginPath();
      ctx.moveTo(i, -h / 2); ctx.lineTo(i + 14, -h / 2); ctx.lineTo(i + 14 + h, h / 2); ctx.lineTo(i + h, h / 2);
      ctx.fill();
    }
  } else if (pattern === 'dots') {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    for (let yy = -h / 2 + 10; yy < h / 2; yy += 18) for (let xx = -w / 2 + 10; xx < w / 2; xx += 18) {
      ctx.beginPath(); ctx.arc(xx + ((yy / 18) % 2) * 9, yy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (pattern === 'checker') {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#111';
    const s = h / 3;
    for (let yy = -h / 2, row = 0; yy < h / 2; yy += s, row++) for (let xx = -w / 2, col = 0; xx < w / 2; xx += s, col++) {
      if ((row + col) % 2 === 0) ctx.fillRect(xx, yy, s, s);
    }
  }
  // crinkle highlight
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w / 2, -h / 2 + h * 0.12, w, h * 0.12);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#000';
  for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + r() * w, -h / 2, 2, h);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Rubber stamp — cached on an offscreen canvas with ink wear.
// ---------------------------------------------------------------------------
const _stamps = new Map();
function stampCanvas({ text, sub, color, shape, fontId }) {
  const key = [text, sub, color, shape, fontId].join('|');
  if (_stamps.has(key)) return _stamps.get(key);
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const size = 120;
  g.font = fontCss(fontId, size);
  const tw = g.measureText(text).width;
  const subSize = 34;
  let W, H;
  if (shape === 'circle') {
    W = H = Math.max(tw * 0.62, 340) + 60;
  } else {
    W = tw + 110;
    H = size + (sub ? subSize + 70 : 70);
  }
  c.width = Math.ceil(W);
  c.height = Math.ceil(H);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineJoin = 'round';
  if (shape === 'circle') {
    const R = W / 2 - 10;
    g.lineWidth = 12;
    g.beginPath(); g.arc(W / 2, H / 2, R, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.arc(W / 2, H / 2, R - 20, 0, Math.PI * 2); g.stroke();
    const s2 = Math.min(size, (W - 110) / Math.max(1, tw / size));
    g.font = fontCss(fontId, s2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + (sub ? -16 : 0));
    if (sub) {
      g.font = fontCss('Courier', subSize);
      g.fillText(sub, W / 2, H / 2 + s2 * 0.48);
    }
  } else {
    g.lineWidth = 10;
    roundRect(g, 8, 8, W - 16, H - 16, 14); g.stroke();
    g.lineWidth = 3;
    roundRect(g, 24, 24, W - 48, H - 48, 8); g.stroke();
    g.font = fontCss(fontId, size);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, sub ? H / 2 - subSize * 0.55 : H / 2 + 4);
    if (sub) {
      g.font = fontCss('Courier', subSize);
      g.fillText(sub, W / 2, H / 2 + size * 0.5);
    }
  }
  // ink wear
  const r = rng(hashStr(key));
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    g.globalAlpha = 0.3 + r() * 0.7;
    g.beginPath();
    g.arc(r() * W, r() * H, 0.6 + r() * 2.6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 0.35;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(r() * W, r() * H, 20 + r() * 60, 4 + r() * 10, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  _stamps.set(key, c);
  return c;
}

export function stamp(ctx, { x, y, text, sub = '', color = '#7a1fa2', width = 420, rot = -0.12, shape = 'rect', fontId = 'Anton', progress = 1, alpha = 0.92 }) {
  if (progress <= 0 || !text) return;
  const c = stampCanvas({ text, sub, color, shape, fontId });
  const s = width / c.width;
  const p = ease.slam(progress);
  const sc = s * (1 + (1 - p) * 0.9);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + (1 - p) * 0.25);
  ctx.globalAlpha *= alpha * clamp(progress * 3);
  ctx.scale(sc, sc);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  ctx.restore();
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------------------------------------------------------------------------
// Images: cover-fit with user zoom / pan / rotation
// ---------------------------------------------------------------------------
export function drawImageCover(ctx, img, w, h, { zoom = 1, offX = 0, offY = 0, rot = 0 } = {}) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih) * zoom;
  ctx.save();
  ctx.translate(w / 2 + offX * w, h / 2 + offY * h);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s);
  ctx.restore();
}

export function drawImageContain(ctx, img, cx, cy, maxW, maxH, rot = 0) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(maxW / iw, maxH / ih);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.drawImage(img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s);
  ctx.restore();
}

const _ph = new Map();
function photoPlaceholder(ctx, w, h, ink) {
  const key = `${Math.round(w)}x${Math.round(h)}|${ink}`;
  let c = _ph.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    drawPlaceholder(c.getContext('2d'), w, h, ink);
    _ph.set(key, c);
  }
  ctx.drawImage(c, 0, 0, w, h);
}

function drawPlaceholder(ctx, w, h, ink) {
  ctx.save();
  ctx.fillStyle = '#cfc8b8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#00000033';
  const r = rng(99);
  halftoneBlock(ctx, 0, 0, w, h, r);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.8;
  ctx.font = fontCss('Courier', Math.max(22, w * 0.07));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[ SUA FOTO / PNG ]', w / 2, h / 2);
  ctx.restore();
}

/**
 * Photo slot. Center-based.
 * frame: 'polaroid' | 'torn' | 'cutout' (no frame, for transparent PNGs)
 */
export function photoSlot(ctx, img, { x, y, w, h, rot = 0, frame = 'polaroid', seed = 4, zoom = 1, offX = 0, offY = 0, imgRot = 0, shadow, caption = '', ink = '#111', paper = '#fbfaf6', scale = 1, alpha = 1, placeholder = true, bw = false }) {
  if (scale <= 0 || alpha <= 0) return;
  ctx.save();
  const filt = bw ? 'grayscale(1) contrast(1.2)' : 'none';
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  const crop = { zoom, offX, offY, rot: imgRot };
  if (frame === 'cutout') {
    // Transparent PNG straight on the collage, with sticker-ish hard shadow.
    if (img) {
      ctx.save();
      if (shadow) {
        ctx.shadowColor = shadow.color;
        ctx.shadowOffsetX = shadow.dx;
        ctx.shadowOffsetY = shadow.dy;
        ctx.shadowBlur = shadow.blur || 0;
      }
      ctx.translate(-w / 2, -h / 2);
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const s = Math.min(w / iw, h / ih) * zoom;
      ctx.translate(w / 2 + offX * w, h / 2 + offY * h);
      ctx.rotate((imgRot * Math.PI) / 180);
      ctx.filter = filt;
      ctx.drawImage(img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s);
      ctx.restore();
    } else if (placeholder) {
      ctx.translate(-w / 2, -h / 2);
      ctx.setLineDash([18, 12]);
      ctx.strokeStyle = ink;
      ctx.globalAlpha *= 0.5;
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = ink;
      ctx.font = fontCss('Courier', 30);
      ctx.textAlign = 'center';
      ctx.fillText('[ PNG RECORTADO ]', w / 2, h / 2);
    }
    ctx.restore();
    return;
  }
  if (frame === 'polaroid') {
    const pad = w * 0.06, bottom = w * 0.22;
    const fw = w + pad * 2, fh = h + pad + bottom;
    ctx.translate(-fw / 2, -fh / 2);
    if (shadow) {
      ctx.beginPath();
      ctx.rect(shadow.dx, shadow.dy, fw, fh);
      shadowFill(ctx, shadow);
    }
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, fw, fh);
    drawTexture(ctx, 'grain', fw, fh, seed, 0.6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, w, h);
    ctx.clip();
    ctx.translate(pad, pad);
    if (img) {
      ctx.filter = filt;
      drawImageCover(ctx, img, w, h, crop);
      ctx.filter = 'none';
    } else if (placeholder) photoPlaceholder(ctx, w, h, ink);
    ctx.restore();
    // inner edge
    ctx.strokeStyle = '#00000022';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w, h);
    if (caption) {
      ctx.fillStyle = ink;
      ctx.font = fontCss('Courier', bottom * 0.36);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(caption, fw / 2, pad + h + bottom / 2, fw - pad * 2);
    }
  } else {
    // torn-out magazine photo
    ctx.translate(-w / 2, -h / 2);
    const shapeOpts = { seed, amp: 9 * STYLE.tear, step: 16 };
    if (shadow) {
      ctx.save();
      ctx.translate(shadow.dx, shadow.dy);
      tornRectPath(ctx, w, h, { ...shapeOpts, expand: 4 });
      shadowFill(ctx, shadow);
      ctx.restore();
    }
    tornRectPath(ctx, w, h, { ...shapeOpts, seed: seed + 17, expand: 5 });
    ctx.fillStyle = '#fbf9f3';
    ctx.fill();
    tornRectPath(ctx, w, h, shapeOpts);
    ctx.save();
    ctx.clip();
    if (img) {
      ctx.filter = filt;
      drawImageCover(ctx, img, w, h, crop);
      ctx.filter = 'none';
    } else if (placeholder) photoPlaceholder(ctx, w, h, ink);
    ctx.globalCompositeOperation = 'multiply';
    drawTexture(ctx, 'none', w, h, seed, 0.4);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
// Sets font + the font's natural letter-spacing (handwritten caps like airy tracking)
export function setFont(ctx, fontId, size, extraSpacing = 0) {
  ctx.font = fontCss(fontId, size);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${fontTracking(fontId) * size + extraSpacing}px`;
}

export function fitFont(ctx, text, fontId, maxSize, maxWidth, minSize = 18) {
  let size = maxSize;
  setFont(ctx, fontId, size);
  const w = ctx.measureText(text).width;
  if (w > maxWidth) size = Math.max(minSize, (size * maxWidth) / w);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return size;
}

export function drawFitText(ctx, text, { x, y, fontId, size, maxWidth, color, align = 'center', baseline = 'middle', strokeColor, strokeWidth = 0, letterSpacing = 0 }) {
  if (!text) return size;
  const s = fitFont(ctx, text, fontId, size, maxWidth);
  setFont(ctx, fontId, s, letterSpacing);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (strokeColor && strokeWidth) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return s;
}

export function wrapLines(ctx, text, maxWidth) {
  const out = [];
  String(text || '').split('\n').forEach((para) => {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else line = test;
    });
    out.push(line);
  });
  return out;
}

/**
 * Ransom-note / cut-out letters. Each glyph on its own scrap of paper.
 * appear: 0..1 staggered pop-in.
 */
export function ransomText(ctx, text, { x, y, size = 150, maxWidth = 900, fonts = ['Anton'], schemes, seed = 1, appear = 1, shadow, boil = 0 }) {
  if (!text) return;
  const chars = [...text.toUpperCase()];
  const r = rng(seed);
  const items = chars.map((ch) => {
    const fontId = fonts[Math.floor(r() * fonts.length)];
    const sz = size * (0.86 + r() * 0.28);
    const scheme = schemes[Math.floor(r() * schemes.length)];
    return { ch, fontId, sz, scheme, rot: (r() - 0.5) * 0.22, dy: (r() - 0.5) * size * 0.12, padX: sz * (0.1 + r() * 0.08), padY: sz * (0.06 + r() * 0.06), s: Math.floor(r() * 1e6) };
  });
  // measure
  let total = 0;
  items.forEach((it) => {
    if (it.ch === ' ') { it.w = size * 0.32; } else {
      ctx.font = fontCss(it.fontId, it.sz);
      it.tw = ctx.measureText(it.ch).width;
      it.w = it.tw + it.padX * 2;
    }
    total += it.w + size * 0.02;
  });
  const k = Math.min(1, maxWidth / total);
  let cx = x - (total * k) / 2;
  const br = rng(boil * 7 + seed);
  ctx.save();
  items.forEach((it, i) => {
    const w = it.w * k;
    if (it.ch !== ' ') {
      const local = clamp(appear * (items.length + 4) - i);
      const sc = local <= 0 ? 0 : ease.outBack(Math.min(1, local));
      if (sc > 0) {
        const sz = it.sz * k;
        const bh = sz * 1.08 + it.padY * 2 * k;
        const jx = boil ? (br() - 0.5) * 3 : 0, jy = boil ? (br() - 0.5) * 3 : 0;
        paperPiece(ctx, {
          x: cx + w / 2 + jx, y: y + it.dy * k + jy, w, h: bh, rot: it.rot + (boil ? (br() - 0.5) * 0.02 : 0),
          color: it.scheme.bg, seed: it.s, amp: 3, step: 9, texture: it.scheme.tex || 'grain', textureAlpha: 0.7,
          shadow, fiber: it.scheme.fiber === false ? null : '#fbf9f3', scale: sc, newsSeed: it.s % 5,
        }, (g, pw, ph) => {
          g.font = fontCss(it.fontId, sz);
          g.fillStyle = it.scheme.fg;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(it.ch, pw / 2, ph / 2 + sz * 0.06);
        });
      }
    }
    cx += w + size * 0.02 * k;
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Racing kerb (zebra) strip
// ---------------------------------------------------------------------------
export function kerb(ctx, x, y, w, h, c1 = '#e10600', c2 = '#ffffff', stripe = 60) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  let i = 0;
  for (let xx = x - h; xx < x + w + h; xx += stripe, i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx + stripe, y);
    ctx.lineTo(xx + stripe + h * 0.5, y + h);
    ctx.lineTo(xx + h * 0.5, y + h);
    ctx.fill();
  }
  ctx.restore();
}

// Hand-drawn marker scribble (underline / circle) for that "editor's pen" feel
export function markerLine(ctx, x0, y0, x1, y1, { color = '#ff3b2f', width = 14, progress = 1, seed = 1 } = {}) {
  if (progress <= 0) return;
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.globalAlpha *= 0.9;
  const xe = x0 + (x1 - x0) * progress, ye = y0 + (y1 - y0) * progress;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + xe) / 2, (y0 + ye) / 2 + (r() - 0.5) * 30, xe, ye);
  ctx.stroke();
  ctx.restore();
}
