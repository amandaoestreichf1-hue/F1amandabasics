// C. Overlays to drop on top of footage.
import { paperPiece, tape, stamp, photoSlot, drawFitText, wrapLines, markerLine, fitFont } from '../lib/paper.js';
import { fontCss } from '../lib/fonts.js';
import { jit, slot, cardEnv, group, deg, ease, range, clamp } from './common.js';

// ---------------------------------------------------------------------------
export const errata = {
  id: 'errata',
  name: 'Errata / Correção',
  desc: 'Bloco de notas preso com fita crepe: texto riscado + correção datilografada.',
  category: 'overlay',
  defaultDuration: 2.8,
  cues: (P, dur) => [
    { t: 0, s: 'whoosh', label: 'papel entra' },
    { t: 0.24, s: 'pop', label: 'cabeçalho' },
    { t: 0.55, s: 'typing', d: Math.min(dur - 0.9, String(P.body || '').length * 0.022), label: 'correção' },
  ],
  fields: [
    { key: 'header', label: 'Cabeçalho', type: 'text', default: 'ERRATA', suggestions: ['ERRATA', 'CORRIGINDO...', 'TEAM RADIO', 'NOTA DA EDITORA', 'ATUALIZAÇÃO'] },
    { key: 'wrong', label: 'Texto errado (riscado)', type: 'text', default: 'Hamilton terminou P5' },
    { key: 'body', label: 'Texto corrigido', type: 'textarea', default: 'Na verdade foi P4. A editora pede desculpas e vai dormir mais cedo hoje.' },
    { key: 'paperStyle', label: 'Papel', type: 'select', options: [['lined', 'Bloco pautado'], ['grid', 'Quadriculado'], ['news', 'Jornal'], ['grain', 'Liso']], default: 'lined' },
    { key: 'typewriter', label: 'Efeito máquina de escrever', type: 'toggle', default: true },
    { key: 'photo', label: 'Imagem/trinket opcional', type: 'image', defaultFrame: 'polaroid', optional: true },
    { key: 'posX', label: 'Posição horizontal', type: 'range', min: 0.25, max: 0.75, step: 0.01, default: 0.5, group: 'Layout' },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.15, max: 0.85, step: 0.01, default: 0.36, group: 'Layout' },
    { key: 'scale', label: 'Escala', type: 'range', min: 0.5, max: 1.2, step: 0.01, default: 1, group: 'Layout' },
    { key: 'tilt', label: 'Inclinação (°)', type: 'range', min: -10, max: 10, step: 0.5, default: -3, group: 'Layout' },
  ],
  render(rc) {
    const { ctx, W, H, P, pal, t } = rc;
    const env = cardEnv(rc, 0.3, 0.24);
    if (env.outRaw >= 1) return;
    const cx = W * P.posX, cy = H * P.posY;
    const pw = 780;
    ctx.font = fontCss('Courier', 48);
    const lines = wrapLines(ctx, P.body, pw - 150).slice(0, 8);
    const ph = 300 + (P.wrong ? 90 : 0) + lines.length * 62;
    const j = jit(rc, 5);
    ctx.save();
    group(ctx, cx, cy, {
      scale: P.scale * (1 - env.outP * 0.2),
      rot: deg(P.tilt) + (1 - env.inP) * -0.3 + env.outP * 0.3 + j.dr,
      dx: (1 - env.inP) * -900 + env.outP * 1200 + j.dx,
      dy: j.dy,
    });
    const T = cy - ph / 2, L = cx - pw / 2;
    paperPiece(ctx, { x: cx, y: cy, w: pw, h: ph, color: P.paperStyle === 'news' ? pal.paper : '#fbf8ef', seed: 1101, amp: 9, texture: P.paperStyle, newsSeed: 2, textureAlpha: P.paperStyle === 'news' ? 0.5 : 1, shadow: rc.shadow, torn: { t: true, l: false, r: false, b: true } }, (g) => {
      // spiral holes for notepad feel
      if (P.paperStyle === 'lined' || P.paperStyle === 'grid') {
        g.fillStyle = '#00000030';
        for (let x = 60; x < pw - 30; x += 64) { g.beginPath(); g.arc(x, 28, 10, 0, Math.PI * 2); g.fill(); }
      }
    });
    // header
    const hAp = env.at(0.24, 0.2, (x) => ease.outBack(x, 1.8));
    if (hAp > 0) {
      ctx.save();
      ctx.translate(L + 100, T + 140);
      ctx.scale(hAp, hAp);
      const s = fitFont(ctx, P.header, rc.fonts.head, 110, pw - 160);
      ctx.font = fontCss(rc.fonts.head, s);
      ctx.fillStyle = pal.accent;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(P.header, 0, 0);
      const hw = ctx.measureText(P.header).width;
      ctx.restore();
      markerLine(ctx, L + 96, T + 205, L + 100 + hw * hAp + 20, T + 198, { color: pal.accent2 === pal.paper ? pal.accent : pal.accent2, width: 12, progress: range(t, 0.34, 0.5), seed: 9 });
    }
    let y = T + 280;
    // wrong (struck-through) text
    if (P.wrong) {
      const wAp = range(t, 0.3, 0.42);
      if (wAp > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(wAp * 3);
        ctx.font = fontCss('Courier', 50);
        ctx.fillStyle = '#6b6b6b';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const ww = Math.min(ctx.measureText(P.wrong).width, pw - 150);
        ctx.fillText(P.wrong, L + 100, y, pw - 150);
        ctx.restore();
        markerLine(ctx, L + 90, y + 2, L + 110 + ww, y - 4, { color: '#e07aa5', width: 11, progress: ease.outCubic(range(t, 0.45, 0.62)), seed: 4 });
      }
      y += 90;
    }
    // body (typewriter)
    const total = lines.join('').length;
    const typeP = P.typewriter ? range(t, 0.55, Math.min(rc.dur - 0.35, 0.55 + total * 0.022)) : range(t, 0.5, 0.6);
    let shown = Math.floor(typeP * total + 0.0001);
    ctx.save();
    ctx.font = fontCss('Courier', 48);
    ctx.fillStyle = pal.ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    if (!P.typewriter) ctx.globalAlpha = typeP;
    lines.forEach((l, i) => {
      const part = P.typewriter ? l.slice(0, Math.max(0, shown)) : l;
      shown -= l.length;
      if (part) ctx.fillText(part, L + 100, y + i * 62);
      // caret
      if (P.typewriter && shown < 0 && shown > -l.length - 1 && Math.floor(t * 6) % 2 === 0) {
        const cw = ctx.measureText(part).width;
        ctx.fillRect(L + 104 + cw, y + i * 62 - 22, 24, 44);
      }
    });
    ctx.restore();
    // optional photo
    const s = slot(rc, 'photo');
    if (s.img) {
      photoSlot(ctx, s.img, { x: L + pw - 40, y: T + 40, w: 250, h: 250, rot: deg(9), frame: s.frame, seed: 1121, zoom: s.zoom, offX: s.offX, offY: s.offY, imgRot: s.imgRot, bw: s.bw, shadow: rc.shadow, ink: pal.ink, scale: env.at(0.4, 0.25, (x) => ease.outBack(x, 1.8)) });
    }
    // masking tape on top
    tape(ctx, { x: cx - 20, y: T + 6, w: 260, h: 70, rot: deg(-4), color: pal.tape, seed: 1131, scale: env.at(0.22, 0.12, (x) => ease.outBack(x, 2.2)) });
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
export const lowerThird = {
  id: 'lowerThird',
  name: 'Tarja / Manchete',
  desc: 'Faixa de papel rasgado rápida para apresentar o assunto do vídeo.',
  category: 'overlay',
  defaultDuration: 2.4,
  cues: () => [
    { t: 0, s: 'whoosh', label: 'faixa entra' },
    { t: 0.2, s: 'pop', label: 'etiqueta' },
  ],
  fields: [
    { key: 'tag', label: 'Etiqueta', type: 'text', default: 'PAUTA DO DIA' },
    { key: 'title', label: 'Manchete', type: 'text', default: 'O CAOS EM INTERLAGOS' },
    { key: 'sub', label: 'Linha de apoio', type: 'text', default: 'GP de São Paulo · Volta 42 · Safety Car' },
    { key: 'style', label: 'Cor da faixa', type: 'select', options: [['accent', 'Cor principal da equipe'], ['paper2', 'Cor secundária'], ['news', 'Jornal'], ['ink', 'Carvão']], default: 'accent' },
    { key: 'side', label: 'Entrar pela', type: 'select', options: [['left', 'Esquerda'], ['right', 'Direita']], default: 'left' },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.1, max: 0.9, step: 0.01, default: 0.64 },
    { key: 'scale', label: 'Escala', type: 'range', min: 0.6, max: 1.2, step: 0.01, default: 1 },
  ],
  render(rc) {
    const { ctx, W, H, P, pal, t } = rc;
    const env = cardEnv(rc, 0.3, 0.22);
    if (env.outRaw >= 1) return;
    const cy = H * P.posY;
    const right = P.side === 'right';
    ctx.save();
    if (right) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    group(ctx, 0, cy, { scale: P.scale });
    const stripW = W * 0.98;
    const colors = {
      accent: [pal.accent, pal.paper, 'grain'],
      paper2: [pal.paper2, pal.paper, 'grain'],
      news: [pal.paper, pal.ink, 'news'],
      ink: ['#1a1917', '#f6f1e6', 'grain'],
    }[P.style];
    const j = jit(rc, 21);
    const slide = (1 - env.inP) * -stripW - env.outP * stripW * 1.1;
    const textFix = (g, w) => { if (right) { g.translate(w, 0); g.scale(-1, 1); } };
    // main strip
    paperPiece(ctx, { x: stripW / 2 - 60 + slide + j.dx, y: cy + j.dy, w: stripW, h: 190, rot: deg(-1.2) + j.dr, color: colors[0], seed: 1201, amp: 10, step: 18, texture: colors[2], newsSeed: 3, shadow: rc.shadow, torn: { l: false } }, (g, w, h) => {
      g.save();
      textFix(g, w);
      const tIn = ease.outExpo(range(t, 0.14, 0.4));
      g.globalAlpha = tIn;
      const tx = right ? 80 : 130;
      drawFitText(g, P.title, { x: tx - (1 - tIn) * 80, y: h / 2 + 8, fontId: rc.fonts.head, size: 120, maxWidth: w - 220, color: colors[1], align: 'left' });
      g.restore();
    });
    // sub strip (newsprint)
    const sAp = ease.outExpo(range(t, 0.12, 0.42));
    const sOut = env.outP;
    if (P.sub && sAp > 0) {
      ctx.font = fontCss('Courier', 42);
      const sw = Math.min(W * 0.9, ctx.measureText(P.sub).width + 150);
      paperPiece(ctx, { x: sw / 2 - 40 + (1 - sAp) * -sw - sOut * W + j.dx, y: cy + 140, w: sw, h: 82, rot: deg(0.8), color: '#fbf8ef', seed: 1211, amp: 6, step: 14, texture: 'news', newsSeed: 1, textureAlpha: 0.35, shadow: rc.shadow, torn: { l: false } }, (g, w, h) => {
        g.save();
        textFix(g, w);
        g.font = fontCss('Courier', 42);
        g.fillStyle = pal.ink;
        g.textBaseline = 'middle';
        g.textAlign = 'left';
        g.fillText(P.sub, right ? 50 : 100, h / 2 + 3, w - 130);
        g.restore();
      });
    }
    // tag chip
    const tAp = env.at(0.2, 0.2, (x) => ease.outBack(x, 2));
    if (P.tag && tAp > 0 && env.outP < 0.6) {
      ctx.font = fontCss('Courier', 38);
      const tw = ctx.measureText(P.tag).width + 60;
      paperPiece(ctx, { x: 120 + tw / 2, y: cy - 118, w: tw, h: 66, rot: deg(-3.5), color: pal.ink === colors[0] ? pal.accent : '#151515', seed: 1221, amp: 4, step: 10, shadow: rc.shadow, scale: tAp * (1 - env.outP), fiber: null }, (g, w, h) => {
        g.save();
        textFix(g, w);
        g.font = fontCss('Courier', 38);
        g.fillStyle = pal.tape;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(P.tag, w / 2, h / 2 + 2);
        g.restore();
      });
      tape(ctx, { x: 120 + tw + 10, y: cy - 140, w: 120, h: 44, rot: deg(30), color: pal.tape, seed: 1231, scale: tAp * (1 - env.outP), pattern: 'stripes' });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
const parsePos = (s) => {
  const m = String(s || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

export const ticker = {
  id: 'ticker',
  name: 'Placar / Posição',
  desc: 'Ticker de jornal mostrando evolução na corrida: P12 ➔ P4 ou P2 ➔ DNF.',
  category: 'overlay',
  defaultDuration: 2.4,
  cues: () => [
    { t: 0, s: 'whoosh', label: 'placar entra' },
    { t: 0.2, s: 'pop', label: 'posição inicial' },
    { t: 0.42, s: 'pop', label: 'posição final' },
    { t: 0.75, s: 'pop', label: 'saldo' },
  ],
  fields: [
    { key: 'label', label: 'Rótulo', type: 'text', default: 'GANHO DE POSIÇÃO' },
    { key: 'driver', label: 'Piloto / sigla', type: 'text', default: 'NORRIS' },
    { key: 'from', label: 'De', type: 'text', default: 'P12' },
    { key: 'to', label: 'Para (P4, DNF, DSQ...)', type: 'text', default: 'P4' },
    { key: 'counter', label: 'Contador rolando', type: 'toggle', default: true },
    { key: 'photo', label: 'Mini foto (opcional)', type: 'image', defaultFrame: 'polaroid', optional: true },
    { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.1, max: 0.9, step: 0.01, default: 0.22 },
    { key: 'scale', label: 'Escala', type: 'range', min: 0.6, max: 1.2, step: 0.01, default: 1 },
  ],
  render(rc) {
    const { ctx, W, H, P, pal, t } = rc;
    const env = cardEnv(rc, 0.3, 0.22);
    if (env.outRaw >= 1) return;
    const cx = W / 2, cy = H * P.posY;
    const j = jit(rc, 31);
    ctx.save();
    group(ctx, cx, cy, { scale: P.scale * (0.9 + 0.1 * env.inP), dy: (1 - env.inP) * -500 - env.outP * 900, rot: (1 - env.inP) * 0.1 + j.dr, dx: j.dx });
    const sw = 960, sh = 230;
    const from = parsePos(P.from), to = parsePos(P.to);
    const dnf = to === null;
    const delta = !dnf && from !== null ? from - to : 0;
    const deltaColor = dnf ? '#e2627d' : delta > 0 ? '#5fbf8a' : delta < 0 ? '#e2627d' : '#8a8a8a';
    // label
    const lAp = env.at(0.1, 0.2, (x) => ease.outBack(x, 2));
    if (P.label && lAp > 0) {
      ctx.font = fontCss('Courier', 40);
      const lw = ctx.measureText(P.label).width + 60;
      paperPiece(ctx, { x: cx - sw / 2 + lw / 2 + 20, y: cy - sh / 2 - 34, w: lw, h: 66, rot: deg(-2.5), color: pal.tape, seed: 1301, amp: 4, step: 10, shadow: rc.shadow, scale: lAp }, (g, w, h) => {
        g.font = fontCss('Courier', 40);
        g.fillStyle = pal.ink;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(P.label, w / 2, h / 2 + 2);
      });
    }
    paperPiece(ctx, { x: cx, y: cy + 12, w: sw, h: sh, rot: deg(0.8), color: pal.ink, seed: 1311, amp: 8, step: 16, shadow: rc.shadow }, (g, w, h) => {
      // ticker rule lines
      g.fillStyle = pal.accent;
      g.fillRect(0, 14, w, 8);
      g.fillRect(0, h - 22, w, 8);
    });
    // driver name box
    const dAp = env.at(0.12, 0.2);
    const s = slot(rc, 'photo');
    let nameX = cx - sw / 2 + 40;
    if (s.img) {
      photoSlot(ctx, s.img, { x: nameX + 70, y: cy + 4, w: 130, h: 130, rot: deg(-6), frame: s.frame, seed: 1321, zoom: s.zoom, offX: s.offX, offY: s.offY, imgRot: s.imgRot, bw: s.bw, shadow: rc.shadow, ink: pal.ink, scale: env.at(0.2, 0.2, (x) => ease.outBack(x, 2)) });
      nameX += 160;
    }
    ctx.save();
    ctx.globalAlpha = dAp;
    drawFitText(ctx, P.driver.toUpperCase(), { x: nameX + (1 - dAp) * -40, y: cy + 20, fontId: rc.fonts.head, size: 110, maxWidth: s.img ? 250 : 360, color: '#f6f1e6', align: 'left' });
    ctx.restore();
    // positions
    const fx = cx + 70, tx = cx + 335;
    const fAp = env.at(0.2, 0.2, (x) => ease.outBack(x, 1.8));
    if (fAp > 0) {
      paperPiece(ctx, { x: fx, y: cy + 12, w: 150, h: 130, rot: deg(-3), color: pal.paper, seed: 1331, amp: 5, step: 12, texture: 'news', newsSeed: 2, textureAlpha: 0.4, scale: fAp, shadow: null }, (g, w, h) => {
        drawFitText(g, P.from, { x: w / 2, y: h / 2 + 6, fontId: rc.fonts.head, size: 90, maxWidth: w - 20, color: pal.ink });
      });
    }
    // arrow
    const aP = ease.outCubic(range(t, 0.32, 0.5));
    if (aP > 0) {
      const ax0 = fx + 90, ax1 = tx - 95;
      const axe = ax0 + (ax1 - ax0) * aP;
      ctx.save();
      ctx.strokeStyle = deltaColor;
      ctx.fillStyle = deltaColor;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax0, cy + 12); ctx.lineTo(axe, cy + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(axe + 18, cy + 12); ctx.lineTo(axe - 14, cy - 14); ctx.lineTo(axe - 14, cy + 38); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // destination position (rolling counter)
    const toAp = env.at(0.42, 0.18, (x) => ease.outBack(x, 1.8));
    if (toAp > 0) {
      let label = P.to;
      if (!dnf && from !== null && P.counter) {
        const k = ease.outExpo(range(t, 0.45, 0.95));
        label = 'P' + Math.round(from + (to - from) * k);
      }
      paperPiece(ctx, { x: tx, y: cy + 8, w: 170, h: 150, rot: deg(2.5), color: dnf ? '#e2627d' : pal.accent, seed: 1341, amp: 5, step: 12, scale: toAp, shadow: rc.shadow }, (g, w, h) => {
        drawFitText(g, label, { x: w / 2, y: h / 2 + 6, fontId: rc.fonts.head, size: 104, maxWidth: w - 20, color: '#fff' });
      });
    }
    // delta badge / DNF stamp
    if (dnf) {
      stamp(ctx, { x: cx + 330, y: cy - 130, text: P.to.toUpperCase(), sub: 'FIM DE PROVA', color: '#e2627d', width: 300, rot: deg(12), progress: range(t, 0.6, 0.8), fontId: rc.fonts.head });
    } else if (delta !== 0) {
      const bAp = env.at(0.75, 0.18, (x) => ease.outBack(x, 2.4));
      if (bAp > 0) {
        const txt = (delta > 0 ? '+' : '') + delta;
        paperPiece(ctx, { x: cx + sw / 2 - 30, y: cy - sh / 2 + 10, w: 130, h: 90, rot: deg(10), color: deltaColor, seed: 1351, amp: 4, step: 10, scale: bAp, shadow: rc.shadow }, (g, w, h) => {
          drawFitText(g, txt, { x: w / 2, y: h / 2 + 4, fontId: rc.fonts.head, size: 70, maxWidth: w - 16, color: '#fff' });
        });
      }
    }
    ctx.restore();
  },
};
