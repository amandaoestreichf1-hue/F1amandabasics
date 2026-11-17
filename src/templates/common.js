import { rng } from '../lib/rng.js';
import { clamp, ease, range } from '../lib/easing.js';

// Per-frame "boil" jitter for stop-motion mode. Returns {dx,dy,dr}.
export function jit(rc, k = 0, amt = 1) {
  if (!rc.boil) return { dx: 0, dy: 0, dr: 0 };
  const r = rng(rc.boil * 7919 + k * 104729 + 13);
  return { dx: (r() - 0.5) * 6 * amt, dy: (r() - 0.5) * 6 * amt, dr: (r() - 0.5) * 0.012 * amt };
}

// Image slot accessor. A slot `photo` stores: photo (asset id), photoZoom, photoX, photoY, photoRot, photoFrame
export function slot(rc, key) {
  const P = rc.P;
  return {
    img: rc.img(P[key]),
    zoom: P[key + 'Zoom'] ?? 1,
    offX: P[key + 'X'] ?? 0,
    offY: P[key + 'Y'] ?? 0,
    imgRot: P[key + 'Rot'] ?? 0,
    frame: P[key + 'Frame'] ?? 'polaroid',
    bw: !!P[key + 'BW'],
  };
}

// Card envelope in seconds: fast in, hold, snappy out.
export function cardEnv(rc, inDur = 0.34, outDur = 0.26) {
  const { t, dur } = rc;
  const outStart = Math.max(inDur, dur - outDur);
  return {
    inP: ease.outExpo(range(t, 0, inDur)),
    inRaw: range(t, 0, inDur),
    outP: ease.inBack(range(t, outStart, dur), 1.6),
    outRaw: range(t, outStart, dur),
    // seconds-since-start helper for staggered element entrances, eased
    at: (start, len = 0.25, fn = ease.outExpo) => fn(range(t, start, start + len)),
  };
}

// Apply a group transform around (cx, cy)
export function group(ctx, cx, cy, { scale = 1, rot = 0, dx = 0, dy = 0 } = {}) {
  ctx.translate(cx + dx, cy + dy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
}

export const deg = (d) => (d * Math.PI) / 180;
export { clamp, ease, range };
