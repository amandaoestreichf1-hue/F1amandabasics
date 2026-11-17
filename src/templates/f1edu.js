// F1 didactic set: weekend timeline, qualifying knock-outs, points, flags, penalties,
// category ladder, starting grid, team radio and team org chart.
import { handArrow } from '../lib/paper.js';
import { TEAMS } from '../lib/teams.js';
import {
  ease, range, clamp, revealText, pop, frame, bgFields, titleFields, styleFields, bgCue, colors, heading,
  card, text, measure, pill, popIn, lines, photo, lerp, fmtNumber, pickFont, wrapLines, setFont, emoji, flagEmoji,
} from './kit.js';
import { stamp } from '../lib/paper.js';

const F1 = ['f1'];

// ---------------------------------------------------------------------------
// 1. Race weekend timeline
// ---------------------------------------------------------------------------
const WEEKEND = {
  normal: 'SEX · Treino Livre 1\nSEX · Treino Livre 2\nSÁB · Treino Livre 3\nSÁB · Classificação\nDOM · Corrida',
  sprint: 'SEX · Treino Livre 1\nSEX · Classificação Sprint\nSÁB · Sprint\nSÁB · Classificação\nDOM · Corrida',
};
export const weekend = {
  id: 'weekend', name: 'Fim de Semana de Corrida', sports: F1, category: 'didatico', defaultDuration: 4.5,
  desc: 'Linha do tempo do fim de semana: treinos, sprint, classificação e corrida, com destaque no que importa.',
  fields: [
    ...titleFields('FIM DE SEMANA DE CORRIDA', ''),
    { key: 'format', label: 'Formato', type: 'select', options: [['normal', 'Normal (3 treinos livres)'], ['sprint', 'Sprint']], default: 'normal' },
    { key: 'items', label: 'Etapas (uma por linha: DIA · Nome · hora) — vazio = padrão', type: 'textarea', default: '' },
    { key: 'focus', label: 'Destacar etapa nº (0 = nenhuma)', type: 'range', min: 0, max: 8, step: 1, default: 0 },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const n = lines(P.items || WEEKEND[P.format]).length;
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0 + 0.3, s: 'whoosh', label: 'linha do tempo' }, ...Array.from({ length: n }, (_, i) => ({ t: t0 + 0.5 + i * 0.22, s: 'pop', label: `etapa ${i + 1}` })), ...(P.focus ? [{ t: t0 + 0.6 + n * 0.22, s: 'pop', label: 'destaque' }] : [])];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 210 }) + 60;
    const items = lines(P.items || WEEKEND[P.format]).map((l) => l.split('·').map((x) => x.trim()));
    const n = items.length;
    const rowH = Math.min(210, (H - 260 - top) / n);
    const lx = 190;
    const lineK = ease.inOutQuart(range(t, f.t0 + 0.3, f.t0 + 0.3 + 0.2 * n));
    ctx.strokeStyle = c.strong; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, top + (n - 0.5) * rowH * lineK); ctx.stroke();
    const allIn = f.t0 + 0.6 + n * 0.22;
    items.forEach(([day, name, hour], i) => {
      const y = top + i * rowH + rowH * 0.25;
      const st = f.t0 + 0.5 + i * 0.22;
      const k = pop(t, st, 0.3, 1.8);
      if (k <= 0) return;
      const isF = P.focus === i + 1 && t > allIn;
      const dim = P.focus && t > allIn && !isF ? 0.4 : 1;
      ctx.save(); ctx.globalAlpha *= dim;
      popIn(ctx, lx, y, k, () => {
        ctx.fillStyle = isF ? c.strong : '#fbfaf6';
        ctx.strokeStyle = c.strong; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(lx, y, isF ? 26 : 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      const slide = ease.outExpo(range(t, st, st + 0.4));
      const cx = lx + 60 + (1 - slide) * 300;
      const cw = W - cx - 70, ch = Math.min(150, rowH - 30);
      ctx.globalAlpha *= clamp(slide * 2);
      const pulse = isF ? 1 + 0.03 * Math.sin(t * 6) : 1;
      popIn(ctx, cx + cw / 2, y, pulse, () => {
        card(ctx, rc, cx, y - ch / 2, cw, ch, { fill: isF ? c.soft : '#fbfaf6' });
        if (day) pill(ctx, rc, cx + 30 + measure(ctx, day, 'Hand', 32) / 2 + 20, y - ch / 2 + 2, day, { size: 32, fill: c.strong });
        text(ctx, name || day, cx + 34, y + 12, { font: pickFont(rc, P.titleFont), size: 56, color: c.ink, align: 'left', maxWidth: cw - 200 });
        if (hour) text(ctx, hour, cx + cw - 30, y + 12, { font: 'Marker', size: 44, color: c.ink, align: 'right' });
      });
      ctx.restore();
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 2. Qualifying Q1 / Q2 / Q3
// ---------------------------------------------------------------------------
export const qualifying = {
  id: 'qualifying', name: 'Classificação Q1 · Q2 · Q3', sports: F1, category: 'didatico', defaultDuration: 8,
  desc: 'Os 22 do grid e as eliminações em blocos: Q1 tira 6, Q2 tira 6, Q3 decide a pole.',
  fields: [
    { key: 'cars', label: 'Carros no grid', type: 'select', options: [['22', '22 (2026)'], ['20', '20']], default: '22' },
    { key: 'names', label: 'Pilotos na ordem final (um por linha, opcional)', type: 'textarea', default: '' },
    { key: 'showNotes', label: 'Explicação de cada fase', type: 'toggle', default: true },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P, dur) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const ph = (dur - t0 - 1.4) / 3;
    return [...bgCue(P), { t: t0, s: 'pop', label: 'grid aparece' }, ...[0, 1, 2].map((i) => ({ t: t0 + 1.1 + i * ph, s: 'whoosh', label: `Q${i + 1}` })), { t: t0 + 1.1 + ph - 0.3, s: 'pop', label: 'eliminados Q1' }, { t: t0 + 1.1 + 2 * ph - 0.3, s: 'pop', label: 'eliminados Q2' }, { t: t0 + 1.1 + 3 * ph - 0.4, s: 'pop', label: 'pole' }];
  },
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    const n = parseInt(P.cars, 10) || 22;
    const out1 = n === 22 ? 6 : 5, out2 = n === 22 ? 6 : 5;
    const names = lines(P.names);
    const dd = rc.realDur ?? dur;
    const ph = Math.max(1, (dd - f.t0 - 1.4) / 3);
    const q = [f.t0 + 1.1, f.t0 + 1.1 + ph, f.t0 + 1.1 + 2 * ph];
    const phase = t < q[0] ? 0 : t < q[1] ? 1 : t < q[2] ? 2 : 3;
    const elim1 = range(t, q[1] - 0.45, q[1] - 0.1), elim2 = range(t, q[2] - 0.45, q[2] - 0.1);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = 150, rowH = Math.min(70, (H - 300) / n);
    const lx = 70, lw = 560;
    for (let i = 0; i < n; i++) {
      const y = top + i * rowH;
      const k = pop(t, f.t0 + i * 0.03, 0.25, 1.6);
      if (k <= 0) continue;
      const pos = i + 1;
      const outQ1 = pos > n - out1, outQ2 = !outQ1 && pos > n - out1 - out2;
      const gone = (outQ1 && elim1 > 0) ? elim1 : (outQ2 && elim2 > 0) ? elim2 : 0;
      const inQ3 = pos <= n - out1 - out2;
      const glow = inQ3 && t > q[2] ? 0.5 + 0.5 * Math.sin(t * 5 + i * 0.4) : 0;
      ctx.save();
      ctx.globalAlpha *= 1 - 0.6 * gone;
      popIn(ctx, lx, y + rowH / 2, k, () => {
        card(ctx, rc, lx, y + 4, lw, rowH - 8, { fill: gone > 0.5 ? '#e7e3ea' : inQ3 && t > q[2] ? c.soft : '#fbfaf6', r: 18, shadow: false, stroke: glow ? c.strong : null, lw: 3 + 3 * glow });
        text(ctx, `P${pos}`, lx + 26, y + rowH / 2 + 2, { font: 'Marker', size: rowH * 0.5, color: c.strong, align: 'left' });
        text(ctx, names[i] || '', lx + 140, y + rowH / 2 + 2, { font: pickFont(rc, P.titleFont), size: rowH * 0.56, color: c.ink, align: 'left', maxWidth: lw - 170 });
        if (gone > 0) {
          ctx.strokeStyle = '#e2627d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(lx + 16, y + rowH / 2); ctx.lineTo(lx + 16 + (lw - 32) * ease.outCubic(gone), y + rowH / 2); ctx.stroke();
        }
      });
      ctx.restore();
    }
    // group brackets on the list
    const brk = (a, b, label, k, color) => {
      if (k <= 0) return;
      const y0 = top + (a - 1) * rowH + 8, y1 = top + b * rowH - 8, x = lx + lw + 26;
      ctx.save(); ctx.globalAlpha *= clamp(k * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 18, y0); ctx.lineTo(x + 18, y1); ctx.lineTo(x, y1); ctx.stroke();
      text(ctx, label, x + 40, (y0 + y1) / 2, { font: 'Hand', size: 36, color, align: 'left', maxWidth: W - x - 60 });
      ctx.restore();
    };
    brk(n - out1 + 1, n, 'saem no Q1', elim1, '#e2627d');
    brk(n - out1 - out2 + 1, n - out1, 'saem no Q2', elim2, '#e2627d');
    if (phase === 3) brk(1, n - out1 - out2, 'disputam a pole', range(t, q[2], q[2] + 0.3), c.strong);
    // phase label
    if (phase > 0) {
      const st = q[phase - 1];
      const k = pop(t, st, 0.35, 2);
      const notes = [`${n} carros · os ${out1} mais lentos saem`, `${n - out1} carros · mais ${out2} saem`, `top ${n - out1 - out2} · vale a pole position`];
      popIn(ctx, W - 190, 260, k, () => {
        card(ctx, rc, W - 330, 170, 280, 180, { fill: c.strong, r: 40 });
        text(ctx, `Q${phase}`, W - 190, 262, { font: 'Marker', size: 120, color: '#ffffff' });
      });
      if (P.showNotes) {
        ctx.save(); ctx.globalAlpha *= clamp(k);
        setFont(ctx, 'Hand', 40);
        const ls = wrapLines(ctx, notes[phase - 1], 300);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ls.forEach((l, i) => text(ctx, l, W - 190, 400 + i * 48, { font: 'Hand', size: 40, color: c.ink }));
        ctx.restore();
      }
      if (phase === 3) stamp(ctx, { x: lx + lw - 70, y: top + rowH / 2 - 6, text: 'POLE', color: c.strong, width: 220, rot: 0.1, progress: range(t, q[2] + 0.4, q[2] + 0.7) });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 3. Points system
// ---------------------------------------------------------------------------
const PTS = { race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], sprint: [8, 7, 6, 5, 4, 3, 2, 1] };
export const pointsTable = {
  id: 'pointsTable', name: 'Sistema de Pontos', sports: F1, category: 'didatico', defaultDuration: 5.5,
  desc: 'A tabela 25 · 18 · 15… se montando, e as contas do campeonato logo abaixo.',
  fields: [
    ...titleFields('SISTEMA DE PONTOS', ''),
    { key: 'kind', label: 'Tabela', type: 'select', options: [['race', 'Corrida (top 10)'], ['sprint', 'Sprint (top 8)']], default: 'race' },
    { key: 'math', label: 'Contas (uma por linha: NOME: pontos + pontos)', type: 'textarea', default: 'NOR: 340 + 25\nVER: 321 + 18' },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const n = PTS[P.kind].length;
    return [...bgCue(P), ...Array.from({ length: n }, (_, i) => ({ t: t0 + 0.4 + i * 0.12, s: 'pop', label: `${i + 1}º` })), ...lines(P.math).map((_, i) => ({ t: t0 + 0.6 + n * 0.12 + i * 0.5, s: 'typing', d: 0.4, label: `conta ${i + 1}` }))];
  },
  render(rc) {
    const { ctx, W, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 190 }) + 40;
    const pts = PTS[P.kind];
    const rowH = 82, bx = 220, bwMax = W - bx - 190;
    pts.forEach((p, i) => {
      const y = top + i * rowH;
      const st = f.t0 + 0.4 + i * 0.12;
      const k = pop(t, st, 0.3, 2);
      if (k <= 0) return;
      popIn(ctx, 140, y, k, () => {
        ctx.fillStyle = i === 0 ? c.strong : '#fbfaf6'; ctx.strokeStyle = c.strong; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(140, y, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        text(ctx, `${i + 1}`, 140, y + 3, { font: 'Marker', size: 34, color: i === 0 ? '#fff' : c.ink });
      });
      const grow = ease.outCubic(range(t, st + 0.05, st + 0.55));
      const bw = Math.max(26, (bwMax * p) / pts[0]) * grow;
      card(ctx, rc, bx, y - 22, bw, 44, { fill: i === 0 ? c.strong : c.soft, r: 22, shadow: false });
      text(ctx, Math.round(p * grow), bx + bw + 24, y + 2, { font: 'Marker', size: 48, color: c.ink, align: 'left' });
    });
    // championship maths
    let y = top + pts.length * rowH + 50;
    lines(P.math).forEach((l, i) => {
      const m = l.match(/^\s*([^:]+):\s*([\d.]+)\s*\+\s*([\d.]+)/);
      if (!m) return;
      const st = f.t0 + 0.6 + pts.length * 0.12 + i * 0.5;
      const k = pop(t, st, 0.3, 1.8);
      if (k <= 0) return;
      const a = parseFloat(m[2]), b = parseFloat(m[3]);
      const sumK = ease.outCubic(range(t, st + 0.35, st + 0.9));
      popIn(ctx, W / 2, y, k, () => {
        card(ctx, rc, 70, y - 50, W - 140, 100, { fill: '#fbfaf6', r: 50 });
        text(ctx, m[1].trim().toUpperCase(), 110, y + 4, { font: pickFont(rc, P.titleFont), size: 52, color: c.ink, align: 'left' });
        text(ctx, `${fmtNumber(a)} + ${fmtNumber(b)} =`, W - 290, y + 4, { font: 'Hand', size: 48, color: c.ink, align: 'right' });
        text(ctx, fmtNumber(Math.round(lerp(a, a + b, sumK))), W - 110, y + 4, { font: 'Marker', size: 56, color: c.strong, align: 'right' });
      });
      y += 120;
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 4. Flags
// ---------------------------------------------------------------------------
export const FLAGS = [
  { id: 'green', name: 'VERDE', note: 'pista liberada', draw: (g, w, h) => { g.fillStyle = '#2fa84f'; g.fillRect(0, 0, w, h); } },
  { id: 'yellow', name: 'AMARELA', note: 'perigo: reduza e não ultrapasse', draw: (g, w, h) => { g.fillStyle = '#f6d32b'; g.fillRect(0, 0, w, h); } },
  { id: 'double', name: 'DUPLA AMARELA', note: 'perigo grande: prepare-se para parar', draw: (g, w, h) => { g.fillStyle = '#f6d32b'; g.fillRect(0, 0, w, h); } , double: true },
  { id: 'red', name: 'VERMELHA', note: 'sessão interrompida', draw: (g, w, h) => { g.fillStyle = '#e23b3b'; g.fillRect(0, 0, w, h); } },
  { id: 'blue', name: 'AZUL', note: 'deixe o mais rápido passar', draw: (g, w, h) => { g.fillStyle = '#2c6fe0'; g.fillRect(0, 0, w, h); } },
  { id: 'white', name: 'BRANCA', note: 'carro lento na pista', draw: (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); } },
  { id: 'slippery', name: 'LISTRADA', note: 'pista escorregadia', draw: (g, w, h) => { g.fillStyle = '#f6d32b'; g.fillRect(0, 0, w, h); g.fillStyle = '#e23b3b'; for (let x = 0; x < w; x += w / 5) g.fillRect(x + w / 10, 0, w / 10, h); } },
  { id: 'blackwhite', name: 'PRETA E BRANCA', note: 'advertência por conduta', draw: (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(0, h); g.closePath(); g.fill(); } },
  { id: 'meatball', name: 'PRETA COM LARANJA', note: 'problema mecânico: vá aos boxes', draw: (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#f08a24'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); g.fill(); } },
  { id: 'black', name: 'PRETA', note: 'desclassificado', draw: (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); } },
  { id: 'chequered', name: 'QUADRICULADA', note: 'fim da sessão', draw: (g, w, h) => { const s = w / 8; for (let y = 0; y * s < h; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * s, y * s, s, s); } } },
];
const flagCache = new Map();
function flagCanvas(fl) {
  if (flagCache.has(fl.id)) return flagCache.get(fl.id);
  const c = document.createElement('canvas');
  c.width = 360; c.height = 240;
  fl.draw(c.getContext('2d'), 360, 240);
  flagCache.set(fl.id, c);
  return c;
}
// waving flag on a pole; (x, y) = top of pole
export function drawFlag(ctx, fl, x, y, w, t, opts = {}) {
  const wave = opts.wave ?? 1;
  const h = w * (240 / 360);
  const src = flagCanvas(fl);
  ctx.save();
  ctx.fillStyle = '#5b5560';
  ctx.fillRect(x - 7, y - 10, 14, h * (opts.pole ?? 1.6));
  ctx.beginPath(); ctx.arc(x, y - 12, 12, 0, Math.PI * 2); ctx.fill();
  const strips = 36;
  for (let i = 0; i < strips; i++) {
    const u = i / strips;
    const off = Math.sin(u * 5 - t * 7) * 14 * u * wave;
    const shade = 0.9 + 0.1 * Math.cos(u * 5 - t * 7);
    ctx.globalAlpha = 1;
    ctx.drawImage(src, (u * src.width), 0, src.width / strips + 1, src.height, x + u * w, y + off, w / strips + 1, h);
    if (shade < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - shade) * 1.2})`; ctx.fillRect(x + u * w, y + off, w / strips + 1, h); }
  }
  ctx.strokeStyle = 'rgba(31,27,36,0.25)'; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  return h;
}
export const flagsBoard = {
  id: 'flagsBoard', name: 'Bandeiras', sports: F1, category: 'didatico', defaultDuration: 3.5,
  desc: 'Uma bandeira tremulando com nome e significado, ou a cartela completa aparecendo uma a uma.',
  fields: [
    { key: 'mode', label: 'Mostrar', type: 'select', options: [['single', 'Uma bandeira (pra puxar enquanto grava)'], ['board', 'Cartela com todas']], default: 'single' },
    { key: 'flag', label: 'Bandeira', type: 'select', options: FLAGS.map((f) => [f.id, f.name.charAt(0) + f.name.slice(1).toLowerCase()]), default: 'yellow', showIf: (P) => P.mode === 'single' },
    { key: 'note', label: 'Significado (vazio = padrão)', type: 'text', default: '', showIf: (P) => P.mode === 'single' },
    ...titleFields('', ''),
    ...styleFields(), ...bgFields('none'),
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.2, max: 0.7, step: 0.01, default: 0.42, group: 'Layout' },
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    if (P.mode === 'single') return [...bgCue(P), { t: t0, s: 'whoosh', label: 'bandeira entra' }, { t: t0 + 0.35, s: 'typing', d: 0.5, label: 'nome e significado' }];
    return [...bgCue(P), ...FLAGS.map((fl, i) => ({ t: t0 + 0.3 + i * 0.16, s: 'pop', label: fl.name.toLowerCase() }))];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const glow = P.bg === 'none' ? 'rgba(255,255,255,0.9)' : null;
    if (P.mode === 'single') {
      const fl = FLAGS.find((x) => x.id === P.flag) || FLAGS[0];
      const k = ease.outBack(range(t, f.t0, f.t0 + 0.45), 1.4);
      const cy = H * P.posY;
      const fw = 520;
      ctx.save();
      ctx.translate(W / 2, cy + 300);
      ctx.rotate((1 - k) * -0.6);
      ctx.translate(-W / 2, -(cy + 300));
      ctx.globalAlpha *= clamp(k * 2);
      const fx = W / 2 - fw / 2 + (fl.double ? -60 : 0);
      drawFlag(ctx, fl, fx, cy - 200, fw, t);
      if (fl.double) drawFlag(ctx, fl, fx + 130, cy - 150, fw, t + 0.3);
      ctx.restore();
      revealText(ctx, fl.name, { x: W / 2, y: cy + 330, fontId: pickFont(rc, P.titleFont), size: 96, color: c.ink, start: f.t0 + 0.35, per: 0.1, t, glow });
      revealText(ctx, P.note || fl.note, { x: W / 2, y: cy + 420, fontId: 'Hand', size: 50, color: c.ink, start: f.t0 + 0.55, per: 0.07, t, maxWidth: W * 0.85, glow });
    } else {
      const top = (P.title ? heading(rc, f, { y: 170 }) : 120) + 30;
      const cols = 2, cw = (W - 140) / cols, chh = Math.min(250, (H - top - 80) / Math.ceil(FLAGS.length / cols));
      FLAGS.forEach((fl, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = 70 + col * cw, y = top + row * chh;
        const k = pop(t, f.t0 + 0.3 + i * 0.16, 0.3, 1.8);
        popIn(ctx, x + cw / 2, y + chh / 2, k, () => {
          card(ctx, rc, x + 10, y + 8, cw - 20, chh - 16, { fill: '#fbfaf6', r: 24 });
          const fw2 = Math.min(150, chh * 0.62);
          drawFlag(ctx, fl, x + 44, y + 40, fw2, t + i * 0.4, { wave: 0.5 });
          text(ctx, fl.name, x + 44 + fw2 + 30, y + chh * 0.4, { font: pickFont(rc, P.titleFont), size: 36, color: c.ink, align: 'left', maxWidth: cw - fw2 - 110 });
          setFont(ctx, 'Hand', 28);
          const ls = wrapLines(ctx, fl.note, cw - fw2 - 100).slice(0, 3);
          if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
          ls.forEach((l, j) => text(ctx, l, x + 44 + fw2 + 30, y + chh * 0.4 + 40 + j * 30, { font: 'Hand', size: 27, color: c.ink, align: 'left' }));
        });
      });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 5. Penalty ladder
// ---------------------------------------------------------------------------
const PENALTIES = 'Advertência\n5 segundos\n10 segundos\nDrive-through\nStop and go (10s)\nPerda de posições no grid\nDesclassificação';
const sevColor = (k) => {
  const stops = [[95, 191, 138], [246, 201, 43], [240, 138, 36], [226, 98, 125]];
  const x = k * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), u = x - i;
  const [a, b] = [stops[i], stops[i + 1]];
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * u)).join(',')})`;
};
export const penalties = {
  id: 'penalties', name: 'Escada de Punições', sports: F1, category: 'didatico', defaultDuration: 4.5,
  desc: 'Da mais leve à mais grave: advertência, 5s, 10s, drive-through, stop and go…',
  fields: [
    ...titleFields('PUNIÇÕES', 'da mais leve à mais grave'),
    { key: 'items', label: 'Degraus (da mais leve para a mais grave)', type: 'textarea', default: PENALTIES },
    { key: 'focus', label: 'Destacar degrau nº (0 = nenhum)', type: 'range', min: 0, max: 10, step: 1, default: 0 },
    { key: 'note', label: 'Nota no destaque', type: 'text', default: '', showIf: (P) => P.focus > 0 },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const n = lines(P.items).length;
    return [...bgCue(P), ...Array.from({ length: n }, (_, i) => ({ t: t0 + 0.4 + i * 0.18, s: 'pop', label: `degrau ${i + 1}` })), ...(P.focus ? [{ t: t0 + 0.6 + n * 0.18, s: 'pop', label: 'destaque' }] : [])];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    heading(rc, f, { y: 180 });
    const items = lines(P.items);
    const n = items.length;
    const bottom = H - 220, top = 420;
    const stepH = Math.min(150, (bottom - top) / n);
    const allIn = f.t0 + 0.6 + n * 0.18;
    items.forEach((name, i) => {
      const y = bottom - (i + 1) * stepH;
      const x = 110 + (i / Math.max(1, n - 1)) * 220;
      const w = W - x - 70;
      const st = f.t0 + 0.4 + i * 0.18;
      const k = ease.outExpo(range(t, st, st + 0.4));
      if (k <= 0) return;
      const isF = P.focus === i + 1 && t > allIn;
      const dim = P.focus && t > allIn && !isF ? 0.45 : 1;
      ctx.save(); ctx.globalAlpha *= dim * clamp(k * 2);
      const pulse = isF ? 1 + 0.025 * Math.sin(t * 6) : 1;
      popIn(ctx, x + w / 2, y + stepH / 2, pulse, () => {
        card(ctx, rc, x + (1 - k) * 200, y + 8, w, stepH - 16, { fill: sevColor(i / Math.max(1, n - 1)), r: 24 });
        text(ctx, name, x + 40 + (1 - k) * 200, y + stepH / 2 + 2, { font: pickFont(rc, P.titleFont), size: Math.min(58, stepH * 0.42), color: '#1f1b24', align: 'left', maxWidth: w - 80 });
      });
      ctx.restore();
      if (isF && P.note) revealText(ctx, P.note, { x: x + w - 30, y: y - 6, fontId: 'Hand', size: 40, color: c.ink, align: 'right', start: allIn + 0.1, per: 0.07, t });
    });
    // arrow "mais grave"
    const ak = ease.outCubic(range(t, f.t0 + 0.4, f.t0 + 0.4 + n * 0.18));
    handArrow(ctx, 56, bottom - 10, 56, bottom - n * stepH + 10, { color: c.strong, width: 7, progress: ak, seed: 4, bend: 0, head: 26 });
    ctx.save(); ctx.globalAlpha *= ak;
    text(ctx, 'mais leve', 40, bottom + 34, { font: 'Hand', size: 36, color: c.ink, align: 'left' });
    text(ctx, 'mais grave', 40, bottom - n * stepH - 34, { font: 'Hand', size: 36, color: c.ink, align: 'left' });
    ctx.restore();
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 6. Category ladder
// ---------------------------------------------------------------------------
const LADDERS = {
  fia: { steps: 'F4\nF3\nF2\nF1', branch: 'F1 Academy', branchFrom: 1 },
  indy: { steps: 'USF Juniors\nUSF2000\nUSF Pro 2000\nIndy NXT\nIndyCar', branch: '', branchFrom: 0 },
};
export const ladder = {
  id: 'ladder', name: 'Escada das Categorias', sports: F1, category: 'didatico', defaultDuration: 4.5,
  desc: 'F4 → F3 → F2 → F1 com a F1 Academy ao lado, ou a escada da IndyCar.',
  fields: [
    { key: 'preset', label: 'Escada', type: 'select', options: [['fia', 'Fórmula (F4 → F1) + F1 Academy'], ['indy', 'IndyCar']], default: 'fia' },
    ...titleFields('ESCADA ATÉ A F1', ''),
    { key: 'steps', label: 'Degraus (vazio = padrão; de baixo para cima)', type: 'textarea', default: '' },
    { key: 'branch', label: 'Categoria ao lado (vazio = padrão; "-" = nenhuma)', type: 'text', default: '' },
    { key: 'focus', label: 'Destacar degrau nº (0 = nenhum)', type: 'range', min: 0, max: 8, step: 1, default: 0 },
    { key: 'note', label: 'Nota no destaque', type: 'text', default: '', showIf: (P) => P.focus > 0 },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const n = lines(P.steps || LADDERS[P.preset].steps).length;
    return [...bgCue(P), ...Array.from({ length: n }, (_, i) => ({ t: t0 + 0.4 + i * 0.3, s: 'pop', label: `degrau ${i + 1}` }))];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    heading(rc, f, { y: 190 });
    const L = LADDERS[P.preset];
    const steps = lines(P.steps || L.steps);
    const branch = P.branch === '-' ? '' : P.branch || L.branch;
    const n = steps.length;
    const base = H - 260, stepW = (W - 160) / n, stepH = Math.min(190, (base - 520) / n);
    const allIn = f.t0 + 0.4 + n * 0.3;
    steps.forEach((name, i) => {
      const x = 80 + i * stepW;
      const h = (i + 1) * stepH;
      const st = f.t0 + 0.4 + i * 0.3;
      const k = ease.outBack(range(t, st, st + 0.4), 1.4);
      if (k <= 0) return;
      const isF = P.focus === i + 1 && t > allIn;
      const last = i === n - 1;
      ctx.save();
      ctx.globalAlpha *= P.focus && t > allIn && !isF ? 0.5 : 1;
      const hh = h * Math.min(1, k);
      card(ctx, rc, x + 6, base - hh, stepW - 12, hh, { fill: last ? c.strong : isF ? c.soft : '#fbfaf6', r: 20, stroke: c.strong, lw: 4 });
      const fs = Math.min(64, (stepW - 30) / Math.max(2.2, name.length * 0.55));
      text(ctx, name, x + stepW / 2, base - hh + 48, { font: pickFont(rc, P.titleFont), size: fs, color: last ? '#fff' : c.ink, maxWidth: stepW - 24 });
      ctx.restore();
      if (isF && P.note) revealText(ctx, P.note, { x: clamp(x + stepW / 2, 220, W - 220), y: base - hh - 60, fontId: 'Hand', size: 40, color: c.ink, start: allIn + 0.1, per: 0.07, t, maxWidth: W * 0.6 });
    });
    // little climber arrow
    const ak = ease.inOutQuart(range(t, f.t0 + 0.6, allIn));
    handArrow(ctx, 90, base - stepH - 90, 80 + (n - 0.5) * stepW, base - n * stepH - 90, { color: c.strong, width: 6, progress: ak, seed: 9, bend: 0.12, head: 30 });
    if (branch && P.preset === 'fia') {
      const bk = pop(t, allIn, 0.4, 1.8);
      const from = L.branchFrom;
      const bx = 80 + from * stepW + stepW / 2, by = base - (from + 1) * stepH;
      popIn(ctx, bx, by - 330, bk, () => {
        card(ctx, rc, bx - 170, by - 400, 340, 110, { fill: '#f3c6da', r: 30, stroke: c.strong, lw: 4 });
        text(ctx, branch, bx, by - 344, { font: pickFont(rc, P.titleFont), size: 54, color: c.ink, maxWidth: 300 });
      });
      if (bk > 0) {
        ctx.save(); ctx.setLineDash([14, 12]);
        handArrow(ctx, bx, by - 290, bx, by - 20, { color: c.strong, width: 5, progress: ease.outCubic(range(t, allIn + 0.2, allIn + 0.6)), seed: 3, bend: 0, head: 0 });
        ctx.restore();
        text(ctx, 'categoria feminina', bx, by - 430, { font: 'Hand', size: 32, color: c.ink });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 7. Starting grid
// ---------------------------------------------------------------------------
export const startGrid = {
  id: 'startGrid', name: 'Grid de Largada', sports: F1, category: 'didatico', defaultDuration: 5,
  desc: 'Os 22 slots se preenchendo, com setas verdes e vermelhas de quem ganhou ou perdeu posições.',
  fields: [
    ...titleFields('GRID DE LARGADA', ''),
    { key: 'rows', label: 'Pilotos na ordem do grid (um por linha: NOME +3 ou NOME -2)', type: 'textarea', default: 'NOR +2\nVER -1\nLEC\nPIA +1\nHAM -3\nRUS\nSAI +4\nALO\nGAS -2\nALB' },
    { key: 'cars', label: 'Slots', type: 'select', options: [['22', '22'], ['20', '20']], default: '22' },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const n = parseInt(P.cars, 10);
    return [...bgCue(P), { t: t0 + 0.3, s: 'pop', label: 'slots preenchendo' }, { t: t0 + 0.4 + n * 0.08, s: 'whoosh', label: 'setas' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 150, size: 80 }) + 10;
    const n = parseInt(P.cars, 10) || 22;
    const entries = lines(P.rows).map((l) => { const m = l.match(/^(.*?)\s*([+-]\d+)?$/); return { name: m[1], d: m[2] ? parseInt(m[2], 10) : 0 }; });
    const rowsN = Math.ceil(n / 2);
    const rowH = Math.min(140, (H - top - 80) / (rowsN + 0.5));
    const slotW = 360, gap = 110;
    const arrowsAt = f.t0 + 0.4 + n * 0.08;
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      const x = left ? W / 2 - gap / 2 - slotW : W / 2 + gap / 2;
      const y = top + row * rowH + (left ? 0 : rowH * 0.5);
      const k = pop(t, f.t0 + 0.3 + i * 0.08, 0.3, 1.8);
      // painted grid box (always visible, faint)
      ctx.save();
      ctx.strokeStyle = 'rgba(47,42,54,0.35)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + slotW, y + 10); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + rowH * 0.62); ctx.moveTo(x + slotW, y + 10); ctx.lineTo(x + slotW, y + rowH * 0.62); ctx.stroke();
      text(ctx, `P${i + 1}`, left ? x - 18 : x + slotW + 18, y + rowH * 0.36, { font: 'Marker', size: 34, color: c.strong, align: left ? 'right' : 'left' });
      ctx.restore();
      const e = entries[i];
      if (!e || k <= 0) continue;
      popIn(ctx, x + slotW / 2, y + rowH * 0.36, k, () => {
        card(ctx, rc, x + 14, y + 22, slotW - 28, rowH * 0.56, { fill: i === 0 ? c.soft : '#fbfaf6', r: 18 });
        text(ctx, e.name.toUpperCase(), x + 40, y + 22 + rowH * 0.29, { font: pickFont(rc, P.titleFont), size: Math.min(48, rowH * 0.38), color: c.ink, align: 'left', maxWidth: slotW - 150 });
      });
      if (e.d && t > arrowsAt) {
        const ak = pop(t, arrowsAt + i * 0.05, 0.3, 2.2);
        const up = e.d > 0;
        const ax = x + slotW - 70, ay = y + 22 + rowH * 0.28;
        popIn(ctx, ax, ay, ak, () => {
          ctx.fillStyle = up ? '#3fb27f' : '#e2627d';
          ctx.beginPath(); ctx.arc(ax, ay, 34, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          if (up) { ctx.moveTo(ax, ay - 20); ctx.lineTo(ax + 16, ay); ctx.lineTo(ax - 16, ay); }
          else { ctx.moveTo(ax, ay + 20); ctx.lineTo(ax + 16, ay); ctx.lineTo(ax - 16, ay); }
          ctx.fill();
          text(ctx, `${up ? '+' : ''}${e.d}`, ax, ay + (up ? 12 : -10), { font: 'Marker', size: 22, color: '#fff' });
        });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 8. Team radio
// ---------------------------------------------------------------------------
export const teamRadio = {
  id: 'teamRadio', name: 'Rádio de Equipe', sports: F1, category: 'didatico', defaultDuration: 4,
  desc: 'Card de rádio com onda de áudio animada e a frase aparecendo como se estivesse sendo dita.',
  fields: [
    { key: 'driver', label: 'Quem fala', type: 'text', default: 'LANDO NORRIS' },
    { key: 'to', label: 'Linha de cima (ex.: PILOTO → EQUIPE)', type: 'text', default: 'PILOTO → EQUIPE' },
    { key: 'team', label: 'Cor da equipe', type: 'select', options: [['palette', 'Paleta atual'], ...TEAMS.filter((x) => x.id !== 'lilas').map((x) => [x.id, x.name])], default: 'palette' },
    { key: 'quote', label: 'Frase', type: 'textarea', default: 'Os pneus acabaram. Box, box.' },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.2, max: 0.8, step: 0.01, default: 0.45, group: 'Layout' },
    ...styleFields(), ...bgFields('none'),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0, s: 'whoosh', label: 'rádio entra' }, { t: t0 + 0.45, s: 'typing', d: String(P.quote || '').split(/\s+/).length * 0.12, label: 'frase' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    const team = TEAMS.find((x) => x.id === P.team);
    const tc = team ? team.palette.accent : c.strong;
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const cy = H * P.posY;
    const k = ease.outExpo(range(t, f.t0, f.t0 + 0.4));
    const x = 70 + (1 - k) * -700, w = W - 140;
    setFont(ctx, 'Hand', 52);
    const ql = wrapLines(ctx, `“${P.quote}”`, w - 120);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const h = 260 + ql.length * 64;
    card(ctx, rc, x, cy - h / 2, w, h, { fill: '#fbfaf6', r: 36 });
    card(ctx, rc, x, cy - h / 2, 26, h, { fill: tc, r: 13, shadow: false });
    text(ctx, P.to, x + 70, cy - h / 2 + 56, { font: 'Hand', size: 34, color: c.ink, align: 'left' });
    text(ctx, P.driver.toUpperCase(), x + 70, cy - h / 2 + 116, { font: pickFont(rc, P.titleFont), size: 64, color: c.ink, align: 'left', maxWidth: w - 300 });
    // headset icon
    const ix = x + w - 90, iy = cy - h / 2 + 90;
    ctx.save(); ctx.strokeStyle = tc; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(ix, iy, 34, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = tc; ctx.fillRect(ix - 44, iy - 4, 18, 32); ctx.fillRect(ix + 26, iy - 4, 18, 32);
    ctx.restore();
    // waveform
    const talking = t > f.t0 + 0.4 && t < f.t0 + 0.4 + ql.join(' ').split(/\s+/).length * 0.12 + 0.3;
    const bars = 34, wx = x + 70, ww = w - 140, wy = cy - h / 2 + 196;
    for (let i = 0; i < bars; i++) {
      const amp = talking ? 0.25 + 0.75 * Math.abs(Math.sin(t * 9 + i * 1.7) * Math.sin(t * 3.3 + i * 0.6)) : 0.12;
      const bh = 8 + 54 * amp;
      card(ctx, rc, wx + (i * ww) / bars, wy - bh / 2, ww / bars - 8, bh, { fill: tc, r: 6, shadow: false });
    }
    let y = wy + 90;
    let idx = 0;
    ql.forEach((l) => {
      revealText(ctx, l, { x: x + 70, y, fontId: 'Hand', size: 52, color: c.ink, align: 'left', start: f.t0 + 0.45 + idx * 0.12, per: 0.12, t, maxWidth: w - 120 });
      idx += l.split(/\s+/).length;
      y += 64;
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 9. Team org chart with a piece leaving
// ---------------------------------------------------------------------------
const ORG = 'Chefe de equipe | Nome\n- Diretor técnico | Nome\n- Diretor esportivo | Nome\n-- Engenheiro de corrida #1 | Nome\n-- Engenheiro de corrida #2 | Nome\n-- Estrategista | Nome';
function parseOrg(s) {
  const out = [];
  lines(s).forEach((l, i) => {
    const lvl = (l.match(/^-*/) || [''])[0].length;
    const [role, name] = l.replace(/^-+\s*/, '').split('|').map((x) => (x || '').trim());
    const parent = [...out].reverse().find((o) => o.lvl < lvl);
    out.push({ i, lvl, role, name, parent: parent ? parent.i : null, kids: [] });
  });
  out.forEach((o) => o.parent !== null && out[o.parent].kids.push(o.i));
  return out;
}
export const orgChart = {
  id: 'orgChart', name: 'Organograma da Equipe', sports: F1, category: 'didatico', defaultDuration: 6,
  desc: 'Quem é quem na equipe, montando nível por nível; uma peça pode sair do quadro e outra entrar.',
  fields: [
    ...titleFields('QUEM É QUEM NA EQUIPE', ''),
    { key: 'org', label: 'Organograma (- para subir de nível; Cargo | Nome)', type: 'textarea', default: ORG },
    { key: 'leave', label: 'Peça que sai (nº da linha, 0 = nenhuma)', type: 'range', min: 0, max: 12, step: 1, default: 2 },
    { key: 'enter', label: 'Quem entra no lugar (vazio = fica a vaga)', type: 'text', default: '' },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P, dur) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const nodes = parseOrg(P.org);
    const levels = Math.max(...nodes.map((n) => n.lvl), 0) + 1;
    const built = t0 + 0.4 + levels * 0.45;
    const outList = [...bgCue(P), ...Array.from({ length: levels }, (_, i) => ({ t: t0 + 0.4 + i * 0.45, s: 'pop', label: `nível ${i + 1}` }))];
    if (P.leave > 0) outList.push({ t: built + 0.6, s: 'whoosh', label: 'peça sai' });
    if (P.leave > 0 && P.enter) outList.push({ t: built + 1.4, s: 'pop', label: 'peça entra' });
    return outList.filter((x) => x.t < dur);
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 170 }) + 60;
    const nodes = parseOrg(P.org);
    if (!nodes.length) { ctx.restore(); return; }
    const levels = Math.max(...nodes.map((n) => n.lvl)) + 1;
    const levelH = Math.min(330, (H - top - 150) / levels);
    // layout: leaves spread evenly, parents centred over kids
    const leaves = nodes.filter((n) => !n.kids.length);
    const slotW = (W - 80) / Math.max(1, leaves.length);
    let li = 0;
    const place = (n) => {
      if (!n.kids.length) { n.x = 40 + slotW * (li + 0.5); li++; }
      else { n.kids.forEach((k) => place(nodes[k])); n.x = (nodes[n.kids[0]].x + nodes[n.kids[n.kids.length - 1]].x) / 2; }
      n.y = top + n.lvl * levelH;
    };
    nodes.filter((n) => n.parent === null).forEach(place);
    const bw = Math.min(360, slotW - 14), bh = Math.min(190, levelH - 70);
    const built = f.t0 + 0.4 + levels * 0.45;
    const leaveIdx = P.leave - 1;
    const leaveT = built + 0.6;
    // connectors
    nodes.forEach((n) => {
      if (n.parent === null) return;
      const p = nodes[n.parent];
      const k = ease.outCubic(range(t, f.t0 + 0.4 + n.lvl * 0.45 - 0.2, f.t0 + 0.4 + n.lvl * 0.45 + 0.1));
      if (k <= 0) return;
      ctx.save();
      ctx.strokeStyle = c.strong; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const midY = (p.y + bh / 2 + n.y - bh / 2) / 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + bh / 2); ctx.lineTo(p.x, lerp(p.y + bh / 2, midY, k));
      if (k > 0.5) { ctx.lineTo(lerp(p.x, n.x, (k - 0.5) * 2), midY); }
      if (k >= 1) { ctx.lineTo(n.x, n.y - bh / 2); }
      ctx.stroke();
      ctx.restore();
    });
    nodes.forEach((n) => {
      const st = f.t0 + 0.4 + n.lvl * 0.45;
      let k = pop(t, st, 0.35, 1.8);
      if (k <= 0) return;
      const leaving = n.i === leaveIdx && P.leave > 0;
      let dx = 0, dy = 0, rot = 0, alpha = 1;
      if (leaving && t > leaveT - 0.4) {
        const shake = range(t, leaveT - 0.4, leaveT);
        rot = Math.sin(t * 40) * 0.05 * shake * (1 - range(t, leaveT, leaveT + 0.1));
        const fly = ease.inBack(range(t, leaveT, leaveT + 0.7), 1.6);
        dx = fly * 900; dy = fly * 260; rot += fly * 0.9; alpha = 1 - range(t, leaveT + 0.5, leaveT + 0.7);
        // empty slot left behind
        const vk = range(t, leaveT + 0.1, leaveT + 0.4);
        if (vk > 0) {
          ctx.save(); ctx.globalAlpha *= vk; ctx.setLineDash([16, 12]); ctx.strokeStyle = c.strong; ctx.lineWidth = 4;
          ctx.strokeRect(n.x - bw / 2, n.y - bh / 2, bw, bh); ctx.setLineDash([]);
          text(ctx, 'VAGA', n.x, n.y, { font: 'Hand', size: 40, color: c.strong });
          ctx.restore();
        }
        if (P.enter) {
          const ek = pop(t, leaveT + 0.8, 0.45, 1.8);
          if (ek > 0) {
            const drop = (1 - ease.outBack(range(t, leaveT + 0.8, leaveT + 1.25), 1.5)) * -500;
            ctx.save(); ctx.translate(0, drop);
            card(ctx, rc, n.x - bw / 2, n.y - bh / 2, bw, bh, { fill: c.soft, r: 22, stroke: c.strong, lw: 4 });
            text(ctx, n.role, n.x, n.y - bh * 0.18, { font: 'Hand', size: Math.min(40, bw / 7.5), color: c.ink, maxWidth: bw - 30 });
            text(ctx, P.enter.toUpperCase(), n.x, n.y + bh * 0.2, { font: pickFont(rc, P.titleFont), size: Math.min(56, bw / 5.8), color: c.ink, maxWidth: bw - 30 });
            ctx.restore();
          }
        }
      }
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(n.x + dx, n.y + dy);
      ctx.rotate(rot);
      ctx.scale(k, k);
      ctx.translate(-n.x, -n.y);
      card(ctx, rc, n.x - bw / 2, n.y - bh / 2, bw, bh, { fill: n.lvl === 0 ? c.strong : '#fbfaf6', r: 22 });
      text(ctx, n.role, n.x, n.y - bh * 0.18, { font: 'Hand', size: Math.min(40, bw / 7.5), color: n.lvl === 0 ? '#fff' : c.ink, maxWidth: bw - 30 });
      text(ctx, (n.name || '').toUpperCase(), n.x, n.y + bh * 0.2, { font: pickFont(rc, P.titleFont), size: Math.min(56, bw / 5.8), color: n.lvl === 0 ? '#fff' : c.ink, maxWidth: bw - 30 });
      ctx.restore();
    });
    ctx.restore();
  },
};

void photo; void emoji; void flagEmoji;
