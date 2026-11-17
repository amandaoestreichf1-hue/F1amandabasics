// B. "Quem Serviu / Quem Dormiu" — post-race recap cards.
import { paperPiece, tape, stamp, photoSlot, ransomText, drawFitText, wrapLines, kerb, markerLine } from '../lib/paper.js';
import { fontCss } from '../lib/fonts.js';
import { jit, slot, cardEnv, group, deg, ease, range, clamp } from './common.js';

const layoutFields = [
  { key: 'posY', label: 'Posição vertical', type: 'range', min: 0.3, max: 0.7, step: 0.01, default: 0.5, group: 'Layout' },
  { key: 'scale', label: 'Escala do card', type: 'range', min: 0.6, max: 1.15, step: 0.01, default: 1, group: 'Layout' },
  { key: 'tilt', label: 'Inclinação (°)', type: 'range', min: -8, max: 8, step: 0.5, default: -1.5, group: 'Layout' },
];

function cardTransform(rc, env) {
  const { ctx, W, H, P } = rc;
  const cx = W / 2, cy = H * P.posY;
  const j = jit(rc, 99, 1.2);
  group(ctx, cx, cy, {
    scale: P.scale * (0.86 + 0.14 * env.inP) * (1 - env.outP * 0.25),
    rot: deg(P.tilt) + (1 - env.inP) * 0.22 - env.outP * 0.35 + j.dr,
    dy: (1 - env.inP) * 900 - env.outP * 1700 + j.dy,
    dx: j.dx,
  });
  return { cx, cy };
}

function subtitleScrap(rc, text, { x, y, w, rot, appear, seed, bg = '#fbfaf6', fg }) {
  const { ctx } = rc;
  if (!text || appear <= 0) return;
  ctx.font = fontCss(rc.fonts.body, 46);
  const lines = wrapLines(ctx, text, w - 70).slice(0, 3);
  const h = 60 + lines.length * 58;
  paperPiece(ctx, { x, y, w, h, rot, color: bg, seed, amp: 6, step: 14, shadow: rc.shadow, scale: ease.outBack(appear, 1.4) }, (g, pw, ph) => {
    g.font = fontCss(rc.fonts.body, 46);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, pw / 2, ph / 2 + (i - (lines.length - 1) / 2) * 58));
  });
}

// ---------------------------------------------------------------------------
export const quemServiu = {
  id: 'quemServiu',
  name: 'Quem Serviu',
  desc: 'Capa de revista pós-corrida com foto, selo Setor Roxo e manchete recortada.',
  category: 'card',
  defaultDuration: 2.6,
  fields: [
    { key: 'title', label: 'Título', type: 'text', default: 'QUEM SERVIU' },
    { key: 'subtitle', label: 'Subtítulo', type: 'textarea', default: 'Segurou o undercut como se fosse fácil.' },
    { key: 'masthead', label: 'Cabeçalho da revista', type: 'text', default: 'PADDOCK PRESS · EDIÇÃO PÓS-CORRIDA' },
    { key: 'tag', label: 'Etiqueta (ex: P1 · +8)', type: 'text', default: 'P1 · VOLTA MAIS RÁPIDA' },
    { key: 'ransom', label: 'Título em letras recortadas', type: 'toggle', default: true },
    { key: 'photo', label: 'Foto / PNG do piloto', type: 'image', defaultFrame: 'polaroid' },
    { key: 'caption', label: 'Legenda da Polaroid', type: 'text', default: 'servindo. ★' },
    { key: 'stampOn', label: 'Selo', type: 'toggle', default: true, group: 'Selo' },
    { key: 'stampText', label: 'Texto do selo', type: 'text', default: 'PURPLE', group: 'Selo' },
    { key: 'stampSub', label: 'Sub do selo', type: 'text', default: 'SECTOR', group: 'Selo' },
    { key: 'stampColor', label: 'Cor do selo', type: 'color', default: '#8a2be2', group: 'Selo' },
    ...layoutFields,
  ],
  render(rc) {
    const { ctx, P, pal } = rc;
    const env = cardEnv(rc);
    if (env.outRaw >= 1) return;
    ctx.save();
    const { cx, cy } = cardTransform(rc, env);
    const cw = 920, ch = 1300;
    const L = cx - cw / 2, T = cy - ch / 2;
    // main card
    paperPiece(ctx, { x: cx, y: cy, w: cw, h: ch, color: pal.paper, seed: 901, amp: 11, step: 20, texture: 'grain', shadow: rc.shadow }, (g, w) => {
      // masthead band
      g.fillStyle = pal.ink;
      g.fillRect(0, 0, w, 92);
      g.fillStyle = pal.paper;
      g.font = fontCss('Courier', 34);
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.fillText(P.masthead || '', w / 2, 50, w - 60);
      g.fillStyle = pal.ink;
      g.fillRect(36, 112, w - 72, 6);
      g.fillRect(36, 124, w - 72, 2);
      // issue line
      g.font = fontCss('Courier', 26);
      g.textAlign = 'left';
      g.globalAlpha = 0.7;
      g.fillText('VOL. 26 — Nº 24', 40, ch - 38);
      g.textAlign = 'right';
      g.fillText('R$ 0,00 · GRÁTIS NO PADDOCK', w - 40, ch - 38);
      g.globalAlpha = 1;
    });
    // decorative accent scrap behind the photo
    const sAp = env.at(0.06, 0.3);
    paperPiece(ctx, { x: cx - 120, y: T + 640, w: 520, h: 660, rot: deg(-7), color: pal.paper2, seed: 911, amp: 12, texture: 'grain', scale: sAp, shadow: null });
    // photo
    const ph = slot(rc, 'photo');
    const pAp = env.at(0.1, 0.32, (x) => ease.outBack(x, 1.5));
    photoSlot(ctx, ph.img, {
      x: cx + 20, y: T + 640, w: 600, h: 600, rot: deg(3.5), frame: ph.frame, seed: 921, zoom: ph.zoom, offX: ph.offX, offY: ph.offY, imgRot: ph.imgRot, bw: ph.bw,
      shadow: rc.shadow, caption: P.caption, ink: pal.ink, scale: pAp,
    });
    // tapes on the photo
    const tAp = env.at(0.3, 0.12, (x) => ease.outBack(x, 2));
    if (ph.frame !== 'cutout') {
      tape(ctx, { x: cx - 270, y: T + 300, w: 210, h: 60, rot: deg(-38), color: pal.tape, seed: 931, pattern: 'stripes', scale: tAp });
      tape(ctx, { x: cx + 320, y: T + 330, w: 210, h: 60, rot: deg(42), color: pal.tape, seed: 932, scale: tAp });
    }
    // title
    const titleP = range(rc.t, 0.12, 0.55);
    if (P.ransom) {
      ransomText(ctx, P.title, {
        x: cx, y: T + 215, size: 150, maxWidth: cw - 40, fonts: [rc.fonts.head, rc.fonts.head, 'PlayfairItalic', 'Syne'],
        schemes: [{ bg: pal.accent, fg: pal.paper }, { bg: pal.ink, fg: pal.paper }, { bg: '#fbfaf6', fg: pal.ink, tex: 'news' }, { bg: pal.accent2, fg: pal.ink }],
        seed: 301, appear: titleP, shadow: rc.shadow, boil: rc.boil,
      });
    } else {
      const s = ease.outBack(clamp(titleP * 1.6), 1.4);
      if (s > 0) {
        paperPiece(ctx, { x: cx, y: T + 215, w: cw - 60, h: 190, rot: deg(-2), color: pal.accent, seed: 941, amp: 8, shadow: rc.shadow, scale: s }, (g, w, h) => {
          drawFitText(g, P.title, { x: w / 2, y: h / 2 + 6, fontId: rc.fonts.head, size: 160, maxWidth: w - 50, color: pal.paper });
        });
      }
    }
    // tag chip
    const tagAp = env.at(0.38, 0.2, (x) => ease.outBack(x, 2));
    if (P.tag && tagAp > 0) {
      ctx.font = fontCss('Courier', 40);
      const tw = ctx.measureText(P.tag).width + 60;
      paperPiece(ctx, { x: L + 60 + tw / 2, y: T + 380, w: tw, h: 70, rot: deg(-4), color: pal.ink, seed: 951, amp: 4, step: 10, shadow: rc.shadow, scale: tagAp, fiber: null }, (g, w, h) => {
        g.font = fontCss('Courier', 40);
        g.fillStyle = pal.accent2 || '#fff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(P.tag, w / 2, h / 2 + 2);
      });
    }
    // subtitle
    subtitleScrap(rc, P.subtitle, { x: cx - 30, y: T + 1130, w: 760, rot: deg(-2), appear: env.at(0.32, 0.25), seed: 961, fg: pal.ink });
    // purple sector stamp
    if (P.stampOn) {
      stamp(ctx, { x: cx + 300, y: T + 900, text: P.stampText, sub: P.stampSub, color: P.stampColor, width: 330, rot: deg(-14), shape: 'circle', progress: range(rc.t, 0.55, 0.78), fontId: rc.fonts.head });
    }
    // little marker star doodle
    const dP = range(rc.t, 0.7, 0.95);
    if (dP > 0) {
      markerLine(ctx, L + 120, T + 1020, L + 300, T + 1000, { color: P.stampColor, width: 10, progress: dP, seed: 3 });
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
export const quemDormiu = {
  id: 'quemDormiu',
  name: 'Quem Dormiu',
  desc: 'Nota de redação estilo Bandeira Amarela / Safety Car com foto e carimbo.',
  category: 'card',
  defaultDuration: 2.6,
  fields: [
    { key: 'title', label: 'Título', type: 'text', default: 'QUEM DORMIU' },
    { key: 'subtitle', label: 'Subtítulo', type: 'textarea', default: 'Largou em P3 e acordou em P11.' },
    { key: 'flagText', label: 'Faixa de aviso', type: 'select', options: [['BANDEIRA AMARELA', 'Bandeira Amarela'], ['SAFETY CAR', 'Safety Car'], ['VIRTUAL SAFETY CAR', 'VSC'], ['BOX BOX', 'Box Box'], ['NOTA DA REDAÇÃO', 'Nota da Redação']], default: 'SAFETY CAR' },
    { key: 'flagColor', label: 'Cor da bandeira', type: 'color', default: '#ffd200' },
    { key: 'ransom', label: 'Título em letras recortadas', type: 'toggle', default: false },
    { key: 'photo', label: 'Foto / PNG', type: 'image', defaultFrame: 'torn', defaultBW: true },
    { key: 'zzz', label: 'Zzz flutuando', type: 'toggle', default: true },
    { key: 'stampOn', label: 'Carimbo', type: 'toggle', default: true, group: 'Selo' },
    { key: 'stampText', label: 'Texto do carimbo', type: 'text', default: 'BOX BOX', group: 'Selo' },
    { key: 'stampSub', label: 'Sub do carimbo', type: 'text', default: 'OFF THE RECORD', group: 'Selo' },
    { key: 'stampColor', label: 'Cor do carimbo', type: 'color', default: '#d7261e', group: 'Selo' },
    ...layoutFields.map((f) => (f.key === 'tilt' ? { ...f, default: 1.5 } : f)),
  ],
  render(rc) {
    const { ctx, P, pal, t } = rc;
    const env = cardEnv(rc);
    if (env.outRaw >= 1) return;
    ctx.save();
    const { cx, cy } = cardTransform(rc, env);
    const cw = 900, ch = 1300;
    const L = cx - cw / 2, T = cy - ch / 2;
    const yellow = P.flagColor;
    paperPiece(ctx, { x: cx, y: cy, w: cw, h: ch, color: pal.paper, seed: 1001, amp: 10, step: 18, texture: 'news', newsSeed: 4, textureAlpha: 0.55, shadow: rc.shadow }, (g, w) => {
      // hazard band
      kerb(g, 0, 0, w, 120, '#141414', yellow, 70);
    });
    // flag label
    const fAp = env.at(0.12, 0.22, (x) => ease.outBack(x, 1.8));
    if (fAp > 0) {
      ctx.font = fontCss('Courier', 48);
      const tw = ctx.measureText(P.flagText).width + 80;
      paperPiece(ctx, { x: cx, y: T + 62, w: tw, h: 84, rot: deg(-1.5), color: yellow, seed: 1011, amp: 5, step: 12, shadow: rc.shadow, scale: fAp }, (g, w, h) => {
        g.font = fontCss('Courier', 48);
        g.fillStyle = '#111';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(P.flagText, w / 2, h / 2 + 3);
      });
    }
    // title
    const titleP = range(t, 0.14, 0.5);
    if (P.ransom) {
      ransomText(ctx, P.title, {
        x: cx, y: T + 255, size: 140, maxWidth: cw - 40, fonts: [rc.fonts.head, 'Courier', 'PlayfairItalic'],
        schemes: [{ bg: yellow, fg: '#111' }, { bg: '#151515', fg: yellow }, { bg: '#fbfaf6', fg: '#111', tex: 'news' }],
        seed: 401, appear: titleP, shadow: rc.shadow, boil: rc.boil,
      });
    } else {
      const s = ease.outBack(clamp(titleP * 1.6), 1.4);
      if (s > 0) {
        paperPiece(ctx, { x: cx - 10, y: T + 255, w: cw - 70, h: 180, rot: deg(1.8), color: '#151515', seed: 1021, amp: 8, shadow: rc.shadow, scale: s }, (g, w, h) => {
          drawFitText(g, P.title, { x: w / 2, y: h / 2 + 6, fontId: rc.fonts.head, size: 150, maxWidth: w - 50, color: yellow });
        });
      }
    }
    // photo
    const ph = slot(rc, 'photo');
    const pAp = env.at(0.08, 0.32, (x) => ease.outBack(x, 1.4));
    photoSlot(ctx, ph.img, {
      x: cx - 30, y: T + 690, w: 640, h: 560, rot: deg(-3), frame: ph.frame, seed: 1031, zoom: ph.zoom, offX: ph.offX, offY: ph.offY, imgRot: ph.imgRot, bw: ph.bw,
      shadow: rc.shadow, ink: pal.ink, scale: pAp,
    });
    const tAp = env.at(0.28, 0.12, (x) => ease.outBack(x, 2));
    if (ph.frame !== 'cutout') {
      tape(ctx, { x: cx - 30, y: T + 410, w: 240, h: 64, rot: deg(-3), color: pal.tape, seed: 1041, scale: tAp, pattern: 'dots' });
    }
    // Zzz
    if (P.zzz) {
      const zAp = range(t, 0.4, 0.6);
      if (zAp > 0) {
        ctx.save();
        ctx.fillStyle = pal.ink;
        ctx.strokeStyle = '#fbfaf6';
        ctx.lineWidth = 10;
        ctx.lineJoin = 'round';
        for (let i = 0; i < 3; i++) {
          const ph2 = (t * 0.9 + i * 0.33) % 1;
          const zx = cx + 270 + i * 40 + Math.sin((t + i) * 4) * 12;
          const zy = T + 800 - ph2 * 260 - i * 50;
          ctx.globalAlpha = zAp * (1 - ph2 * 0.6);
          ctx.font = fontCss('PlayfairItalic', 70 + i * 26);
          ctx.strokeText('z', zx, zy);
          ctx.fillText('z', zx, zy);
        }
        ctx.restore();
      }
    }
    subtitleScrap(rc, P.subtitle, { x: cx + 20, y: T + 1120, w: 740, rot: deg(1.5), appear: env.at(0.3, 0.25), seed: 1051, bg: '#fbfaf6', fg: pal.ink });
    if (P.stampOn) {
      stamp(ctx, { x: cx + 250, y: T + 905, text: P.stampText, sub: P.stampSub, color: P.stampColor, width: 400, rot: deg(-10), shape: 'rect', progress: range(t, 0.52, 0.75), fontId: rc.fonts.head });
    }
    ctx.restore();
  },
};
