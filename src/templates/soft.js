// "Lilás" family: templates modeled on the creator's own edits — lilac handwritten titles,
// lilac/linen gingham, crumpled graph paper, floating cut-out heads, hand-drawn circles & arrows.
import { setFont, graphLines, crumpleTexture, weaveOver, handCircle, handArrow, photoSlot, wrapLines, drawImageCover } from '../lib/paper.js';
import { rng } from '../lib/rng.js';
import { slot, ease, range, clamp } from './common.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
export function sceneBg(rc, kind, { enter = 'zoom', inLen = 0.3, outLen = 0.22 } = {}) {
  if (!kind || kind === 'none') return;
  const { ctx, W, H, pal, t, dur } = rc;
  const kin = range(t, 0, inLen), kout = range(t, dur - outLen, dur);
  ctx.save();
  if (enter === 'slide') {
    ctx.translate(0, (1 - ease.outExpo(kin)) * H - ease.inCubic(kout) * H);
  } else if (enter === 'zoom') {
    // soft "breathing" zoom in + fade, then a gentle drift while on screen
    const sc = 1.12 - 0.12 * ease.outCubic(kin) + 0.03 * range(t, 0, dur) + 0.04 * ease.inCubic(kout);
    ctx.globalAlpha *= ease.outCubic(kin) * (1 - ease.inCubic(kout));
    ctx.translate(W / 2, H / 2);
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -H / 2);
  }
  if (kind === 'graph') {
    ctx.fillStyle = pal.paper;
    ctx.fillRect(0, 0, W, H);
    graphLines(ctx, W, H, 24);
    const cr = crumpleTexture();
    ctx.drawImage(cr, -120, -150);
  } else if (kind === 'gingham') {
    gingham(ctx, 0, 0, W, H, { size: 150, c1: pal.paper2, c2: pal.linen });
  } else if (kind === 'image') {
    const s = slot(rc, 'bgImage');
    if (s.img) drawImageCover(ctx, s.img, W, H, { zoom: s.zoom, offX: s.offX, offY: s.offY, rot: s.imgRot });
    else {
      ctx.fillStyle = pal.paper;
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.restore();
}

export function gingham(ctx, x, y, w, h, { size = 150, c1, c2, weave = true }) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = c2;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c1;
  for (let r = 0; r * size < h + size; r++) for (let c = 0; c * size < w + size; c++) {
    if ((r + c) % 2 === 0) ctx.fillRect(x + c * size - size * 0.3, y + r * size - size * 0.3, size, size);
  }
  if (weave) weaveOver(ctx, w + x, h + y, 0.45);
  ctx.restore();
}

// Word-by-word (or letter typing) reveal. lines: string[]; returns block height.
export function revealText(ctx, text, { x, y, fontId, size, color, align = 'center', start = 0, per = 0.11, t, mode = 'word', lineH = 1.12, maxWidth = 960, glow = null, popScale = 0.55, out = 0 }) {
  if (!text) return 0;
  setFont(ctx, fontId, size);
  const lines = wrapLines(ctx, text, maxWidth);
  let idx = 0;
  const lh = size * lineH;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.18;
  }
  const outA = 1 - ease.inCubic(out);
  lines.forEach((line, li) => {
    const ly = y + li * lh;
    setFont(ctx, fontId, size);
    const full = ctx.measureText(line).width;
    let lx = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
    if (mode === 'letter') {
      const chars = [...line];
      let shown = '';
      for (const ch of chars) {
        if (t >= start + idx * per * 0.35) shown += ch;
        idx++;
      }
      ctx.globalAlpha = outA;
      ctx.textAlign = 'left';
      ctx.fillText(shown, lx, ly);
      return;
    }
    const words = line.split(' ');
    words.forEach((wd, wi) => {
      const ww = ctx.measureText(wd).width;
      const sp = ctx.measureText(' ').width;
      const k = range(t, start + idx * per, start + idx * per + 0.2);
      idx++;
      if (k > 0) {
        const s = popScale + (1 - popScale) * ease.outBack(k, 2.2);
        ctx.save();
        ctx.globalAlpha = clamp(k * 3) * outA;
        ctx.translate(lx + ww / 2, ly + (1 - ease.outCubic(k)) * size * 0.18);
        ctx.scale(s * (1 - out * 0.12), s * (1 - out * 0.12));
        ctx.textAlign = 'center';
        ctx.fillText(wd, 0, 0);
        ctx.restore();
      }
      lx += ww + sp;
    });
  });
  ctx.restore();
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return lines.length * lh;
}

const bgField = (def = 'graph') => ({ key: 'bg', label: 'Fundo', type: 'select', options: [['graph', 'Papel quadriculado amassado'], ['gingham', 'Xadrez lilás (tecido)'], ['image', 'Imagem do meu acervo'], ['none', 'Sem fundo (por cima do vídeo)']], default: def, group: 'Fundo' });
const bgImageField = { key: 'bgImage', label: 'Imagem de fundo', type: 'image', libCategory: 'background', frames: false, group: 'Fundo', showIf: (P) => P.bg === 'image' };
const bgEnterField = { key: 'bgEnter', label: 'Animação do fundo', type: 'select', options: [['zoom', 'Zoom suave + fade'], ['slide', 'Desliza de baixo'], ['cut', 'Corte seco']], default: 'zoom', group: 'Fundo', showIf: (P) => P.bg !== 'none' };
const fontOpts = [['head', 'Título (do Acervo/Tipografia)'], ['body', 'Subtítulo (do Acervo/Tipografia)'], ['accent', 'Destaque (do Acervo/Tipografia)'], ['Hand', 'Letra de mão'], ['Script', 'Script'], ['Marker', 'Marcador'], ['Rounded', 'Bold largo'], ['PlayfairItalic', 'Serifada itálica'], ['Courier', 'Máquina de escrever']];
const pickFont = (rc, v) => (v === 'head' ? rc.fonts.head : v === 'body' ? rc.fonts.body : v === 'accent' ? rc.fonts.accent || 'Script' : v);
const legibility = (P) => (P.glow ? 'rgba(40,24,64,0.45)' : null);

// ---------------------------------------------------------------------------
export const lilacTitle = {
  id: 'lilacTitle',
  name: 'Título Lilás',
  desc: 'Seu título de abertura: nome em lilás + linha bold + palavra em script, palavra por palavra.',
  category: 'overlay',
  defaultDuration: 2.6,
  fields: [
    { key: 'l1', label: 'Linha 1 (destaque)', type: 'text', default: 'VERSTAPPEN' },
    { key: 'l2', label: 'Linha 2 (bold pequena)', type: 'text', default: 'ainda pode ser' },
    { key: 'l3', label: 'Linha 3 (script)', type: 'text', default: 'campeão' },
    { key: 'f1', label: 'Fonte linha 1', type: 'select', options: fontOpts, default: 'head', group: 'Estilo' },
    { key: 'f2', label: 'Fonte linha 2', type: 'select', options: fontOpts, default: 'Rounded', group: 'Estilo' },
    { key: 'f3', label: 'Fonte linha 3', type: 'select', options: fontOpts, default: 'accent', group: 'Estilo' },
    { key: 'c1', label: 'Cor linha 1', type: 'color', default: '#c0b4fc', group: 'Estilo' },
    { key: 'c2', label: 'Cor linha 2', type: 'color', default: '#ffffff', group: 'Estilo' },
    { key: 'c3', label: 'Cor linha 3', type: 'color', default: '#ffffff', group: 'Estilo' },
    { key: 's1', label: 'Tamanho linha 1', type: 'range', min: 60, max: 260, step: 2, default: 150, group: 'Estilo' },
    { key: 's2', label: 'Tamanho linha 2', type: 'range', min: 30, max: 140, step: 2, default: 54, group: 'Estilo' },
    { key: 's3', label: 'Tamanho linha 3', type: 'range', min: 60, max: 280, step: 2, default: 170, group: 'Estilo' },
    { key: 'mode', label: 'Aparecer', type: 'select', options: [['word', 'Palavra por palavra'], ['letter', 'Letra por letra (digitando)']], default: 'word' },
    { key: 'glow', label: 'Sombrinha p/ leitura no vídeo', type: 'toggle', default: true },
    { ...bgField('none') },
    bgImageField,
    bgEnterField,
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.15, max: 0.85, step: 0.01, default: 0.56, group: 'Layout' },
    { key: 'scale', label: 'Escala', type: 'range', min: 0.5, max: 1.4, step: 0.01, default: 1, group: 'Layout' },
  ],
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    const cy = H * P.posY;
    const out = range(t, dur - 0.22, dur);
    sceneBg(rc, P.bg, { enter: P.bgEnter });
    if (out >= 1) return;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.scale(P.scale, P.scale);
    ctx.translate(-W / 2, -cy);
    const glow = legibility(P);
    const y1 = cy - P.s2 * 0.55 - P.s1 * 0.42;
    const y3 = cy + P.s2 * 0.45 + P.s3 * 0.38;
    const n1 = P.l1 ? P.l1.split(' ').length : 0;
    const n2 = P.l2 ? P.l2.split(' ').length : 0;
    const per = P.mode === 'letter' ? 0.05 : 0.13;
    const s2 = 0.1 + Math.max(1, n1) * per * (P.mode === 'letter' ? (P.l1 || '').length / Math.max(1, n1) * 0.35 : 1) + 0.08;
    const s3 = s2 + Math.max(1, n2) * per * (P.mode === 'letter' ? (P.l2 || '').length / Math.max(1, n2) * 0.35 : 1) + 0.1;
    revealText(ctx, P.l1, { x: W / 2, y: y1, fontId: pickFont(rc, P.f1), size: P.s1, color: P.c1, start: 0.06, per, t, mode: P.mode, glow, maxWidth: 1000 / P.scale, out });
    revealText(ctx, P.l2, { x: W / 2, y: cy, fontId: pickFont(rc, P.f2), size: P.s2, color: P.c2, start: s2, per, t, mode: P.mode, glow, maxWidth: 1000 / P.scale, out });
    revealText(ctx, P.l3, { x: W / 2, y: y3, fontId: pickFont(rc, P.f3), size: P.s3, color: P.c3, start: s3, per: per * 1.4, t, mode: P.mode, glow, popScale: 0.7, maxWidth: 1000 / P.scale, out });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
export const checkerWipe = {
  id: 'checkerWipe',
  name: 'Xadrez Lilás',
  desc: 'Quadradinhos de tecido lilás/linho cobrem a tela em cascata e abrem na próxima cena.',
  category: 'transition',
  defaultDuration: 1.0,
  cutPoint: 0.5,
  fields: [
    { key: 'size', label: 'Tamanho dos quadrados', type: 'range', min: 90, max: 270, step: 5, default: 150 },
    { key: 'order', label: 'Ordem', type: 'select', options: [['diagonal', 'Diagonal'], ['center', 'Do centro pra fora'], ['rows', 'De cima pra baixo'], ['random', 'Aleatória (confete)']], default: 'diagonal' },
    { key: 'text', label: 'Texto no meio (opcional)', type: 'text', default: '' },
    { key: 'textFont', label: 'Fonte do texto', type: 'select', options: fontOpts, default: 'head' },
    { key: 'textColor', label: 'Cor do texto', type: 'color', default: '#ffffff' },
    { key: 'fill', label: 'Preenchimento', type: 'select', options: [['checker', 'Xadrez lilás/linho'], ['image', 'Imagem do meu acervo (mosaico)']], default: 'checker' },
    { key: 'tileImage', label: 'Imagem dos quadrados', type: 'image', libCategory: 'background', frames: false, showIf: (P) => P.fill === 'image' },
    { key: 'weave', label: 'Textura de tecido', type: 'toggle', default: true },
    { key: 'mode', label: 'Movimento', type: 'select', options: [['full', 'Cobre e revela (corte no meio)'], ['in', 'Só cobrir'], ['out', 'Só revelar']], default: 'full' },
  ],
  render(rc) {
    const { ctx, W, H, pal, P, t, dur } = rc;
    const p = clamp(t / dur);
    const size = P.size;
    const cols = Math.ceil(W / size) + 1, rows = Math.ceil(H / size) + 1;
    const r = rng(17);
    const ox = (W - cols * size) / 2, oy = (H - rows * size) / 2;
    const spread = 0.3, len = 0.17;
    ctx.save();
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
      let o;
      if (P.order === 'center') o = Math.hypot(cc - (cols - 1) / 2, (rr - (rows - 1) / 2) * 0.7) / Math.hypot(cols / 2, rows * 0.35);
      else if (P.order === 'rows') o = rr / (rows - 1);
      else if (P.order === 'random') o = r();
      else o = (cc + rr) / (cols + rows - 2);
      o = clamp(o);
      let kin = range(p, o * spread, o * spread + len);
      let kout = range(p, 0.53 + o * spread, 0.53 + o * spread + len);
      if (P.mode === 'in') { kin = range(p, o * spread * 2, o * spread * 2 + len * 2); kout = 0; }
      if (P.mode === 'out') { kin = 1; kout = range(p, o * spread * 2, o * spread * 2 + len * 2); }
      let s = ease.outBack(kin, 1.5) * (1 - ease.inBack(kout, 1.4));
      if (kin >= 1 && kout <= 0) s = 1;
      if (s <= 0.001) continue;
      const cx = ox + cc * size + size / 2, cy = oy + rr * size + size / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((1 - Math.min(1, s)) * 0.5);
      ctx.scale(s, s);
      ctx.fillStyle = (rr + cc) % 2 ? pal.paper2 : pal.linen;
      ctx.fillRect(-size / 2 - 0.6, -size / 2 - 0.6, size + 1.2, size + 1.2);
      ctx.restore();
    }
    const ti = P.fill === 'image' ? slot(rc, 'tileImage') : null;
    if (ti?.img) {
      ctx.globalCompositeOperation = 'source-atop';
      drawImageCover(ctx, ti.img, W, H, { zoom: ti.zoom, offX: ti.offX, offY: ti.offY, rot: ti.imgRot });
      ctx.globalCompositeOperation = 'source-over';
    }
    if (P.weave) {
      ctx.globalCompositeOperation = 'source-atop';
      weaveOver(ctx, W, H, 0.45);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (P.text) {
      const tin = p * dur;
      const outK = range(p, 0.6, 0.68);
      if (outK < 1) revealText(ctx, P.text, { x: W / 2, y: H / 2, fontId: pickFont(rc, P.textFont), size: 110, color: P.textColor, start: dur * 0.3, per: 0.08, t: tin, maxWidth: W * 0.84, out: outK });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
export const disclaimer = {
  id: 'disclaimer',
  name: 'Disclaimer / Nota',
  desc: 'Título circulado à mão + texto em letra de mão surgindo palavra por palavra.',
  category: 'overlay',
  defaultDuration: 3.2,
  fields: [
    { key: 'title', label: 'Título', type: 'text', default: 'DISCLAIMER:', suggestions: ['DISCLAIMER:', 'NÃO CONFIRMADAS:', 'ATENÇÃO:', 'SPOILER:', 'CONTEXTO:'] },
    { key: 'text', label: 'Texto', type: 'textarea', default: 'FALTAM APENAS 6 CORRIDAS PARA O FIM DA TEMPORADA' },
    { key: 'circle', label: 'Círculo desenhado no título', type: 'toggle', default: true },
    { key: 'titleFont', label: 'Fonte do título', type: 'select', options: fontOpts, default: 'head', group: 'Estilo' },
    { key: 'textFont', label: 'Fonte do texto', type: 'select', options: fontOpts, default: 'Hand', group: 'Estilo' },
    { key: 'titleColor', label: 'Cor do título', type: 'color', default: '#625a78', group: 'Estilo' },
    { key: 'textColor', label: 'Cor do texto', type: 'color', default: '#2f2a36', group: 'Estilo' },
    { key: 'circleColor', label: 'Cor do círculo', type: 'color', default: '#ffffff', group: 'Estilo' },
    { key: 'titleSize', label: 'Tamanho do título', type: 'range', min: 60, max: 200, step: 2, default: 110, group: 'Estilo' },
    { key: 'textSize', label: 'Tamanho do texto', type: 'range', min: 30, max: 110, step: 2, default: 56, group: 'Estilo' },
    bgField('graph'),
    bgImageField,
    bgEnterField,
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.12, max: 0.8, step: 0.01, default: 0.32, group: 'Layout' },
  ],
  render(rc) {
    const { ctx, W, H, P, t, dur } = rc;
    const out = range(t, dur - 0.18, dur);
    sceneBg(rc, P.bg, { enter: P.bgEnter });
    if (out >= 1) return;
    const cy = H * P.posY;
    const tf = pickFont(rc, P.titleFont);
    const tStart = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.25 : 0.08;
    revealText(ctx, P.title, { x: W / 2, y: cy, fontId: tf, size: P.titleSize, color: P.titleColor, start: tStart, per: 0.1, t, out });
    if (P.circle) {
      setFont(ctx, tf, P.titleSize);
      const tw = Math.min(W * 0.9, ctx.measureText(P.title).width);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.save();
      ctx.globalAlpha = 1 - out;
      handCircle(ctx, W / 2, cy + 4, tw * 0.55 + 24, P.titleSize * 0.62, { color: P.circleColor, width: 7, progress: ease.inOutQuart(range(t, tStart + 0.22, tStart + 0.6)), seed: 5 });
      ctx.restore();
    }
    revealText(ctx, P.text, { x: W / 2, y: cy + P.titleSize * 0.9 + P.textSize * 0.6, fontId: pickFont(rc, P.textFont), size: P.textSize, color: P.textColor, start: tStart + 0.55, per: 0.12, t, maxWidth: W * 0.72, lineH: 1.25, out });
  },
};

// ---------------------------------------------------------------------------
export const pointsCompare = {
  id: 'pointsCompare',
  name: 'Cabecinhas & Pontos',
  desc: 'Cabeças recortadas + "340 PTS" ou "PRECISA GANHAR TUDO", com seta lilás e diferença.',
  category: 'overlay',
  defaultDuration: 3.4,
  fields: [
    { key: 'photo1', label: 'Cabecinha 1 (PNG recortado)', type: 'image', defaultFrame: 'cutout' },
    { key: 'v1', label: 'Texto 1', type: 'textarea', default: '340 PTS' },
    { key: 'rows', label: 'Linhas', type: 'select', options: [['1', '1 pessoa'], ['2', '2 pessoas']], default: '2' },
    { key: 'photo2', label: 'Cabecinha 2 (PNG recortado)', type: 'image', defaultFrame: 'cutout', showIf: (P) => P.rows === '2' },
    { key: 'v2', label: 'Texto 2', type: 'textarea', default: '221 PTS', showIf: (P) => P.rows === '2' },
    { key: 'arrow', label: 'Seta entre os dois', type: 'toggle', default: true, showIf: (P) => P.rows === '2' },
    { key: 'diff', label: 'Diferença (do lado da seta)', type: 'text', default: '119 PTS', showIf: (P) => P.rows === '2' },
    { key: 'font', label: 'Fonte dos textos', type: 'select', options: fontOpts, default: 'Marker', group: 'Estilo' },
    { key: 'color', label: 'Cor dos textos', type: 'color', default: '#2b2630', group: 'Estilo' },
    { key: 'arrowColor', label: 'Cor da seta', type: 'color', default: '#c0b4fc', group: 'Estilo' },
    { key: 'size', label: 'Tamanho do texto', type: 'range', min: 40, max: 150, step: 2, default: 96, group: 'Estilo' },
    { key: 'head', label: 'Tamanho das cabecinhas', type: 'range', min: 140, max: 420, step: 5, default: 260, group: 'Estilo' },
    bgField('graph'),
    bgImageField,
    bgEnterField,
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.15, max: 0.75, step: 0.01, default: 0.38, group: 'Layout' },
    { key: 'gap', label: 'Distância entre linhas', type: 'range', min: 200, max: 700, step: 5, default: 360, group: 'Layout' },
  ],
  render(rc) {
    const { ctx, W, H, P, pal, t, dur } = rc;
    const out = range(t, dur - 0.18, dur);
    sceneBg(rc, P.bg, { enter: P.bgEnter });
    if (out >= 1) return;
    const t0 = P.bg !== 'none' && P.bgEnter !== 'cut' ? 0.25 : 0.05;
    const two = P.rows === '2';
    const y1 = H * P.posY, y2 = y1 + P.gap;
    const hx = W * 0.3, tx = W * 0.45;
    const fontId = pickFont(rc, P.font);
    const row = (key, text, y, start) => {
      const s = slot(rc, key);
      const k = range(t, start, start + 0.28);
      const sc = ease.outBack(k, 2) * (1 - ease.inBack(out, 1.6));
      if (sc > 0) {
        photoSlot(ctx, s.img, { x: hx, y, w: P.head, h: P.head * 1.15, rot: (s.imgRot ? 0 : -0.03), frame: s.frame, seed: 7, zoom: s.zoom, offX: s.offX, offY: s.offY, imgRot: s.imgRot, bw: s.bw, shadow: rc.shadow, ink: pal.ink, scale: sc });
        if (!s.img) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = pal.ink;
          setFont(ctx, 'Hand', 30);
          ctx.textAlign = 'center';
          ctx.fillText('cabecinha', hx, y + P.head * 0.72);
          ctx.restore();
        }
      }
      const lines = String(text || '').split('\n');
      setFont(ctx, fontId, P.size);
      const lh = P.size * 1.08;
      const blockH = lines.length * lh;
      let ty = y - blockH / 2 + lh / 2;
      let st = start + 0.25;
      lines.forEach((ln) => {
        revealText(ctx, ln, { x: tx, y: ty, fontId, size: P.size, color: P.color, align: 'left', start: st, per: 0.1, t, maxWidth: W - tx - 30, out });
        st += ln.split(' ').length * 0.1;
        ty += lh;
      });
    };
    row('photo1', P.v1, y1, t0);
    if (two) {
      const start2 = t0 + 0.55 + String(P.v1).split(/\s+/).length * 0.1;
      row('photo2', P.v2, y2, start2);
      if (P.arrow) {
        const ax = tx + P.size * 0.9;
        const ak = ease.inOutQuart(range(t, start2 + 0.5, start2 + 0.85));
        ctx.save();
        ctx.globalAlpha = 1 - out;
        handArrow(ctx, ax, y1 + P.size * 0.55, ax + 6, y2 - P.size * 0.6, { color: P.arrowColor, width: 6, progress: ak, seed: 3, bend: 0.02, head: 22 });
        ctx.restore();
        if (P.diff) revealText(ctx, P.diff, { x: ax + 40, y: (y1 + y2) / 2, fontId: 'Hand', size: P.size * 0.42, color: P.color, align: 'left', start: start2 + 0.8, per: 0.08, t, out });
      }
    }
  },
};
