// Universal set for F1 and tennis: quick glossary, "what if" flowchart, number counter,
// driver / player card, podium & top 3, and an end card with a follow button.
import { handArrow, handCircle, markerLine } from '../lib/paper.js';
import {
  ease, range, clamp, revealText, pop, frame, bgFields, titleFields, styleFields, bgCue, colors, heading,
  card, text, measure, pill, popIn, lines, photo, lerp, fmtNumber, pickFont, wrapLines, setFont, emoji, flagEmoji,
} from './kit.js';
import { tennisBall } from './tennis.js';

const BOTH = ['f1', 'tennis'];

// ---------------------------------------------------------------------------
// 17. Quick glossary
// ---------------------------------------------------------------------------
export const glossary = {
  id: 'glossary', name: 'Glossário Relâmpago', sports: BOTH, category: 'universal', defaultDuration: 3.5,
  desc: 'O termo grande, sublinhado à mão, e a definição sendo escrita embaixo.',
  fields: [
    { key: 'term', label: 'Termo', type: 'text', default: 'UNDERCUT' },
    { key: 'kind', label: 'Classe / pronúncia (opcional)', type: 'text', default: 'estratégia · /ãn-der-cât/' },
    { key: 'def', label: 'Definição', type: 'textarea', default: 'Parar antes do rival para ganhar tempo com pneus novos e passar ele quando ele parar.' },
    ...styleFields(), ...bgFields(),
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.2, max: 0.7, step: 0.01, default: 0.4, group: 'Layout' },
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0, s: 'pop', label: 'termo' }, { t: t0 + 0.5, s: 'whoosh', label: 'sublinhado' }, { t: t0 + 0.8, s: 'typing', d: String(P.def || '').split(/\s+/).length * 0.09, label: 'definição' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const cy = H * P.posY;
    const glow = P.bg === 'none' ? 'rgba(255,255,255,0.9)' : null;
    const th = revealText(ctx, P.term, { x: W / 2, y: cy, fontId: pickFont(rc, P.titleFont), size: 140, color: c.ink, start: f.t0, per: 0.1, t, maxWidth: W * 0.88, glow });
    const tw = Math.min(W * 0.88, measure(ctx, P.term, pickFont(rc, P.titleFont), 140));
    markerLine(ctx, W / 2 - tw / 2, cy + th * 0.45, W / 2 + tw / 2, cy + th * 0.42, { color: c.soft, width: 18, progress: ease.outCubic(range(t, f.t0 + 0.5, f.t0 + 0.85)), seed: 3 });
    if (P.kind) revealText(ctx, P.kind, { x: W / 2, y: cy + th * 0.5 + 60, fontId: 'Hand', size: 40, color: c.strong, start: f.t0 + 0.6, per: 0.06, t, glow });
    revealText(ctx, P.def, { x: W / 2, y: cy + th * 0.5 + 150, fontId: 'Hand', size: 54, color: c.ink, start: f.t0 + 0.8, per: 0.09, t, maxWidth: W * 0.84, lineH: 1.25, glow });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 18. "What if" flowchart
// ---------------------------------------------------------------------------
export const flowchart = {
  id: 'flowchart', name: 'Fluxograma "E se…"', sports: BOTH, category: 'universal', defaultDuration: 5,
  desc: 'Cadeia de consequências: choveu → safety car → bandeira vermelha… um passo de cada vez.',
  fields: [
    ...titleFields('E SE CHOVER?', ''),
    { key: 'steps', label: 'Passos (um por linha; "texto | rótulo da seta" opcional)', type: 'textarea', default: 'Começa a chover | então\nSafety car na pista | se piorar\nBandeira vermelha | depois\nRelargada com pneu de chuva' },
    { key: 'step', label: 'Tempo de cada passo (s)', type: 'range', min: 0.4, max: 2, step: 0.1, default: 0.8 },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), ...lines(P.steps).map((_, i) => ({ t: t0 + 0.4 + i * P.step, s: 'pop', label: `passo ${i + 1}` }))];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 190 }) + 70;
    const steps = lines(P.steps).map((l) => l.split('|').map((x) => x.trim()));
    const n = steps.length;
    const gap = Math.min(330, (H - top - 160) / Math.max(1, n));
    steps.forEach(([txt, arrow], i) => {
      const y = top + i * gap;
      const st = f.t0 + 0.4 + i * P.step;
      const k = pop(t, st, 0.35, 1.8);
      if (k <= 0) return;
      setFont(ctx, pickFont(rc, P.titleFont), 54);
      const ls = wrapLines(ctx, txt, W - 280);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      const bh = 70 + ls.length * 60;
      const last = i === n - 1;
      popIn(ctx, W / 2, y + bh / 2, k, () => {
        card(ctx, rc, 110, y, W - 220, bh, { fill: last ? c.strong : i === 0 ? c.soft : '#fbfaf6', r: 40 });
        ls.forEach((l, j) => text(ctx, l, W / 2, y + 66 + j * 60, { font: pickFont(rc, P.titleFont), size: 54, color: last ? '#fff' : c.ink }));
      });
      if (i < n - 1) {
        const ak = ease.outCubic(range(t, st + P.step * 0.55, st + P.step));
        handArrow(ctx, W / 2, y + bh + 14, W / 2, y + gap - 14, { color: c.strong, width: 7, progress: ak, seed: 5 + i, bend: 0.04, head: 28 });
        if (arrow && ak > 0.3) {
          ctx.save(); ctx.globalAlpha *= range(ak, 0.3, 0.8);
          text(ctx, arrow, W / 2 + 40, (y + bh + y + gap) / 2, { font: 'Hand', size: 40, color: c.ink, align: 'left' });
          ctx.restore();
        }
      }
    });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 19. Number counter
// ---------------------------------------------------------------------------
export const counter = {
  id: 'counter', name: 'Contador de Número', sports: BOTH, category: 'universal', defaultDuration: 3,
  desc: 'Um número grande contando até o valor do roteiro, com prefixo, sufixo e legenda.',
  fields: [
    { key: 'value', label: 'Número final', type: 'text', default: '1500000' },
    { key: 'decimals', label: 'Casas decimais', type: 'range', min: 0, max: 2, step: 1, default: 0 },
    { key: 'prefix', label: 'Antes (ex.: US$)', type: 'text', default: '' },
    { key: 'suffix', label: 'Depois (ex.: km, %, fãs)', type: 'text', default: '' },
    { key: 'label', label: 'Legenda', type: 'text', default: 'pessoas assistiram a corrida' },
    { key: 'speed', label: 'Tempo contando (s)', type: 'range', min: 0.5, max: 4, step: 0.1, default: 1.6 },
    ...styleFields(), ...bgFields('none'),
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.2, max: 0.8, step: 0.01, default: 0.45, group: 'Layout' },
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0, s: 'whoosh', label: 'contando' }, { t: t0 + P.speed, s: 'pop', label: 'número final' }, { t: t0 + P.speed + 0.1, s: 'typing', d: 0.4, label: 'legenda' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const cy = H * P.posY;
    const target = parseFloat(String(P.value).replace(/\./g, '').replace(',', '.')) || 0;
    const k = ease.outExpo(range(t, f.t0, f.t0 + P.speed));
    const v = target * k;
    const str = `${P.prefix ? P.prefix + ' ' : ''}${fmtNumber(v, P.decimals)}${P.suffix ? ' ' + P.suffix : ''}`;
    const done = t >= f.t0 + P.speed;
    const pk = done ? 1 + 0.12 * (1 - ease.outCubic(range(t, f.t0 + P.speed, f.t0 + P.speed + 0.4))) : 1;
    const glow = P.bg === 'none' ? 'rgba(255,255,255,0.9)' : null;
    ctx.save(); ctx.globalAlpha *= clamp(range(t, f.t0, f.t0 + 0.2) * 1);
    popIn(ctx, W / 2, cy, pk, () => {
      setFont(ctx, 'Marker', 170);
      const size = Math.min(170, (170 * W * 0.9) / Math.max(1, ctx.measureText(str).width));
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 20; }
      text(ctx, str, W / 2, cy, { font: 'Marker', size, color: c.ink });
      ctx.shadowColor = 'transparent';
    });
    ctx.restore();
    if (done) {
      // little burst
      const bk = range(t, f.t0 + P.speed, f.t0 + P.speed + 0.5);
      ctx.save(); ctx.globalAlpha *= 1 - bk; ctx.strokeStyle = c.strong; ctx.lineWidth = 8; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, r0 = 260 + bk * 80, r1 = r0 + 40 * (1 - bk);
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0 * 1.4, cy + Math.sin(a) * r0 * 0.6); ctx.lineTo(W / 2 + Math.cos(a) * r1 * 1.4, cy + Math.sin(a) * r1 * 0.6); ctx.stroke();
      }
      ctx.restore();
    }
    if (P.label) revealText(ctx, P.label, { x: W / 2, y: cy + 150, fontId: 'Hand', size: 54, color: c.ink, start: f.t0 + P.speed + 0.1, per: 0.07, t, maxWidth: W * 0.86, glow });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 20. Driver / player card
// ---------------------------------------------------------------------------
function profileTemplate({ id, name, sports, defaults }) {
  return {
    id, name, sports, category: 'universal', defaultDuration: 4,
    desc: 'Ficha bonitinha com foto, bandeira, número/ranking e dados principais.',
    fields: [
      { key: 'photo', label: 'Foto', type: 'image', defaultFrame: 'polaroid' },
      { key: 'name', label: 'Nome', type: 'text', default: defaults.name },
      { key: 'country', label: 'País (sigla: BR, GB, IT…)', type: 'text', default: defaults.country },
      { key: 'big', label: defaults.bigLabel, type: 'text', default: defaults.big },
      { key: 'sub', label: 'Linha de apoio', type: 'text', default: defaults.sub },
      { key: 'stats', label: 'Dados (um por linha: rótulo: valor)', type: 'textarea', default: defaults.stats },
      ...styleFields(), ...bgFields(),
    ],
    cues: (P) => {
      const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
      return [...bgCue(P), { t: t0, s: 'whoosh', label: 'card entra' }, { t: t0 + 0.3, s: 'pop', label: 'foto' }, { t: t0 + 0.5, s: 'typing', d: 0.4, label: 'nome' }, ...lines(P.stats).map((_, i) => ({ t: t0 + 0.9 + i * 0.2, s: 'pop', label: `dado ${i + 1}` }))];
    },
    render(rc) {
      const { ctx, W, H, P, t } = rc;
      const f = frame(rc); if (!f) return;
      const c = colors(rc);
      ctx.save(); ctx.globalAlpha *= f.fadeOut;
      const k = ease.outExpo(range(t, f.t0, f.t0 + 0.45));
      const cx = W / 2, top = 230 + (1 - k) * 900;
      const cw = W - 140, ch = H - 460;
      card(ctx, rc, cx - cw / 2, top, cw, ch, { fill: '#fbfaf6', r: 44 });
      card(ctx, rc, cx - cw / 2, top, cw, 360, { fill: c.soft, r: 44, shadow: false });
      // big number / ranking watermark
      ctx.save(); ctx.globalAlpha *= 0.9;
      text(ctx, P.big, cx + cw / 2 - 50, top + 150, { font: 'Marker', size: 200, color: '#ffffff', align: 'right' });
      ctx.restore();
      const pk = pop(t, f.t0 + 0.3, 0.4, 1.6);
      photo(rc, 'photo', { x: cx - 150, y: top + 330, w: 380, h: 420, rot: -0.04, seed: 61, scale: pk, caption: '' });
      emoji(ctx, flagEmoji(P.country), cx + 220, top + 320, 110);
      const nh = revealText(ctx, (P.name || '').toUpperCase(), { x: cx, y: top + 640, fontId: pickFont(rc, P.titleFont), size: 80, color: c.ink, start: f.t0 + 0.5, per: 0.08, t, maxWidth: cw - 80, lineH: 1.0 });
      if (P.sub) revealText(ctx, P.sub, { x: cx, y: top + 640 + nh - 10, fontId: 'Hand', size: 46, color: c.strong, start: f.t0 + 0.7, per: 0.06, t, maxWidth: cw - 80 });
      const stats = lines(P.stats).map((l) => l.split(':').map((x) => x.trim()));
      const cols = 2, sw = (cw - 120) / cols, sh = 150;
      stats.forEach(([lab, val], i) => {
        const x = cx - cw / 2 + 60 + (i % cols) * sw, y = top + 860 + Math.floor(i / cols) * (sh + 20);
        if (y + sh > top + ch - 20) return;
        const sk = pop(t, f.t0 + 0.9 + i * 0.2, 0.3, 2);
        popIn(ctx, x + sw / 2, y + sh / 2, sk, () => {
          card(ctx, rc, x + 10, y, sw - 20, sh, { fill: '#f1eef5', r: 26, shadow: false });
          text(ctx, val || '', x + sw / 2, y + 62, { font: 'Marker', size: 60, color: c.ink, maxWidth: sw - 50 });
          text(ctx, lab || '', x + sw / 2, y + 118, { font: 'Hand', size: 32, color: c.ink, maxWidth: sw - 50 });
        });
      });
      ctx.restore();
    },
  };
}
export const driverCard = profileTemplate({ id: 'driverCard', name: 'Card de Piloto', sports: ['f1'], defaults: { name: 'Gabriel Bortoleto', country: 'BR', bigLabel: 'Número do carro', big: '5', sub: 'Audi · 21 anos', stats: 'GPs: 24\nPontos: 19\nMelhor resultado: P6\nTítulos F2: 1' } });
export const playerCard = profileTemplate({ id: 'playerCard', name: 'Card de Tenista', sports: ['tennis'], defaults: { name: 'João Fonseca', country: 'BR', bigLabel: 'Ranking', big: '#24', sub: 'destro · 19 anos', stats: 'Títulos: 2\nRanking máx.: 24\nVitórias no ano: 30\nAces: 210' } });

// ---------------------------------------------------------------------------
// 21. Podium & top 3
// ---------------------------------------------------------------------------
export const podium = {
  id: 'podium', name: 'Pódio · Top 3', sports: BOTH, category: 'universal', defaultDuration: 4.5,
  desc: 'Pódio subindo com fotos e nomes (2º, 1º, 3º), ou um top 3 em lista para rankings.',
  fields: [
    { key: 'mode', label: 'Formato', type: 'select', options: [['podium', 'Pódio'], ['list', 'Top 3 em lista']], default: 'podium' },
    ...titleFields('TOP 3', ''),
    ...[1, 2, 3].flatMap((n) => [
      { key: `n${n}`, label: `${n}º lugar`, type: 'text', default: ['NORRIS', 'VERSTAPPEN', 'LECLERC'][n - 1] },
      { key: `v${n}`, label: `${n}º · valor (opcional)`, type: 'text', default: '' },
      { key: `ph${n}`, label: `${n}º · foto`, type: 'image', defaultFrame: 'cutout' },
    ]),
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0 + 0.3, s: 'whoosh', label: '3º' }, { t: t0 + 0.7, s: 'whoosh', label: '2º' }, { t: t0 + 1.1, s: 'pop', label: '1º' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const top = heading(rc, f, { y: 190 });
    const order = [3, 2, 1];
    const startOf = (n) => f.t0 + 0.3 + order.indexOf(n) * 0.4;
    if (P.mode === 'podium') {
      const base = H - 240, colW = (W - 120) / 3;
      const hts = { 1: 520, 2: 380, 3: 280 };
      const xs = { 2: 60, 1: 60 + colW, 3: 60 + 2 * colW };
      [2, 1, 3].forEach((n) => {
        const st = startOf(n);
        const k = ease.outBack(range(t, st, st + 0.5), 1.3);
        if (k <= 0) return;
        const h = hts[n] * Math.min(1, k), x = xs[n];
        card(ctx, rc, x + 10, base - h, colW - 20, h, { fill: n === 1 ? c.strong : n === 2 ? c.soft : '#fbfaf6', r: 22, stroke: c.strong, lw: 4 });
        text(ctx, `${n}`, x + colW / 2, base - h + 90, { font: 'Marker', size: 110, color: n === 1 ? '#fff' : c.ink });
        if (P[`v${n}`]) text(ctx, P[`v${n}`], x + colW / 2, base - h + 160, { font: 'Hand', size: 40, color: n === 1 ? '#fff' : c.ink, maxWidth: colW - 40 });
        const pk = pop(t, st + 0.3, 0.35, 1.8);
        photo(rc, `ph${n}`, { x: x + colW / 2, y: base - hts[n] - 170, w: colW * 0.8, h: 260, rot: 0, seed: 70 + n, scale: pk, placeholder: true });
        revealText(ctx, (P[`n${n}`] || '').toUpperCase(), { x: x + colW / 2, y: base - hts[n] - 20, fontId: pickFont(rc, P.titleFont), size: 50, color: c.ink, start: st + 0.4, per: 0.08, t, maxWidth: colW - 10 });
        if (n === 1) {
          const ck = pop(t, st + 0.6, 0.4, 2.4);
          popIn(ctx, x + colW / 2, base - hts[n] - 340, ck, () => emoji(ctx, rc.sport === 'tennis' ? '🏆' : '👑', x + colW / 2, base - hts[n] - 340, 90));
        }
      });
    } else {
      const rowH = Math.min(360, (H - top - 160) / 3);
      [1, 2, 3].forEach((n, i) => {
        const y = top + 40 + i * rowH;
        const st = startOf(n);
        const k = ease.outExpo(range(t, st, st + 0.45));
        if (k <= 0) return;
        const x = 70 + (1 - k) * W;
        card(ctx, rc, x, y, W - 140, rowH - 40, { fill: n === 1 ? c.soft : '#fbfaf6', r: 40 });
        text(ctx, `${n}`, x + 90, y + (rowH - 40) / 2, { font: 'Marker', size: 120, color: c.strong });
        photo(rc, `ph${n}`, { x: x + 300, y: y + (rowH - 40) / 2, w: (rowH - 80) * 0.85, h: rowH - 80, seed: 80 + n, placeholder: true });
        text(ctx, (P[`n${n}`] || '').toUpperCase(), x + 450, y + (rowH - 40) / 2 - (P[`v${n}`] ? 24 : 0), { font: pickFont(rc, P.titleFont), size: 64, color: c.ink, align: 'left', maxWidth: W - 640 });
        if (P[`v${n}`]) text(ctx, P[`v${n}`], x + 450, y + (rowH - 40) / 2 + 44, { font: 'Hand', size: 42, color: c.ink, align: 'left', maxWidth: W - 640 });
      });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 22. End card with follow button
// ---------------------------------------------------------------------------
export const endCard = {
  id: 'endCard', name: 'End Card · Seguir', sports: BOTH, category: 'universal', defaultDuration: 4,
  desc: 'Seu @ com foto, botão "Seguir" sendo tocado e virando "Seguindo ✓", e corações subindo.',
  fields: [
    { key: 'handle', label: '@', type: 'text', default: '@amanda.estreiche' },
    { key: 'avatar', label: 'Sua foto', type: 'image', defaultFrame: 'cutout' },
    { key: 'line', label: 'Frase', type: 'text', default: 'segue pra mais esporte explicado ✿' },
    { key: 'button', label: 'Texto do botão', type: 'text', default: 'Seguir' },
    ...styleFields(), ...bgFields(),
  ],
  cues: (P) => {
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    return [...bgCue(P), { t: t0, s: 'pop', label: 'foto' }, { t: t0 + 0.4, s: 'typing', d: 0.5, label: '@ e frase' }, { t: t0 + 1.6, s: 'pop', label: 'toque no seguir' }];
  },
  render(rc) {
    const { ctx, W, H, P, t } = rc;
    const f = frame(rc); if (!f) return;
    const c = colors(rc);
    ctx.save(); ctx.globalAlpha *= f.fadeOut;
    const tennis = rc.sport === 'tennis';
    // floating balls / sparkles
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.25 + i / 7) % 1;
      const x = 110 + ((i * 197) % (W - 220)), y = H - ph * (H + 200);
      ctx.save(); ctx.globalAlpha *= 0.85 * clamp(range(t, f.t0, f.t0 + 0.4));
      if (tennis) tennisBall(ctx, x, y, 26 + (i % 3) * 8, t * 2 + i);
      else { ctx.fillStyle = c.soft; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const r = k % 2 ? 9 : 26; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    const cy = H * 0.42;
    const ak = pop(t, f.t0, 0.45, 1.8);
    popIn(ctx, W / 2, cy - 160, ak, () => {
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, cy - 160, 190, 0, Math.PI * 2);
      ctx.fillStyle = c.soft; ctx.fill();
      ctx.lineWidth = 12; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.clip();
      photo(rc, 'avatar', { x: W / 2, y: cy - 150, w: 380, h: 380, frame: 'cutout', seed: 91, shadow: null, placeholder: false });
      ctx.restore();
    });
    revealText(ctx, P.handle, { x: W / 2, y: cy + 110, fontId: pickFont(rc, P.titleFont), size: 84, color: c.ink, start: f.t0 + 0.4, per: 0.08, t, maxWidth: W * 0.9 });
    revealText(ctx, P.line, { x: W / 2, y: cy + 200, fontId: 'Hand', size: 48, color: c.ink, start: f.t0 + 0.6, per: 0.07, t, maxWidth: W * 0.86 });
    // follow button + tap
    const bk = pop(t, f.t0 + 0.9, 0.35, 2);
    const tap = f.t0 + 1.6;
    const followed = t > tap;
    const by = cy + 360;
    const press = 1 - 0.1 * Math.sin(Math.PI * range(t, tap - 0.1, tap + 0.1));
    popIn(ctx, W / 2, by, bk * press, () => {
      const label = followed ? 'Seguindo ✓' : P.button;
      pill(ctx, rc, W / 2, by, label, { font: pickFont(rc, P.titleFont), size: 64, fill: followed ? '#fbfaf6' : c.strong, color: followed ? c.ink : '#ffffff', padX: 70, h: 120, shadow: true });
    });
    // finger cursor
    const fk = range(t, f.t0 + 1.1, tap);
    if (fk > 0 && t < tap + 0.5) {
      const fx = lerp(W * 0.8, W / 2 + 60, ease.inOutQuart(fk)), fy = lerp(by + 300, by + 30, ease.inOutQuart(fk));
      ctx.save(); ctx.globalAlpha *= 1 - range(t, tap + 0.2, tap + 0.5);
      emoji(ctx, '👆', fx, fy + 40, 90);
      if (t > tap) handCircle(ctx, W / 2 + 40, by + 10, 60 + 60 * range(t, tap, tap + 0.4), 30 + 30 * range(t, tap, tap + 0.4), { color: c.strong, width: 5, progress: 1, seed: 2 });
      ctx.restore();
    }
    // hearts rising after follow
    if (followed) {
      for (let i = 0; i < 6; i++) {
        const hk = range(t, tap + i * 0.08, tap + 1.2 + i * 0.08);
        if (hk <= 0 || hk >= 1) continue;
        ctx.save(); ctx.globalAlpha *= 1 - hk;
        const side = i % 2 ? 1 : -1;
        emoji(ctx, tennis ? '🎾' : '💜', W / 2 + side * (300 + (i >> 1) * 60) + Math.sin(hk * 6 + i) * 20, by - hk * 260, 54);
        ctx.restore();
      }
    }
    ctx.restore();
  },
};

void wrapLines;
