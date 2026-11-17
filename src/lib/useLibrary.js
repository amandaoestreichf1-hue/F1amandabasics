import { useCallback, useEffect, useState } from 'react';
import * as lib from './library.js';
import { registerFont, unregisterFont } from './fonts.js';

const loadImg = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

export const libAssetId = (id) => 'lib_' + id;
export const libFontId = (id) => 'lib:' + id;

/**
 * Keeps the persistent Acervo in sync with the editor:
 * images become assets (assetsRef.current['lib_<id>']), fonts become registered FontFaces ('lib:<id>').
 */
export function useLibrary(assetsRef, { onAssetsChanged, onFontsChanged, onFontRole, notify }) {
  const [images, setImages] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [ready, setReady] = useState(false);

  const mountImage = useCallback(async (rec) => {
    const url = URL.createObjectURL(rec.blob);
    try {
      const img = await loadImg(url);
      assetsRef.current[libAssetId(rec.id)] = { img, url, name: rec.name, kind: rec.category, libId: rec.id };
      return { ...rec, url };
    } catch {
      URL.revokeObjectURL(url);
      return null;
    }
  }, [assetsRef]);

  const mountFont = useCallback(async (rec) => {
    try {
      await registerFont(rec.blob, rec.name, libFontId(rec.id));
      return rec;
    } catch {
      return null;
    }
  }, []);

  // initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      lib.requestPersistence();
      try {
        const [imgs, fnts] = await Promise.all([lib.listImages(), lib.listFonts()]);
        const mi = (await Promise.all(imgs.map(mountImage))).filter(Boolean);
        const mf = (await Promise.all(fnts.map(mountFont))).filter(Boolean);
        if (!alive) return;
        setImages(mi);
        setFonts(mf);
        onAssetsChanged();
        onFontsChanged();
      } catch (e) {
        console.error(e);
        notify?.('Não consegui abrir o acervo deste navegador.', 'err');
      }
      setReady(true);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImages = useCallback(async (files, category) => {
    const added = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const rec = await lib.addImage(f, category);
      const m = await mountImage(rec);
      if (m) added.push(m);
    }
    setImages((prev) => [...prev, ...added]);
    onAssetsChanged();
    return added.map((r) => libAssetId(r.id));
  }, [mountImage, onAssetsChanged]);

  const updateImage = useCallback(async (id, patch) => {
    await lib.updateImage(id, patch);
    setImages((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const a = assetsRef.current[libAssetId(id)];
    if (a) {
      if (patch.category) a.kind = patch.category;
      if (patch.name) a.name = patch.name;
    }
    onAssetsChanged();
  }, [assetsRef, onAssetsChanged]);

  const removeImage = useCallback(async (id) => {
    await lib.deleteImage(id);
    const a = assetsRef.current[libAssetId(id)];
    if (a) URL.revokeObjectURL(a.url);
    delete assetsRef.current[libAssetId(id)];
    setImages((prev) => prev.filter((r) => r.id !== id));
    onAssetsChanged();
  }, [assetsRef, onAssetsChanged]);

  const addFonts = useCallback(async (files, role = 'head') => {
    const out = [];
    for (const f of files) {
      if (!/\.(ttf|otf|woff2?)$/i.test(f.name)) continue;
      const rec = await lib.addFont(f, role);
      const m = await mountFont(rec);
      if (m) {
        out.push(m);
        if (role !== 'none') onFontRole(role, libFontId(m.id));
      } else {
        await lib.deleteFont(rec.id);
        notify?.(`Não consegui ler a fonte ${f.name}.`, 'err');
      }
    }
    setFonts((prev) => [...prev, ...out]);
    onFontsChanged();
    return out;
  }, [mountFont, onFontRole, onFontsChanged, notify]);

  const setFontRole = useCallback(async (id, role) => {
    await lib.updateFont(id, { role });
    setFonts((prev) => prev.map((f) => (f.id === id ? { ...f, role } : f)));
    if (role !== 'none') onFontRole(role, libFontId(id));
  }, [onFontRole]);

  const removeFont = useCallback(async (id) => {
    await lib.deleteFont(id);
    unregisterFont(libFontId(id));
    setFonts((prev) => prev.filter((f) => f.id !== id));
    onFontsChanged();
  }, [onFontsChanged]);

  const exportBackup = useCallback(() => lib.exportLibrary(), []);
  const importBackup = useCallback(async (file) => {
    const n = await lib.importLibrary(file);
    const [imgs, fnts] = await Promise.all([lib.listImages(), lib.listFonts()]);
    const known = new Set(images.map((i) => i.id));
    const knownF = new Set(fonts.map((f) => f.id));
    const newImgs = (await Promise.all(imgs.filter((i) => !known.has(i.id)).map(mountImage))).filter(Boolean);
    const newFonts = (await Promise.all(fnts.filter((f) => !knownF.has(f.id)).map(mountFont))).filter(Boolean);
    setImages((prev) => [...prev, ...newImgs]);
    setFonts((prev) => [...prev, ...newFonts]);
    newFonts.forEach((f) => f.role !== 'none' && onFontRole(f.role, libFontId(f.id)));
    onAssetsChanged();
    onFontsChanged();
    return n;
  }, [images, fonts, mountImage, mountFont, onAssetsChanged, onFontsChanged, onFontRole]);

  return { ready, images, fonts, addImages, updateImage, removeImage, addFonts, setFontRole, removeFont, exportBackup, importBackup };
}
