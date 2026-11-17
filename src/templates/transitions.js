// A. Full-screen wipes. The screen is 100% covered around 50% of the duration — that's the cut point.
import { paperPiece, tape, stamp, kerb, drawFitText, ransomText } from '../lib/paper.js';
import { carSticker, drawSticker } from '../lib/car.js';
import { fontCss } from '../lib/fonts.js';
import { rng } from '../lib/rng.js';
import { jit, deg, ease, range, clamp } from './common.js';

// ---------------------------------------------------------------------------
// Newspaper strips headline wipe
// ---------------------------------------------------------------------------
export const newsWipe = {
  id: 'newsWipe',
  name: 'Manchete Wipe',
  desc: 'Tiras de jornal rasgado cobrem a tela e abrem revelando a próxima cena.',
  category: 'transition',
  defaultDuration: 1.0,
  cutPoint: 0.5,
  fields: [
    { key: 'h1', label: 'Manchete 1', type: 'text', default: 'RACE REPORT' },
    { key: 'h2', label: 'Manchete 2', type: 'text', default: 'PADDOCK NEWS' },
    { key: 'h3', label: 'Manchete 3', type: 'text', default: 'ÚLTIMA HORA' },
    { key: 'strips', label: 'Nº de tiras', type: 'range', min: 4, max: 9, step: 1, default: 6 },
    { key: 'mix', label: 'Papéis', type: 'select', options: [['team', 'Jornal + cores da equipe'], ['news', 'Só jornal'], ['team-only', 'Só cores da equipe']], default: 'team' },
    { key: 'angle', label: 'Inclinação das tiras (°)', type: 'range', min: -12, max: 12, step: 1, default: -4 },
    { key: 'stampOn', label: 'Carimbo no meio', type: 'toggle', default: true },
    { key: 'stampText', label: 'Texto do carimbo', type: 'text', default: 'BREAKING' },
    { key: 'mode', label: 'Movimento', type: 'select', options: [['full', 'Cobre e revela (corte no meio)'], ['in', 'Só cobrir'], ['out', 'Só revelar']], default: 'full' },
  ],
  render(rc) {
    const { ctx, W, H, pal, P, t, dur } = rc;
    const p = clamp(t / dur);
    const n = P.strips | 0;
    const ang = deg(P.angle);
    // Strips must cover the rotated screen
    const span = H / Math.cos(ang) + Math.abs(Math.tan(ang)) * W + 260;
    const sh = span / n + 70;
    const sw = W * 1.7;
    const headlines = [P.h1, P.h2, P.h3].filter(Boolean);
    const stagger = 0.24 / n;
    const inLen = 0.22, outStart = 0.56;
    const mid = Math.floor(n / 2);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(ang);
    for (let i = 0; i < n; i++) {
      const order = (i * 3) % n; // shuffled stagger, more collage-y
      const d = order * stagger;
      let inP = ease.outExpo(range(p, d, d + inLen));
      let outP = ease.inOutExpo(range(p, outStart + d * 0.8, outStart + d * 0.8 + inLen + 0.04));
      if (P.mode === 'in') { inP = ease.outExpo(range(p, d * 2, d * 2 + inLen * 2)); outP = 0; }
      if (P.mode === 'out') { inP = 1; outP = ease.inOutExpo(range(p, d * 2, d * 2 + inLen * 2)); }
      if (inP <= 0 || outP >= 1) continue;
      const side = i % 2 ? 1 : -1;
      const x = side * (1 - inP) * sw * 1.05 - side * outP * sw * 1.05;
      const y = -span / 2 + (i + 0.5) * (span / n);
      const j = jit(rc, i);
      let color = pal.paper, tex = 'news', ink = pal.ink;
      const kind = P.mix === 'news' ? 0 : P.mix === 'team-only' ? 1 + (i % 2) : [0, 1, 0, 2][i % 4];
      if (kind === 1) { color = pal.paper2; tex = 'grain'; ink = pal.paper; }
      if (kind === 2) { color = pal.accent; tex = 'grain'; ink = pal.paper; }
      if (P.mix === 'team-only' && pal.paper2.toLowerCase() === pal.accent.toLowerCase()) {
        if (kind === 2) { color = pal.accent2; ink = pal.ink; }
      }
      const headline = headlines.length && (i % 2 === 1 || i === mid) ? headlines[(i >> 1) % headlines.length] : null;
      const r = rng(i * 31 + 5);
      paperPiece(ctx, {
        x: x + j.dx, y: y + j.dy, w: sw, h: sh, rot: (r() - 0.5) * 0.03 + j.dr, color, seed: 100 + i * 13, amp: 14, step: 22,
        texture: tex, newsSeed: i % 4, shadow: rc.shadow, torn: { l: false, r: false },
      }, (g, w, h) => {
        if (!headline) return;
        const tx = w / 2 + (r() - 0.5) * 240;
        drawFitText(g, headline, { x: tx, y: h / 2 + 6, fontId: rc.fonts.head, size: h * 0.62, maxWidth: W * 0.92, color: ink });
      });
      if (P.stampOn && i === mid && P.stampText) {
        stamp(ctx, { x: x + 170, y: y + sh * 0.2, text: P.stampText, color: pal.accent === pal.paper2 ? pal.accent2 : pal.accent, width: 470, rot: -0.14 - ang, progress: range(p, 0.28, 0.46), fontId: rc.fonts.head });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// Car / PNG pass wipe
// ---------------------------------------------------------------------------
export const carWipe = {
  id: 'carWipe',
  name: 'Passagem de Carro',
  desc: 'Carro ilustrado (ou seu PNG) cruza a tela deixando rastro de papel / zebra.',
  category: 'transition',
  defaultDuration: 0.9,
  cutPoint: 0.55,
  fields: [
    { key: 'carMode', label: 'Objeto', type: 'select', options: [['native', 'Carrinho ilustrado (cor da equipe)'], ['png', 'Meu PNG (carro, capacete, objeto)']], default: 'native' },
    { key: 'carPng', label: 'PNG que cruza a tela', type: 'image', frames: false, showIf: (P) => P.carMode === 'png' },
    { key: 'carFlip', label: 'Espelhar PNG', type: 'toggle', default: false, showIf: (P) => P.carMode === 'png' },
    { key: 'carNumber', label: 'Número do carro', type: 'text', default: '4', showIf: (P) => P.carMode === 'native' },
    { key: 'dir', label: 'Direção', type: 'select', options: [['ltr', 'Esquerda → Direita'], ['rtl', 'Direita → Esquerda']], default: 'ltr' },
    { key: 'carScale', label: 'Tamanho do objeto', type: 'range', min: 0.5, max: 1.6, step: 0.05, default: 1 },
    { key: 'carY', label: 'Altura na tela', type: 'range', min: 0.15, max: 0.85, step: 0.01, default: 0.5 },
    { key: 'trail', label: 'Rastro', type: 'select', options: [['torn', 'Papel rasgado (equipe)'], ['kerb', 'Zebra de pista'], ['news', 'Jornal']], default: 'torn' },
    { key: 'cover', label: 'Cobrir tela inteira (corte)', type: 'toggle', default: true },
    { key: 'trailText', label: 'Texto no rastro', type: 'text', default: 'FULL PUSH' },
    { key: 'speedLines', label: 'Linhas de velocidade', type: 'toggle', default: true },
  ],
  render(rc) {
    const { ctx, W, H, pal, P, t, dur } = rc;
    const p = clamp(t / dur);
    const rtl = P.dir === 'rtl';
    ctx.save();
    if (rtl) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const sc = P.carScale;
    const carW = 980 * sc;
    const cy = H * P.carY;
    // car travel: off-left -> off-right by 52%
    const travel = ease.inOutQuart(range(p, 0, 0.52));
    const carX = -carW * 0.6 + travel * (W + carW * 1.2);
    const rear = carX - carW * 0.45;
    const front = carX + carW * 0.5;
    const j = jit(rc, 1, 1.5);
    const trailColor = P.trail === 'news' ? pal.paper : pal.accent;
    const trailTex = P.trail === 'news' ? 'news' : 'grain';

    const drawBandContent = (g, w, h) => {
      if (P.trail === 'kerb') {
        kerb(g, 0, 0, w, 90, pal.accent, '#fbf9f3', 80);
        kerb(g, 0, h - 90, w, 90, pal.accent, '#fbf9f3', 80);
      } else if (P.trail === 'torn') {
        // inner collage strip in secondary color
        g.fillStyle = pal.paper2 === pal.accent ? pal.accent2 : pal.paper2;
        g.globalAlpha = 0.95;
        g.fillRect(0, h * 0.5 - 60, w, 120);
        g.globalAlpha = 1;
      }
      if (P.trailText) {
        g.save();
        if (rtl) { g.translate(w, 0); g.scale(-1, 1); }
        g.font = fontCss(rc.fonts.head, 120);
        g.fillStyle = P.trail === 'news' ? pal.ink : pal.paper;
        g.globalAlpha = 0.95;
        g.textBaseline = 'middle';
        const tw = g.measureText(P.trailText + '   ').width;
        const off = -((t * 900) % tw);
        for (let x = off; x < w; x += tw) g.fillText(P.trailText, x, h * 0.5 + 6);
        g.restore();
      }
    };

    if (P.cover) {
      const coverP = ease.outQuart(range(p, 0.05, 0.5));
      const split = ease.inOutExpo(range(p, 0.58, 1));
      const bandH = 380 * sc + coverP * (H + 500 - 380 * sc);
      const bandCy = cy + (H / 2 - cy) * coverP;
      const left = -260;
      const right = Math.max(left + 10, Math.min(rear + 120, W + 300));
      const bw = right - left;
      if (split <= 0) {
        if (bw > 20)
          paperPiece(ctx, { x: left + bw / 2 + j.dx, y: bandCy + j.dy, w: bw, h: bandH, color: trailColor, seed: 701, amp: 18, step: 26, texture: trailTex, newsSeed: 2, shadow: rc.shadow, torn: { l: false } }, drawBandContent);
      } else {
        // tear in half, top goes up, bottom goes down
        const half = (H + 500) / 2;
        const off = split * (half + 200);
        paperPiece(ctx, { x: W / 2 + j.dx, y: H / 2 - half / 2 - off - 40, w: W + 520, h: half + 80, color: trailColor, seed: 731, amp: 22, step: 30, texture: trailTex, newsSeed: 2, shadow: rc.shadow, torn: { l: false, r: false, t: false }, rot: -split * 0.06 }, (g, w, h) => drawBandContent(g, w, h * 2));
        paperPiece(ctx, { x: W / 2 - j.dx, y: H / 2 + half / 2 + off + 40, w: W + 520, h: half + 80, color: trailColor, seed: 733, amp: 22, step: 30, texture: trailTex, newsSeed: 2, shadow: rc.shadow, torn: { l: false, r: false, b: false }, rot: split * 0.05 }, (g, w, h) => { g.translate(0, -h); drawBandContent(g, w, h * 2); });
      }
    } else {
      // overlay: trail follows the car and fades out
      const trailLen = 1300 * sc;
      const l = Math.max(-200, rear - trailLen * (0.4 + travel * 0.6));
      const bw = rear + 80 - l;
      const fade = 1 - ease.inCubic(range(p, 0.55, 1));
      if (bw > 30 && fade > 0)
        paperPiece(ctx, { x: l + bw / 2, y: cy + 70 * sc + j.dy, w: bw, h: 240 * sc, color: trailColor, seed: 702, amp: 14, step: 22, texture: trailTex, shadow: rc.shadow, alpha: fade, rot: -0.01 }, drawBandContent);
    }

    // speed lines
    if (P.speedLines && travel > 0 && travel < 1) {
      const r = rng(Math.floor(t * 30) + 3);
      ctx.save();
      ctx.strokeStyle = pal.ink;
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const yy = cy - 150 * sc + r() * 300 * sc;
        const len = 160 + r() * 380;
        ctx.lineWidth = 4 + r() * 8;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(rear - 40 - r() * 80, yy);
        ctx.lineTo(rear - 40 - len, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // the car / object
    if (front > -50 && rear < W + 50) {
      const bob = Math.sin(t * 60) * 3;
      const tilt = -0.025 + (1 - travel) * 0.01;
      if (P.carMode === 'png') {
        const img = rc.img(P.carPng);
        if (img) {
          drawSticker(ctx, img, { x: carX + j.dx, y: cy + bob, w: carW, rot: tilt + j.dr, flip: !!P.carFlip, shadow: rc.shadow });
        } else {
          ctx.save();
          ctx.fillStyle = pal.ink;
          ctx.font = fontCss('Courier', 46);
          ctx.textAlign = 'center';
          ctx.fillText('[ suba seu PNG ]', carX, cy);
          ctx.restore();
        }
      } else {
        const st = carSticker({ color: pal.car, color2: pal.car2, ink: '#121212', number: P.carNumber, mirrorNumber: rtl });
        drawSticker(ctx, st, { x: carX + j.dx, y: cy + bob, w: carW, rot: tilt + j.dr, shadow: rc.shadow });
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// 5 start lights, taped paper cut-outs
// ---------------------------------------------------------------------------
export const startLights = {
  id: 'startLights',
  name: 'Luzes de Largada',
  desc: '5 luzes recortadas com fita acendem em sequência e apagam: LIGHTS OUT.',
  category: 'transition',
  defaultDuration: 1.2,
  cutPoint: 0.78,
  fields: [
    { key: 'cover', label: 'Fundo de papel cobrindo a tela', type: 'toggle', default: true },
    { key: 'bg', label: 'Fundo', type: 'select', options: [['news', 'Jornal'], ['team', 'Cor da equipe'], ['dark', 'Carvão']], default: 'news' },
    { key: 'outText', label: 'Texto ao apagar', type: 'text', default: 'LIGHTS OUT' },
    { key: 'ransom', label: 'Texto em letras recortadas', type: 'toggle', default: true },
    { key: 'lightColor', label: 'Cor das luzes', type: 'color', default: '#ff1e1e' },
    { key: 'posY', label: 'Altura das luzes', type: 'range', min: 0.2, max: 0.7, step: 0.01, default: 0.42 },
  ],
  render(rc) {
    const { ctx, W, H, pal, P, t, dur } = rc;
    const p = clamp(t / dur);
    const tear = ease.inOutExpo(range(p, 0.84, 1));
    const exit = ease.inBack(range(p, 0.8, 0.95), 1.8);
    // backdrop
    if (P.cover) {
      const bgIn = ease.outExpo(range(p, 0, 0.12));
      const color = P.bg === 'team' ? pal.paper2 : P.bg === 'dark' ? '#1c1b19' : pal.paper;
      const tex = P.bg === 'news' ? 'news' : 'grain';
      const half = H / 2 + 120;
      const enterOff = (1 - bgIn) * (H + 300);
      const off = tear * (half + 260);
      paperPiece(ctx, { x: W / 2, y: H / 4 - 60 - enterOff - off, w: W + 260, h: half + 120, color, seed: 811, amp: 22, step: 28, texture: tex, newsSeed: 1, torn: { t: false, l: false, r: false }, rot: -tear * 0.05, fiber: '#fbf9f3' });
      paperPiece(ctx, { x: W / 2, y: (3 * H) / 4 + 60 + enterOff + off, w: W + 260, h: half + 120, color, seed: 812, amp: 22, step: 28, texture: tex, newsSeed: 3, torn: { b: false, l: false, r: false }, rot: tear * 0.04, fiber: '#fbf9f3' });
    }
    const cy = H * P.posY;
    const pw = 168, ph = 400, gap = 22;
    const total = pw * 5 + gap * 4;
    const onTimes = [0.18, 0.28, 0.38, 0.48, 0.58];
    const allOff = 0.7;
    // gantry bar
    const barIn = ease.outExpo(range(p, 0.02, 0.14));
    if (barIn > 0 && exit < 1) {
      paperPiece(ctx, { x: W / 2, y: cy - ph / 2 - 30 - (1 - barIn) * 400 - exit * 1400, w: total + 120, h: 56, color: '#1a1a1a', seed: 820, amp: 5, step: 14, texture: 'grain', shadow: rc.shadow, rot: -0.01 });
    }
    for (let i = 0; i < 5; i++) {
      const drop = ease.outBack(range(p, 0.03 + i * 0.025, 0.15 + i * 0.025), 1.6);
      if (drop <= 0) continue;
      const r = rng(i * 17 + 2);
      const j = jit(rc, i + 10);
      const x = W / 2 - total / 2 + pw / 2 + i * (pw + gap);
      const y = cy - (1 - drop) * 900 - exit * (1500 + i * 120);
      const rot = (r() - 0.5) * 0.08 + j.dr + exit * (i - 2) * 0.2;
      const lit = p >= onTimes[i] && p < allOff;
      paperPiece(ctx, { x: x + j.dx, y: y + j.dy, w: pw, h: ph, rot, color: '#222220', seed: 830 + i, amp: 6, step: 14, texture: 'grain', shadow: rc.shadow }, (g, w, h) => {
        const drawLight = (ly, on, flash) => {
          // socket
          g.fillStyle = '#0c0c0c';
          g.beginPath(); g.arc(w / 2, ly, 62, 0, Math.PI * 2); g.fill();
          if (on) {
            g.fillStyle = P.lightColor;
            g.beginPath(); g.arc(w / 2, ly, 54, 0, Math.PI * 2); g.fill();
            // paper highlight scrap
            g.fillStyle = 'rgba(255,255,255,0.75)';
            g.beginPath(); g.ellipse(w / 2 - 18, ly - 20, 16, 9, -0.6, 0, Math.PI * 2); g.fill();
            if (flash > 0) {
              g.fillStyle = `rgba(255,255,255,${flash * 0.8})`;
              g.beginPath(); g.arc(w / 2, ly, 54, 0, Math.PI * 2); g.fill();
            }
          } else {
            g.fillStyle = '#2d2d2b';
            g.beginPath(); g.arc(w / 2, ly, 54, 0, Math.PI * 2); g.fill();
          }
        };
        const flash = lit ? 1 - range(p, onTimes[i], onTimes[i] + 0.06) : 0;
        drawLight(h * 0.3, false, 0);
        drawLight(h * 0.7, lit, flash);
      });
      // glow behind lit light (drawn as a halftone-ish ring, collage style)
      if (lit) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = P.lightColor;
        ctx.lineWidth = 10;
        ctx.setLineDash([4, 14]);
        ctx.beginPath();
        ctx.arc(x + j.dx, y + j.dy + ph * 0.2, 92, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      tape(ctx, { x: x + 4, y: y - ph / 2 + 4, w: 130, h: 46, rot: (r() - 0.5) * 0.5, color: pal.tape, seed: 840 + i, pattern: i % 2 ? 'stripes' : 'plain', scale: drop });
    }
    // LIGHTS OUT
    const txtP = range(p, allOff, allOff + 0.12);
    if (P.outText && txtP > 0 && tear < 1) {
      const ty = cy + ph / 2 + 170 - exit * 0 + tear * 900;
      if (P.ransom) {
        ransomText(ctx, P.outText, {
          x: W / 2, y: ty, size: 150, maxWidth: W * 0.9, fonts: [rc.fonts.head, 'Anton', 'PlayfairItalic', 'Courier'],
          schemes: [{ bg: pal.paper, fg: pal.ink, tex: 'news' }, { bg: pal.accent, fg: pal.paper }, { bg: '#111', fg: '#fff' }, { bg: pal.tape, fg: pal.ink }],
          seed: 55, appear: txtP, shadow: rc.shadow, boil: rc.boil,
        });
      } else {
        ctx.save();
        const s = ease.slam(txtP);
        ctx.translate(W / 2, ty);
        ctx.scale(1.6 - 0.6 * s, 1.6 - 0.6 * s);
        ctx.globalAlpha = clamp(txtP * 4);
        if (rc.shadow) drawFitText(ctx, P.outText, { x: rc.shadow.dx, y: rc.shadow.dy, fontId: rc.fonts.head, size: 190, maxWidth: W * 0.9, color: rc.shadow.color });
        drawFitText(ctx, P.outText, { x: 0, y: 0, fontId: rc.fonts.head, size: 190, maxWidth: W * 0.9, color: pal.ink === '#111111' && P.bg === 'dark' ? '#fff' : (P.cover && P.bg === 'dark' ? '#fff' : pal.ink) });
        ctx.restore();
      }
    }
  },
};
