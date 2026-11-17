// Built-in editorial fonts + runtime custom font upload (e.g. Bootzy TM).
export const BUILTIN_FONTS = [
  { id: 'Hand', label: 'Letra de mão (caixa alta)', family: '"Shadows Into Light Two"', weight: '400', style: 'normal', tracking: 0.09 },
  { id: 'Script', label: 'Script (campeão)', family: '"Yellowtail"', weight: '400', style: 'normal' },
  { id: 'Marker', label: 'Marcador (340 PTS)', family: '"Permanent Marker"', weight: '400', style: 'normal', tracking: 0.02 },
  { id: 'Rounded', label: 'Bold largo (ainda pode ser)', family: '"Unbounded"', weight: '800', style: 'normal' },
  { id: 'Anton', label: 'Anton (condensada)', family: '"Anton"', weight: '400', style: 'normal' },
  { id: 'Syne', label: 'Syne (display)', family: '"Syne"', weight: '800', style: 'normal' },
  { id: 'PlayfairItalic', label: 'Playfair Display Itálico', family: '"Playfair Display"', weight: '900', style: 'italic' },
  { id: 'Playfair', label: 'Playfair Display', family: '"Playfair Display"', weight: '900', style: 'normal' },
  { id: 'Courier', label: 'Courier Prime (telemetria)', family: '"Courier Prime"', weight: '700', style: 'normal' },
];

const custom = []; // {id,label,family,weight,style}

export function allFonts() {
  return [...custom, ...BUILTIN_FONTS];
}

export function fontTracking(id) {
  return fontById(id).tracking || 0;
}

export function fontById(id) {
  return allFonts().find((f) => f.id === id) || BUILTIN_FONTS[0];
}

// CSS font shorthand for canvas
export function fontCss(id, size) {
  const f = fontById(id);
  return `${f.style} ${f.weight} ${Math.round(size)}px ${f.family}, "Anton", sans-serif`;
}

// Register a font file (from upload or from the Acervo) under a stable id.
export async function registerFont(blobOrFile, name, id) {
  const familyName = 'Lib_' + id.replace(/[^a-zA-Z0-9]/g, '_');
  const buf = await blobOrFile.arrayBuffer();
  const face = new FontFace(familyName, buf);
  await face.load();
  document.fonts.add(face);
  const entry = { id, label: `${name} (sua fonte)`, family: `"${familyName}"`, weight: 'normal', style: 'normal', custom: true };
  const i = custom.findIndex((c) => c.id === id);
  if (i >= 0) custom[i] = entry;
  else custom.unshift(entry);
  return entry;
}

export function unregisterFont(id) {
  const i = custom.findIndex((c) => c.id === id);
  if (i >= 0) custom.splice(i, 1);
}

export async function ensureBuiltinFonts() {
  const loads = BUILTIN_FONTS.map((f) =>
    document.fonts.load(`${f.style} ${f.weight} 64px ${f.family}`).catch(() => null)
  );
  loads.push(document.fonts.load('italic 400 64px "Courier Prime"').catch(() => null));
  loads.push(document.fonts.load('700 64px "Playfair Display"').catch(() => null));
  await Promise.all(loads);
}
