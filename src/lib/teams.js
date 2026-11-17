// F1 2026 grid — palettes tuned for paper-cutout collage.
// paper: main paper stock · paper2: secondary scrap · ink: text/ink · accent: highlight
// accent2: secondary highlight · tape: masking/washi tape · car / car2: livery for the native car
export const TEAMS = [
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

export const teamById = (id) => TEAMS.find((t) => t.id === id) || TEAMS[0];
