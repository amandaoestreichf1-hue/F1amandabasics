// A starter pack of built-in collage stickers (all drawn in code, so no copyright worries).
import { grainInside } from './paper.js';

function mk(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  return c;
}

function sticker(base, border = '#fbf9f3', r = 10) {
  const c = mk(base.width + r * 2, base.height + r * 2, (g) => {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.drawImage(base, r + Math.cos(a) * r, r + Math.sin(a) * r);
    }
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = border;
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(base, r, r);
  });
  grainInside(c, 77, 0.8);
  return c;
}

const star = (g, cx, cy, R, r, n = 5) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath();
};

export function buildNativeTrinkets() {
  const list = [];
  list.push(['Estrela', sticker(mk(240, 240, (g) => { star(g, 120, 125, 115, 50); g.fillStyle = '#ffd400'; g.fill(); }))]);
  list.push(['Coração', sticker(mk(240, 220, (g) => {
    g.fillStyle = '#ff5fa2';
    g.beginPath(); g.moveTo(120, 210); g.bezierCurveTo(-40, 100, 40, -40, 120, 50); g.bezierCurveTo(200, -40, 280, 100, 120, 210); g.fill();
  }))]);
  list.push(['Brilho', mk(220, 220, (g) => { star(g, 110, 110, 105, 18, 4); g.fillStyle = '#ffffff'; g.fill(); star(g, 110, 110, 70, 12, 4); g.fillStyle = '#ffe9f3'; g.fill(); })]);
  list.push(['Bandeira', sticker(mk(260, 300, (g) => {
    g.fillStyle = '#222'; g.fillRect(10, 10, 14, 285);
    const s = 36;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
      g.fillRect(24 + x * s, 14 + y * s + Math.sin(x * 0.8) * 8, s, s);
    }
  }))]);
  list.push(['Seta', mk(320, 160, (g) => {
    g.strokeStyle = '#ff3b2f'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(20, 120); g.quadraticCurveTo(140, 10, 280, 70); g.stroke();
    g.beginPath(); g.moveTo(230, 30); g.lineTo(290, 72); g.lineTo(225, 112); g.stroke();
  })]);
  list.push(['Nº1', sticker(mk(240, 240, (g) => {
    g.fillStyle = '#7b2ff7'; g.beginPath(); g.arc(120, 120, 112, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '400 130px "Anton"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P1', 120, 128);
  }))]);
  list.push(['Clipe', mk(120, 300, (g) => {
    g.strokeStyle = '#9aa1a8'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 240); g.arc(60, 240, 20, 0, Math.PI); g.lineTo(40, 40); g.arc(65, 40, 25, Math.PI, 0); g.lineTo(90, 270); g.arc(60, 270, 30, 0, Math.PI); g.lineTo(30, 90); g.stroke();
  })]);
  list.push(['Pneu', sticker(mk(240, 240, (g) => {
    g.fillStyle = '#111'; g.beginPath(); g.arc(120, 120, 112, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e10600'; g.lineWidth = 14; g.beginPath(); g.arc(120, 120, 84, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#333'; g.beginPath(); g.arc(120, 120, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e10600'; g.font = '700 26px "Courier Prime"'; g.textAlign = 'center'; g.fillText('SOFT', 120, 34);
  }))]);
  list.push(['Bolinha', sticker(mk(220, 220, (g) => {
    g.fillStyle = '#d7ef4f'; g.beginPath(); g.arc(110, 110, 100, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fbf9f3'; g.lineWidth = 12;
    g.beginPath(); g.arc(-15, 110, 95, -0.85, 0.85); g.stroke();
    g.beginPath(); g.arc(235, 110, 95, Math.PI - 0.85, Math.PI + 0.85); g.stroke();
  }))]);
  list.push(['Raquete', sticker(mk(200, 380, (g) => {
    g.strokeStyle = '#3f9f78'; g.lineWidth = 16;
    g.beginPath(); g.ellipse(100, 110, 80, 100, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(63,159,120,0.5)'; g.lineWidth = 3;
    for (let x = 40; x <= 160; x += 20) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 200); g.stroke(); }
    for (let y = 30; y <= 190; y += 20) { g.beginPath(); g.moveTo(25, y); g.lineTo(175, y); g.stroke(); }
    g.fillStyle = '#24332d'; g.fillRect(88, 205, 24, 160);
  }))]);
  list.push(['Troféu', sticker(mk(220, 260, (g) => {
    g.fillStyle = '#e9c45a';
    g.beginPath(); g.moveTo(40, 20); g.lineTo(180, 20); g.quadraticCurveTo(180, 150, 110, 165); g.quadraticCurveTo(40, 150, 40, 20); g.fill();
    g.fillRect(96, 160, 28, 50); g.fillRect(60, 205, 100, 30);
    g.strokeStyle = '#e9c45a'; g.lineWidth = 14;
    g.beginPath(); g.arc(40, 70, 32, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.beginPath(); g.arc(180, 70, 32, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
  }))]);
  return list;
}
