// Snappy short-form curves.
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (t, start, end) => clamp((t - start) / (end - start));

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inQuart: (t) => t * t * t * t,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outBack: (t, s = 2.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 2.2) => (s + 1) * t * t * t - s * t * t,
  // "slam" — overshoots then settles; great for stamps
  slam: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.pow(2, -9 * t) * Math.cos(t * Math.PI * 3.2);
  },
};

// Card-style in/hold/out envelope. Returns {inP, outP} eased 0..1.
export function envelope(time, duration, inDur = 0.32, outDur = 0.24) {
  const inP = ease.outExpo(range(time, 0, inDur));
  const outP = ease.inQuart(range(time, duration - outDur, duration));
  return { inP, outP };
}
