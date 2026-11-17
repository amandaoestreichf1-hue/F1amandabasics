import { carWipe, startLights } from './transitions.js';
import { quemServiu, quemDormiu } from './cards.js';
import { errata, ticker } from './overlays.js';
import { carAnatomy } from './carParts.js';
import { checkerWipe, disclaimer, pointsCompare } from './soft.js';
import { circuitMap } from './circuit.js';
import { tyres } from './tyres.js';
import { weekend, qualifying, pointsTable, flagsBoard, penalties, ladder, startGrid, teamRadio, orgChart } from './f1edu.js';
import { courtAnatomy, surfaces, scoreExplained, drawPath, pyramid, h2h, matchClock } from './tennis.js';
import { glossary, flowchart, counter, driverCard, playerCard, podium, endCard } from './universal.js';

checkerWipe.category = disclaimer.category = pointsCompare.category = 'lilas';
checkerWipe.isTransition = true;
// which mode each template shows up in (F1 or tennis); the rest default to F1
[checkerWipe, disclaimer, pointsCompare, errata].forEach((t) => (t.sports = ['f1', 'tennis']));

export const TEMPLATES = [
  circuitMap, carAnatomy, tyres, weekend, qualifying, pointsTable, flagsBoard, penalties, ladder, startGrid, teamRadio, orgChart,
  courtAnatomy, surfaces, scoreExplained, drawPath, pyramid, h2h, matchClock,
  glossary, flowchart, counter, driverCard, playerCard, podium, endCard,
  checkerWipe, disclaimer, pointsCompare, carWipe, startLights, quemServiu, quemDormiu, errata, ticker,
];
export const sportsOf = (t) => t.sports || ['f1'];
export const templatesFor = (sport) => TEMPLATES.filter((t) => sportsOf(t).includes(sport));

export const CATEGORIES = [
  { id: 'didatico', label: '✎ Didático · Fórmula 1', hint: 'Para explicar a F1 para quem está chegando.' },
  { id: 'tenis', label: '🎾 Tênis', hint: 'Quadra, superfícies, placar, chave e mais.' },
  { id: 'universal', label: '✦ Para qualquer vídeo', hint: 'Glossário, fluxograma, contador, cards, pódio e end card.' },
  { id: 'lilas', label: '✿ Do seu jeito', hint: 'Baseados nas suas edições.' },
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
