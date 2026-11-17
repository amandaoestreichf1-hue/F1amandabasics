// Single source of truth for drawing a frame — used by the live preview AND the exporter,
// so what you see is exactly what gets exported.
import { templateById, isTransition } from '../templates/index.js';
import { FONT_REMAP } from './fonts.js';
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
  STYLE.look = state.look || 'soft';
  FONT_REMAP.Courier = STYLE.look === 'soft' ? 'Hand' : undefined;
  const transition = isTransition(tpl);
  // "Terminar parado": overlays never reach their exit; the clip simply ends on the held frame
  const holdEnd = !!state.holdEnd && !transition;
  const rc = {
    ctx, W, H, t, dur: holdEnd ? dur + 1000 : dur, realDur: dur, boil,
    P: state.params[tpl.id],
    pal: soften(state.palette, state.soft || 0),
    fonts: state.fonts,
    shadow: sh.on ? { dx: sh.size * 0.6, dy: sh.size, color: rgba(sh.color, sh.opacity ?? 0.85), blur: sh.blur || 0 } : null,
    img: (id) => (id ? assets[id]?.img || null : null),
  };
  // Continuous motion while on screen, so nothing sits frozen like a still
  const idle = transition ? 'none' : state.idle || 'push';
  if (idle !== 'none') {
    const cx = W / 2, cy = H * (rc.P?.posY ?? 0.5);
    const h = clamp(t / dur);
    let sc = 1, rot = 0, dy = 0;
    if (idle === 'push') sc = 1 + 0.03 * (0.5 - 0.5 * Math.cos(h * Math.PI));
    else if (idle === 'float') { dy = Math.sin(t * 1.7) * 7; rot = Math.sin(t * 1.15) * 0.004; sc = 1.012; }
    ctx.translate(cx, cy + dy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);
  }
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
    let s = 1, rotExtra = 0, dyExtra = 0, alpha = 1;
    if (tr.anim && tr.anim !== 'none') {
      const d0 = tr.delay ?? 0.12;
      const k = range(t, d0, d0 + (tr.anim === 'slam' ? 0.16 : tr.anim === 'drop' ? 0.3 : 0.24));
      if (tr.anim === 'slam') s = k <= 0 ? 0 : 1 + (1 - ease.slam(k)) * 0.9;
      else if (tr.anim === 'drop') { s = k <= 0 ? 0 : 1; dyExtra = -(1 - ease.outBack(k, 1.6)) * 500; alpha = Math.min(1, k * 4); }
      else if (tr.anim === 'spin') { s = ease.outBack(k, 1.6); rotExtra = (1 - ease.outCubic(k)) * Math.PI * 1.2; }
      else { s = ease.outBack(k, 2.2); rotExtra = (1 - Math.min(1, k)) * 0.5; }
    }
    // idle motion while on screen, so nothing sits dead still
    const ph = i * 1.7;
    if (tr.idle === 'float') dyExtra += Math.sin(t * 2.4 + ph) * 12;
    else if (tr.idle === 'wiggle') rotExtra += Math.sin(t * 3.2 + ph) * 0.09;
    else if (tr.idle === 'pulse') s *= 1 + Math.sin(t * 4 + ph) * 0.05;
    else if (tr.idle === 'spin') rotExtra += t * 0.8;
    if (tr.exit) s *= 1 - ease.inBack(range(t, dur - 0.2, dur), 2);
    if (s <= 0.001) return;
    let jx = 0, jy = 0, jr = 0;
    if (boil && tr.wiggle !== false) {
      const r = rng(boil * 31 + i * 7);
      jx = (r() - 0.5) * 5; jy = (r() - 0.5) * 5; jr = (r() - 0.5) * 0.03;
    }
    drawSticker(ctx, img, {
      x: tr.x + jx, y: tr.y + jy + dyExtra, w: tr.w * tr.scale * s, alpha,
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
