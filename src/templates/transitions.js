// A. Full-screen wipes. The screen is 100% covered around 50% of the duration — that's the cut point.
import { paperPiece, tape, kerb, drawFitText, ransomText } from '../lib/paper.js';
import { carSticker, drawSticker } from '../lib/car.js';
import { fontCss } from '../lib/fonts.js';
import { rng } from '../lib/rng.js';
import { jit, deg, ease, range, clamp } from './common.js';
import { gingham } from './soft.js';
import { graphLines } from '../lib/paper.js';

// ---------------------------------------------------------------------------
// Car / PNG pass wipe
// ---------------------------------------------------------------------------
export const carWipe = {
  id: 'carWipe',
  name: 'Passagem de Carro',
  desc: 'O carrinho (ou seu PNG) cruza a tela e o rastro cobre tudo; depois abre na próxima cena.',
  category: 'transition',
  defaultDuration: 0.9,
  cutPoint: 0.55,
  cues: (P, dur) => [
    { t: 0.05, s: 'whoosh', label: 'carro cruzando' },
    ...(P.cover ? [{ t: dur * 0.58, s: 'whoosh', label: 'abre' }] : []),
  ],
  fields: [
    { key: 'carMode', label: 'Quem cruza a tela', type: 'select', options: [['native', 'Carrinho ilustrado'], ['png', 'Meu PNG (carro, capacete, cabecinha)']], default: 'native' },
    { key: 'carPng', label: 'PNG', type: 'image', frames: false, libCategory: 'object', showIf: (P) => P.carMode === 'png' },
    { key: 'carNumber', label: 'Número do carro', type: 'text', default: '4', showIf: (P) => P.carMode === 'native' },
    { key: 'trail', label: 'Rastro', type: 'select', options: [['lilac', 'Lilás'], ['gingham', 'Xadrez lilás'], ['graph', 'Papel quadriculado']], default: 'lilac' },
    { key: 'cover', label: 'Rastro cobre a tela (transição)', type: 'toggle', default: true },
    { key: 'dir', label: 'Direção', type: 'select', options: [['ltr', 'Esquerda → direita'], ['rtl', 'Direita → esquerda']], default: 'ltr' },
  ],
  render(rc) {
    const { ctx, W, H, pal, P, t, dur } = rc;
    const p = clamp(t / dur);
    const rtl = P.dir === 'rtl';
    ctx.save();
    if (rtl) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const carW = 900;
    const cy = H * 0.5;
    const travel = ease.inOutQuart(range(p, 0, 0.52));
    const carX = -carW * 0.6 + travel * (W + carW * 1.2);
    const rear = carX - carW * 0.42;
    const fillBand = (x, y, w, h) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      if (P.trail === 'gingham') gingham(ctx, x, y, w, h, { size: 150, c1: pal.paper2, c2: pal.linen });
      else if (P.trail === 'graph') {
        ctx.fillStyle = pal.paper; ctx.fillRect(x, y, w, h);
        ctx.translate(x, y); graphLines(ctx, w, h, 24);
      } else { ctx.fillStyle = pal.accent; ctx.fillRect(x, y, w, h); }
      ctx.restore();
      // soft leading edge
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x + w - 10, y, 10, h);
    };
    if (P.cover) {
      const grow = ease.outQuart(range(p, 0.04, 0.5));
      const bh = 260 + grow * (H - 260);
      const reveal = ease.inOutExpo(range(p, 0.58, 1));
      const right = Math.min(W + 20, rear + 60);
      const left = reveal * (W + 40);
      if (right > left) fillBand(left - 20, cy - bh / 2, right - left + 20, bh);
    } else {
      const fade = 1 - ease.inCubic(range(p, 0.55, 1));
      const l = Math.max(-40, rear - 900 * (0.3 + travel * 0.7));
      if (rear > l) { ctx.globalAlpha *= fade; fillBand(l, cy - 110, rear + 40 - l, 220); ctx.globalAlpha = 1; }
    }
    // a few speed lines behind the car
    if (travel > 0 && travel < 1) {
      const r = rng(Math.floor(t * 30) + 3);
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const yy = cy - 120 + r() * 240, len = 160 + r() * 260;
        ctx.lineWidth = 6 + r() * 6;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(rear - 30, yy); ctx.lineTo(rear - 30 - len, yy); ctx.stroke();
      }
      ctx.restore();
    }
    const front = carX + carW * 0.5;
    if (front > -50 && rear < W + 50) {
      const bob = Math.sin(t * 60) * 3;
      if (P.carMode === 'png') {
        const img = rc.img(P.carPng);
        if (img) drawSticker(ctx, img, { x: carX, y: cy + bob, w: carW * 0.8, rot: -0.02, shadow: rc.shadow });
      } else {
        const st = carSticker({ color: pal.car, color2: pal.car2, ink: '#1f1b24', number: P.carNumber, mirrorNumber: rtl });
        drawSticker(ctx, st, { x: carX, y: cy + bob, w: carW, rot: -0.02, shadow: rc.shadow });
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
  cues: (P, dur) => [
    { t: 0.02, s: 'whoosh', label: 'fundo entra' },
    ...[0.18, 0.28, 0.38, 0.48, 0.58].map((k, i) => ({ t: dur * k, s: 'pop', label: `luz ${i + 1}` })),
    { t: dur * 0.7, s: 'whoosh', label: 'lights out' },
    { t: dur * 0.84, s: 'whoosh', label: 'abre' },
  ],
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
