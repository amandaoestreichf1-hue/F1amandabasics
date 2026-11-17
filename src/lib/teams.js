// F1 2026 grid — palettes tuned for paper-cutout collage.
// paper: main paper stock · paper2: secondary scrap · ink: text/ink · accent: highlight
// accent2: secondary highlight · tape: masking/washi tape · car / car2: livery for the native car
export const IDENTITY = {
  id: 'lilas', name: 'Minha identidade · Lilás', short: 'LIL',
  // sampled from the reference edits: lilac titles, lilac/linen gingham, crumpled graph paper
  palette: { paper: '#ece6dc', paper2: '#8a74a8', ink: '#4b4358', accent: '#c0b4fc', accent2: '#ffffff', tape: '#dcd2fb', car: '#c0b4fc', car2: '#ffffff', linen: '#b5a79b' },
};

export const TENNIS_IDENTITY = {
  id: 'menta', name: 'Identidade Tênis · Menta', short: 'TEN',
  palette: { paper: '#eef5f0', paper2: '#3f9f78', ink: '#24332d', accent: '#a8e6c9', accent2: '#ffffff', tape: '#cdeedd', car: '#a8e6c9', car2: '#ffffff', linen: '#d9e8de' },
};

export const TEAMS = [
  IDENTITY,
  { id: 'ferrari', name: 'Ferrari', short: 'FER', palette: { paper: '#f3ead8', paper2: '#d40000', ink: '#1a1410', accent: '#d40000', accent2: '#ffd400', tape: '#ffe066', car: '#d40000', car2: '#ffd400' } },
  { id: 'mclaren', name: 'McLaren', short: 'MCL', palette: { paper: '#f2ebdf', paper2: '#ff8000', ink: '#1d1d1f', accent: '#ff8000', accent2: '#47c7fc', tape: '#ffb366', car: '#ff8000', car2: '#1d1d1f' } },
  { id: 'mercedes', name: 'Mercedes', short: 'MER', palette: { paper: '#e4e2dc', paper2: '#9da3a6', ink: '#111111', accent: '#00a19c', accent2: '#c6c6c6', tape: '#bfe9e6', car: '#a7aeb3', car2: '#00d7b6' } },
  { id: 'redbull', name: 'Red Bull Racing', short: 'RBR', palette: { paper: '#efe8da', paper2: '#1b2a5c', ink: '#0d1430', accent: '#e4002b', accent2: '#ffc906', tape: '#ffd84d', car: '#1b2a5c', car2: '#e4002b' } },
  { id: 'aston', name: 'Aston Martin', short: 'AMR', palette: { paper: '#ece8dc', paper2: '#00594f', ink: '#0b1f1b', accent: '#00594f', accent2: '#cedc00', tape: '#e2ec7a', car: '#00594f', car2: '#cedc00' } },
  { id: 'alpine', name: 'Alpine', short: 'ALP', palette: { paper: '#eee9e1', paper2: '#0078c1', ink: '#0a1530', accent: '#0078c1', accent2: '#ff87bc', tape: '#ffb8d6', car: '#0078c1', car2: '#ff87bc' } },
  { id: 'williams', name: 'Williams', short: 'WIL', palette: { paper: '#eef0f2', paper2: '#00359f', ink: '#041e42', accent: '#00359f', accent2: '#64c4ff', tape: '#a8dcff', car: '#00359f', car2: '#64c4ff' } },
  { id: 'racingbulls', name: 'Racing Bulls', short: 'RB', palette: { paper: '#f1f1ef', paper2: '#1634cc', ink: '#0c0f1e', accent: '#1634cc', accent2: '#c0c4cc', tape: '#d8dcf5', car: '#f4f4f4', car2: '#1634cc' } },
  { id: 'haas', name: 'Haas', short: 'HAA', palette: { paper: '#f4f1ea', paper2: '#1a1a1a', ink: '#111111', accent: '#e10600', accent2: '#8c8c8c', tape: '#f0e6d0', car: '#f4f4f4', car2: '#e10600' } },
  { id: 'audi', name: 'Audi', short: 'AUD', palette: { paper: '#e7e5e1', paper2: '#8f9497', ink: '#121212', accent: '#d5001c', accent2: '#5a5f63', tape: '#d9d6cf', car: '#8f9497', car2: '#d5001c' } },
  { id: 'cadillac', name: 'Cadillac', short: 'CAD', palette: { paper: '#ece7dc', paper2: '#121212', ink: '#0b0b0b', accent: '#c9a54a', accent2: '#2a5bd7', tape: '#e8d9a8', car: '#141414', car2: '#c9a54a' } },
];

export const teamById = (id) => (id === 'menta' ? TENNIS_IDENTITY : TEAMS.find((t) => t.id === id) || TEAMS[0]);

// Color helpers
const hex = (h) => {
  const m = h.replace('#', '');
  const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => {
  const A = hex(a), B = hex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * k));
};
export const rgba = (h, a) => {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${a})`;
};

// "Suavizar": pastelize the strong team colors toward a dreamy, lighter version
export function soften(pal, k) {
  const out = { linen: '#b5a79b', ...pal };
  if (!k) return out;
  ['accent', 'accent2', 'paper2', 'car', 'car2', 'tape'].forEach((key) => (out[key] = mix(out[key], '#ffffff', k * 0.75)));
  out.ink = mix(out.ink, '#4b4358', k);
  out.paper = mix(out.paper, '#f4efe8', k * 0.6);
  return out;
}
