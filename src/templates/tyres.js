// "Compostos de Pneu": didactic tyre animations — line-up with grip/durability bars, one compound in
// focus with wear dropping, and race strategy stints on a lap timeline.
import { setFont, wrapLines } from '../lib/paper.js';
import { sceneBg, revealText } from './soft.js';
import { ease, range, clamp } from './common.js';

export const COMPOUNDS = {
  S: { key: 'S', name: 'MACIO', color: '#e8343a', grip: 3, life: 1 },
  M: { key: 'M', name: 'MÉDIO', color: '#f6c92b', grip: 2, life: 2 },
  H: { key: 'H', name: 'DURO', color: '#f2f2ef', grip: 1, life: 3 },
  I: { key: 'I', name: 'INTERMEDIÁRIO', color: '#3fb54a', grip: 2, life: 2 },
  W: { key: 'W', name: 'CHUVA', color: '#2c7fd6', grip: 3, life: 2 },
};

// Side view of a tyre, drawn like a sticker. spin in radians, wear 0..1
export function drawTyre(ctx, x, y, r, comp, { spin = 0, wear = 0, outline = '#fbf9f3', shadow = null } = {}) {
  const c = COMPOUNDS[comp] || COMPOUNDS.M;
  ctx.save();
  ctx.translate(x, y);
  if (shadow) {
    ctx.save();
    ctx.filter = shadow.blur ? `blur(${shadow.blur}px)` : 'none';
    ctx.fillStyle = shadow.color;
    ctx.beginPath(); ctx.arc(shadow.dx, shadow.dy, r + 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // sticker border
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.fill();
  // rubber
  ctx.fillStyle = '#16151a';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(spin);
  // sidewall compound stripe (two arcs, like the real marking)
  ctx.strokeStyle = c.color;
  ctx.globalAlpha = 1 - wear * 0.45;
  ctx.lineWidth = r * 0.075;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.8, -Math.PI * 0.92, -Math.PI * 0.08); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.8, Math.PI * 0.08, Math.PI * 0.92); ctx.stroke();
  ctx.globalAlpha = 1;
  // letters on the sidewall
  setFont(ctx, 'Marker', r * 0.16);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = c.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [0, Math.PI].forEach((a) => {
    ctx.save();
    ctx.rotate(a);
    ctx.fillText(c.key, 0, -r * 0.8);
    ctx.restore();
  });
  // rim
  ctx.fillStyle = '#2d2c33';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a4952';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(r * 0.12, -r * 0.035, r * 0.42, r * 0.07);
    ctx.restore();
  }
  ctx.fillStyle = '#bdbcc4';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-spin);
  // wear: scuffs and graining on the rubber
  if (wear > 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2, true); ctx.clip();
    ctx.fillStyle = `rgba(150,140,130,${0.15 + wear * 0.35})`;
    for (let i = 0; i < 60 * wear; i++) {
      const a = (i * 2.399) % (Math.PI * 2), rr = r * (0.7 + ((i * 37) % 30) / 100);
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.05, r * 0.018, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // sheen
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.93, -2.6, -1.7); ctx.stroke();
  ctx.restore();
}

function bar(ctx, x, y, w, h, value, { color, track = 'rgba(47,42,54,0.15)', label, ink, labelSize = 30 }) {
  ctx.save();
  ctx.fillStyle = track;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h); ctx.fill();
  if (value > 0) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, Math.max(h, w * value), h, h / 2) : ctx.rect(x, y, w * value, h); ctx.fill();
  }
  if (label) {
    setFont(ctx, 'Hand', labelSize);
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, y - 6);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  ctx.restore();
}

// "M-22, H-35" -> [{c:'M', laps:22}, ...]
export function parseStints(s) {
  return String(s || '')
    .split(/[,;>→]+/)
    .map((x) => x.trim().match(/^([SMHIWsmhiw])\s*[-:\s]\s*(\d+)/))
    .filter(Boolean)
    .map((m) => ({ c: m[1].toUpperCase(), laps: parseInt(m[2], 10) }));
}

const fontOpts = [['head', 'Título (Acervo/Tipografia)'], ['body', 'Subtítulo (Acervo/Tipografia)'], ['Hand', 'Letra de mão'], ['Marker', 'Marcador']];
const pickFont = (rc, v) => (v === 'head' ? rc.fonts.head : v === 'body' ? rc.fonts.body : v);

export const tyres = {
  id: 'tyres',
  name: 'Compostos de Pneu',
  desc: 'Apresenta os compostos com aderência × durabilidade, um pneu em destaque com desgaste, ou a estratégia de paradas.',
  category: 'didatico',
  defaultDuration: 4,
  fields: [
    { key: 'mode', label: 'Animação', type: 'select', options: [['lineup', 'Apresentar os compostos'], ['focus', 'Um composto em destaque'], ['strategy', 'Estratégia (stints e paradas)']], default: 'lineup' },
    { key: 'title', label: 'Título', type: 'text', default: 'OS PNEUS' },
    { key: 'set', label: 'Quais compostos', type: 'select', options: [['dry', 'Macio, médio e duro'], ['all', 'Os 5 (com intermediário e chuva)'], ['wet', 'Intermediário e chuva']], default: 'dry', showIf: (P) => P.mode === 'lineup' },
    { key: 'codes', label: 'Códigos (opcional, ex.: C5, C4, C3)', type: 'text', default: '', showIf: (P) => P.mode === 'lineup' },
    { key: 'compound', label: 'Composto', type: 'select', options: Object.values(COMPOUNDS).map((c) => [c.key, c.name.charAt(0) + c.name.slice(1).toLowerCase()]), default: 'S', showIf: (P) => P.mode === 'focus' },
    { key: 'code', label: 'Código (ex.: C5)', type: 'text', default: '', showIf: (P) => P.mode === 'focus' },
    { key: 'note', label: 'Nota', type: 'textarea', default: 'mais rápido, mas dura pouco', showIf: (P) => P.mode === 'focus' },
    { key: 'wear', label: 'Mostrar desgaste caindo', type: 'toggle', default: true, showIf: (P) => P.mode === 'focus' },
    { key: 'wearEnd', label: 'Desgaste final (% de borracha)', type: 'range', min: 0, max: 90, step: 1, default: 35, showIf: (P) => P.mode === 'focus' && P.wear },
    { key: 'rows', label: 'Estratégias (uma por linha: NOME: M-22, H-35)', type: 'textarea', default: 'NOR: M-22, H-35\nVER: H-30, M-27', showIf: (P) => P.mode === 'strategy' },
    { key: 'raceLaps', label: 'Voltas da corrida (0 = soma dos stints)', type: 'range', min: 0, max: 80, step: 1, default: 0, showIf: (P) => P.mode === 'strategy' },
    { key: 'titleFont', label: 'Fonte do título', type: 'select', options: fontOpts, default: 'head', group: 'Estilo' },
    { key: 'inkColor', label: 'Cor do texto', type: 'color', default: '#2f2a36', group: 'Estilo' },
    { key: 'bg', label: 'Fundo', type: 'select', options: [['graph', 'Papel quadriculado amassado'], ['gingham', 'Xadrez lilás'], ['image', 'Imagem do meu acervo'], ['none', 'Sem fundo (por cima do vídeo)']], default: 'graph', group: 'Fundo' },
    { key: 'bgImage', label: 'Imagem de fundo', type: 'image', libCategory: 'background', frames: false, group: 'Fundo', showIf: (P) => P.bg === 'image' },
    { key: 'bgEnter', label: 'Animação do fundo', type: 'select', options: [['zoom', 'Zoom suave + fade'], ['slide', 'Desliza de baixo'], ['cut', 'Corte seco']], default: 'zoom', group: 'Fundo', showIf: (P) => P.bg !== 'none' },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.3, max: 0.7, step: 0.01, default: 0.5, group: 'Layout' },
  ],
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    sceneBg(rc, P.bg, { enter: P.bgEnter });
    const out = range(t, dur - 0.22, dur);
    if (out >= 1) return;
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const ink = P.inkColor;
    const cy = H * P.posY;
    ctx.save();
    ctx.globalAlpha *= 1 - ease.inCubic(out);
    if (P.title) revealText(ctx, P.title, { x: W / 2, y: H * 0.16, fontId: pickFont(rc, P.titleFont), size: 100, color: ink, start: t0, per: 0.1, t, maxWidth: W * 0.88 });

    if (P.mode === 'lineup') {
      const keys = P.set === 'all' ? ['S', 'M', 'H', 'I', 'W'] : P.set === 'wet' ? ['I', 'W'] : ['S', 'M', 'H'];
      const codes = String(P.codes || '').split(/[,\s]+/).filter(Boolean);
      const rowH = keys.length > 3 ? 230 : 300;
      const r = keys.length > 3 ? 88 : 115;
      const top = cy - ((keys.length - 1) * rowH) / 2;
      keys.forEach((k, i) => {
        const c = COMPOUNDS[k];
        const st = t0 + 0.25 + i * 0.28;
        const roll = ease.outCubic(range(t, st, st + 0.5));
        if (roll <= 0) return;
        const y = top + i * rowH;
        const xEnd = W * 0.22;
        const x = -r * 1.5 + (xEnd + r * 1.5) * roll;
        const spin = -((1 - roll) * 6) + Math.sin(t * 1.5 + i) * 0.04;
        drawTyre(ctx, x, y, r, k, { spin, shadow: rc.shadow });
        const tx = W * 0.42;
        const k2 = range(t, st + 0.3, st + 0.6);
        ctx.save();
        ctx.globalAlpha *= clamp(k2 * 2);
        setFont(ctx, 'Marker', keys.length > 3 ? 56 : 66);
        ctx.fillStyle = ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const name = codes[i] ? `${c.name} · ${codes[i]}` : c.name;
        ctx.fillText(name, tx, y - r * 0.5, W - tx - 40);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.restore();
        const bw = W * 0.48, bh = keys.length > 3 ? 14 : 18;
        const fill = ease.outCubic(range(t, st + 0.45, st + 0.95));
        const wetLabel = k === 'I' || k === 'W';
        bar(ctx, tx, y + 14, bw, bh, (c.grip / 3) * fill, { color: c.key === 'H' ? '#b9b4c4' : c.color, label: wetLabel ? 'aderência na chuva' : 'aderência', ink, labelSize: keys.length > 3 ? 26 : 30 });
        bar(ctx, tx, y + (keys.length > 3 ? 70 : 92), bw, bh, (c.life / 3) * fill, { color: '#8b74e0', label: 'durabilidade', ink, labelSize: keys.length > 3 ? 26 : 30 });
      });
    } else if (P.mode === 'focus') {
      const c = COMPOUNDS[P.compound] || COMPOUNDS.S;
      const r = 230;
      const roll = ease.outBack(range(t, t0 + 0.15, t0 + 0.75), 1.2);
      const x = W / 2 + (1 - roll) * -W, y = cy - 120;
      const wearP = P.wear ? ease.inOutQuart(range(t, t0 + 1.2, dur - 0.5)) : 0;
      const rubber = 100 - (100 - P.wearEnd) * wearP;
      drawTyre(ctx, x, y, r, c.key, { spin: -(1 - roll) * 8 + t * 0.4, wear: (100 - rubber) / 100, shadow: rc.shadow });
      const name = P.code ? `${c.name} · ${P.code}` : c.name;
      revealText(ctx, name, { x: W / 2, y: y + r + 110, fontId: 'Marker', size: 92, color: ink, start: t0 + 0.6, per: 0.1, t, maxWidth: W * 0.9 });
      if (P.note) revealText(ctx, P.note, { x: W / 2, y: y + r + 200, fontId: 'Hand', size: 50, color: ink, start: t0 + 0.85, per: 0.08, t, maxWidth: W * 0.8, lineH: 1.2 });
      if (P.wear) {
        const by = y + r + 330 + (P.note ? 40 * Math.max(0, wrapLinesCount(ctx, P.note) - 1) : 0);
        const k = range(t, t0 + 1.0, t0 + 1.3);
        ctx.save();
        ctx.globalAlpha *= clamp(k * 3);
        const col = rubber > 60 ? '#5fbf8a' : rubber > 35 ? '#f6c92b' : '#e8343a';
        bar(ctx, W * 0.15, by, W * 0.7, 26, rubber / 100, { color: col, label: `borracha: ${Math.round(rubber)}%`, ink, labelSize: 40 });
        ctx.restore();
      }
    } else {
      const lines = String(P.rows || '').split('\n').map((l) => {
        const m = l.match(/^\s*([^:]+):\s*(.+)$/);
        return m ? { name: m[1].trim(), stints: parseStints(m[2]) } : { name: '', stints: parseStints(l) };
      }).filter((l) => l.stints.length).slice(0, 5);
      const total = P.raceLaps || Math.max(1, ...lines.map((l) => l.stints.reduce((a, s) => a + s.laps, 0)));
      const left = W * 0.08, bw = W * 0.84, rowH = 250;
      const top = cy - ((lines.length - 1) * rowH) / 2;
      // lap scale
      const sk = range(t, t0 + 0.2, t0 + 0.5);
      ctx.save();
      ctx.globalAlpha *= sk;
      setFont(ctx, 'Hand', 30);
      ctx.fillStyle = ink;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText('volta 1', left, top + (lines.length - 1) * rowH + 70);
      ctx.textAlign = 'right';
      ctx.fillText(`volta ${total}`, left + bw, top + (lines.length - 1) * rowH + 70);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.restore();
      lines.forEach((ln, ri) => {
        const y = top + ri * rowH;
        const st = t0 + 0.3 + ri * 0.35;
        const fillT = ease.inOutQuart(range(t, st, st + 1.4));
        if (ln.name) revealText(ctx, ln.name.toUpperCase(), { x: left, y: y - 90, fontId: 'Marker', size: 54, color: ink, align: 'left', start: st - 0.1, per: 0.08, t });
        // track
        ctx.fillStyle = 'rgba(47,42,54,0.22)';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(left, y - 22, bw, 44, 22) : ctx.rect(left, y - 22, bw, 44); ctx.fill();
        let acc = 0;
        ln.stints.forEach((s, si) => {
          const c = COMPOUNDS[s.c] || COMPOUNDS.M;
          const a = acc / total, b = Math.min(1, (acc + s.laps) / total);
          const shown = Math.min(b, fillT);
          if (shown > a) {
            ctx.fillStyle = c.color;
            ctx.strokeStyle = '#1f1b24';
            ctx.lineWidth = 5;
            ctx.beginPath();
            const x0 = left + bw * a, x1 = left + bw * shown;
            ctx.roundRect ? ctx.roundRect(x0, y - 22, Math.max(10, x1 - x0), 44, 22) : ctx.rect(x0, y - 22, x1 - x0, 44);
            ctx.fill(); ctx.stroke();
          }
          // tyre icon at stint start
          if (fillT > a) {
            const k = ease.outBack(range(fillT, a, a + 0.06), 2);
            drawTyre(ctx, left + bw * a + 10, y, 40 * k, c.key, { spin: t * 2, outline: '#fbf9f3' });
          }
          // pit stop marker
          if (si > 0 && fillT >= a) {
            const k = ease.outBack(range(fillT, a, a + 0.05), 2);
            const px = left + bw * a;
            ctx.save();
            ctx.translate(px, y + 60);
            ctx.scale(k, k);
            setFont(ctx, 'Hand', 32);
            ctx.fillStyle = ink;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`PIT · v${acc}`, 0, 0);
            if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
            ctx.restore();
          }
          acc += s.laps;
        });
      });
    }
    ctx.restore();
  },
};

function wrapLinesCount(ctx, text) {
  setFont(ctx, 'Hand', 50);
  const n = wrapLines(ctx, text, 1080 * 0.8).length;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return n;
}
