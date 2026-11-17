import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Preview from './components/Preview.jsx';
import { TemplatePicker, TeamPanel, TypePanel, FieldsPanel, TrinketPanel, MotionPanel } from './components/panels.jsx';
import { Section, Btn, Segmented, Label } from './components/ui.jsx';
import { TEMPLATES, templateById, allDefaultParams, defaultParams } from './templates/index.js';
import { teamById } from './lib/teams.js';
import { ensureBuiltinFonts, loadCustomFont } from './lib/fonts.js';
import { buildNativeTrinkets } from './lib/nativeTrinkets.js';
import { exportWebM, exportPNGZip, exportStillPNG, download, webmAlphaSupported } from './lib/exporter.js';

const STORAGE_KEY = 'paddock-press-v1';
const uid = () => Math.random().toString(36).slice(2, 10);

function initialState() {
  const base = {
    templateId: 'newsWipe',
    teamId: 'mclaren',
    palette: { ...teamById('mclaren').palette },
    fonts: { head: 'Anton', body: 'PlayfairItalic' },
    motion: 'stop',
    durations: Object.fromEntries(TEMPLATES.map((t) => [t.id, t.defaultDuration])),
    params: allDefaultParams(),
    shadow: { on: true, size: 14, color: '#141210' },
    trinkets: [],
    selectedTrinket: null,
    exportFps: 30,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) {
      const params = { ...base.params };
      Object.keys(params).forEach((k) => {
        const clean = { ...(saved.params?.[k] || {}) };
        // uploaded images don't survive a reload
        Object.keys(clean).forEach((ck) => typeof clean[ck] === 'string' && clean[ck].startsWith('asset_') && (clean[ck] = null));
        params[k] = { ...params[k], ...clean };
      });
      return {
        ...base,
        ...saved,
        fonts: { head: saved.fonts?.head?.startsWith('custom:') ? 'Anton' : saved.fonts?.head || 'Anton', body: saved.fonts?.body?.startsWith('custom:') ? 'PlayfairItalic' : saved.fonts?.body || 'PlayfairItalic' },
        durations: { ...base.durations, ...(saved.durations || {}) },
        params,
        shadow: { ...base.shadow, ...(saved.shadow || {}) },
        trinkets: [],
        selectedTrinket: null,
      };
    }
  } catch {
    /* ignore */
  }
  return base;
}

export default function App() {
  const [state, setStateRaw] = useState(initialState);
  const setState = useCallback((patch) => setStateRaw((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);
  const assetsRef = useRef({});
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [fontVersion, setFontVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const timeRef = useRef(0);

  const notify = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind, id: uid() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  // fonts + native trinkets
  useEffect(() => {
    ensureBuiltinFonts().then(() => {
      buildNativeTrinkets().forEach(([name, canvas]) => {
        const id = 'native_' + name;
        assetsRef.current[id] = { img: canvas, url: canvas.toDataURL(), name, kind: 'native' };
      });
      setFontVersion((v) => v + 1);
      setAssetsVersion((v) => v + 1);
    });
  }, []);

  // persist (no images)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const { trinkets, selectedTrinket, ...rest } = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      } catch {
        /* storage might be blocked */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [state]);

  const tpl = templateById(state.templateId);
  const renderState = useMemo(
    () => ({ ...state, duration: state.durations[state.templateId] }),
    [state]
  );

  const uploadImage = useCallback((file, kind) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const id = 'asset_' + uid();
        assetsRef.current[id] = { img, url, name: file.name.replace(/\.[^.]+$/, ''), kind };
        setAssetsVersion((v) => v + 1);
        resolve(id);
      };
      img.onerror = () => {
        notify('Não consegui abrir essa imagem.', 'err');
        reject(new Error('img'));
      };
      img.src = url;
    });
  }, [notify]);

  const setParams = (patch) =>
    setState((s) => ({ params: { ...s.params, [s.templateId]: { ...s.params[s.templateId], ...patch } } }));

  // trinkets
  const addTrinket = (assetId) => {
    const id = uid();
    const n = state.trinkets.length;
    setState((s) => ({
      trinkets: [...s.trinkets, { id, assetId, x: 540 + ((n * 97) % 300) - 150, y: 760 + ((n * 131) % 500) - 250, w: 300, scale: 1, rot: ((n * 37) % 30) - 15, flip: false, shadow: true, anim: 'pop', delay: Math.min(1.2, 0.12 + n * 0.06), exit: true, wiggle: true }],
      selectedTrinket: id,
    }));
  };
  const updateTrinket = (id, patch) => setState((s) => ({ trinkets: s.trinkets.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const removeTrinket = (id) => setState((s) => ({ trinkets: s.trinkets.filter((t) => t.id !== id), selectedTrinket: s.selectedTrinket === id ? null : s.selectedTrinket }));
  const moveTrinket = (id, dir) =>
    setState((s) => {
      const arr = [...s.trinkets];
      const i = arr.findIndex((t) => t.id === id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return {};
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { trinkets: arr };
    });
  const deleteAsset = (id) => {
    setState((s) => ({ trinkets: s.trinkets.filter((t) => t.assetId !== id) }));
    delete assetsRef.current[id];
    setAssetsVersion((v) => v + 1);
  };

  // keyboard: delete selected trinket, space play handled in preview
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedTrinket) removeTrinket(state.selectedTrinket);
      if (e.key === 'Escape') setState({ selectedTrinket: null });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const onUploadFont = async (file) => {
    try {
      const f = await loadCustomFont(file);
      setState((s) => ({ fonts: { ...s.fonts, head: f.id } }));
      setFontVersion((v) => v + 1);
      notify(`Fonte "${f.label}" carregada e aplicada nos títulos ✓`);
    } catch (e) {
      notify('Não consegui ler essa fonte. Use .ttf, .otf ou .woff.', 'err');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <aside className="lg:w-[440px] shrink-0 lg:h-full overflow-y-auto scroll-thin border-r border-desk-700/70 bg-desk-900">
          <TemplatePicker value={state.templateId} onChange={(id) => { timeRef.current = 0; setState({ templateId: id }); }} />
          <TeamPanel
            teamId={state.teamId}
            palette={state.palette}
            onTeam={(id) => setState({ teamId: id, palette: { ...teamById(id).palette } })}
            onPalette={(p) => setState({ palette: p })}
          />
          <FieldsPanel tpl={tpl} P={state.params[tpl.id]} set={setParams} assets={assetsRef.current} onUpload={uploadImage} key={tpl.id + assetsVersion} />
          <div className="px-5 py-2 -mt-1 border-b border-desk-700/70">
            <Btn className="w-full !text-[12px]" onClick={() => setState((s) => ({ params: { ...s.params, [tpl.id]: defaultParams(tpl) }, durations: { ...s.durations, [tpl.id]: tpl.defaultDuration } }))}>
              ↺ Restaurar padrão deste template
            </Btn>
          </div>
          <TrinketPanel
            assets={assetsRef.current}
            trinkets={state.trinkets}
            selected={state.selectedTrinket}
            onUpload={(f, kind) => uploadImage(f, kind).then((id) => { addTrinket(id); return id; }).catch(() => {})}
            onAdd={addTrinket}
            onSelect={(id) => setState({ selectedTrinket: id })}
            onUpdate={updateTrinket}
            onRemove={removeTrinket}
            onMove={moveTrinket}
            onDeleteAsset={deleteAsset}
          />
          <TypePanel fonts={state.fonts} onFonts={(f) => setState({ fonts: f })} onUploadFont={onUploadFont} fontVersion={fontVersion} />
          <MotionPanel
            state={renderState}
            tpl={tpl}
            setState={(patch) => {
              if ('duration' in patch) {
                const { duration, ...rest } = patch;
                setState((s) => ({ ...rest, durations: { ...s.durations, [s.templateId]: duration } }));
              } else setState(patch);
            }}
          />
          <ExportPanel state={renderState} assets={assetsRef.current} fps={state.exportFps} setFps={(v) => setState({ exportFps: v })} notify={notify} timeRef={timeRef} />
          <div className="p-5 font-mono text-[10px] text-stone-600 leading-relaxed">
            Paddock Press · gerador local · nada sai do seu computador.<br />Imagens e fontes enviadas ficam só nesta aba.
          </div>
        </aside>
        <main className="flex-1 min-w-0 min-h-[80vh] lg:min-h-0 bg-desk-950">
          <Preview
            state={renderState}
            assets={assetsRef.current}
            assetsVersion={assetsVersion}
            fontVersion={fontVersion}
            timeRef={timeRef}
            onTrinketChange={updateTrinket}
            onSelectTrinket={(id) => setState({ selectedTrinket: id })}
          />
        </main>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: 40, opacity: 0, rotate: -3 }}
            animate={{ y: 0, opacity: 1, rotate: -1 }}
            exit={{ y: 40, opacity: 0 }}
            className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 font-mono text-[13px] shadow-[5px_5px_0_#000] ${toast.kind === 'err' ? 'bg-marker text-white' : 'bg-newsprint text-desk-950'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header() {
  const letters = [
    ['P', '#ff3b2f', '#fff', 'Anton'], ['A', '#efe9dc', '#111', 'Playfair Display'], ['D', '#111', '#ffd400', 'Anton'],
    ['D', '#ff87bc', '#111', 'Syne'], ['O', '#efe9dc', '#111', 'Courier Prime'], ['C', '#ff8000', '#111', 'Anton'], ['K', '#111', '#efe9dc', 'Playfair Display'],
  ];
  return (
    <header className="flex items-center gap-4 px-5 py-3 border-b border-desk-700/70 bg-desk-900">
      <div className="flex items-center gap-[3px]">
        {letters.map(([l, bg, fg, font], i) => (
          <motion.span
            key={i}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: 0, opacity: 1, rotate: (i % 2 ? 1 : -1) * (3 + (i % 3) * 2) }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 600, damping: 18 }}
            className="inline-grid place-items-center w-7 h-8 text-[20px] font-black shadow-[2px_2px_0_#000]"
            style={{ background: bg, color: fg, fontFamily: font, fontStyle: font === 'Playfair Display' ? 'italic' : 'normal' }}
          >
            {l}
          </motion.span>
        ))}
        <span className="ml-2 font-anton text-[22px] tracking-wide text-newsprint">PRESS</span>
      </div>
      <div className="hidden md:block font-mono text-[11px] text-stone-500 border-l border-desk-700 pl-4 leading-tight">
        Gerador de transições & overlays F1<br />Reels / TikTok · 1080×1920 · fundo transparente
      </div>
      <div className="flex-1" />
      <span className="hidden sm:inline font-mono text-[11px] px-2 py-1 bg-marker text-white -rotate-2 shadow-[2px_2px_0_#000]">OFF THE RECORD</span>
    </header>
  );
}

function ExportPanel({ state, assets, fps, setFps, notify, timeRef }) {
  const [busy, setBusy] = useState(null); // {kind, p}
  const [alphaOk, setAlphaOk] = useState(null);
  const abortRef = useRef(null);
  useEffect(() => {
    webmAlphaSupported().then(setAlphaOk);
  }, []);
  const tpl = templateById(state.templateId);
  const base = `${tpl.id}_${state.teamId}_${state.duration.toFixed(1)}s`;
  const frames = Math.round(state.duration * fps);

  const run = async (kind) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy({ kind, p: 0 });
    const onProgress = (p) => setBusy({ kind, p });
    try {
      if (kind === 'webm') {
        const blob = await exportWebM(state, assets, { fps, onProgress, signal: ac.signal });
        download(blob, `${base}_${fps}fps_alpha.webm`);
        notify(`WebM exportado (${(blob.size / 1e6).toFixed(1)} MB) ✓`);
      } else if (kind === 'png') {
        const blob = await exportPNGZip(state, assets, { fps, onProgress, signal: ac.signal, baseName: base });
        download(blob, `${base}_${fps}fps_png.zip`);
        notify(`ZIP com ${frames} PNGs exportado ✓`);
      } else {
        const blob = await exportStillPNG(state, assets, Math.min(timeRef.current, state.duration));
        download(blob, `${base}_quadro.png`);
        notify('Quadro PNG exportado ✓');
      }
    } catch (e) {
      if (e.name === 'AbortError') notify('Exportação cancelada.', 'err');
      else {
        console.error(e);
        notify('Erro ao exportar: ' + e.message, 'err');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="Exportar com transparência" kicker="07">
      <Label>Quadros por segundo do arquivo</Label>
      <Segmented value={String(fps)} onChange={(v) => setFps(parseInt(v, 10))} options={[['30', '30 fps'], ['60', '60 fps']]} />
      <div className="font-mono text-[11px] text-stone-500">1080×1920 · {frames} quadros · {state.duration.toFixed(2)}s</div>
      <div className="grid grid-cols-1 gap-2">
        <Btn variant="primary" disabled={!!busy} onClick={() => run('webm')}>⬇ Vídeo .webm (VP9 + Alpha)</Btn>
        <Btn variant="paper" disabled={!!busy} onClick={() => run('png')}>⬇ Sequência PNG transparente (.zip)</Btn>
        <Btn disabled={!!busy} onClick={() => run('still')}>⬇ Só o quadro atual (.png)</Btn>
      </div>
      <AnimatePresence>
        {busy && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5">
            <div className="h-3 bg-desk-800 border border-desk-700 overflow-hidden">
              <motion.div className="h-full bg-marker" animate={{ width: `${Math.round(busy.p * 100)}%` }} transition={{ duration: 0.1 }} />
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-stone-400">
              <span>Renderizando {busy.kind === 'webm' ? 'WebM' : busy.kind === 'png' ? 'PNGs' : 'PNG'}… {Math.round(busy.p * 100)}%</span>
              <button className="text-marker hover:underline" onClick={() => abortRef.current?.abort()}>cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`text-[11px] leading-relaxed rounded-md p-2.5 border ${alphaOk === false ? 'border-amber-500/40 text-amber-200/90 bg-amber-500/5' : 'border-desk-700 text-stone-400 bg-desk-850'}`}>
        {alphaOk === null && 'Verificando suporte a VP9 com alfa…'}
        {alphaOk === true && <>✓ Seu navegador codifica <b>VP9 com canal alfa</b> quadro a quadro (exportação mais rápida que tempo real e sem quadros perdidos).</>}
        {alphaOk === false && <>⚠ Codificação VP9+alfa direta indisponível aqui — o WebM será gravado em tempo real (MediaRecorder). Para máxima compatibilidade use o <b>Chrome/Edge</b> no computador ou a <b>sequência PNG</b>.</>}
        <div className="mt-1.5 text-stone-500">
          CapCut: o <b>.webm</b> funciona bem no CapCut para computador. No celular, se a transparência não aparecer, use a <b>sequência PNG</b> (ou converta o PNG/WebM para .mov com alfa no computador).
        </div>
      </div>
    </Section>
  );
}
