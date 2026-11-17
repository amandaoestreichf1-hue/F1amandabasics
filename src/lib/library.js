// "Acervo": persistent personal library of images and fonts, stored in the browser (IndexedDB).
// Survives reloads; can be backed up / restored as a .zip.
import JSZip from 'jszip';

const DB_NAME = 'paddock-press-acervo';
const DB_VERSION = 1;

export const IMAGE_CATEGORIES = [
  { id: 'trinket', label: 'Trinkets', hint: 'adesivos, estrelinhas, clipes, setas, recortes' },
  { id: 'background', label: 'Fundos', hint: 'papéis, tecidos, texturas, cenários' },
  { id: 'photo', label: 'Cabecinhas & Fotos', hint: 'pilotos recortados, reações, prints' },
  { id: 'object', label: 'Objetos que cruzam', hint: 'carros, capacetes, PNGs para a transição' },
];

export const FONT_ROLES = [
  { id: 'head', label: 'Título / Headline' },
  { id: 'body', label: 'Subtítulo' },
  { id: 'accent', label: 'Destaque (script)' },
  { id: 'none', label: 'Só guardar' },
];

let _db = null;
function db() {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('images')) d.createObjectStore('images', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('fonts')) d.createObjectStore('fonts', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _db;
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r?.result ?? r);
    t.onerror = () => reject(t.error);
  });
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}

// ---- images
export async function listImages() {
  const all = await tx('images', 'readonly', (s) => s.getAll());
  return (all || []).sort((a, b) => a.createdAt - b.createdAt);
}
export async function addImage(file, category = 'trinket', name) {
  const rec = { id: uid(), name: name || file.name.replace(/\.[^.]+$/, ''), category, blob: file, type: file.type, createdAt: Date.now() };
  await tx('images', 'readwrite', (s) => s.put(rec));
  return rec;
}
export async function updateImage(id, patch) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('images', 'readwrite');
    const s = t.objectStore('images');
    const g = s.get(id);
    g.onsuccess = () => g.result && s.put({ ...g.result, ...patch });
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
export const deleteImage = (id) => tx('images', 'readwrite', (s) => s.delete(id));

// ---- fonts
export async function listFonts() {
  const all = await tx('fonts', 'readonly', (s) => s.getAll());
  return (all || []).sort((a, b) => a.createdAt - b.createdAt);
}
export async function addFont(file, role = 'head') {
  const rec = { id: uid(), name: file.name.replace(/\.(ttf|otf|woff2?)$/i, ''), fileName: file.name, role, blob: file, createdAt: Date.now() };
  await tx('fonts', 'readwrite', (s) => s.put(rec));
  return rec;
}
export async function updateFont(id, patch) {
  const all = await listFonts();
  const f = all.find((x) => x.id === id);
  if (f) await tx('fonts', 'readwrite', (s) => s.put({ ...f, ...patch }));
}
export const deleteFont = (id) => tx('fonts', 'readwrite', (s) => s.delete(id));

// ---- backup
export async function exportLibrary() {
  const zip = new JSZip();
  const images = await listImages();
  const fonts = await listFonts();
  const manifest = { version: 1, images: [], fonts: [] };
  images.forEach((im) => {
    const ext = (im.type || 'image/png').split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const path = `imagens/${im.category}/${im.id}.${ext}`;
    zip.file(path, im.blob);
    manifest.images.push({ id: im.id, name: im.name, category: im.category, type: im.type, path, createdAt: im.createdAt });
  });
  fonts.forEach((f) => {
    const path = `fontes/${f.id}_${f.fileName}`;
    zip.file(path, f.blob);
    manifest.fonts.push({ id: f.id, name: f.name, fileName: f.fileName, role: f.role, path, createdAt: f.createdAt });
  });
  zip.file('acervo.json', JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

export async function importLibrary(file) {
  const zip = await JSZip.loadAsync(file);
  const mf = JSON.parse(await zip.file('acervo.json').async('string'));
  const existing = new Set((await listImages()).map((i) => i.id));
  const existingF = new Set((await listFonts()).map((i) => i.id));
  let n = 0;
  for (const im of mf.images || []) {
    if (existing.has(im.id)) continue;
    const blob = new Blob([await zip.file(im.path).async('arraybuffer')], { type: im.type || 'image/png' });
    await tx('images', 'readwrite', (s) => s.put({ ...im, blob }));
    n++;
  }
  for (const f of mf.fonts || []) {
    if (existingF.has(f.id)) continue;
    const blob = new Blob([await zip.file(f.path).async('arraybuffer')]);
    await tx('fonts', 'readwrite', (s) => s.put({ ...f, blob }));
    n++;
  }
  return n;
}
