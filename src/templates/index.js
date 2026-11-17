import { newsWipe, carWipe, startLights } from './transitions.js';
import { quemServiu, quemDormiu } from './cards.js';
import { errata, lowerThird, ticker } from './overlays.js';
import { lilacTitle, checkerWipe, disclaimer, pointsCompare } from './soft.js';

lilacTitle.category = checkerWipe.category = disclaimer.category = pointsCompare.category = 'lilas';
checkerWipe.isTransition = true;

export const TEMPLATES = [lilacTitle, checkerWipe, disclaimer, pointsCompare, newsWipe, carWipe, startLights, quemServiu, quemDormiu, errata, lowerThird, ticker];

export const CATEGORIES = [
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
