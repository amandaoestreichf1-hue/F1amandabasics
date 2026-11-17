// "Circuito": real track outlines, animated turn by turn. Draw-in, coloured sectors, a sector that
// blinks, numbered turns popping in order, a highlighted turn with hand-drawn circle + zoom, and a lap dot.
import { CIRCUITS, circuitById } from '../data/circuits.js';
import { setFont, handCircle } from '../lib/paper.js';
import { drawSticker } from '../lib/car.js';
import { sceneBg, revealText } from './soft.js';
import { slot, ease, range, clamp } from './common.js';

const N = 360;

// --- geometry helpers ------------------------------------------------------
const trackCache = new Map();
function trackPoints(id, reverse) {
  const key = id + (reverse ? ':r' : '');
  if (trackCache.has(key)) return trackCache.get(key);
  const c = circuitById(id);
  let pts = [];
  for (let i = 0; i < c.pts.length; i += 2) pts.push([c.pts[i] - c.w / 2, c.pts[i + 1] - c.h / 2]);
  if (reverse) pts = [pts[0], ...pts.slice(1).reverse()];
  trackCache.set(key, pts);
  return pts;
}

// Corner detection from heading change. Returns [{i, dir}] in lap order.
const turnCache = new Map();
export function detectTurns(id, reverse, sensitivity = 0.5) {
  const key = `${id}|${reverse}|${sensitivity}`;
  if (turnCache.has(key)) return turnCache.get(key);
  const P = trackPoints(id, reverse);
  const h = P.map((p, i) => {
    const q = P[(i + 1) % N];
    return Math.atan2(q[1] - p[1], q[0] - p[0]);
  });
  const dA = h.map((a, i) => {
    let d = h[(i + 1) % N] - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  });
  // smoothed turning rate over a window
  const win = 4;
  const k = dA.map((_, i) => {
    let s = 0;
    for (let j = -win; j <= win; j++) s += dA[(i + j + N) % N];
    return s;
  });
  const thr = (0.85 - sensitivity * 0.6); // radians over the window
  const turns = [];
  let i = 0;
  // start scanning from a straight-ish point so a corner isn't split at index 0
  let start = 0;
  for (let j = 0; j < N; j++) if (Math.abs(k[j]) < thr * 0.5) { start = j; break; }
  while (i < N) {
    const idx = (start + i) % N;
    if (Math.abs(k[idx]) >= thr) {
      let best = idx, bestV = Math.abs(k[idx]), sign = Math.sign(k[idx]);
      let j = i;
      while (j < N && Math.abs(k[(start + j) % N]) >= thr * 0.6 && Math.sign(k[(start + j) % N]) === sign) {
        const id2 = (start + j) % N;
        if (Math.abs(k[id2]) > bestV) { bestV = Math.abs(k[id2]); best = id2; }
        j++;
      }
      turns.push({ i: best, dir: sign });
      i = j + 2;
    } else i++;
  }
  turns.sort((a, b) => a.i - b.i);
  // merge very close corners of the same direction (one physical corner)
  const merged = [];
  turns.forEach((t) => {
    const last = merged[merged.length - 1];
    if (last && t.i - last.i < 6 && last.dir === t.dir) return;
    merged.push(t);
  });
  turnCache.set(key, merged);
  return merged;
}

function fitTransform(P, { cx, cy, boxW, boxH, rot }) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const R = P.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  R.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  const sc = Math.min(boxW / (maxX - minX), boxH / (maxY - minY));
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  return { pts: R.map(([x, y]) => [cx + (x - mx) * sc, cy + (y - my) * sc]), sc, h: (maxY - minY) * sc, w: (maxX - minX) * sc };
}

function strokePath(ctx, pts, from, to, closed = false) {
  if (to <= from) return;
  ctx.beginPath();
  const a = Math.floor(from), b = Math.min(Math.floor(to), closed ? N : N - 1);
  ctx.moveTo(pts[a % N][0], pts[a % N][1]);
  for (let i = a + 1; i <= b; i++) ctx.lineTo(pts[i % N][0], pts[i % N][1]);
  // fractional tail for smooth progress
  const f = to - Math.floor(to);
  if (f > 0 && b < (closed ? N : N - 1) + 1) {
    const p = pts[b % N], q = pts[(b + 1) % N];
    ctx.lineTo(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f);
  }
  ctx.stroke();
}

const SECTOR_SETS = {
  f1: ['#e8434b', '#3b7ddd', '#f2c94c'],
  lilas: ['#c0b4fc', '#f3a6c8', '#8fd3c6'],
  mono: ['#ffffff', '#ffffff', '#ffffff'],
};

const fontOpts = [['head', 'Título (Acervo/Tipografia)'], ['body', 'Subtítulo (Acervo/Tipografia)'], ['Hand', 'Letra de mão'], ['Marker', 'Marcador']];
const pickFont = (rc, v) => (v === 'head' ? rc.fonts.head : v === 'body' ? rc.fonts.body : v);

export const circuitMap = {
  id: 'circuitMap',
  name: 'Circuito',
  desc: 'Traçado real da pista: desenha, colore setores, faz um setor piscar, numera curvas e dá zoom numa curva.',
  category: 'didatico',
  defaultDuration: 4.5,
  fields: [
    { key: 'circuit', label: 'Circuito (calendário 2026)', type: 'select', options: CIRCUITS.map((c) => [c.id, `${c.name} · ${c.sub}`]), default: 'interlagos' },
    { key: 'title', label: 'Título (vazio = nome do GP)', type: 'text', default: '' },
    { key: 'subtitle', label: 'Subtítulo (vazio = nome da pista)', type: 'text', default: '' },
    { key: 'showTitle', label: 'Mostrar título', type: 'toggle', default: true },
    { key: 'showLength', label: 'Mostrar extensão (km)', type: 'toggle', default: true },

    { key: 'draw', label: 'Pista se desenhando', type: 'toggle', default: true, group: 'O que mostrar' },
    { key: 'sectors', label: 'Setores coloridos', type: 'toggle', default: true, group: 'O que mostrar' },
    { key: 'sectorFocus', label: 'Setor em destaque (pisca)', type: 'select', options: [['0', 'Nenhum'], ['1', 'Setor 1'], ['2', 'Setor 2'], ['3', 'Setor 3']], default: '0', group: 'O que mostrar' },
    { key: 'sectorLabel', label: 'Texto do setor em destaque', type: 'text', default: '', group: 'O que mostrar', showIf: (P) => P.sectorFocus !== '0' },
    { key: 'turns', label: 'Numerar curvas (uma a uma)', type: 'toggle', default: false, group: 'O que mostrar' },
    { key: 'focusBy', label: 'Destacar uma curva', type: 'select', options: [['none', 'Não'], ['turn', 'Pelo número (contagem automática)'], ['pos', 'Pela posição na volta (exato)']], default: 'none', group: 'O que mostrar' },
    { key: 'turnFocus', label: 'Número da curva', type: 'range', min: 1, max: 30, step: 1, default: 1, group: 'O que mostrar', showIf: (P) => P.focusBy === 'turn' },
    { key: 'focusPos', label: 'Posição na volta (%)', type: 'range', min: 0, max: 100, step: 0.5, default: 25, group: 'O que mostrar', showIf: (P) => P.focusBy === 'pos' },
    { key: 'turnName', label: 'Nome da curva (ex.: CURVA 15)', type: 'text', default: '', group: 'O que mostrar', showIf: (P) => P.focusBy !== 'none' },
    { key: 'turnNote', label: 'Nota (ex.: 130R)', type: 'text', default: '', group: 'O que mostrar', showIf: (P) => P.focusBy !== 'none' },
    { key: 'zoom', label: 'Zoom na curva em destaque', type: 'toggle', default: true, group: 'O que mostrar', showIf: (P) => P.focusBy !== 'none' },
    { key: 'lap', label: 'Bolinha dando a volta', type: 'toggle', default: false, group: 'O que mostrar' },
    { key: 'lapTime', label: 'Tempo de uma volta (s)', type: 'range', min: 1, max: 8, step: 0.1, default: 2.5, group: 'O que mostrar', showIf: (P) => P.lap },
    { key: 'lapImg', label: 'Trocar bolinha por PNG (opcional)', type: 'image', libCategory: 'object', frames: false, group: 'O que mostrar', showIf: (P) => P.lap },
    { key: 'startLine', label: 'Marcar largada/chegada', type: 'toggle', default: true, group: 'O que mostrar' },

    { key: 'style', label: 'Traço', type: 'select', options: [['marker', 'Contorno escuro (como nos seus vídeos)'], ['white', 'Branco (por cima do vídeo)'], ['lilas', 'Lilás']], default: 'marker', group: 'Estilo' },
    { key: 'sectorColors', label: 'Cores dos setores', type: 'select', options: [['f1', 'Telemetria (vermelho/azul/amarelo)'], ['lilas', 'Lilás / rosa / menta'], ['mono', 'Sem cor']], default: 'f1', group: 'Estilo' },
    { key: 'width', label: 'Espessura do traço', type: 'range', min: 6, max: 34, step: 1, default: 16, group: 'Estilo' },
    { key: 'titleFont', label: 'Fonte do título', type: 'select', options: fontOpts, default: 'head', group: 'Estilo' },
    { key: 'inkColor', label: 'Cor do texto', type: 'color', default: '#2f2a36', group: 'Estilo' },
    { key: 'focusColor', label: 'Cor do destaque', type: 'color', default: '#a78bfa', group: 'Estilo' },
    { key: 'bg', label: 'Fundo', type: 'select', options: [['graph', 'Papel quadriculado amassado'], ['gingham', 'Xadrez lilás'], ['image', 'Imagem do meu acervo'], ['none', 'Sem fundo (por cima do vídeo)']], default: 'graph', group: 'Fundo' },
    { key: 'bgImage', label: 'Imagem de fundo', type: 'image', libCategory: 'background', frames: false, group: 'Fundo', showIf: (P) => P.bg === 'image' },
    { key: 'bgEnter', label: 'Animação do fundo', type: 'select', options: [['zoom', 'Zoom suave + fade'], ['slide', 'Desliza de baixo'], ['cut', 'Corte seco']], default: 'zoom', group: 'Fundo', showIf: (P) => P.bg !== 'none' },

    { key: 'rot', label: 'Girar pista (°)', type: 'range', min: -180, max: 180, step: 1, default: 0, group: 'Layout' },
    { key: 'scale', label: 'Tamanho', type: 'range', min: 0.5, max: 1.3, step: 0.01, default: 1, group: 'Layout' },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.3, max: 0.7, step: 0.01, default: 0.52, group: 'Layout' },
    { key: 's1', label: 'Fim do setor 1 (% da volta)', type: 'range', min: 10, max: 60, step: 1, default: 33, group: 'Ajustes finos' },
    { key: 's2', label: 'Fim do setor 2 (% da volta)', type: 'range', min: 40, max: 90, step: 1, default: 66, group: 'Ajustes finos' },
    { key: 'sens', label: 'Sensibilidade das curvas', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, group: 'Ajustes finos' },
    { key: 'reverse', label: 'Inverter sentido', type: 'toggle', default: false, group: 'Ajustes finos' },
  ],
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    const c = circuitById(P.circuit);
    sceneBg(rc, P.bg, { enter: P.bgEnter });
    const out = range(t, dur - 0.22, dur);
    if (out >= 1) return;
    const base = trackPoints(c.id, P.reverse);
    const cy = H * P.posY;
    const fit = fitTransform(base, { cx: W / 2, cy, boxW: W * 0.8 * P.scale, boxH: H * 0.42 * P.scale, rot: (P.rot * Math.PI) / 180 });
    const pts = fit.pts;
    const turns = detectTurns(c.id, P.reverse, P.sens);
    const tw = P.width;
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.22 : 0.05;
    const drawDur = 1.25;
    const drawK = P.draw ? ease.inOutQuart(range(t, t0, t0 + drawDur)) : 1;
    const popK = P.draw ? 1 : ease.outBack(range(t, t0, t0 + 0.3), 1.6);
    const afterDraw = t0 + (P.draw ? drawDur : 0.3);
    const sectorEnds = [0, Math.round((P.s1 / 100) * N), Math.round((Math.max(P.s2, P.s1 + 5) / 100) * N), N];
    const colors = SECTOR_SETS[P.sectorColors] || SECTOR_SETS.f1;
    const focusSector = parseInt(P.sectorFocus, 10) || 0;
    const focusTurn = P.focusBy === 'turn' && turns.length ? turns[Math.min(turns.length, P.turnFocus) - 1]
      : P.focusBy === 'pos' ? { i: Math.min(N - 1, Math.round((P.focusPos / 100) * N)) } : null;
    const focusName = P.turnName || (P.focusBy === 'turn' ? `CURVA ${P.turnFocus}` : 'CURVA');

    // camera zoom towards the highlighted turn
    let camK = 0;
    if (focusTurn && P.zoom) camK = ease.inOutQuart(range(t, afterDraw + 0.15, afterDraw + 0.75)) * (1 - ease.inOutQuart(range(t, dur - 0.6, dur - 0.25)));
    const Z = 1 + 1.3 * camK;

    ctx.save();
    ctx.globalAlpha *= 1 - ease.inCubic(out);
    if (camK > 0) {
      const tp = pts[focusTurn.i];
      const tx = tp[0] + (W / 2 - tp[0]) * camK, ty = tp[1] + (cy - tp[1]) * camK;
      ctx.translate(tx, ty);
      ctx.scale(Z, Z);
      ctx.translate(-tp[0], -tp[1]);
    }
    if (popK !== 1) {
      ctx.translate(W / 2, cy);
      ctx.scale(popK, popK);
      ctx.translate(-W / 2, -cy);
    }
    const lw = tw / Math.sqrt(Z); // keep line weight pleasant while zoomed
    const prog = drawK * N;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1) outline / base
    if (P.style === 'white') {
      ctx.save();
      ctx.shadowColor = 'rgba(30,20,50,0.45)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lw + 6;
      strokePath(ctx, pts, 0, prog, drawK >= 1);
      ctx.restore();
    } else {
      ctx.strokeStyle = P.style === 'lilas' ? '#4b4358' : '#1f1b24';
      ctx.lineWidth = lw + 10;
      strokePath(ctx, pts, 0, prog, drawK >= 1);
    }
    // 2) inner colour, per sector
    const blink = focusSector ? 0.5 + 0.5 * Math.sin((t - afterDraw) * Math.PI * 2 * 2.6) : 0;
    for (let s = 0; s < 3; s++) {
      const a = sectorEnds[s], b = Math.min(sectorEnds[s + 1], prog);
      if (b <= a) continue;
      let col = P.sectors ? colors[s] : P.style === 'lilas' ? '#c0b4fc' : P.style === 'white' ? '#ffffff' : '#ffffff';
      if (P.style === 'white' && !P.sectors) col = '#f4efff';
      ctx.save();
      const isFocus = focusSector === s + 1 && t > afterDraw;
      if (focusSector && !isFocus && t > afterDraw) ctx.globalAlpha *= 0.35 + 0.65 * (1 - range(t, afterDraw, afterDraw + 0.3));
      ctx.strokeStyle = col;
      ctx.lineWidth = isFocus ? lw * (1.15 + 0.35 * blink) : lw * 0.62;
      if (isFocus) {
        ctx.shadowColor = P.focusColor;
        ctx.shadowBlur = 22 + 20 * blink;
      }
      strokePath(ctx, pts, a, s === 2 && drawK >= 1 ? N : b, s === 2 && drawK >= 1);
      ctx.restore();
    }
    // pen head while drawing
    if (P.draw && drawK > 0 && drawK < 1) {
      const p = pts[Math.min(N - 1, Math.floor(prog))];
      ctx.fillStyle = P.focusColor;
      ctx.beginPath(); ctx.arc(p[0], p[1], lw * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    // start/finish chequer
    if (P.startLine && drawK > 0.02) {
      const p = pts[0], q = pts[2];
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const k = ease.outBack(range(t, t0, t0 + 0.25), 2);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(a);
      ctx.scale(k / Math.sqrt(Z), k / Math.sqrt(Z));
      const cs = 9, rows = 2, cols = 5;
      for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
        ctx.fillStyle = (r + cc) % 2 ? '#111' : '#fff';
        ctx.fillRect(-rows * cs / 2 + r * cs, -cols * cs / 2 + cc * cs, cs, cs);
      }
      ctx.restore();
    }
    // numbered turns, popping in order
    if (P.turns) {
      turns.forEach((tn, n) => {
        const k = range(t, afterDraw + n * 0.07, afterDraw + n * 0.07 + 0.22);
        if (k <= 0) return;
        const p = pts[tn.i];
        const a = pts[(tn.i - 8 + N) % N], b = pts[(tn.i + 8) % N];
        let ix = (a[0] + b[0]) / 2 - p[0], iy = (a[1] + b[1]) / 2 - p[1];
        const l = Math.hypot(ix, iy) || 1;
        const off = (lw + 34) / Math.sqrt(Z);
        const lx = p[0] - (ix / l) * off, ly = p[1] - (iy / l) * off;
        const sc = ease.outBack(k, 2.2) / Math.sqrt(Z);
        const isF = focusTurn && tn === focusTurn;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(sc, sc);
        ctx.fillStyle = isF ? P.focusColor : '#fbf9f3';
        ctx.strokeStyle = '#1f1b24';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        setFont(ctx, 'Hand', 28);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.fillStyle = '#1f1b24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n + 1), 0, 2);
        ctx.restore();
      });
    }
    // highlighted turn: hand-drawn circle + note
    if (focusTurn) {
      const p = pts[focusTurn.i];
      const start = afterDraw + (P.zoom ? 0.6 : 0.2);
      const r = (70 + lw) / Math.sqrt(Z);
      handCircle(ctx, p[0], p[1], r, r * 0.85, { color: P.focusColor, width: 7 / Math.sqrt(Z), progress: ease.inOutQuart(range(t, start, start + 0.45)), seed: 11 });
      const label = P.turnNote ? `${focusName} · ${P.turnNote}` : focusName;
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.scale(1 / Z, 1 / Z);
      revealText(ctx, label, { x: 0, y: -(r * Z) - 50, fontId: 'Hand', size: 50, color: P.inkColor, start: start + 0.3, per: 0.09, t, maxWidth: W * 0.8, glow: P.style === 'white' ? 'rgba(40,24,64,0.6)' : 'rgba(255,255,255,0.95)' });
      ctx.restore();
    }
    // sector label
    if (focusSector && t > afterDraw) {
      const mid = Math.floor((sectorEnds[focusSector - 1] + sectorEnds[focusSector]) / 2);
      const p = pts[mid];
      const label = P.sectorLabel || `SETOR ${focusSector}`;
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.scale(1 / Z, 1 / Z);
      const k = ease.outBack(range(t, afterDraw + 0.1, afterDraw + 0.35), 2);
      ctx.scale(k, k);
      setFont(ctx, 'Hand', 40);
      const w = ctx.measureText(label).width + 36;
      ctx.fillStyle = colors[focusSector - 1] === '#ffffff' ? P.focusColor : colors[focusSector - 1];
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-w / 2, -70, w, 54, 27) : ctx.rect(-w / 2, -70, w, 54);
      ctx.fill();
      ctx.fillStyle = '#1f1b24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -42);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.restore();
    }
    // lap dot / PNG
    if (P.lap && t > afterDraw) {
      const lt = (t - afterDraw) / P.lapTime;
      const fi = (lt % 1) * N;
      const i0 = Math.floor(fi);
      const p = pts[i0 % N], q = pts[(i0 + 1) % N];
      const f = fi - i0;
      const x = p[0] + (q[0] - p[0]) * f, y = p[1] + (q[1] - p[1]) * f;
      // trail
      for (let k = 14; k > 0; k--) {
        const tp = pts[(i0 - k + N) % N];
        ctx.fillStyle = P.focusColor;
        ctx.globalAlpha = 0.5 * (1 - k / 14);
        ctx.beginPath(); ctx.arc(tp[0], tp[1], (lw * 0.6) * (1 - k / 18), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const s = slot(rc, 'lapImg');
      if (s.img) {
        const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
        const flip = Math.cos(a) < 0;
        drawSticker(ctx, s.img, { x, y, w: (150 * s.zoom) / Math.sqrt(Z), rot: flip ? a + Math.PI : a, flip, shadow: rc.shadow });
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, lw * 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = P.focusColor;
        ctx.beginPath(); ctx.arc(x, y, lw * 0.75, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // title block (outside the camera)
    if (P.showTitle) {
      const topY = cy - fit.h / 2 - 200;
      const ty = Math.max(170, topY);
      const tOut = clamp(camK * 1.4);
      ctx.save();
      ctx.globalAlpha *= 1 - tOut * 0.85;
      revealText(ctx, (P.title || c.name).toUpperCase(), { x: W / 2, y: ty, fontId: pickFont(rc, P.titleFont), size: 96, color: P.inkColor, start: t0, per: 0.1, t, out, maxWidth: W * 0.88 });
      const sub = P.subtitle || c.sub;
      const extra = P.showLength && c.length ? ` · ${(c.length / 1000).toFixed(3).replace('.', ',')} km` : '';
      revealText(ctx, sub + extra, { x: W / 2, y: ty + 82, fontId: 'Hand', size: 40, color: P.inkColor, start: t0 + 0.25, per: 0.06, t, out, maxWidth: W * 0.88 });
      ctx.restore();
    }
  },
};
