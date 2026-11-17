import { carWipe, startLights } from './transitions.js';
import { quemServiu, quemDormiu } from './cards.js';
import { errata, ticker } from './overlays.js';
import { carAnatomy } from './carParts.js';
import { checkerWipe, disclaimer, pointsCompare } from './soft.js';
import { circuitMap } from './circuit.js';
import { tyres } from './tyres.js';

checkerWipe.category = disclaimer.category = pointsCompare.category = 'lilas';
checkerWipe.isTransition = true;

export const TEMPLATES = [circuitMap, carAnatomy, tyres, checkerWipe, disclaimer, pointsCompare, carWipe, startLights, quemServiu, quemDormiu, errata, ticker];

export const CATEGORIES = [
  { id: 'didatico', label: '✎ Didático · pista & pneus', hint: 'Para explicar circuitos, setores, curvas e compostos.' },
  { id: 'lilas', label: '✿ Do seu jeito · Lilás', hint: 'Baseados nas suas edições.' },
  { id: 'transition', label: 'A · Transições de tela cheia', hint: 'Tela 100% coberta no meio da duração = ponto de corte.' },
  { id: 'card', label: 'B · Quem Serviu / Quem Dormiu', hint: 'Cards de resumo pós-corrida.' },
  { id: 'overlay', label: 'C · Overlays de edição', hint: 'Para jogar por cima do vídeo.' },
];

export const isTransition = (t) => t.category === 'transition' || !!t.isTransition;

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

export function defaultParams(tpl) {
  const P = {};
  tpl.fields.forEach((f) => {
    if (f.type === 'image') {
      P[f.key] = null;
      P[f.key + 'Zoom'] = 1;
      P[f.key + 'X'] = 0;
      P[f.key + 'Y'] = 0;
      P[f.key + 'Rot'] = 0;
      P[f.key + 'Frame'] = f.defaultFrame || 'polaroid';
      P[f.key + 'BW'] = !!f.defaultBW;
    } else P[f.key] = f.default;
  });
  return P;
}

export function allDefaultParams() {
  const out = {};
  TEMPLATES.forEach((t) => (out[t.id] = defaultParams(t)));
  return out;
}

// Sound cues (pop / typing / whoosh) for syncing SFX in CapCut
export function getCues(state) {
  const tpl = templateById(state.templateId);
  const P = state.params[tpl.id];
  const dur = state.duration;
  const list = (tpl.cues ? tpl.cues(P, dur) : []).filter((c) => c.t <= dur);
  if (!isTransition(tpl) && !state.holdEnd) list.push({ t: Math.max(0, dur - 0.24), s: 'whoosh', label: 'saída' });
  return list.sort((a, b) => a.t - b.t);
}

export const SFX = {
  whoosh: { icon: '💨', name: 'WHOOSH' },
  pop: { icon: '🫧', name: 'POP' },
  typing: { icon: '⌨️', name: 'TYPING' },
};

export function cuesText(state, fps = 30) {
  const tpl = templateById(state.templateId);
  const fmt = (t) => t.toFixed(2).replace('.', ',') + 's';
  const lines = getCues(state).map((c) => {
    const frame = Math.round(c.t * fps);
    const d = c.d ? ` até ${fmt(c.t + c.d)}` : '';
    return `${fmt(c.t)}${d}  (quadro ${frame})  ${SFX[c.s].name}  ·  ${c.label}`;
  });
  return `Marcas de som · ${tpl.name} · ${state.duration.toFixed(2).replace('.', ',')}s\n\n${lines.join('\n')}\n`;
}
