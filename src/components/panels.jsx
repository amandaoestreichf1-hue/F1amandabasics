import React from 'react';
import { motion } from 'framer-motion';
import { Section, TextInput, Slider, Toggle, Select, ColorInput, Btn, FileButton, Segmented, Label } from './ui.jsx';
import { TEMPLATES, CATEGORIES, isTransition } from '../templates/index.js';
import { TEAMS } from '../lib/teams.js';
import { allFonts } from '../lib/fonts.js';

// ---------------------------------------------------------------------------
export function TemplatePicker({ value, onChange }) {
  return (
    <Section title="Catálogo de animações" kicker="01">
      {CATEGORIES.map((cat) => (
        <div key={cat.id} className="space-y-1.5">
          <div className="font-mono text-[11px] text-stone-400 mt-2">{cat.label}</div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.filter((t) => t.category === cat.id).map((t) => {
              const active = value === t.id;
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ rotate: active ? 0 : -1.2, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onChange(t.id)}
                  className={`text-left p-2.5 rounded-sm border transition-colors ${
                    active
                      ? 'bg-newsprint text-desk-950 border-newsprint shadow-[4px_4px_0_#ff3b2f]'
                      : 'bg-desk-800 border-desk-700 hover:border-desk-600 text-stone-200'
                  }`}
                >
                  <div className="font-anton uppercase text-[15px] leading-tight">{t.name}</div>
                  <div className={`text-[11px] leading-snug mt-0.5 ${active ? 'text-desk-700' : 'text-stone-500'}`}>{t.desc}</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </Section>
  );
}

// ---------------------------------------------------------------------------
const PAL_LABELS = [
  ['paper', 'Papel'],
  ['paper2', 'Papel 2 / recorte'],
  ['ink', 'Tinta / texto'],
  ['accent', 'Destaque'],
  ['accent2', 'Destaque 2'],
  ['tape', 'Fita adesiva'],
  ['car', 'Carro (principal)'],
  ['car2', 'Carro (detalhe)'],
  ['linen', 'Xadrez (linho)'],
];

export function TeamPanel({ teamId, palette, onTeam, onPalette, soft, onSoft }) {
  return (
    <Section title="Equipe · Grid 2026" kicker="02">
      <div className="grid grid-cols-2 gap-1.5">
        {TEAMS.map((t) => {
          const active = teamId === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTeam(t.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border text-left ${t.id === 'lilas' ? 'col-span-2' : ''} ${active ? 'border-marker bg-desk-800' : 'border-desk-700 bg-desk-850 hover:border-desk-600'}`}
            >
              <span className="flex -space-x-1 shrink-0">
                {[t.palette.accent, t.palette.paper2, t.palette.accent2].map((c, i) => (
                  <span key={i} className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ background: c }} />
                ))}
              </span>
              <span className={`text-[12px] font-semibold truncate ${active ? 'text-newsprint' : 'text-stone-300'}`}>{t.name}</span>
            </motion.button>
          );
        })}
      </div>
      <Slider label="Suavizar cores (tons delicados)" value={soft} min={0} max={1} step={0.05} fmt={(v) => Math.round(v * 100) + '%'} onChange={onSoft} />
      <div className="font-mono text-[11px] text-stone-500 pt-1">Cores livres (sobrescrevem a equipe):</div>
      <div className="grid grid-cols-2 gap-1.5">
        {PAL_LABELS.map(([k, l]) => (
          <ColorInput key={k} label={l} value={palette[k] || '#b5a79b'} onChange={(v) => onPalette({ ...palette, [k]: v })} />
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
export function TypePanel({ fonts, onFonts, onUploadFont, fontVersion }) {
  const opts = allFonts().map((f) => [f.id, f.label]);
  return (
    <Section title="Tipografia" kicker="03">
      <FileButton accept=".ttf,.otf,.woff,.woff2" onFiles={(fs) => onUploadFont(fs[0])} variant="paper" className="w-full">
        ⬆ Upload de fonte customizada (.ttf / .otf / .woff)
      </FileButton>
      <div className="text-[11px] text-stone-500 -mt-1">Ex.: sua <b className="text-stone-300">Bootzy TM</b>. Ela vira a fonte de título automaticamente.</div>
      <Select key={'h' + fontVersion} label="Fonte dos títulos / manchetes" value={fonts.head} options={opts} onChange={(v) => onFonts({ ...fonts, head: v })} />
      <Select key={'b' + fontVersion} label="Fonte dos subtítulos" value={fonts.body} options={opts} onChange={(v) => onFonts({ ...fonts, body: v })} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
function ImageSlot({ field, P, set, assets, onUpload }) {
  const k = field.key;
  const asset = P[k] ? assets[P[k]] : null;
  const frames = field.frames === false ? null : [['polaroid', 'Polaroid'], ['torn', 'Recorte rasgado'], ['cutout', 'PNG solto']];
  return (
    <div className="rounded-md border border-dashed border-desk-600 p-3 space-y-2.5 bg-desk-900/60">
      <Label>{field.label}</Label>
      <div className="flex items-center gap-2">
        <div className="w-14 h-14 rounded checker shrink-0 overflow-hidden border border-desk-700 grid place-items-center">
          {asset ? <img src={asset.url} className="max-w-full max-h-full object-contain" alt="" /> : <span className="text-[10px] text-stone-500">vazio</span>}
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <FileButton accept="image/*" onFiles={(fs) => onUpload(fs[0], 'photo').then((id) => set({ [k]: id }))}>
            {asset ? 'Trocar imagem' : 'Upload foto / PNG'}
          </FileButton>
          {asset && <Btn variant="danger" onClick={() => set({ [k]: null })}>Remover</Btn>}
        </div>
      </div>
      {frames && <Segmented value={P[k + 'Frame']} onChange={(v) => set({ [k + 'Frame']: v })} options={frames} />}
      {asset && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Slider label="Zoom" value={P[k + 'Zoom']} min={0.3} max={3} step={0.01} fmt={(v) => v.toFixed(2) + 'x'} onChange={(v) => set({ [k + 'Zoom']: v })} />
          <Slider label="Rotação" value={P[k + 'Rot']} min={-180} max={180} step={1} fmt={(v) => v + '°'} onChange={(v) => set({ [k + 'Rot']: v })} />
          <Slider label="Enquadrar ↔" value={P[k + 'X']} min={-0.6} max={0.6} step={0.01} onChange={(v) => set({ [k + 'X']: v })} />
          <Slider label="Enquadrar ↕" value={P[k + 'Y']} min={-0.6} max={0.6} step={0.01} onChange={(v) => set({ [k + 'Y']: v })} />
          {frames && (
            <div className="col-span-2">
              <Toggle label="Preto e branco" value={!!P[k + 'BW']} onChange={(v) => set({ [k + 'BW']: v })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FieldsPanel({ tpl, P, set, assets, onUpload }) {
  const visible = tpl.fields.filter((f) => !f.showIf || f.showIf(P));
  const groups = [];
  visible.forEach((f) => {
    const g = f.group || 'Conteúdo';
    let grp = groups.find((x) => x.name === g);
    if (!grp) groups.push((grp = { name: g, fields: [] }));
    grp.fields.push(f);
  });
  const render = (f) => {
    switch (f.type) {
      case 'text':
        return <TextInput key={f.key} label={f.label} value={P[f.key]} suggestions={f.suggestions} onChange={(v) => set({ [f.key]: v })} />;
      case 'textarea':
        return <TextInput key={f.key} multiline label={f.label} value={P[f.key]} onChange={(v) => set({ [f.key]: v })} />;
      case 'range':
        return <Slider key={f.key} label={f.label} value={P[f.key]} min={f.min} max={f.max} step={f.step} onChange={(v) => set({ [f.key]: v })} />;
      case 'toggle':
        return <Toggle key={f.key} label={f.label} value={!!P[f.key]} onChange={(v) => set({ [f.key]: v })} />;
      case 'select':
        return <Select key={f.key} label={f.label} value={P[f.key]} options={f.options} onChange={(v) => set({ [f.key]: v })} />;
      case 'color':
        return <ColorInput key={f.key} label={f.label} value={P[f.key]} onChange={(v) => set({ [f.key]: v })} />;
      case 'image':
        return <ImageSlot key={f.key} field={f} P={P} set={set} assets={assets} onUpload={onUpload} />;
      default:
        return null;
    }
  };
  return (
    <Section title={`Editar · ${tpl.name}`} kicker="04">
      {groups.map((g) => (
        <div key={g.name} className="space-y-2.5">
          {groups.length > 1 && <div className="font-mono text-[11px] text-marker pt-1">— {g.name.toUpperCase()}</div>}
          {g.fields.map(render)}
        </div>
      ))}
    </Section>
  );
}

// ---------------------------------------------------------------------------
export function TrinketPanel({ assets, trinkets, selected, onUpload, onAdd, onSelect, onUpdate, onRemove, onMove, onDeleteAsset }) {
  const gallery = Object.entries(assets).filter(([, a]) => a.kind === 'trinket' || a.kind === 'native');
  const sel = trinkets.find((t) => t.id === selected);
  return (
    <Section title="Gaveta de trinkets" kicker="05" right={<span className="font-mono text-[11px] text-stone-500 mr-2">{trinkets.length} na tela</span>}>
      <FileButton accept="image/png,image/webp,image/gif,image/*" multiple onFiles={(fs) => fs.forEach((f) => onUpload(f, 'trinket'))} variant="paper" className="w-full">
        ⬆ Subir PNGs transparentes (vários)
      </FileButton>
      <div className="text-[11px] text-stone-500">Clique num trinket para colocar na tela. Arraste no preview para posicionar · roda do mouse = tamanho · Shift + roda = girar.</div>
      <div className="grid grid-cols-4 gap-1.5">
        {gallery.map(([id, a]) => (
          <motion.div key={id} className="relative group" whileHover={{ rotate: -3, scale: 1.05 }} whileTap={{ scale: 0.9 }}>
            <button onClick={() => onAdd(id)} title={a.name} className="w-full aspect-square checker rounded-sm border border-desk-700 hover:border-marker grid place-items-center overflow-hidden p-1">
              <img src={a.url} alt={a.name} className="max-w-full max-h-full object-contain" />
            </button>
            {a.kind === 'trinket' && (
              <button onClick={() => onDeleteAsset(id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-desk-950 border border-desk-600 text-[10px] text-stone-300 hidden group-hover:grid place-items-center">✕</button>
            )}
          </motion.div>
        ))}
      </div>
      {trinkets.length > 0 && (
        <div className="space-y-1">
          <Label>Na tela (camadas)</Label>
          {trinkets.map((t, i) => (
            <div key={t.id} onClick={() => onSelect(t.id)} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selected === t.id ? 'bg-marker/20 border border-marker/50' : 'bg-desk-800 border border-transparent hover:border-desk-600'}`}>
              <img src={assets[t.assetId]?.url} className="w-7 h-7 object-contain" alt="" />
              <span className="flex-1 text-[12px] text-stone-300 truncate">{assets[t.assetId]?.name || 'trinket'}</span>
              <button className="text-stone-500 hover:text-white text-xs px-1" onClick={(e) => { e.stopPropagation(); onMove(t.id, 1); }} disabled={i === trinkets.length - 1}>▲</button>
              <button className="text-stone-500 hover:text-white text-xs px-1" onClick={(e) => { e.stopPropagation(); onMove(t.id, -1); }} disabled={i === 0}>▼</button>
              <button className="text-red-400/70 hover:text-red-400 text-xs px-1" onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {sel && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border border-marker/40 p-3 space-y-2 bg-desk-900/70">
          <div className="font-mono text-[11px] text-marker">TRINKET SELECIONADO</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <Slider label="Tamanho" value={sel.scale} min={0.1} max={4} step={0.01} fmt={(v) => v.toFixed(2) + 'x'} onChange={(v) => onUpdate(sel.id, { scale: v })} />
            <Slider label="Rotação" value={sel.rot} min={-180} max={180} step={1} fmt={(v) => v + '°'} onChange={(v) => onUpdate(sel.id, { rot: v })} />
            <Slider label="X" value={Math.round(sel.x)} min={-100} max={1180} step={1} onChange={(v) => onUpdate(sel.id, { x: v })} />
            <Slider label="Y" value={Math.round(sel.y)} min={-100} max={2020} step={1} onChange={(v) => onUpdate(sel.id, { y: v })} />
            <Slider label="Entra em" value={sel.delay} min={0} max={3} step={0.01} fmt={(v) => v.toFixed(2) + 's'} onChange={(v) => onUpdate(sel.id, { delay: v })} />
            <Select label="Animação" value={sel.anim} onChange={(v) => onUpdate(sel.id, { anim: v })} options={[['pop', 'Pop (mola)'], ['slam', 'Carimbo (slam)'], ['none', 'Parado']]} />
          </div>
          <Toggle label="Espelhar" value={sel.flip} onChange={(v) => onUpdate(sel.id, { flip: v })} />
          <Toggle label="Sombra seca" value={sel.shadow} onChange={(v) => onUpdate(sel.id, { shadow: v })} />
          <Toggle label="Sai no final" value={sel.exit} onChange={(v) => onUpdate(sel.id, { exit: v })} />
          <Toggle label="Tremidinha stop-motion" value={sel.wiggle !== false} onChange={(v) => onUpdate(sel.id, { wiggle: v })} />
        </motion.div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
export function MotionPanel({ state, setState, tpl }) {
  return (
    <Section title="Ritmo & acabamento" kicker="06">
      <Label>Animação</Label>
      <Segmented
        value={state.motion}
        onChange={(v) => setState({ motion: v })}
        options={[['stop', 'Stop-motion 15fps'], ['fluid', 'Fluida 60fps']]}
      />
      <Slider
        label="Duração"
        value={state.duration}
        min={isTransition(tpl) ? 0.4 : 1}
        max={isTransition(tpl) ? 2.5 : 6}
        step={0.05}
        fmt={(v) => v.toFixed(2) + 's'}
        onChange={(v) => setState({ duration: v })}
      />
      <div className="flex gap-1.5">
        {(isTransition(tpl) ? [0.6, 0.8, 1.0, 1.2] : [1.8, 2.4, 3, 4]).map((d) => (
          <Btn key={d} className="flex-1 !py-1 font-mono" onClick={() => setState({ duration: d })}>{d}s</Btn>
        ))}
      </div>
      <Slider label="Papel rasgado (intensidade)" value={state.tear ?? 1} min={0} max={1.6} step={0.05} fmt={(v) => Math.round(v * 100) + '%'} onChange={(v) => setState({ tear: v })} />
      <Toggle label="Sombra" value={state.shadow.on} onChange={(v) => setState({ shadow: { ...state.shadow, on: v } })} />
      {state.shadow.on && (
        <>
          <Segmented
            value={state.shadow.blur > 0 ? 'soft' : 'hard'}
            onChange={(v) => setState({ shadow: v === 'soft' ? { ...state.shadow, blur: 14, size: 8, opacity: 0.3, color: '#4b3a78' } : { ...state.shadow, blur: 0, size: 14, opacity: 0.9, color: '#141210' } })}
            options={[['soft', 'Suave (esfumada)'], ['hard', 'Seca (recorte)']]}
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 items-end">
            <Slider label="Deslocamento" value={state.shadow.size} min={0} max={30} step={1} fmt={(v) => v + 'px'} onChange={(v) => setState({ shadow: { ...state.shadow, size: v } })} />
            <Slider label="Desfoque" value={state.shadow.blur || 0} min={0} max={40} step={1} fmt={(v) => v + 'px'} onChange={(v) => setState({ shadow: { ...state.shadow, blur: v } })} />
            <Slider label="Opacidade" value={state.shadow.opacity ?? 0.85} min={0.05} max={1} step={0.05} fmt={(v) => Math.round(v * 100) + '%'} onChange={(v) => setState({ shadow: { ...state.shadow, opacity: v } })} />
            <ColorInput label="Cor da sombra" value={state.shadow.color} onChange={(v) => setState({ shadow: { ...state.shadow, color: v } })} />
          </div>
        </>
      )}
    </Section>
  );
}
