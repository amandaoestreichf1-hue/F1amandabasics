// Tennis set (mint identity): court anatomy, surfaces, scoring explained, draw path,
// tournament pyramid, head-to-head card and match-duration clock.
import { handArrow } from '../lib/paper.js';
import {
  ease, range, clamp, revealText, pop, frame, bgFields, titleFields, styleFields, bgCue, colors, heading,
  card, text, measure, pill, popIn, lines, photo, lerp, fmtNumber, pickFont, wrapLines, setFont, emoji, flagEmoji,
} from './kit.js';
import { stamp } from '../lib/paper.js';

const TEN = ['tennis'];
export const SURFACES = {
  hard: { name: 'QUADRA DURA', court: '#3f6fb5', out: '#4f8a5e', bounce: 'médio', speed: 'média', h: 0.6, v: 0.7 },
  clay: { name: 'SAIBRO', court: '#d0703f', out: '#c86538', bounce: 'alto', speed: 'lenta', h: 0.9, v: 0.45 },
  grass: { name: 'GRAMA', court: '#5f9e48', out: '#55913f', bounce: 'baixo', speed: 'rápida', h: 0.35, v: 0.95 },
};

// ---------------------------------------------------------------------------
// Tennis ball sticker
// ---------------------------------------------------------------------------
export function tennisBall(ctx, x, y, r, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#fbf9f3';
  ctx.beginPath(); ctx.arc(0, 0, r + Math.max(3, r * 0.12), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d7ef4f';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fbf9f3'; ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.95, -0.85, 0.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.85, Math.PI + 0.85); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.4, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 10. Court anatomy
// ---------------------------------------------------------------------------
// Court in metres, vertical: y from -11.885 (far baseline) to +11.885, x from -5.485 to +5.485
const CL = 11.885, DW = 5.485, SW = 4.115, SL = 6.4;
const COURT_PARTS = [
  ['baseline', 'Linha de fundo'],
  ['net', 'Rede'],
  ['alley', 'Corredor de duplas'],
  ['serviceBox', 'Área de saque'],
  ['serviceLine', 'Linha de saque'],
  ['centerLine', 'Linha central de saque'],
  ['centerMark', 'Marca central'],
  ['sideline', 'Linha lateral (simples)'],
  ['noMansLand', 'Fundo de quadra'],
];
const partName = (id) => (COURT_PARTS.find((p) => p[0] === id) || [id, id])[1].toUpperCase();

export const courtAnatomy = {
  id: 'courtAnatomy', name: 'Anatomia da Quadra', sports: TEN, category: 'tenis', defaultDuration: 6,
  desc: 'As linhas se desenham e cada área ganha nome: fundo, rede, corredor de duplas, área de saque…',
  fields: [
    ...titleFields('A QUADRA', ''),
    { key: 'surface', label: 'Piso', type: 'select', options: [['hard', 'Quadra dura (azul)'], ['clay', 'Saibro'], ['grass', 'Grama']], default: 'hard' },
    { key: 'mode', label: 'Nomes', type: 'select', options: [['tour', 'Tour: todas as partes, uma a uma'], ['pick', 'Só as que eu escolher']], default: 'tour' },
    ...[1, 2, 3].map((n) => ({ key: `p${n}`, label: `Parte ${n}`, type: 'select', options: [['none', '—'], ...COURT_PARTS], default: ['alley', 'serviceBox', 'none'][n - 1], showIf: (P) => P.mode === 'pick' })),
    { key: 'step', label: 'Tempo de cada nome (s)', type: 'range', min: 0.4, max: 2.5, step: 0.1, default: 0.6 },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const list = courtList(P);
    return [...bgCue(P), { t: t0 + 0.3, s: 'whoosh', label: 'linhas se desenham' }, ...list.map((id, i) => ({ t: t0 + 1.6 + i * P.step, s: 'pop', label: partName(id).toLowerCase() }))];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    heading(rc, f, { y: 150, size: 84 });
    const S = SURFACES[P.surface];
    const m = Math.min((W * 0.5) / (DW * 2 + 2), (H * 0.66) / (CL * 2 + 3));
    const cx = W * 0.68, cy = H * 0.56;
    const X = (x) => cx + x * m, Y = (y) => cy + y * m;
    // surface
    const sk = ease.outCubic(range(t, f.t0 + 0.1, f.t0 + 0.4));
    card(ctx, rc, X(-DW - 1.2), Y(-CL - 1.6) + (1 - sk) * 80, (DW * 2 + 2.4) * m, (CL * 2 + 3.2) * m, { fill: S.out, r: 24 });
    ctx.save(); ctx.globalAlpha *= sk;
    ctx.fillStyle = S.court; ctx.fillRect(X(-DW), Y(-CL), DW * 2 * m, CL * 2 * m);
    ctx.restore();
    // lines drawing
    const segs = [
      [[-DW, -CL], [DW, -CL]], [[-DW, CL], [DW, CL]],
      [[-DW, -CL], [-DW, CL]], [[DW, -CL], [DW, CL]],
      [[-SW, -CL], [-SW, CL]], [[SW, -CL], [SW, CL]],
      [[-SW, -SL], [SW, -SL]], [[-SW, SL], [SW, SL]],
      [[0, -SL], [0, SL]],
      [[0, -CL], [0, -CL + 0.3]], [[0, CL], [0, CL - 0.3]],
    ];
    ctx.save();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(5, m * 0.1); ctx.lineCap = 'square';
    segs.forEach(([a, b], i) => {
      const k = ease.outCubic(range(t, f.t0 + 0.3 + i * 0.08, f.t0 + 0.6 + i * 0.08));
      if (k <= 0) return;
      ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(lerp(a[0], b[0], k)), Y(lerp(a[1], b[1], k))); ctx.stroke();
    });
    ctx.restore();
    // net
    const nk = ease.outCubic(range(t, f.t0 + 1.1, f.t0 + 1.4));
    if (nk > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(30,30,30,0.55)'; ctx.fillRect(X(-DW - 0.9), Y(0) - 6, (DW * 2 + 1.8) * m * nk, 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(X(-DW - 0.9), Y(0) - 3, (DW * 2 + 1.8) * m * nk, 6);
      ctx.fillStyle = '#2f2a36'; ctx.beginPath(); ctx.arc(X(-DW - 0.9), Y(0), 9, 0, Math.PI * 2); ctx.arc(X(DW + 0.9), Y(0), 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // highlights
    const list = courtList(P);
    const start = f.t0 + 1.6;
    const active = list.reduce((a, _, i) => (t >= start + i * P.step ? i : a), -1);
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    let labelY = 300;
    list.forEach((id, i) => {
      const st = start + i * P.step;
      if (t < st) return;
      const isCur = i === active;
      const k = ease.outCubic(range(t, st, st + 0.25));
      // area / line glow
      ctx.save();
      ctx.globalAlpha *= isCur ? 0.55 + 0.3 * pulse : P.mode === 'pick' ? 0.25 : 0;
      ctx.fillStyle = c.soft; ctx.strokeStyle = c.soft; ctx.lineWidth = Math.max(14, m * 0.35); ctx.lineCap = 'round';
      const R = (x0, y0, x1, y1) => ctx.fillRect(X(x0), Y(y0), (x1 - x0) * m, (y1 - y0) * m);
      const L = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke(); };
      if (id === 'alley') { R(-DW, -CL, -SW, CL); R(SW, -CL, DW, CL); }
      else if (id === 'serviceBox') { R(-SW, 0, 0, SL); R(0, 0, SW, SL); R(-SW, -SL, 0, 0); R(0, -SL, SW, 0); }
      else if (id === 'noMansLand') { R(-SW, SL, SW, CL); R(-SW, -CL, SW, -SL); }
      else if (id === 'baseline') { L(-DW, CL, DW, CL); L(-DW, -CL, DW, -CL); }
      else if (id === 'net') { L(-DW - 0.9, 0, DW + 0.9, 0); }
      else if (id === 'serviceLine') { L(-SW, SL, SW, SL); L(-SW, -SL, SW, -SL); }
      else if (id === 'centerLine') { L(0, -SL, 0, SL); }
      else if (id === 'centerMark') { L(0, CL, 0, CL - 0.6); L(0, -CL, 0, -CL + 0.6); }
      else if (id === 'sideline') { L(-SW, -CL, -SW, CL); L(SW, -CL, SW, CL); }
      ctx.restore();
      // label in the left column with a leader line
      const anchor = courtAnchor(id);
      const ax = X(anchor[0]), ay = Y(anchor[1]);
      const ly = labelY;
      setFont(ctx, pickFont(rc, P.titleFont), 42);
      const nl = wrapLines(ctx, partName(id), 360).length;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      labelY += 50 + nl * 46;
      ctx.save();
      ctx.globalAlpha *= isCur ? 1 : 0.45;
      if (isCur || P.mode === 'pick') handArrow(ctx, 50 + Math.min(360, measure(ctx, partName(id), pickFont(rc, P.titleFont), 42)) + 16, ly, ax, ay, { color: c.ink, width: 4, progress: k, seed: 31 + i, bend: 0.05, head: 0 });
      ctx.fillStyle = c.strong; ctx.beginPath(); ctx.arc(ax, ay, 10 * k, 0, Math.PI * 2); ctx.fill();
      revealText(ctx, partName(id), { x: 50, y: ly, fontId: pickFont(rc, P.titleFont), size: 42, color: isCur ? c.strong : c.ink, align: 'left', start: st, per: 0.06, t, maxWidth: 360, lineH: 1.1 });
      ctx.restore();
    });
    ctx.restore();
  },
};
function courtList(P) {
  if (P.mode === 'tour') return ['baseline', 'sideline', 'alley', 'serviceLine', 'serviceBox', 'centerLine', 'centerMark', 'noMansLand', 'net'];
  return [P.p1, P.p2, P.p3].filter((x) => x && x !== 'none');
}
function courtAnchor(id) {
  return { baseline: [-DW + 0.6, CL], net: [-DW - 0.9, 0], alley: [-SW - 0.7, CL - 4], serviceBox: [-SW / 2, SL / 2], serviceLine: [-SW + 0.8, SL], centerLine: [0, 3.2], centerMark: [0, CL - 0.4], sideline: [-SW, -8], noMansLand: [-2, CL - 2.6] }[id] || [0, 0];
}

// ---------------------------------------------------------------------------
// 11. Surfaces
// ---------------------------------------------------------------------------
export const surfaces = {
  id: 'surfaces', name: 'Superfícies', sports: TEN, category: 'tenis', defaultDuration: 5,
  desc: 'Saibro, grama e quadra dura: a bola quicando alto, baixo ou médio, e a velocidade de cada uma.',
  fields: [
    ...titleFields('AS SUPERFÍCIES', ''),
    { key: 'which', label: 'Mostrar', type: 'select', options: [['all', 'As três comparadas'], ['clay', 'Só saibro'], ['grass', 'Só grama'], ['hard', 'Só quadra dura']], default: 'all' },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const n = P.which === 'all' ? 3 : 1;
    return [...bgCue(P), ...Array.from({ length: n }, (_, i) => ({ t: t0 + 0.3 + i * 0.35, s: 'whoosh', label: `piso ${i + 1}` })), { t: t0 + 1.4, s: 'pop', label: 'quique' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 170 }) + 40;
    const keys = P.which === 'all' ? ['clay', 'grass', 'hard'] : [P.which];
    const rowH = Math.min(560, (H - top - 120) / keys.length);
    keys.forEach((k, i) => {
      const S = SURFACES[k];
      const y = top + i * rowH;
      const st = f.t0 + 0.3 + i * 0.35;
      const sk = ease.outExpo(range(t, st, st + 0.45));
      if (sk <= 0) return;
      const x = 60 + (1 - sk) * -W;
      const w = W - 120, h = rowH - 40;
      card(ctx, rc, x, y, w, h, { fill: '#fbfaf6', r: 30 });
      const groundY = y + h - 70;
      // court strip
      ctx.fillStyle = S.court; ctx.fillRect(x + 30, groundY, w - 60, 34);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 30, groundY, w - 60, 5);
      text(ctx, S.name, x + 40, y + 60, { font: pickFont(rc, P.titleFont), size: 60, color: c.ink, align: 'left' });
      text(ctx, `quique ${S.bounce} · ${S.speed}`, x + 40, y + 118, { font: 'Hand', size: 40, color: c.ink, align: 'left' });
      // speed meter
      const mk = ease.outCubic(range(t, st + 0.4, st + 1.0));
      text(ctx, 'velocidade', x + w - 300, y + 54, { font: 'Hand', size: 30, color: c.ink, align: 'left' });
      card(ctx, rc, x + w - 300, y + 76, 250, 20, { fill: 'rgba(47,42,54,0.12)', r: 10, shadow: false });
      card(ctx, rc, x + w - 300, y + 76, Math.max(20, 250 * S.v * mk), 20, { fill: S.court, r: 10, shadow: false });
      // ball trajectory: comes in, bounces at 40% width, leaves
      const path = (u) => {
        const bx = x + 40 + u * (w - 80);
        const bounceU = 0.42;
        const peakIn = h * 0.45, peakOut = (h - 150) * S.h;
        let by;
        if (u < bounceU) { const q = u / bounceU; by = groundY - 22 - peakIn * (1 - q * q) * 0.9 - 10 * (1 - q); }
        else { const q = (u - bounceU) / (1 - bounceU); by = groundY - 22 - peakOut * Math.sin(q * Math.PI * 0.8); }
        return [bx, by];
      };
      // trajectory trace
      ctx.save();
      ctx.setLineDash([10, 14]); ctx.strokeStyle = 'rgba(47,42,54,0.35)'; ctx.lineWidth = 4;
      ctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.02) { const [px, py] = path(u); u ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.restore();
      const cycle = 2.2 - S.v * 1.0;
      const u = ((t - st - 0.4) / cycle) % 1;
      if (t > st + 0.4) {
        const [bx, by] = path(u);
        const sq = Math.abs(u - 0.42) < 0.02 ? 0.8 : 1;
        ctx.save(); ctx.translate(bx, by); ctx.scale(1 / sq, sq); tennisBall(ctx, 0, 0, 26, t * 8); ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(bx, groundY + 2, 24 * (1 - (groundY - by) / h * 0.6), 6, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 12. Scoring explained
// ---------------------------------------------------------------------------
const SCORE_SEQ = {
  game: [['0', '0', 'começa o game'], ['15', '0', 'primeiro ponto: 15'], ['15', '15', ''], ['30', '15', 'segundo ponto: 30'], ['40', '15', 'terceiro ponto: 40'], ['40', '30', ''], ['40', '40', 'empate em 40: DEUCE'], ['AD', '40', 'VANTAGEM'], ['40', '40', 'volta pro DEUCE'], ['AD', '40', 'VANTAGEM de novo'], ['GAME', '', 'dois pontos seguidos: GAME']],
  tiebreak: [['0', '0', 'TIE-BREAK em 6–6'], ['1', '0', 'pontos contados 1, 2, 3…'], ['3', '2', ''], ['5', '4', ''], ['6', '5', 'set point'], ['6', '6', ''], ['7', '6', ''], ['8', '6', 'chega a 7 com 2 de vantagem']],
  super: [['0', '0', 'SUPER TIE-BREAK no lugar do 3º set'], ['4', '3', 'até 10 pontos'], ['7', '7', ''], ['9', '8', 'match point'], ['9', '9', ''], ['10', '9', ''], ['11', '9', 'precisa de 2 de vantagem']],
};
export const scoreExplained = {
  id: 'scoreExplained', name: 'Placar Explicado', sports: TEN, category: 'tenis', defaultDuration: 7,
  desc: 'Placar animado passo a passo: 15-30-40, deuce, vantagem, tie-break e super tie-break.',
  fields: [
    { key: 'mode', label: 'Explicar', type: 'select', options: [['game', 'Um game (15, 30, 40, deuce, vantagem)'], ['tiebreak', 'Tie-break'], ['super', 'Super tie-break']], default: 'game' },
    { key: 'p1', label: 'Jogador(a) 1', type: 'text', default: 'SINNER' },
    { key: 'p2', label: 'Jogador(a) 2', type: 'text', default: 'ALCARAZ' },
    { key: 'sets', label: 'Sets já jogados (ex.: 6-4, 3-6)', type: 'text', default: '6-4' },
    ...titleFields('COMO FUNCIONA O PLACAR', ''),
    ...styleFields(), ...bgFields(),
  ],
  cues: (P, dur) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const seq = SCORE_SEQ[P.mode];
    const step = (dur - t0 - 1) / seq.length;
    return [...bgCue(P), { t: t0 + 0.2, s: 'whoosh', label: 'placar entra' }, ...seq.map((s, i) => ({ t: t0 + 0.7 + i * step, s: 'pop', label: `${s[0]}–${s[1]}` }))];
  },
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    heading(rc, f, { y: 210 });
    const seq = SCORE_SEQ[P.mode];
    const dd = rc.realDur ?? dur;
    const step = (dd - f.t0 - 1) / seq.length;
    const idx = clamp(Math.floor((t - f.t0 - 0.7) / step), -1, seq.length - 1);
    const cur = idx >= 0 ? seq[idx] : ['0', '0', ''];
    const stepT = f.t0 + 0.7 + Math.max(0, idx) * step;
    const sets = String(P.sets || '').split(',').map((s) => s.trim().split('-')).filter((s) => s.length === 2);
    const k = ease.outExpo(range(t, f.t0 + 0.2, f.t0 + 0.6));
    const y0 = H * 0.42, bw = W - 140, rowH = 150;
    ctx.save(); ctx.translate((1 - k) * -W, 0);
    card(ctx, rc, 70, y0 - rowH - 10, bw, rowH * 2 + 20, { fill: '#26332d', r: 34 });
    [P.p1, P.p2].forEach((name, r) => {
      const y = y0 - rowH / 2 + r * rowH;
      text(ctx, (name || '').toUpperCase(), 120, y, { font: pickFont(rc, P.titleFont), size: 60, color: '#ffffff', align: 'left', maxWidth: bw - 520 });
      sets.forEach((s, j) => text(ctx, s[r], 70 + bw - 330 + j * 70, y, { font: 'Marker', size: 54, color: '#cfe9dc' }));
      // current points box
      const v = cur[r];
      const changed = idx >= 0 && (idx === 0 || seq[idx - 1][r] !== v);
      const pk = changed ? pop(t, stepT, 0.3, 2.4) : 1;
      popIn(ctx, 70 + bw - 110, y, pk, () => {
        card(ctx, rc, 70 + bw - 190, y - 56, 160, 112, { fill: v === 'AD' || v === 'GAME' ? c.soft : '#ffffff', r: 22, shadow: false });
        text(ctx, v, 70 + bw - 110, y + 2, { font: 'Marker', size: v.length > 2 ? 44 : 64, color: '#26332d' });
      });
    });
    ctx.restore();
    // caption
    if (cur[2]) {
      const ck = pop(t, stepT, 0.35, 1.8);
      popIn(ctx, W / 2, y0 + rowH + 170, ck, () => {
        pill(ctx, rc, W / 2, y0 + rowH + 170, cur[2], { size: 54, fill: c.strong, color: '#fff', padX: 40, shadow: true });
      });
    }
    // little bouncing ball for fun
    const bx = W / 2 + Math.sin(t * 2.2) * 360, by = y0 + rowH + 330 - Math.abs(Math.sin(t * 4.4)) * 120;
    tennisBall(ctx, bx, by, 30, t * 6);
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 13. Draw path (128 → final)
// ---------------------------------------------------------------------------
const ROUNDS = ['1ª rodada', '2ª rodada', '3ª rodada', 'Oitavas', 'Quartas', 'Semi', 'Final'];
export const drawPath = {
  id: 'drawPath', name: 'Chave do Torneio', sports: TEN, category: 'tenis', defaultDuration: 7,
  desc: 'Chave de 128 até a final: o caminho de um jogador rodada a rodada, com os adversários.',
  fields: [
    { key: 'player', label: 'Jogador(a)', type: 'text', default: 'JOÃO FONSECA' },
    { key: 'size', label: 'Tamanho da chave', type: 'select', options: [['128', '128 (Grand Slam)'], ['64', '64'], ['32', '32']], default: '128' },
    { key: 'opps', label: 'Adversários (um por linha, na ordem; deixe "?" para possível)', type: 'textarea', default: 'Adversário 1\nAdversário 2\n?\n?\n?\n?\n?' },
    { key: 'reach', label: 'Até qual rodada já chegou (0 = todas)', type: 'range', min: 0, max: 7, step: 1, default: 0 },
    ...titleFields('O CAMINHO ATÉ O TÍTULO', ''),
    ...styleFields(), ...bgFields(),
  ],
  cues: (P, dur) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const R = Math.log2(parseInt(P.size, 10));
    const step = (dur - t0 - 1.4) / R;
    return [...bgCue(P), { t: t0 + 0.3, s: 'pop', label: 'chave aparece' }, ...Array.from({ length: R }, (_, i) => ({ t: t0 + 1 + i * step, s: 'whoosh', label: ROUNDS[ROUNDS.length - R + i] }))];
  },
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 160, size: 80 }) + 30;
    const size = parseInt(P.size, 10);
    const R = Math.log2(size);
    const names = ROUNDS.slice(ROUNDS.length - R);
    const opps = lines(P.opps);
    const dd = rc.realDur ?? dur;
    const step = (dd - f.t0 - 1.4) / R;
    const cur = clamp(Math.floor((t - f.t0 - 1) / step), -1, R - 1);
    const reach = P.reach || R;
    // funnel of dots: one row per round
    const fx = 70, fw = W - 140;
    const rowGap = 46;
    const pIndex = 37 % size; // where our player sits in the draw
    for (let r = 0; r <= R; r++) {
      const count = size >> r;
      const y = top + r * rowGap;
      const k = range(t, f.t0 + 0.3 + r * 0.05, f.t0 + 0.6 + r * 0.05);
      if (k <= 0) continue;
      const done = r <= cur + 1;
      for (let i = 0; i < count; i++) {
        const x = fx + ((i + 0.5) / count) * fw;
        const mine = Math.floor(pIndex / (1 << r)) === i;
        const alive = r <= cur + 1 && r <= reach;
        ctx.fillStyle = mine && alive ? c.strong : done ? 'rgba(47,42,54,0.45)' : 'rgba(47,42,54,0.18)';
        const rr = mine && alive ? 9 : Math.max(2.5, Math.min(8, fw / count / 3));
        ctx.beginPath(); ctx.arc(x, y, rr * k, 0, Math.PI * 2); ctx.fill();
      }
      if (r > 0 && r <= cur + 1 && r <= reach) {
        const x0 = fx + ((Math.floor(pIndex / (1 << (r - 1))) + 0.5) / (count * 2)) * fw;
        const x1 = fx + ((Math.floor(pIndex / (1 << r)) + 0.5) / count) * fw;
        ctx.strokeStyle = c.strong; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y - rowGap); ctx.lineTo(x1, y); ctx.stroke();
      }
    }
    if (cur === R - 1 && reach >= R) {
      const tk = pop(t, f.t0 + 1 + (R - 1) * step + 0.4, 0.4, 2);
      popIn(ctx, W / 2, top + R * rowGap + 10, tk, () => emoji(ctx, '🏆', W / 2, top + R * rowGap + 4, 70));
    }
    // match cards
    let y = top + R * rowGap + 110;
    const ch = Math.min(118, (H - y - 60) / R - 14);
    for (let r = 0; r < R; r++) {
      if (r > cur) break;
      const k = pop(t, f.t0 + 1 + r * step, 0.3, 1.8);
      const lost = r >= reach;
      const opp = opps[r] && opps[r] !== '?' ? opps[r] : 'possível adversário';
      popIn(ctx, W / 2, y + ch / 2, k, () => {
        ctx.save(); ctx.globalAlpha *= lost ? 0.45 : 1;
        card(ctx, rc, 70, y, W - 140, ch, { fill: r === cur ? c.soft : '#fbfaf6', r: 24 });
        text(ctx, names[r].toUpperCase(), 100, y + ch / 2, { font: 'Hand', size: 34, color: c.ink, align: 'left' });
        text(ctx, `${(P.player || '').toUpperCase()}`, 360, y + ch / 2, { font: pickFont(rc, P.titleFont), size: 44, color: c.ink, align: 'left', maxWidth: 270 });
        text(ctx, 'x', 660, y + ch / 2, { font: 'Hand', size: 36, color: c.ink });
        text(ctx, opp, 700, y + ch / 2, { font: opps[r] && opps[r] !== '?' ? pickFont(rc, P.titleFont) : 'Hand', size: opps[r] && opps[r] !== '?' ? 40 : 30, color: c.ink, align: 'left', maxWidth: W - 790 });
        ctx.restore();
      });
      y += ch + 14;
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 14. Tournament pyramid
// ---------------------------------------------------------------------------
const PYR = {
  atp: [['GRAND SLAM', 2000], ['ATP FINALS', 1500], ['MASTERS 1000', 1000], ['ATP 500', 500], ['ATP 250', 250]],
  wta: [['GRAND SLAM', 2000], ['WTA FINALS', 1500], ['WTA 1000', 1000], ['WTA 500', 500], ['WTA 250', 250]],
};
export const pyramid = {
  id: 'pyramid', name: 'Pirâmide de Torneios', sports: TEN, category: 'tenis', defaultDuration: 5,
  desc: 'Slam, Finals, 1000, 500 e 250 empilhados com a pontuação de cada um para o campeão.',
  fields: [
    { key: 'tour', label: 'Circuito', type: 'select', options: [['atp', 'ATP'], ['wta', 'WTA']], default: 'atp' },
    ...titleFields('PIRÂMIDE DE TORNEIOS', 'pontos para o campeão'),
    { key: 'focus', label: 'Destacar nível (0 = nenhum, 1 = topo)', type: 'range', min: 0, max: 5, step: 1, default: 0 },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), ...[0, 1, 2, 3, 4].map((i) => ({ t: t0 + 0.4 + i * 0.3, s: 'pop', label: `nível ${5 - i}` }))];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    heading(rc, f, { y: 200 });
    const tiers = PYR[P.tour];
    const n = tiers.length, base = H - 250, lvlH = Math.min(230, (base - 470) / n);
    const allIn = f.t0 + 0.4 + n * 0.3;
    for (let j = n - 1; j >= 0; j--) {
      const [name, pts] = tiers[j];
      const order = n - 1 - j; // bottom first
      const st = f.t0 + 0.4 + order * 0.3;
      const k = ease.outBack(range(t, st, st + 0.4), 1.5);
      if (k <= 0) continue;
      const yTop = base - (order + 1) * lvlH;
      const wBot = W - 120 - order * ((W - 400) / n), wTop = W - 120 - (order + 1) * ((W - 400) / n);
      const isF = P.focus === j + 1 && t > allIn;
      ctx.save();
      ctx.globalAlpha *= P.focus && t > allIn && !isF ? 0.45 : 1;
      ctx.translate(0, (1 - Math.min(1, k)) * -260);
      ctx.beginPath();
      ctx.moveTo(W / 2 - wBot / 2, yTop + lvlH - 6); ctx.lineTo(W / 2 + wBot / 2, yTop + lvlH - 6);
      ctx.lineTo(W / 2 + wTop / 2, yTop + 6); ctx.lineTo(W / 2 - wTop / 2, yTop + 6); ctx.closePath();
      ctx.fillStyle = j === 0 ? c.strong : isF ? c.soft : j % 2 ? '#fbfaf6' : '#eef6f1';
      ctx.fill(); ctx.strokeStyle = c.strong; ctx.lineWidth = 4; ctx.stroke();
      text(ctx, name, W / 2, yTop + lvlH * 0.4, { font: pickFont(rc, P.titleFont), size: Math.min(58, lvlH * 0.32), color: j === 0 ? '#fff' : c.ink, maxWidth: wTop - 40 });
      const cnt = Math.round(pts * ease.outCubic(range(t, st + 0.2, st + 0.8)));
      text(ctx, `${fmtNumber(cnt)} pts${j === 1 ? '*' : ''}`, W / 2, yTop + lvlH * 0.72, { font: 'Marker', size: Math.min(48, lvlH * 0.26), color: j === 0 ? '#fff' : c.strong });
      ctx.restore();
    }
    if (t > allIn) {
      ctx.save(); ctx.globalAlpha *= range(t, allIn, allIn + 0.3);
      text(ctx, '* Finals: até 1.500 se vencer invicto', W / 2, base + 50, { font: 'Hand', size: 32, color: c.ink });
      ctx.restore();
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 15. Head to head
// ---------------------------------------------------------------------------
export const h2h = {
  id: 'h2h', name: 'H2H · Confronto Direto', sports: TEN, category: 'tenis', defaultDuration: 5,
  desc: 'Dois tenistas lado a lado: fotos, bandeiras, placar do confronto e estatísticas com barras.',
  fields: [
    { key: 'p1', label: 'Jogador(a) 1', type: 'text', default: 'SINNER' },
    { key: 'c1', label: 'País 1 (sigla: IT, BR, ES…)', type: 'text', default: 'IT' },
    { key: 'photo1', label: 'Foto 1', type: 'image', defaultFrame: 'cutout' },
    { key: 'p2', label: 'Jogador(a) 2', type: 'text', default: 'ALCARAZ' },
    { key: 'c2', label: 'País 2', type: 'text', default: 'ES' },
    { key: 'photo2', label: 'Foto 2', type: 'image', defaultFrame: 'cutout' },
    { key: 'score', label: 'Placar do confronto (ex.: 5 x 8)', type: 'text', default: '5 x 8' },
    { key: 'stats', label: 'Estatísticas (uma por linha: Nome: 1 | 2)', type: 'textarea', default: 'Títulos: 18 | 21\nGrand Slams: 4 | 6\nSemanas nº 1: 60 | 40' },
    ...titleFields('', ''),
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0 + 0.1, s: 'whoosh', label: 'jogadores entram' }, { t: t0 + 0.7, s: 'pop', label: 'placar' }, ...lines(P.stats).map((_, i) => ({ t: t0 + 1.1 + i * 0.3, s: 'pop', label: `estatística ${i + 1}` }))];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    if (P.title || P.subtitle) heading(rc, f, { y: 150, size: 80 });
    const k = ease.outExpo(range(t, f.t0 + 0.1, f.t0 + 0.6));
    const py = 560;
    [1, 2].forEach((n) => {
      const left = n === 1;
      const x = left ? W * 0.26 - (1 - k) * 600 : W * 0.74 + (1 - k) * 600;
      photo(rc, `photo${n}`, { x, y: py, w: 360, h: 420, rot: left ? -0.03 : 0.03, seed: 50 + n });
      const name = P[`p${n}`] || '';
      card(ctx, rc, x - 210, py + 230, 420, 100, { fill: '#fbfaf6', r: 50 });
      text(ctx, name.toUpperCase(), x, py + 282, { font: pickFont(rc, P.titleFont), size: 56, color: c.ink, maxWidth: 380 });
      emoji(ctx, flagEmoji(P[`c${n}`]), x + (left ? -150 : 150), py - 200, 64);
    });
    const sk = pop(t, f.t0 + 0.7, 0.4, 2.2);
    popIn(ctx, W / 2, py, sk, () => {
      ctx.fillStyle = c.strong;
      ctx.beginPath(); ctx.arc(W / 2, py, 100, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'H2H', W / 2, py - 40, { font: 'Hand', size: 34, color: '#fff' });
      text(ctx, P.score, W / 2, py + 18, { font: 'Marker', size: 54, color: '#fff' });
    });
    let y = py + 420;
    lines(P.stats).forEach((l, i) => {
      const m = l.match(/^(.*?):\s*([\d.,]+)\s*\|\s*([\d.,]+)/);
      if (!m) return;
      const a = parseFloat(m[2].replace(',', '.')), b = parseFloat(m[3].replace(',', '.'));
      const st = f.t0 + 1.1 + i * 0.3;
      const kk = ease.outCubic(range(t, st, st + 0.6));
      if (kk <= 0) return;
      ctx.save(); ctx.globalAlpha *= clamp(kk * 2);
      text(ctx, m[1].trim(), W / 2, y, { font: 'Hand', size: 40, color: c.ink });
      const tot = a + b || 1, bw = (W - 300) / 2;
      card(ctx, rc, W / 2 - 20 - bw * (a / Math.max(a, b)) * kk, y + 34, bw * (a / Math.max(a, b)) * kk, 30, { fill: a >= b ? c.strong : c.soft, r: 15, shadow: false });
      card(ctx, rc, W / 2 + 20, y + 34, bw * (b / Math.max(a, b)) * kk, 30, { fill: b >= a ? c.strong : c.soft, r: 15, shadow: false });
      text(ctx, m[2], 70, y + 49, { font: 'Marker', size: 44, color: c.ink, align: 'left' });
      text(ctx, m[3], W - 70, y + 49, { font: 'Marker', size: 44, color: c.ink, align: 'right' });
      ctx.restore();
      void tot;
      y += 140;
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 16. Match duration clock
// ---------------------------------------------------------------------------
export const matchClock = {
  id: 'matchClock', name: 'Relógio de Duração', sports: TEN, category: 'tenis', defaultDuration: 4,
  desc: 'Relógio com os ponteiros girando até a duração da partida, e o tempo contando ao lado.',
  fields: [
    { key: 'hours', label: 'Horas', type: 'range', min: 0, max: 12, step: 1, default: 5 },
    { key: 'minutes', label: 'Minutos', type: 'range', min: 0, max: 59, step: 1, default: 53 },
    ...titleFields('', 'a final mais longa da história'),
    ...styleFields(), ...bgFields(),
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.3, max: 0.7, step: 0.01, default: 0.45, group: 'Layout' },
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0, s: 'pop', label: 'relógio' }, { t: t0 + 0.35, s: 'whoosh', label: 'ponteiros girando' }, { t: t0 + 2.4, s: 'pop', label: 'tempo final' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    if (P.title || P.subtitle) heading(rc, f, { y: 180 });
    const cy = H * P.posY, cx = W / 2, R = 300;
    const k = pop(t, f.t0, 0.4, 1.8);
    const total = P.hours * 60 + P.minutes;
    const run = ease.inOutQuart(range(t, f.t0 + 0.35, f.t0 + 2.4));
    const mins = total * run;
    popIn(ctx, cx, cy, k, () => {
      ctx.fillStyle = '#fbfaf6';
      ctx.strokeStyle = c.strong; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // elapsed arc
      ctx.strokeStyle = c.soft; ctx.lineWidth = 34; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R - 46, -Math.PI / 2, -Math.PI / 2 + Math.min(Math.PI * 2 * 0.999, (mins / 720) * Math.PI * 2)); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * (R - 18), cy - Math.cos(a) * (R - 18)); ctx.lineTo(cx + Math.sin(a) * (R - 52), cy - Math.cos(a) * (R - 52)); ctx.stroke();
      }
      const hand = (ang, len, w2, col) => { ctx.strokeStyle = col; ctx.lineWidth = w2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang) * len, cy - Math.cos(ang) * len); ctx.stroke(); };
      hand((mins / 720) * Math.PI * 2, R * 0.5, 16, c.ink);
      hand(((mins % 60) / 60) * Math.PI * 2, R * 0.78, 9, c.strong);
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
    });
    const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
    const dk = pop(t, f.t0 + 2.4, 0.35, 2.2);
    ctx.save(); ctx.globalAlpha *= clamp(k);
    popIn(ctx, cx, cy + R + 130, t > f.t0 + 2.4 ? dk : 1, () => {
      text(ctx, `${h}h ${String(m).padStart(2, '0')}min`, cx, cy + R + 130, { font: 'Marker', size: 120, color: c.ink });
    });
    ctx.restore();
    ctx.restore();
  },
};

void wrapLines; void setFont; void stamp;
