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
const TOP = {
  box: [-360, -880, 360, 860],
  parts: [
    { id: 'floor', kind: 'body', anchor: [-300, 250], shape: (c) => poly(c, [[-120, -430], [120, -430], [262, -300], [300, -150], [300, 420], [250, 560], [-250, 560], [-300, 420], [-300, -150], [-262, -300]]),
      lines: (c) => { c.moveTo(-285, -120); c.lineTo(-285, 400); c.moveTo(285, -120); c.lineTo(285, 400); } },
    { id: 'diffuser', kind: 'body', anchor: [0, 650], shape: (c) => poly(c, [[-210, 560], [210, 560], [228, 700], [-228, 700]]),
      lines: (c) => { [-120, -40, 40, 120].forEach((x) => { c.moveTo(x, 570); c.lineTo(x * 1.08, 690); }); } },
    { id: 'rearTyres', kind: 'tyre', anchor: [-290, 560], shape: (c) => { rrect(c, -290, 560, 150, 235, 36); rrect(c, 290, 560, 150, 235, 36); },
      lines: (c) => { [-290, 290].forEach((x) => { for (let k = -80; k <= 80; k += 40) { c.moveTo(x - 60, 560 + k); c.lineTo(x + 60, 560 + k); } }); } },
    { id: 'frontTyres', kind: 'tyre', anchor: [290, -560], shape: (c) => { rrect(c, -288, -560, 122, 212, 32); rrect(c, 288, -560, 122, 212, 32); },
      lines: (c) => { [-288, 288].forEach((x) => { for (let k = -70; k <= 70; k += 35) { c.moveTo(x - 48, -560 + k); c.lineTo(x + 48, -560 + k); } }); } },
    { id: 'brakes', kind: 'dark', anchor: [-222, -560], shape: (c) => { rrect(c, -222, -560, 22, 90, 6); rrect(c, 222, -560, 22, 90, 6); rrect(c, -207, 560, 24, 100, 6); rrect(c, 207, 560, 24, 100, 6); } },
    { id: 'frontSusp', kind: 'line', anchor: [170, -585], shape: () => {},
      lines: (c) => { [-1, 1].forEach((s) => { c.moveTo(s * 55, -620); c.lineTo(s * 228, -585); c.moveTo(s * 60, -500); c.lineTo(s * 228, -540); c.moveTo(s * 50, -560); c.lineTo(s * 228, -560); }); } },
    { id: 'rearSusp', kind: 'line', anchor: [-170, 540], shape: () => {},
      lines: (c) => { [-1, 1].forEach((s) => { c.moveTo(s * 95, 500); c.lineTo(s * 214, 535); c.moveTo(s * 70, 610); c.lineTo(s * 214, 585); c.moveTo(s * 85, 560); c.lineTo(s * 214, 560); }); } },
    { id: 'sidepods', kind: 'body', anchor: [-245, 0], shape: (c) => {
      const L = [[-108, -262], [-232, -236], [-266, -130], [-262, 110], [-206, 330], [-118, 450]];
      poly(c, L); poly(c, mirror(L));
    }, lines: (c) => { c.moveTo(-232, -228); c.lineTo(-120, -248); c.moveTo(232, -228); c.lineTo(120, -248); } },
    { id: 'engine', kind: 'body', anchor: [0, 330], shape: (c) => poly(c, [[-112, 60], [112, 60], [96, 400], [42, 630], [-42, 630], [-96, 400]]),
      lines: (c) => { c.moveTo(0, 90); c.lineTo(0, 610); } },
    { id: 'chassis', kind: 'body', anchor: [-112, -330], shape: (c) => poly(c, [[-56, -560], [56, -560], [112, -300], [116, 62], [-116, 62], [-112, -300]]) },
    { id: 'nose', kind: 'body', anchor: [0, -690], shape: (c) => { c.moveTo(-28, -800); c.quadraticCurveTo(0, -830, 28, -800); c.lineTo(56, -560); c.lineTo(-56, -560); c.closePath(); } },
    { id: 'cockpit', kind: 'dark', anchor: [60, -150], shape: (c) => ell(c, 0, -140, 62, 108),
      lines: (c) => { c.moveTo(-70, -60); c.quadraticCurveTo(-78, -250, 0, -262); c.quadraticCurveTo(78, -250, 70, -60); c.moveTo(0, -262); c.lineTo(0, -200); } },
    { id: 'mirrors', kind: 'body', anchor: [-160, -300], shape: (c) => { ell(c, -160, -300, 34, 18); ell(c, 160, -300, 34, 18); } },
    { id: 'frontWing', kind: 'body', anchor: [-300, -810], shape: (c) => { poly(c, [[-345, -852], [345, -852], [348, -768], [-348, -768]]); },
      lines: (c) => { [-830, -808, -788].forEach((y) => { c.moveTo(-335, y); c.quadraticCurveTo(0, y + 16, 335, y); }); c.moveTo(-338, -852); c.lineTo(-338, -768); c.moveTo(338, -852); c.lineTo(338, -768); } },
    { id: 'rearWing', kind: 'body', anchor: [270, 780], shape: (c) => { poly(c, [[-272, 738], [272, 738], [272, 812], [-272, 812]]); rrect(c, -280, 772, 22, 120, 6); rrect(c, 280, 772, 22, 120, 6); },
      lines: (c) => { c.moveTo(-262, 772); c.lineTo(262, 772); c.moveTo(0, 700); c.lineTo(0, 738); } },
  ],
  // streamlines for airflow (car space)
  flow: [
    { pts: [[-330, -980], [-345, -700], [-330, -300], [-330, 400], [-300, 980]] },
    { pts: [[-180, -980], [-170, -650], [-290, -320], [-300, 200], [-160, 640], [-150, 980]] },
    { pts: [[0, -980], [0, -830], [0, -300], [0, 300], [0, 980]] },
    { pts: [[180, -980], [170, -650], [290, -320], [300, 200], [160, 640], [150, 980]] },
    { pts: [[330, -980], [345, -700], [330, -300], [330, 400], [300, 980]] },
  ],
};

const SIDE = {
  box: [-860, -190, 890, 210],
  parts: [
    { id: 'rearWing', kind: 'body', anchor: [-740, -150], shape: (c) => { poly(c, [[-835, -150], [-640, -150], [-640, -112], [-835, -112]]); rrect(c, -790, -20, 44, 250, 10); poly(c, [[-760, 60], [-600, 60], [-600, 78], [-760, 78]]); },
      lines: (c) => { c.moveTo(-830, -128); c.lineTo(-646, -128); } },
    { id: 'rearTyres', kind: 'tyre', anchor: [-560, 0], shape: (c) => ell(c, -560, 100, 108, 108),
      lines: (c) => { ell(c, -560, 100, 70, 70); } },
    { id: 'floor', kind: 'dark', anchor: [0, 182], shape: (c) => poly(c, [[-560, 168], [560, 168], [585, 178], [560, 188], [-560, 188]]) },
    { id: 'diffuser', kind: 'body', anchor: [-660, 150], shape: (c) => poly(c, [[-560, 168], [-724, 118], [-744, 136], [-560, 188]]),
      lines: (c) => { c.moveTo(-600, 160); c.lineTo(-700, 132); } },
    { id: 'engine', kind: 'body', anchor: [-330, -40], shape: (c) => { c.moveTo(-620, 70); c.lineTo(-440, -6); c.quadraticCurveTo(-200, -64, 60, -58); c.lineTo(80, 40); c.lineTo(-620, 92); c.closePath(); },
      lines: (c) => { c.moveTo(-430, -10); c.lineTo(-560, -60); c.lineTo(-90, -62); } },
    { id: 'sidepods', kind: 'body', anchor: [80, 90], shape: (c) => { c.moveTo(-300, 150); c.quadraticCurveTo(-250, 60, -100, 52); c.lineTo(300, 46); c.quadraticCurveTo(340, 95, 330, 150); c.closePath(); },
      lines: (c) => { c.moveTo(300, 56); c.lineTo(300, 120); } },
    { id: 'chassis', kind: 'body', anchor: [300, 120], shape: (c) => poly(c, [[60, 26], [400, 42], [404, 150], [60, 150]]) },
    { id: 'nose', kind: 'body', anchor: [640, 110], shape: (c) => { c.moveTo(400, 42); c.lineTo(820, 120); c.quadraticCurveTo(872, 134, 866, 150); c.lineTo(404, 150); c.closePath(); } },
    { id: 'cockpit', kind: 'dark', anchor: [160, -90], shape: (c) => ell(c, 165, -40, 34, 34),
      lines: (c) => { c.moveTo(100, 22); c.quadraticCurveTo(170, -110, 300, 30); } },
    { id: 'mirrors', kind: 'body', anchor: [300, -40], shape: (c) => { poly(c, [[285, -22], [335, -30], [335, -8], [285, -4]]); } },
    { id: 'frontWing', kind: 'body', anchor: [790, 180], shape: (c) => { poly(c, [[690, 160], [884, 160], [884, 186], [690, 186]]); rrect(c, 872, 150, 26, 80, 6); },
      lines: (c) => { c.moveTo(700, 172); c.lineTo(870, 172); } },
    { id: 'frontTyres', kind: 'tyre', anchor: [560, 20], shape: (c) => ell(c, 560, 110, 98, 98),
      lines: (c) => { ell(c, 560, 110, 62, 62); } },
    { id: 'brakes', kind: 'dark', anchor: [560, 110], shape: (c) => { ell(c, 560, 110, 34, 34); ell(c, -560, 100, 38, 38); } },
    { id: 'frontSusp', kind: 'line', anchor: [470, 70], shape: () => {},
      lines: (c) => { c.moveTo(560, 110); c.lineTo(404, 60); c.moveTo(560, 110); c.lineTo(404, 135); } },
    { id: 'rearSusp', kind: 'line', anchor: [-470, 60], shape: () => {},
      lines: (c) => { c.moveTo(-560, 100); c.lineTo(-420, 40); c.moveTo(-560, 100); c.lineTo(-430, 120); } },
  ],
  flow: [
    { pts: [[980, 40], [700, 60], [420, 0], [150, -150], [-300, -110], [-700, -190], [-980, -200]] },
    { pts: [[980, 110], [860, 110], [500, 30], [200, -40], [-400, -60], [-680, -200], [-980, -230]] },
    { pts: [[980, 196], [700, 196], [300, 196], [-300, 196], [-560, 194], [-740, 150], [-980, 120]], under: true },
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
    const boxW = W * (P.view === 'side' ? 0.92 : 0.44) * P.scale;
    const boxH = H * (P.view === 'side' ? 0.3 : 0.6) * P.scale;
    const s = Math.min(boxW / (bx1 - bx0), boxH / (by1 - by0));
    const ox = W / 2 - ((bx0 + bx1) / 2) * s, oy = cy - ((by0 + by1) / 2) * s;
    const toScreen = ([x, y]) => [ox + x * s, oy + y * s];

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
      const prev = activeIdx > 0 ? toScreen(partAnchor(G, list[activeIdx - 1].id)) : null;
      const cur = toScreen(partAnchor(G, list[activeIdx].id));
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
    const colW = P.view === 'side' ? W * 0.8 : Math.max(180, carL - 48 - 24);
    const nameSize = P.view === 'side' ? 60 : 50, noteSize = P.view === 'side' ? 40 : 34;
    const glowTxt = P.bg === 'none' ? 'rgba(255,255,255,0.9)' : null;
    const nextY = { left: 0, right: 0, top: carT - 40, bottom: carB + 110 };
    list.forEach((h, i) => {
      if (!isOn(i)) return;
      const st = starts[i];
      const k = range(t, st, st + 0.3);
      if (k <= 0) return;
      const a = camApply(toScreen(partAnchor(G, h.id)));
      // measure the block (name + note) to stack labels without overlap
      setFont(ctx, pickFont(rc, P.titleFont), nameSize);
      const nameLines = wrapLines(ctx, h.name, colW).length;
      setFont(ctx, 'Hand', noteSize);
      const noteLines = h.note ? wrapLines(ctx, h.note, colW).length : 0;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      const blockH = nameLines * nameSize * 1.05 + noteLines * noteSize * 1.15 + (h.tag ? 90 : 0);
      let lx, ly, align, ex, ey;
      if (P.view === 'side') {
        const above = i % 2 === 0;
        align = 'center';
        lx = clamp(a[0], colW / 2 + 40, W - colW / 2 - 40);
        if (above) { ly = Math.min(nextY.top, carT - 40) - blockH + nameSize / 2; nextY.top = ly - nameSize / 2 - 30; ex = lx; ey = ly + blockH - nameSize / 2 + 6; }
        else { ly = nextY.bottom; nextY.bottom = ly + blockH + 30; ex = lx; ey = ly - nameSize / 2 - 10; }
      } else {
        const center = Math.abs(a[0] - W / 2) < 40;
        const side = center ? (i % 2 === 0 ? 'left' : 'right') : a[0] < W / 2 ? 'left' : 'right';
        align = side;
        lx = side === 'left' ? 48 : W - 48;
        ly = Math.max(clamp(a[1] - blockH / 2, 230, H - 230 - blockH), nextY[side]);
        nextY[side] = ly + blockH + 40;
        ex = side === 'left' ? carL - 14 : carR + 14;
        ey = ly + 4;
        ly += nameSize / 2;
      }
      const fade = P.stack ? 1 : 1 - range(t, (starts[i + 1] ?? 1e9) - 0.15, starts[i + 1] ?? 1e9);
      ctx.save();
      ctx.globalAlpha *= fade * (1 - ease.inCubic(out));
      handArrow(ctx, ex, ey, a[0], a[1], { color: P.inkColor, width: 4, progress: ease.outCubic(k), seed: 21 + i, bend: 0.06, head: 0 });
      ctx.fillStyle = P.focusColor;
      ctx.beginPath(); ctx.arc(a[0], a[1], 12 * ease.outBack(k, 2), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
      const nh = revealText(ctx, h.name, { x: lx, y: ly, fontId: pickFont(rc, P.titleFont), size: nameSize, color: P.inkColor, align, start: st + 0.05, per: 0.08, t, maxWidth: colW, lineH: 1.05, glow: glowTxt });
      let y2 = ly - nameSize / 2 + nh + noteSize * 0.55;
      if (h.note) y2 += revealText(ctx, h.note, { x: lx, y: y2, fontId: 'Hand', size: noteSize, color: P.inkColor, align, start: st + 0.2, per: 0.07, t, maxWidth: colW, lineH: 1.15, glow: glowTxt });
      if (h.tag) {
        const tw = Math.min(colW, 260);
        const tx = align === 'left' ? lx + tw / 2 : align === 'right' ? lx - tw / 2 : lx;
        stamp(ctx, { x: tx, y: y2 + 20, text: h.tag.toUpperCase(), color: P.focusColor, width: 280, rot: -0.08, progress: range(t, st + 0.35, st + 0.6) });
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

