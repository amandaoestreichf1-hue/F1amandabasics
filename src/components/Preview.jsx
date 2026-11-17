import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { renderFrame, hitTrinket, W, H } from '../lib/renderer.js';
import { templateById, isTransition, getCues, SFX } from '../templates/index.js';
import { Btn, FileButton } from './ui.jsx';

export default function Preview({ state, assets, assetsVersion, fontVersion, onTrinketChange, onSelectTrinket, timeRef }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [hd, setHd] = useState(false);
  const [bg, setBg] = useState(null); // {type: 'image'|'video', url}
  const [bgDim, setBgDim] = useState(0.0);
  const [bgOffset, setBgOffset] = useState(0);
  const [muted, setMuted] = useState(false);
  const [safe, setSafe] = useState(false);
  const videoRef = useRef(null);
  const bgRef = useRef({ offset: 0 });
  bgRef.current = { offset: bgOffset };
  const [time, setTime] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const playRef = useRef({ playing, loop });
  playRef.current = { playing, loop };
  const drag = useRef(null);
  const scale = hd ? 1 : 0.5;

  // render loop
  useEffect(() => {
    let raf;
    let last = performance.now();
    const loopFn = (now) => {
      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(loopFn); return; }
      const ctx = canvas.getContext('2d');
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      const pr = playRef.current;
      let t = timeRef.current;
      if (pr.playing && !drag.current) {
        t += dt;
        const pause = 0.45; // small breather between loops
        if (t > s.duration + pause) t = pr.loop ? 0 : s.duration;
        if (!pr.loop && t >= s.duration) setPlaying(false);
      }
      timeRef.current = t;
      // keep a test video in sync with the animation clock (so you hear your own voice against it)
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        const want = bgRef.current.offset + Math.min(t, s.duration);
        if (pr.playing && t <= s.duration) {
          if (v.paused) v.play().catch(() => {});
          if (Math.abs(v.currentTime - want) > 0.18) v.currentTime = want;
        } else {
          if (!v.paused) v.pause();
          if (Math.abs(v.currentTime - want) > 0.04) v.currentTime = want;
        }
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      renderFrame(ctx, s, assets, Math.min(t, s.duration), { editor: true });
      setTime((prev) => (Math.abs(prev - t) > 0.03 ? t : prev));
      raf = requestAnimationFrame(loopFn);
    };
    raf = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(raf);
  }, [assets, assetsVersion, fontVersion, scale, timeRef]);

  const toCanvas = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const onDown = (e) => {
    const p = toCanvas(e);
    const id = hitTrinket(state.trinkets, assets, p.x, p.y);
    onSelectTrinket(id);
    if (id) {
      const tr = state.trinkets.find((t) => t.id === id);
      drag.current = { id, ox: p.x - tr.x, oy: p.y - tr.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = toCanvas(e);
    onTrinketChange(drag.current.id, { x: p.x - drag.current.ox, y: p.y - drag.current.oy });
  };
  const onUp = () => (drag.current = null);
  const onWheel = (e) => {
    const sel = state.trinkets.find((t) => t.id === state.selectedTrinket);
    if (!sel) return;
    e.preventDefault();
    if (e.shiftKey) onTrinketChange(sel.id, { rot: Math.round(sel.rot + Math.sign(e.deltaY) * 4) });
    else onTrinketChange(sel.id, { scale: Math.max(0.1, Math.min(4, sel.scale * (e.deltaY > 0 ? 0.94 : 1.06))) });
  };
  // wheel must be non-passive
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const h = (e) => onWheel(e);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  });

  const tpl = templateById(state.templateId);
  const dur = state.duration;
  const cut = isTransition(tpl);

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      {/* toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-desk-700/70 flex-wrap">
        <Btn variant={playing ? 'ghost' : 'primary'} onClick={() => { if (!playing && timeRef.current >= dur) timeRef.current = 0; setPlaying((p) => !p); }} className="w-24">
          {playing ? '❚❚ Pausar' : '▶ Play'}
        </Btn>
        <Btn onClick={() => { timeRef.current = 0; setTime(0); }} title="Voltar ao início">⏮</Btn>
        <Btn onClick={() => { setPlaying(false); timeRef.current = Math.max(0, timeRef.current - 1 / 30); }} title="Quadro anterior">◀︎</Btn>
        <Btn onClick={() => { setPlaying(false); timeRef.current = Math.min(dur, timeRef.current + 1 / 30); }} title="Próximo quadro">▶︎</Btn>
        <Btn variant={loop ? 'paper' : 'ghost'} onClick={() => setLoop((l) => !l)}>↻ Loop</Btn>
        <Btn variant={hd ? 'paper' : 'ghost'} onClick={() => setHd((h) => !h)} title="Preview em resolução total">{hd ? 'Preview HD' : 'Preview leve'}</Btn>
        <div className="flex-1" />
        <Btn variant={safe ? 'paper' : 'ghost'} onClick={() => setSafe((v) => !v)} title="Mostra o que a interface do Reels/TikTok cobre">📱 Zona segura</Btn>
        <FileButton accept="image/*,video/*" onFiles={(fs) => setBg({ type: fs[0].type.startsWith('video/') ? 'video' : 'image', url: URL.createObjectURL(fs[0]) })}>🎬 Testar com meu vídeo</FileButton>
        {bg?.type === 'video' && <Btn onClick={() => setMuted((m) => !m)} title="Som do vídeo">{muted ? '🔇' : '🔊'}</Btn>}
        {bg && <Btn variant="danger" onClick={() => setBg(null)}>✕</Btn>}
      </div>

      {/* stage */}
      <div ref={wrapRef} className="flex-1 min-h-0 flex items-center justify-center p-6 relative">
        <div className="absolute top-4 left-6 font-mono text-[11px] text-stone-500 leading-relaxed pointer-events-none">
          PREVIEW 9:16 · 1080×1920 · ALFA<br />
          {state.motion === 'stop' ? 'STOP-MOTION 15FPS' : 'FLUIDA'}
        </div>
        <motion.div
          key={state.templateId}
          initial={{ rotate: -2, scale: 0.97, opacity: 0.4 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="relative h-full max-h-full aspect-[9/16] shadow-[10px_10px_0_#000] ring-1 ring-desk-700"
        >
          <div className="absolute inset-0 checker" />
          {bg?.type === 'image' && <img src={bg.url} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 1 - bgDim }} alt="" />}
          {bg?.type === 'video' && (
            <video ref={videoRef} src={bg.url} muted={muted} playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 1 - bgDim }} />
          )}
          <canvas
            ref={canvasRef}
            width={W * scale}
            height={H * scale}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="absolute inset-0 w-full h-full touch-none"
            style={{ cursor: state.trinkets.length ? 'grab' : 'default' }}
          />
          {safe && <SafeZone />}
        </motion.div>
      </div>

      {/* timeline */}
      <div className="px-5 py-3 border-t border-desk-700/70">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-newsprint w-28">{Math.min(time, dur).toFixed(2)}s / {dur.toFixed(2)}s</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={dur}
              step={0.001}
              value={Math.min(time, dur)}
              onChange={(e) => { setPlaying(false); timeRef.current = parseFloat(e.target.value); setTime(timeRef.current); }}
              className="w-full"
            />
            {cut && (
              <div className="absolute top-[-14px] pointer-events-none font-mono text-[10px] text-marker" style={{ left: `calc(${(tpl.cutPoint ?? 0.5) * 100}% - 22px)` }}>
                ✂ corte
              </div>
            )}
            <div className="relative h-6 mt-0.5">
              {getCues(state).map((c, i) => (
                <div
                  key={i}
                  title={`${c.t.toFixed(2)}s · ${SFX[c.s].name} · ${c.label}`}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer"
                  style={{ left: `${(c.t / dur) * 100}%` }}
                  onClick={() => { setPlaying(false); timeRef.current = c.t; setTime(c.t); }}
                >
                  <span className="w-px h-1.5 bg-stone-500" />
                  <span className="text-[12px] leading-none">{SFX[c.s].icon}</span>
                  {c.d > 0 && <span className="absolute top-2 left-1/2 h-0.5 bg-[#c0b4fc]/60 rounded" style={{ width: `${(c.d / dur) * 100 * 8}px`, maxWidth: 120 }} />}
                </div>
              ))}
            </div>
          </div>
          {bg && (
            <label className="flex items-center gap-2 text-[11px] text-stone-400">
              apagar fundo
              <input type="range" min={0} max={0.9} step={0.05} value={bgDim} onChange={(e) => setBgDim(parseFloat(e.target.value))} className="w-20" />
            </label>
          )}
          {bg?.type === 'video' && (
            <label className="flex items-center gap-2 text-[11px] text-stone-400">
              vídeo a partir de {bgOffset.toFixed(1)}s
              <input type="range" min={0} max={videoRef.current?.duration || 60} step={0.1} value={bgOffset} onChange={(e) => setBgOffset(parseFloat(e.target.value))} className="w-28" />
            </label>
          )}
        </div>
        <div className="text-[11px] text-stone-500 mt-1">Marcas de som: 💨 whoosh · 🫧 pop · ⌨️ typing. Clique numa marca para ir até ela.</div>
        {cut && <div className="text-[11px] text-stone-500 mt-1">Dica: no CapCut, posicione o corte entre as cenas no meio da transição (marcado com ✂), quando a tela está 100% coberta.</div>}
      </div>
    </div>
  );
}

// What the Reels / TikTok interface covers (approximate, for a 1080×1920 frame)
function SafeZone() {
  return (
    <svg viewBox="0 0 1080 1920" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect x="0" y="0" width="1080" height="170" fill="rgba(0,0,0,0.45)" />
      <text x="540" y="105" textAnchor="middle" fill="#fff" fontSize="40" fontFamily="Inter, sans-serif" opacity="0.8">Seguindo · Para você</text>
      <rect x="0" y="1540" width="1080" height="380" fill="rgba(0,0,0,0.5)" />
      <text x="50" y="1620" fill="#fff" fontSize="44" fontWeight="700" fontFamily="Inter, sans-serif">@seuperfil</text>
      <rect x="50" y="1660" width="720" height="26" rx="13" fill="rgba(255,255,255,0.55)" />
      <rect x="50" y="1706" width="560" height="26" rx="13" fill="rgba(255,255,255,0.4)" />
      <text x="50" y="1800" fill="#fff" fontSize="34" fontFamily="Inter, sans-serif" opacity="0.85">♫ som original</text>
      <rect x="940" y="980" width="140" height="560" fill="rgba(0,0,0,0.45)" />
      {[1040, 1170, 1300, 1430].map((y) => <circle key={y} cx="1010" cy={y} r="44" fill="rgba(255,255,255,0.75)" />)}
      <rect x="60" y="200" width="860" height="1320" fill="none" stroke="#c0b4fc" strokeWidth="6" strokeDasharray="28 18" />
      <text x="80" y="250" fill="#c0b4fc" fontSize="34" fontFamily="Inter, sans-serif" fontWeight="700">área segura</text>
    </svg>
  );
}
