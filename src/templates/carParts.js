// "Anatomia do Carro": a single-seater drawn part by part (top or side view), so any part can be
// highlighted with a glow, a callout and a note — plus optional zoom and animated airflow.
// Generic modern single-seater proportions; not any team's real car.
import { setFont, handArrow, wrapLines } from '../lib/paper.js';
import { mix } from '../lib/teams.js';
import { stamp } from '../lib/paper.js';
import { sceneBg, revealText } from './soft.js';
import { ease, range, clamp } from './common.js';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const poly = (ctx, pts) => {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
};
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
const rrect = (ctx, cx, cy, w, h, r) => {
  const x = cx - w / 2, y = cy - h / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
const ell = (ctx, cx, cy, rx, ry) => {
  ctx.moveTo(cx + rx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
};

// Each part: shape(ctx) adds sub-paths; lines(ctx) optional detail strokes; anchor for callouts.
// kind: 'body' | 'tyre' | 'dark' | 'line' decides the base colouring.
// Units ≈ millimetres / 2.5. Proportions follow the 2026 rules: 3.4 m wheelbase, 1.9 m width,
// narrower tyres, narrower curved front wing, rounded rear wing on a swan-neck pylon, no beam wing,
// sculpted sidepods with undercut, smaller diffuser.
const TOP = {
  box: [-400, -1040, 400, 970],
  parts: [
    { id: 'floor', kind: 'body', anchor: [-326, 120], shape: (c) => poly(c, [[-150, -440], [150, -440], [290, -410], [332, -340], [332, 360], [300, 450], [228, 520], [228, 700], [-228, 700], [-228, 520], [-300, 450], [-332, 360], [-332, -340], [-290, -410]]),
      lines: (c) => { [-1, 1].forEach((s2) => { c.moveTo(s2 * 318, -320); c.lineTo(s2 * 318, 350); c.moveTo(s2 * 300, -300); c.quadraticCurveTo(s2 * 290, -360, s2 * 250, -400); }); } },
    { id: 'diffuser', kind: 'body', anchor: [-150, 770], shape: (c) => poly(c, [[-205, 640], [205, 640], [222, 800], [-222, 800]]),
      lines: (c) => { [-110, -36, 36, 110].forEach((x) => { c.moveTo(x, 650); c.lineTo(x * 1.08, 792); }); } },
    { id: 'rearTyres', kind: 'tyre', anchor: [-305, 680], shape: (c) => { rrect(c, -305, 680, 150, 288, 42); rrect(c, 305, 680, 150, 288, 42); },
      lines: (c) => { [-305, 305].forEach((x) => { for (let k = -100; k <= 100; k += 50) { c.moveTo(x - 60, 680 + k); c.lineTo(x + 60, 680 + k); } }); } },
    { id: 'frontTyres', kind: 'tyre', anchor: [-324, -680], shape: (c) => { rrect(c, -324, -680, 112, 288, 36); rrect(c, 324, -680, 112, 288, 36); },
      lines: (c) => { [-324, 324].forEach((x) => { for (let k = -100; k <= 100; k += 50) { c.moveTo(x - 42, -680 + k); c.lineTo(x + 42, -680 + k); } }); } },
    { id: 'brakes', kind: 'dark', anchor: [-262, -680], shape: (c) => { [-1, 1].forEach((s2) => { rrect(c, s2 * 262, -680, 16, 96, 5); rrect(c, s2 * 222, 680, 18, 104, 5); }); } },
    { id: 'frontSusp', kind: 'line', anchor: [-170, -682], shape: () => {},
      lines: (c) => { [-1, 1].forEach((s2) => { c.moveTo(s2 * 62, -742); c.lineTo(s2 * 268, -700); c.moveTo(s2 * 72, -636); c.lineTo(s2 * 268, -662); c.moveTo(s2 * 84, -600); c.lineTo(s2 * 266, -690); }); } },
    { id: 'rearSusp', kind: 'line', anchor: [-160, 680], shape: () => {},
      lines: (c) => { [-1, 1].forEach((s2) => { c.moveTo(s2 * 96, 615); c.lineTo(s2 * 230, 660); c.moveTo(s2 * 80, 745); c.lineTo(s2 * 230, 702); c.moveTo(s2 * 104, 690); c.lineTo(s2 * 230, 680); }); } },
    { id: 'sidepods', kind: 'body', anchor: [-284, -160], shape: (c) => {
      const L = [[-112, -340], [-250, -332], [-282, -262], [-286, -60], [-262, 120], [-200, 300], [-130, 430], [-105, 470]];
      poly(c, L); poly(c, mirror(L));
    }, lines: (c) => { [-1, 1].forEach((s2) => { c.moveTo(s2 * 248, -322); c.lineTo(s2 * 124, -332); c.moveTo(s2 * 268, -120); c.quadraticCurveTo(s2 * 240, 150, s2 * 150, 380); }); } },
    { id: 'engine', kind: 'body', anchor: [-80, 420], shape: (c) => poly(c, [[-112, -60], [112, -60], [98, 250], [60, 600], [28, 862], [-28, 862], [-60, 600], [-98, 250]]),
      lines: (c) => { c.moveTo(0, -30); c.lineTo(0, 840); } },
    { id: 'chassis', kind: 'body', anchor: [-115, -460], shape: (c) => poly(c, [[-62, -620], [62, -620], [112, -380], [118, -60], [-118, -60], [-112, -380]]) },
    { id: 'nose', kind: 'body', anchor: [-30, -820], shape: (c) => { c.moveTo(-16, -1000); c.quadraticCurveTo(0, -1018, 16, -1000); c.lineTo(62, -620); c.lineTo(-62, -620); c.closePath(); } },
    { id: 'cockpit', kind: 'dark', anchor: [-62, -200], shape: (c) => ell(c, 0, -200, 60, 112),
      lines: (c) => { c.moveTo(-76, -100); c.quadraticCurveTo(-86, -330, 0, -346); c.quadraticCurveTo(86, -330, 76, -100); c.moveTo(0, -346); c.lineTo(0, -292); } },
    { id: 'mirrors', kind: 'body', anchor: [-160, -410], shape: (c) => { ell(c, -160, -410, 38, 15); ell(c, 160, -410, 38, 15); },
      lines: (c) => { c.moveTo(-122, -410); c.lineTo(-100, -400); c.moveTo(122, -410); c.lineTo(100, -400); } },
    { id: 'frontWing', kind: 'body', anchor: [-300, -965], shape: (c) => poly(c, [[-345, -985], [-200, -1008], [0, -1016], [200, -1008], [345, -985], [352, -932], [328, -906], [170, -930], [0, -946], [-170, -930], [-328, -906], [-352, -932]]),
      lines: (c) => { [0, 1, 2].forEach((k) => { c.moveTo(-336, -968 + k * 20); c.quadraticCurveTo(0, -1012 + k * 24, 336, -968 + k * 20); }); } },
    { id: 'rearWing', kind: 'body', anchor: [-225, 915], shape: (c) => poly(c, [[-236, 880], [-120, 870], [0, 868], [120, 870], [236, 880], [246, 915], [226, 948], [0, 952], [-226, 948], [-246, 915]]),
      lines: (c) => { c.moveTo(-230, 910); c.quadraticCurveTo(0, 896, 230, 910); c.moveTo(0, 850); c.lineTo(0, 868); } },
  ],
  flow: [
    { pts: [[-372, -1160], [-388, -700], [-372, 0], [-348, 700], [-330, 1160]] },
    { pts: [[-200, -1160], [-206, -900], [-300, -420], [-300, 100], [-150, 520], [-150, 1160]] },
    { pts: [[0, -1160], [0, -1030], [0, 1160]] },
    { pts: [[200, -1160], [206, -900], [300, -420], [300, 100], [150, 520], [150, 1160]] },
    { pts: [[372, -1160], [388, -700], [372, 0], [348, 700], [330, 1160]] },
  ],
};

const SIDE = {
  box: [-960, -250, 1090, 160],
  parts: [
    { id: 'rearWing', kind: 'body', anchor: [-860, -215], shape: (c) => {
      poly(c, [[-940, -172], [-772, -180], [-770, -152], [-938, -142]]);
      poly(c, [[-930, -208], [-792, -214], [-790, -190], [-928, -182]]);
      c.moveTo(-952, -220); c.quadraticCurveTo(-964, -120, -930, -62); c.lineTo(-904, -62); c.quadraticCurveTo(-928, -130, -918, -220); c.closePath();
    }, lines: (c) => { c.moveTo(-860, -208); c.quadraticCurveTo(-830, -110, -780, -36); } },
    { id: 'rearTyres', kind: 'tyre', anchor: [-680, -138], shape: (c) => ell(c, -680, 6, 144, 144), lines: (c) => ell(c, -680, 6, 92, 92) },
    { id: 'floor', kind: 'dark', anchor: [-60, 140], shape: (c) => poly(c, [[-600, 128], [560, 128], [592, 139], [560, 150], [-600, 150]]) },
    { id: 'diffuser', kind: 'body', anchor: [-760, 92], shape: (c) => poly(c, [[-600, 128], [-822, 72], [-842, 92], [-600, 150]]),
      lines: (c) => { c.moveTo(-640, 136); c.lineTo(-800, 92); } },
    { id: 'engine', kind: 'body', anchor: [-420, -86], shape: (c) => { c.moveTo(-790, -28); c.lineTo(-220, -112); c.lineTo(10, -218); c.lineTo(84, -218); c.lineTo(96, -80); c.lineTo(-790, 12); c.closePath(); },
      lines: (c) => { c.moveTo(-40, -176); c.lineTo(-660, -44); c.moveTo(30, -205); c.lineTo(70, -205); } },
    { id: 'sidepods', kind: 'body', anchor: [-40, 10], shape: (c) => { c.moveTo(342, -42); c.quadraticCurveTo(364, 12, 340, 70); c.quadraticCurveTo(220, 76, 120, 108); c.lineTo(-420, 128); c.lineTo(-480, 58); c.quadraticCurveTo(-200, -22, 300, -50); c.closePath(); },
      lines: (c) => { c.moveTo(334, -32); c.lineTo(334, 62); c.moveTo(300, -40); c.quadraticCurveTo(-100, -10, -450, 62); } },
    { id: 'chassis', kind: 'body', anchor: [400, 60], shape: (c) => poly(c, [[90, -62], [452, -42], [470, 128], [90, 128]]) },
    { id: 'nose', kind: 'body', anchor: [780, 30], shape: (c) => { c.moveTo(452, -42); c.quadraticCurveTo(760, -12, 1010, 94); c.quadraticCurveTo(1036, 108, 1020, 122); c.lineTo(470, 128); c.closePath(); } },
    { id: 'cockpit', kind: 'dark', anchor: [175, -130], shape: (c) => ell(c, 176, -90, 36, 36),
      lines: (c) => { c.moveTo(96, -64); c.quadraticCurveTo(190, -152, 382, -50); c.moveTo(160, -96); c.lineTo(206, -96); } },
    { id: 'mirrors', kind: 'body', anchor: [345, -100], shape: (c) => poly(c, [[318, -94], [374, -102], [374, -80], [318, -74]]),
      lines: (c) => { c.moveTo(330, -74); c.lineTo(320, -48); } },
    { id: 'frontWing', kind: 'body', anchor: [970, 140], shape: (c) => {
      poly(c, [[880, 128], [1072, 128], [1072, 145], [880, 145]]);
      poly(c, [[860, 96], [990, 108], [988, 124], [858, 112]]);
      poly(c, [[848, 70], [930, 80], [928, 96], [846, 86]]);
      c.moveTo(1048, 58); c.quadraticCurveTo(1088, 92, 1080, 148); c.lineTo(1050, 148); c.closePath();
    } },
    { id: 'frontTyres', kind: 'tyre', anchor: [680, -138], shape: (c) => ell(c, 680, 6, 144, 144), lines: (c) => ell(c, 680, 6, 92, 92) },
    { id: 'brakes', kind: 'dark', anchor: [680, 6], shape: (c) => { ell(c, 680, 6, 52, 52); ell(c, -680, 6, 58, 58); } },
    { id: 'frontSusp', kind: 'line', anchor: [560, 0], shape: () => {},
      lines: (c) => { c.moveTo(680, 6); c.lineTo(462, -26); c.moveTo(680, 6); c.lineTo(466, 70); c.moveTo(650, 30); c.lineTo(472, -36); } },
    { id: 'rearSusp', kind: 'line', anchor: [-560, 0], shape: () => {},
      lines: (c) => { c.moveTo(-680, 6); c.lineTo(-470, -40); c.moveTo(-680, 6); c.lineTo(-470, 60); } },
  ],
  flow: [
    { pts: [[1160, 40], [900, 40], [650, -150], [300, -112], [140, -186], [-300, -168], [-860, -250], [-1120, -268]] },
    { pts: [[1160, 100], [1000, 100], [500, -60], [-500, -46], [-900, -124], [-1120, -140]] },
    { pts: [[1160, 146], [700, 146], [300, 142], [-500, 142], [-600, 140], [-822, 80], [-1120, 40]], under: true },
  ],
};

export const CAR_PARTS = [
  ['frontWing', 'Asa dianteira'],
  ['nose', 'Bico'],
  ['frontTyres', 'Pneus dianteiros'],
  ['rearTyres', 'Pneus traseiros'],
  ['floor', 'Assoalho'],
  ['diffuser', 'Difusor'],
  ['sidepods', 'Sidepods'],
  ['rearWing', 'Asa traseira'],
  ['engine', 'Cobertura do motor'],
  ['chassis', 'Chassi / monocoque'],
  ['cockpit', 'Cockpit + halo'],
  ['frontSusp', 'Suspensão dianteira'],
  ['rearSusp', 'Suspensão traseira'],
  ['brakes', 'Freios'],
  ['mirrors', 'Retrovisores'],
];
const partLabel = (id) => (CAR_PARTS.find((p) => p[0] === id) || [id, id])[1].toUpperCase();

// ---------------------------------------------------------------------------
const fontOpts = [['head', 'Título (Acervo/Tipografia)'], ['body', 'Subtítulo (Acervo/Tipografia)'], ['Hand', 'Letra de mão'], ['Marker', 'Marcador']];
const pickFont = (rc, v) => (v === 'head' ? rc.fonts.head : v === 'body' ? rc.fonts.body : v);
const partOpts = [['none', '—'], ...CAR_PARTS];

const hlFields = [1, 2, 3].flatMap((n) => [
  { key: `h${n}`, label: `Destaque ${n}`, type: 'select', options: partOpts, default: n === 1 ? 'floor' : n === 2 ? 'rearTyres' : 'none', group: 'Destaques' },
  { key: `n${n}`, label: `Nota do destaque ${n}`, type: 'text', default: n === 1 ? 'pacote de atualização' : n === 2 ? 'mais exigidos em Madri' : '', group: 'Destaques', showIf: (P) => P[`h${n}`] !== 'none' },
  { key: `l${n}`, label: `Nome (vazio = nome da peça)`, type: 'text', default: '', group: 'Destaques', showIf: (P) => P[`h${n}`] !== 'none' },
  { key: `t${n}`, label: `Etiqueta (ex.: UPGRADE, NOVO)`, type: 'text', default: n === 1 ? 'UPGRADE' : '', group: 'Destaques', showIf: (P) => P[`h${n}`] !== 'none' },
]);

export const carAnatomy = {
  id: 'carAnatomy',
  name: 'Anatomia do Carro',
  desc: 'Carro desenhado peça por peça: destaque asa, assoalho, pneus… com nota, etiqueta, zoom e fluxo de ar.',
  category: 'didatico',
  defaultDuration: 5,
  fields: [
    { key: 'view', label: 'Vista', type: 'select', options: [['top', 'De cima'], ['side', 'Lateral']], default: 'top' },
    { key: 'title', label: 'Título (opcional)', type: 'text', default: '' },
    { key: 'subtitle', label: 'Subtítulo (opcional)', type: 'text', default: '' },
    ...hlFields,
    { key: 'labels', label: 'Textos ficam do lado', type: 'select', options: [['left', 'Esquerdo (carro à direita)'], ['right', 'Direito (carro à esquerda)']], default: 'left', group: 'Destaques', showIf: (P) => P.view !== 'side' },
    { key: 'step', label: 'Tempo de cada destaque (s)', type: 'range', min: 0.6, max: 3, step: 0.1, default: 1.2, group: 'Destaques' },
    { key: 'stack', label: 'Manter os destaques anteriores acesos', type: 'toggle', default: true, group: 'Destaques' },
    { key: 'zoom', label: 'Zoom em cada destaque', type: 'toggle', default: false, group: 'Destaques' },
    { key: 'flow', label: 'Fluxo de ar animado', type: 'select', options: [['none', 'Não'], ['all', 'Por todo o carro'], ['under', 'Só por baixo do assoalho (lateral)']], default: 'none', group: 'Animação' },
    { key: 'build', label: 'Entrada do carro', type: 'select', options: [['assemble', 'Monta peça por peça'], ['pop', 'Aparece inteiro'], ['none', 'Já começa pronto']], default: 'assemble', group: 'Animação' },
    { key: 'paint', label: 'Pintura', type: 'select', options: [['sketch', 'Esboço (papel + contorno)'], ['team', 'Cores da equipe']], default: 'sketch', group: 'Estilo' },
    { key: 'focusColor', label: 'Cor do destaque', type: 'color', default: '#a78bfa', group: 'Estilo' },
    { key: 'inkColor', label: 'Cor do texto', type: 'color', default: '#2f2a36', group: 'Estilo' },
    { key: 'titleFont', label: 'Fonte do título', type: 'select', options: fontOpts, default: 'head', group: 'Estilo' },
    { key: 'bg', label: 'Fundo', type: 'select', options: [['graph', 'Papel quadriculado amassado'], ['gingham', 'Xadrez lilás'], ['image', 'Imagem do meu acervo'], ['none', 'Sem fundo (por cima do vídeo)']], default: 'graph', group: 'Fundo' },
    { key: 'bgImage', label: 'Imagem de fundo', type: 'image', libCategory: 'background', frames: false, group: 'Fundo', showIf: (P) => P.bg === 'image' },
    { key: 'bgEnter', label: 'Animação do fundo', type: 'select', options: [['zoom', 'Zoom suave + fade'], ['slide', 'Desliza de baixo'], ['cut', 'Corte seco']], default: 'zoom', group: 'Fundo', showIf: (P) => P.bg !== 'none' },
    { key: 'scale', label: 'Tamanho do carro', type: 'range', min: 0.5, max: 1.3, step: 0.01, default: 1, group: 'Layout' },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.3, max: 0.7, step: 0.01, default: 0.53, group: 'Layout' },
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const built = t0 + (P.build === 'assemble' ? 0.9 : P.build === 'pop' ? 0.3 : 0);
    const out = [...(P.bg !== 'none' ? [{ t: 0, s: 'whoosh', label: 'fundo' }] : [])];
    if (P.build !== 'none') out.push({ t: t0, s: 'whoosh', label: P.build === 'assemble' ? 'carro se monta' : 'carro aparece' });
    hl(P).forEach((h, i) => {
      const st = built + 0.15 + i * P.step;
      if (P.zoom) out.push({ t: st, s: 'whoosh', label: `zoom ${i + 1}` });
      out.push({ t: st, s: 'pop', label: `destaque ${i + 1}: ${h.name.toLowerCase()}` });
      out.push({ t: st + 0.2, s: 'typing', d: 0.4, label: `nota ${i + 1}` });
    });
    return out;
  },
  render(rc) {
    const { ctx, W, H, P, t, dur, pal } = rc;
    sceneBg(rc, P.bg, { enter: P.bgEnter });
    const out = range(t, dur - 0.22, dur);
    if (out >= 1) return;
    const G = P.view === 'side' ? SIDE : TOP;
    const [bx0, by0, bx1, by1] = G.box;
    const cy = H * P.posY;
    const top = P.view !== 'side';
    const boxW = W * (top ? 0.42 : 0.94) * P.scale;
    const boxH = H * (top ? 0.62 : 0.3) * P.scale;
    const s = Math.min(boxW / (bx1 - bx0), boxH / (by1 - by0));
    // top view: car on one side, a wide column for the labels on the other
    const carCx = top ? (P.labels === 'right' ? W * 0.31 : W * 0.69) : W / 2;
    const ox = carCx - ((bx0 + bx1) / 2) * s, oy = cy - ((by0 + by1) / 2) * s;
    const toScreen = ([x, y]) => [ox + x * s, oy + y * s];
    const anchorFor = (id) => {
      const a0 = partAnchor(G, id);
      return P.view !== 'side' && P.labels === 'right' ? [-a0[0], a0[1]] : a0;
    };

    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const buildLen = P.build === 'assemble' ? 0.9 : P.build === 'pop' ? 0.3 : 0;
    const built = t0 + buildLen;
    const list = hl(P);
    const starts = list.map((_, i) => built + 0.15 + i * P.step);
    const activeIdx = starts.reduce((a, st, i) => (t >= st ? i : a), -1);
    const isOn = (i) => (P.stack ? i <= activeIdx : i === activeIdx);
    const onIds = new Set(list.filter((_, i) => isOn(i)).map((h) => h.id));
    const anyOn = activeIdx >= 0;
    const dimK = anyOn ? ease.outCubic(range(t, starts[0], starts[0] + 0.25)) : 0;

    // camera: zoom towards the active highlight
    let cam = { k: 0, x: 0, y: 0 };
    if (P.zoom && activeIdx >= 0) {
      const st = starts[activeIdx];
      const prev = activeIdx > 0 ? toScreen(anchorFor(list[activeIdx - 1].id)) : null;
      const cur = toScreen(anchorFor(list[activeIdx].id));
      const k = ease.inOutQuart(range(t, st, st + 0.5));
      const zx = prev ? prev[0] + (cur[0] - prev[0]) * k : cur[0];
      const zy = prev ? prev[1] + (cur[1] - prev[1]) * k : cur[1];
      const kIn = activeIdx === 0 ? k : 1;
      const kOut = 1 - ease.inOutQuart(range(t, dur - 0.7, dur - 0.3));
      cam = { k: kIn * kOut, x: zx, y: zy };
    }
    const Z = 1 + 0.9 * cam.k;
    const camApply = (p) => {
      if (!cam.k) return p;
      const tx = cam.x + (W / 2 - cam.x) * cam.k, ty = cam.y + (cy - cam.y) * cam.k;
      return [tx + (p[0] - cam.x) * Z, ty + (p[1] - cam.y) * Z];
    };

    ctx.save();
    ctx.globalAlpha *= 1 - ease.inCubic(out);
    if (cam.k) {
      const tx = cam.x + (W / 2 - cam.x) * cam.k, ty = cam.y + (cy - cam.y) * cam.k;
      ctx.translate(tx, ty);
      ctx.scale(Z, Z);
      ctx.translate(-cam.x, -cam.y);
    }
    const popAll = P.build === 'pop' ? ease.outBack(range(t, t0, t0 + 0.3), 1.6) : 1;
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    if (popAll !== 1) ctx.scale(popAll, popAll);
    const lw = 7 / s;

    const base = {
      body: P.paint === 'team' ? pal.car : '#fbf9f3',
      wing: P.paint === 'team' ? pal.car2 : '#fbf9f3',
      tyre: '#2b2830',
      dark: '#3a3542',
      ink: '#1f1b24',
    };
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.6);
    const m = ctx.getTransform();
    const glowPx = (b) => (b * Math.hypot(m.a, m.b)) / s; // blur in device px, sized for the 1080 frame
    const dimFill = (c) => mix(c, '#d8d3de', 0.62 * dimK);
    const dimInk = mix(base.ink, '#9a93a6', 0.6 * dimK);
    const drawPart = (part, { xray = false } = {}) => {
      const on = onIds.has(part.id);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      part.shape(ctx);
      let fill = part.kind === 'tyre' ? base.tyre : part.kind === 'dark' ? base.dark : (part.id === 'frontWing' || part.id === 'rearWing') ? base.wing : base.body;
      if (part.kind !== 'line') {
        if (xray) {
          ctx.globalAlpha *= 0.66;
          ctx.fillStyle = P.focusColor;
          ctx.shadowColor = P.focusColor;
          ctx.shadowBlur = glowPx(26 + 22 * pulse);
          ctx.fill();
          ctx.globalAlpha /= 0.66;
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = '#2f2550';
          ctx.lineWidth = lw * 1.1;
          ctx.stroke();
        } else {
          ctx.fillStyle = on ? fill : dimFill(fill);
          ctx.fill();
          ctx.strokeStyle = on ? base.ink : dimInk;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      }
      if (part.lines) {
        ctx.beginPath();
        part.lines(ctx);
        if (part.kind === 'line') {
          ctx.strokeStyle = xray ? P.focusColor : on ? base.ink : dimInk;
          ctx.lineWidth = xray ? lw * 2.4 : lw * 1.1;
          if (xray) { ctx.shadowColor = P.focusColor; ctx.shadowBlur = glowPx(20 + 18 * pulse); }
        } else {
          ctx.strokeStyle = xray ? 'rgba(255,255,255,0.7)' : part.kind === 'tyre' ? 'rgba(255,255,255,0.18)' : 'rgba(31,27,36,0.3)';
          ctx.lineWidth = lw * 0.5;
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
      }
    };
    const assemble = (pi) => {
      if (P.build !== 'assemble') return { a: 1, dy: 0, sc: 1 };
      const st = t0 + pi * (buildLen / G.parts.length) * 0.85;
      const k = range(t, st, st + 0.28);
      return { a: clamp(k * 3), dy: (1 - ease.outBack(k, 1.6)) * -120, sc: 0.9 + 0.1 * ease.outBack(k, 2), k };
    };
    G.parts.forEach((part, pi) => {
      const as = assemble(pi);
      if (as.a <= 0) return;
      ctx.save();
      ctx.globalAlpha *= as.a;
      const ac = part.anchor;
      ctx.translate(ac[0], ac[1] + as.dy);
      ctx.scale(as.sc, as.sc);
      ctx.translate(-ac[0], -ac[1]);
      drawPart(part);
      ctx.restore();
    });
    // highlighted parts again on top, "x-ray" style, so hidden parts (floor, diffuser, brakes) read clearly
    G.parts.forEach((part) => {
      if (!onIds.has(part.id)) return;
      const i = list.findIndex((h) => h.id === part.id);
      const k = ease.outCubic(range(t, starts[i], starts[i] + 0.3));
      ctx.save();
      ctx.globalAlpha *= k;
      drawPart(part, { xray: true });
      ctx.restore();
    });

    // airflow streamlines
    if (P.flow !== 'none' && t > built) {
      const fk = range(t, built, built + 0.4);
      ctx.save();
      ctx.globalAlpha *= 0.85 * fk;
      ctx.lineCap = 'round';
      ctx.setLineDash([46, 34]);
      ctx.lineDashOffset = P.view === 'side' ? t * 520 : -t * 520;
      G.flow.forEach((f) => {
        if (P.flow === 'under' && !f.under) return;
        ctx.beginPath();
        f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = lw * 2.2;
        ctx.stroke();
        ctx.strokeStyle = f.under ? P.focusColor : '#8fb8ff';
        ctx.lineWidth = lw * 1.1;
        ctx.stroke();
      });
      ctx.restore();
    }
    ctx.restore();

    // callouts (screen space, outside the camera)
    const carL = ox + bx0 * s, carR = ox + bx1 * s, carT = oy + by0 * s, carB = oy + by1 * s;
    const labelSide = P.labels === 'right' ? 'right' : 'left';
    const colW = P.view === 'side' ? W * 0.8 : labelSide === 'left' ? carL - 48 - 40 : W - 48 - carR - 40;
    const nameSize = P.view === 'side' ? 60 : 56, noteSize = P.view === 'side' ? 40 : 38;
    const glowTxt = P.bg === 'none' ? 'rgba(255,255,255,0.9)' : null;
    const nextY = { left: 0, right: 0, top: carT - 40, bottom: carB + 110 };
    const measureW = (txt) => {
      setFont(ctx, pickFont(rc, P.titleFont), nameSize);
      const w = ctx.measureText(txt).width;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      return w;
    };
    // top view: lay out every label once, in the order the parts sit on the car, so each one stays beside its part
    const topLayout = {};
    if (P.view !== 'side') {
      const items = list.map((h, i) => {
        setFont(ctx, pickFont(rc, P.titleFont), nameSize);
        const nl = wrapLines(ctx, h.name, colW).length;
        setFont(ctx, 'Hand', noteSize);
        const tl = h.note ? wrapLines(ctx, h.note, colW).length : 0;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        const bh = nl * nameSize * 1.08 + tl * noteSize * 1.25 + (h.tag ? 100 : 0);
        return { i, ay: camApply(toScreen(anchorFor(h.id)))[1], bh };
      }).sort((a, b) => a.ay - b.ay);
      let y = 200;
      items.forEach((it) => {
        const want = it.ay - nameSize * 0.45;
        it.y = Math.max(want, y);
        y = it.y + it.bh + 56;
      });
      const overflow = y - 56 - (H - 170);
      if (overflow > 0) items.forEach((it) => (it.y -= overflow));
      items.forEach((it) => (topLayout[it.i] = it.y));
    }
    list.forEach((h, i) => {
      if (!isOn(i)) return;
      const st = starts[i];
      const k = range(t, st, st + 0.3);
      if (k <= 0) return;
      const a = camApply(toScreen(anchorFor(h.id)));
      // measure the block (name + note) to stack labels without overlap
      setFont(ctx, pickFont(rc, P.titleFont), nameSize);
      const nameLines = wrapLines(ctx, h.name, colW).length;
      setFont(ctx, 'Hand', noteSize);
      const noteLines = h.note ? wrapLines(ctx, h.note, colW).length : 0;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      const blockH = nameLines * nameSize * 1.08 + noteLines * noteSize * 1.25 + (h.tag ? 100 : 0);
      let lx, ly, align, ex, ey;
      if (P.view === 'side') {
        const above = i % 2 === 0;
        align = 'center';
        lx = clamp(a[0], colW / 2 + 40, W - colW / 2 - 40);
        if (above) { ly = Math.min(nextY.top, carT - 40) - blockH + nameSize / 2; nextY.top = ly - nameSize / 2 - 30; ex = lx; ey = ly + blockH - nameSize / 2 + 6; }
        else { ly = nextY.bottom; nextY.bottom = ly + blockH + 30; ex = lx; ey = ly - nameSize / 2 - 10; }
      } else {
        const side = labelSide;
        align = side;
        lx = side === 'left' ? 48 : W - 48;
        ly = topLayout[i];
        ex = side === 'left' ? lx + Math.min(colW, measureW(h.name)) + 24 : lx - Math.min(colW, measureW(h.name)) - 24;
        ey = ly + nameSize * 0.45;
        ly += nameSize / 2;
      }
      const fade = P.stack ? 1 : 1 - range(t, (starts[i + 1] ?? 1e9) - 0.15, starts[i + 1] ?? 1e9);
      ctx.save();
      ctx.globalAlpha *= fade * (1 - ease.inCubic(out));
      handArrow(ctx, ex, ey, a[0], a[1], { color: P.inkColor, width: 4, progress: ease.outCubic(k), seed: 21 + i, bend: 0.06, head: 0 });
      ctx.fillStyle = P.focusColor;
      ctx.beginPath(); ctx.arc(a[0], a[1], 12 * ease.outBack(k, 2), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
      const nh = revealText(ctx, h.name, { x: lx, y: ly, fontId: pickFont(rc, P.titleFont), size: nameSize, color: P.inkColor, align, start: st + 0.05, per: 0.08, t, maxWidth: colW, lineH: 1.08, glow: glowTxt });
      let y2 = ly - nameSize / 2 + nh + noteSize * 0.75;
      if (h.note) y2 += revealText(ctx, h.note, { x: lx, y: y2, fontId: 'Hand', size: noteSize, color: P.inkColor, align, start: st + 0.2, per: 0.07, t, maxWidth: colW, lineH: 1.25, glow: glowTxt });
      if (h.tag) {
        const tw = Math.min(colW, 260);
        const tx = align === 'left' ? lx + tw / 2 : align === 'right' ? lx - tw / 2 : lx;
        stamp(ctx, { x: tx, y: y2 + 30, text: h.tag.toUpperCase(), color: P.focusColor, width: 280, rot: -0.08, progress: range(t, st + 0.35, st + 0.6) });
      }
      ctx.restore();
    });

    // title
    if (P.title) {
      ctx.save();
      ctx.globalAlpha *= 1 - clamp(cam.k * 1.4) * 0.85;
      const ty = P.view === 'side' ? H * 0.17 : 150;
      revealText(ctx, P.title, { x: W / 2, y: ty, fontId: pickFont(rc, P.titleFont), size: 84, color: P.inkColor, start: t0, per: 0.09, t, out, maxWidth: W * 0.9 });
      if (P.subtitle) revealText(ctx, P.subtitle, { x: W / 2, y: ty + 74, fontId: 'Hand', size: 40, color: P.inkColor, start: t0 + 0.2, per: 0.06, t, out, maxWidth: W * 0.9 });
      ctx.restore();
    }
  },
};

function hl(P) {
  return [1, 2, 3]
    .map((n) => ({ id: P[`h${n}`], note: P[`n${n}`], tag: P[`t${n}`], name: (P[`l${n}`] || '').toUpperCase() }))
    .filter((h) => h.id && h.id !== 'none')
    .map((h) => ({ ...h, name: h.name || partLabel(h.id) }));
}

function partAnchor(G, id) {
  return (G.parts.find((p) => p.id === id) || G.parts[0]).anchor;
}

