// Single source of truth for drawing a frame — used by the live preview AND the exporter,
// so what you see is exactly what gets exported.
import { templateById } from '../templates/index.js';
import { drawSticker } from './car.js';
import { ease, range, clamp } from './easing.js';
import { rng } from './rng.js';
import { STYLE } from './paper.js';
import { soften, rgba } from './teams.js';

export const W = 1080, H = 1920;
export const STOP_FPS = 15;

export function trinketSize(tr, assets) {
  const img = assets[tr.assetId]?.img;
  if (!img) return { w: 0, h: 0 };
  const w = tr.w * tr.scale;
  return { w, h: (w * (img.naturalHeight || img.height)) / (img.naturalWidth || img.width) };
}

export function hitTrinket(trinkets, assets, x, y) {
  for (let i = trinkets.length - 1; i >= 0; i--) {
    const tr = trinkets[i];
    const { w, h } = trinketSize(tr, assets);
    const a = (-tr.rot * Math.PI) / 180;
    const dx = x - tr.x, dy = y - tr.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= w / 2 + 10 && Math.abs(ly) <= h / 2 + 10) return tr.id;
  }
  return null;
}

export function renderFrame(ctx, state, assets, time, { editor = false } = {}) {
  const tpl = templateById(state.templateId);
  const dur = state.duration;
  let t = clamp(time, 0, dur);
  let boil = 0;
  if (state.motion === 'stop') {
    const f = Math.floor(t * STOP_FPS + 1e-6);
    t = Math.min(dur, f / STOP_FPS);
    boil = (f % 3) + 1;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.save();
  const sh = state.shadow;
  STYLE.tear = state.tear ?? 1;
  const rc = {
    ctx, W, H, t, dur, boil,
    P: state.params[tpl.id],
    pal: soften(state.palette, state.soft || 0),
    fonts: state.fonts,
    shadow: sh.on ? { dx: sh.size * 0.6, dy: sh.size, color: rgba(sh.color, sh.opacity ?? 0.85), blur: sh.blur || 0 } : null,
    img: (id) => (id ? assets[id]?.img || null : null),
  };
  try {
    tpl.render(rc);
  } catch (e) {
    console.error(e);
  }
  ctx.restore();

  // Trinkets layer (user PNG stickers), always on top
  state.trinkets.forEach((tr, i) => {
    const img = assets[tr.assetId]?.img;
    if (!img) return;
    let s = 1, rotExtra = 0;
    if (tr.anim !== 'none') {
      const d0 = (tr.delay ?? 0.12) + 0;
      const k = range(t, d0, d0 + (tr.anim === 'slam' ? 0.16 : 0.22));
      s = tr.anim === 'slam' ? (k <= 0 ? 0 : 1 + (1 - ease.slam(k)) * 0.9) : ease.outBack(k, 2.2);
      rotExtra = (1 - Math.min(1, k)) * 0.5;
      if (tr.anim === 'slam' && k <= 0) s = 0;
    }
    if (tr.exit) s *= 1 - ease.inBack(range(t, dur - 0.2, dur), 2);
    if (s <= 0.001) return;
    let jx = 0, jy = 0, jr = 0;
    if (boil && tr.wiggle !== false) {
      const r = rng(boil * 31 + i * 7);
      jx = (r() - 0.5) * 5; jy = (r() - 0.5) * 5; jr = (r() - 0.5) * 0.03;
    }
    drawSticker(ctx, img, {
      x: tr.x + jx, y: tr.y + jy, w: tr.w * tr.scale * s,
      rot: (tr.rot * Math.PI) / 180 + rotExtra + jr, flip: tr.flip,
      shadow: tr.shadow && rc.shadow ? rc.shadow : null,
    });
  });

  if (editor && state.selectedTrinket) {
    const tr = state.trinkets.find((x) => x.id === state.selectedTrinket);
    if (tr) {
      const { w, h } = trinketSize(tr, assets);
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate((tr.rot * Math.PI) / 180);
      ctx.setLineDash([16, 10]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ff3b2f';
      ctx.strokeRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16);
      ctx.restore();
    }
  }
}
