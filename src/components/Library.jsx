import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Btn, FileButton, Segmented } from './ui.jsx';
import { IMAGE_CATEGORIES, FONT_ROLES } from '../lib/library.js';
import { libFontId } from '../lib/useLibrary.js';
import { fontById } from '../lib/fonts.js';
import { download } from '../lib/exporter.js';

function DropZone({ accept, onFiles, children, className = '' }) {
  const [over, setOver] = useState(false);
  const ref = useRef(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files].filter((f) => accept(f));
        if (files.length) onFiles(files);
      }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer border-2 border-dashed rounded-lg transition-colors grid place-items-center text-center ${over ? 'border-[#c0b4fc] bg-[#c0b4fc]/10' : 'border-desk-600 hover:border-[#c0b4fc]/60 bg-desk-900/60'} ${className}`}
    >
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files || [])].filter((f) => accept(f));
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {children}
    </div>
  );
}

export default function Library({ library, fontsState, notify, onUseImage }) {
  const { images, fonts, addImages, updateImage, removeImage, addFonts, setFontRole, removeFont, exportBackup, importBackup } = library;
  const [cat, setCat] = useState('all');
  const [dropCat, setDropCat] = useState('trinket');
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(null);
  const counts = useMemo(() => Object.fromEntries(IMAGE_CATEGORIES.map((c) => [c.id, images.filter((i) => i.category === c.id).length])), [images]);
  const shown = cat === 'all' ? images : images.filter((i) => i.category === cat);
  const [lastBackup, setLastBackup] = useState(() => {
    try { return JSON.parse(localStorage.getItem('acervo-last-backup') || 'null'); } catch { return null; }
  });
  const signature = images.length + fonts.length;
  const needsBackup = signature > 0 && (!lastBackup || lastBackup.count !== signature);
  const doBackup = async () => {
    const blob = await exportBackup();
    const ok = await download(blob, `acervo-paddock-press-${new Date().toISOString().slice(0, 10)}.zip`).catch((e) => { notify(e.message, 'err'); return false; });
    if (!ok) return;
    const info = { at: Date.now(), count: signature };
    try { localStorage.setItem('acervo-last-backup', JSON.stringify(info)); } catch { /* ignore */ }
    setLastBackup(info);
  };

  const onImages = async (files) => {
    setBusy(true);
    const ids = await addImages(files, dropCat);
    setBusy(false);
    notify(`${ids.length} imagem(ns) salvas em ${IMAGE_CATEGORIES.find((c) => c.id === dropCat).label} ✓`);
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* intro */}
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div>
            <div className="font-mono text-[11px] text-[#c0b4fc] tracking-widest">MEU ACERVO</div>
            <h1 className="text-4xl text-newsprint mt-1" style={{ fontFamily: '"Shadows Into Light Two"', letterSpacing: '0.06em' }}>
              Suas imagens & fontes
            </h1>
            <p className="text-stone-400 text-sm mt-2 max-w-xl">
              Tudo que você sobe aqui fica salvo neste navegador e aparece direto no editor: trinkets na gaveta e na auto-colagem,
              fundos nos templates, cabecinhas nos espaços de foto, objetos na passagem de carro. Fontes entram com o papel que você escolher.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant={needsBackup ? 'primary' : 'ghost'} onClick={doBackup}>⬇ Baixar backup (.zip)</Btn>
            <FileButton
              accept=".zip"
              onFiles={async (fs) => {
                try {
                  const n = await importBackup(fs[0]);
                  notify(`Backup restaurado: ${n} item(ns) novos ✓`);
                } catch {
                  notify('Esse arquivo não parece um backup do acervo.', 'err');
                }
              }}
            >⬆ Restaurar backup</FileButton>
          </div>
        </div>

        <AnimatePresence>
          {needsBackup && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-[#c0b4fc]/50 bg-[#c0b4fc]/10 px-4 py-3 flex flex-wrap items-center gap-3"
            >
              <span className="text-xl">💾</span>
              <div className="flex-1 min-w-60 text-sm text-stone-200">
                Você tem coisas novas no acervo desde o último backup.
                <span className="text-stone-400"> Baixe o .zip e guarde no Google Drive. Se um dia o navegador for limpo, é só clicar em “Restaurar backup”.</span>
              </div>
              <Btn variant="primary" onClick={doBackup}>Fazer backup agora</Btn>
            </motion.div>
          )}
        </AnimatePresence>
        {lastBackup && !needsBackup && (
          <div className="font-mono text-[11px] text-stone-500 -mt-6">✓ último backup em {new Date(lastBackup.at).toLocaleDateString('pt-BR')}</div>
        )}

        {/* images */}
        <section className="space-y-4">
          <div className="grid md:grid-cols-[1fr_320px] gap-4">
            <DropZone accept={(f) => f.type.startsWith('image/')} onFiles={onImages} className="min-h-40 p-6">
              <div>
                <div className="text-3xl mb-1">✿</div>
                <div className="text-newsprint font-semibold">{busy ? 'Salvando…' : 'Arraste imagens aqui ou clique para escolher'}</div>
                <div className="text-stone-500 text-xs mt-1">PNG transparente, JPG, WEBP. Pode mandar várias de uma vez.</div>
              </div>
            </DropZone>
            <div className="rounded-lg border border-desk-700 p-4 bg-desk-900 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Salvar como</div>
              {IMAGE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDropCat(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${dropCat === c.id ? 'border-[#c0b4fc] bg-[#c0b4fc]/10' : 'border-desk-700 hover:border-desk-600'}`}
                >
                  <div className="text-sm text-newsprint font-semibold">{c.label}</div>
                  <div className="text-[11px] text-stone-500">{c.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[{ id: 'all', label: 'Tudo' }, ...IMAGE_CATEGORIES].map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`relative px-3 py-1.5 rounded-full text-[13px] font-semibold ${cat === c.id ? 'text-desk-950' : 'text-stone-300 hover:text-white bg-desk-800'}`}
              >
                {cat === c.id && <motion.span layoutId="libcat" className="absolute inset-0 rounded-full bg-[#c0b4fc]" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                <span className="relative">{c.label} <span className="opacity-60 font-mono text-[11px]">{c.id === 'all' ? images.length : counts[c.id]}</span></span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="text-stone-500 text-sm py-10 text-center border border-desk-800 rounded-lg">
              Nada aqui ainda. Os PNGs da sua pasta do Pinterest entram aqui.
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <AnimatePresence>
                {shown.map((im, i) => (
                  <motion.div
                    layout
                    key={im.id}
                    initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30, delay: Math.min(i, 12) * 0.015 }}
                    whileHover={{ rotate: i % 2 ? 1.5 : -1.5, y: -3 }}
                    className="rounded-lg bg-desk-900 border border-desk-700 overflow-hidden group"
                  >
                    <div className="relative aspect-square checker grid place-items-center p-2">
                      <img src={im.url} alt={im.name} className="max-w-full max-h-full object-contain" />
                      <button
                        onClick={() => (armed === im.id ? (removeImage(im.id), setArmed(null)) : setArmed(im.id))}
                        onMouseLeave={() => armed === im.id && setArmed(null)}
                        title="Apagar do acervo"
                        className={`absolute top-1.5 right-1.5 h-6 rounded-full text-xs place-items-center ${armed === im.id ? 'grid px-2 bg-red-500 text-white' : 'hidden group-hover:grid w-6 bg-desk-950/90 text-stone-300 hover:text-red-400'}`}
                      >{armed === im.id ? 'apagar?' : '✕'}</button>
                      {onUseImage && (
                        <button
                          onClick={() => onUseImage(im)}
                          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#c0b4fc] text-desk-950 text-[11px] font-semibold hidden group-hover:block"
                        >usar no editor</button>
                      )}
                    </div>
                    <div className="p-2 space-y-1.5">
                      <input
                        defaultValue={im.name}
                        onBlur={(e) => e.target.value !== im.name && updateImage(im.id, { name: e.target.value })}
                        className="w-full bg-transparent text-[12px] text-newsprint focus:outline-none focus:bg-desk-800 rounded px-1"
                      />
                      <select
                        value={im.category}
                        onChange={(e) => updateImage(im.id, { category: e.target.value })}
                        className="w-full bg-desk-800 border border-desk-700 rounded px-1.5 py-1 text-[11px] text-stone-300"
                      >
                        {IMAGE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* fonts */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="font-mono text-[11px] text-[#c0b4fc] tracking-widest">FONTES</div>
              <p className="text-stone-400 text-sm mt-1 max-w-xl">
                Suba a Bootzy (e outras) e diga o papel de cada uma. O <b className="text-stone-200">Título</b> vai em manchetes e nomes,
                o <b className="text-stone-200">Subtítulo</b> nos textos de apoio e o <b className="text-stone-200">Destaque</b> nas palavras em script.
              </p>
            </div>
          </div>
          <DropZone accept={(f) => /\.(ttf|otf|woff2?)$/i.test(f.name)} onFiles={(fs) => addFonts(fs, fonts.length ? 'none' : 'head').then((o) => o.length && notify(`${o.length} fonte(s) salvas ✓`))} className="min-h-24 p-5">
            <div>
              <div className="text-newsprint font-semibold">Arraste .ttf / .otf / .woff aqui</div>
              <div className="text-stone-500 text-xs mt-1">A primeira fonte vira Título automaticamente.</div>
            </div>
          </DropZone>
          <div className="space-y-2">
            {fonts.map((f) => {
              const fid = libFontId(f.id);
              const fam = fontById(fid).family;
              const activeRoles = ['head', 'body', 'accent'].filter((r) => fontsState[r] === fid);
              return (
                <motion.div
                  layout
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-desk-700 bg-desk-900 p-4 flex flex-wrap items-center gap-4"
                >
                  <div className="flex-1 min-w-60">
                    <div className="text-[11px] text-stone-500 font-mono">{f.fileName}</div>
                    <div className="text-3xl text-newsprint truncate" style={{ fontFamily: fam }}>QUEM SERVIU · campeão · 340 PTS</div>
                    {activeRoles.length > 0 && (
                      <div className="text-[11px] text-[#c0b4fc] mt-1">em uso como: {activeRoles.map((r) => FONT_ROLES.find((x) => x.id === r).label).join(', ')}</div>
                    )}
                  </div>
                  <div className="w-full sm:w-auto sm:min-w-96">
                    <Segmented value={f.role} onChange={(v) => setFontRole(f.id, v)} options={FONT_ROLES.map((r) => [r.id, r.label])} />
                  </div>
                  <Btn variant="danger" onClick={() => (armed === f.id ? (removeFont(f.id), setArmed(null)) : setArmed(f.id))}>{armed === f.id ? 'Confirmar' : 'Apagar'}</Btn>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="font-mono text-[11px] text-stone-600 leading-relaxed">
          O acervo fica guardado neste navegador, neste computador. Para levar para outro computador ou guardar no Drive, use “Baixar backup”.
          Se limpar os dados do navegador, ele some, então faça backup de vez em quando.
        </div>
      </div>
    </div>
  );
}
