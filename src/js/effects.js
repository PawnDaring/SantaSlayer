export class Effects {
  constructor() {
    this.scale = 1;
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.popups = [];
    this.screen = null; // { type: 'blue'|'rainbow'|'vignette-red', t: 0, dur: 2 }
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); }
  burstBad(x, y) {
    const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    const count = Math.floor(18 * this.scale);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (40 + Math.random()*120) * this.scale;
      const size = 2 + Math.random() * 3 * this.scale;
      const color = Math.random() < 0.6 ? red : ink;
      this.particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, a: 1, life: 0.6, size, color });
    }
  }
  burstGood(x, y) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    const count = Math.floor(24 * this.scale);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (60 + Math.random()*140) * this.scale;
      const size = 2 + Math.random() * 3 * this.scale;
      const color = ink;
      this.particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, a: 1, life: 0.7, size, color });
    }
  }
  pulseGood(x, y) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    this.rings.push({ x, y, r: 2 * this.scale, dr: 120 * this.scale, a: 0.8, life: 0.5, color: ink });
  }
  floatText(x, y, text, color) {
    this.texts.push({ x, y, text, color, a: 1, vy: -30 * this.scale, life: 0.8 });
  }
  update(dt) {
    this.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 1.6; p.life -= dt; });
    this.particles = this.particles.filter(p => p.life > 0 && p.a > 0);
    this.rings.forEach(r => { r.r += r.dr * dt; r.a -= dt * 1.6; r.life -= dt; });
    this.rings = this.rings.filter(r => r.life > 0 && r.a > 0);
    this.texts.forEach(t => { t.y += t.vy * dt; t.a -= dt * 1.4; t.life -= dt; });
    this.texts = this.texts.filter(t => t.life > 0 && t.a > 0);
    // popups
    this.popups.forEach(p => { p.t += dt; });
    this.popups = this.popups.filter(p => p.t < p.dur);
    if (this.screen) {
      this.screen.t += dt;
      if (this.screen.t >= this.screen.dur) this.screen = null;
    }
  }
  draw(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      ctx.globalAlpha = 1;
    });
    this.rings.forEach(r => {
      ctx.globalAlpha = Math.max(0, r.a);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, 2 * this.scale);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    this.texts.forEach(t => {
      ctx.globalAlpha = Math.max(0, t.a);
      ctx.fillStyle = t.color;
      ctx.font = `${Math.floor(12 * this.scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    });
    // Image popups (e.g., 500.png rainbow flicker)
    this.popups.forEach(p => {
      const prog = p.t / p.dur;
      const s = p.s0 + (p.s1 - p.s0) * prog;
      const a = Math.max(0, 1 - prog);
      const w = p.img ? p.img.width : 64;
      const h = p.img ? p.img.height : 64;
      const dw = w * s;
      const dh = h * s;
      const x = p.x - dw/2;
      const y = p.y - dh/2;
      // draw image
      if (p.img) {
        ctx.globalAlpha = a;
        ctx.drawImage(p.img, x, y, dw, dh);
        ctx.globalAlpha = 1;
      }
      // rainbow flicker overlay
      const flick = 0.3 + 0.3 * Math.sin(p.t * 10);
      const g = ctx.createLinearGradient(x, y, x + dw, y + dh);
      g.addColorStop(0.0, 'rgba(255,0,68,0.6)');
      g.addColorStop(0.2, 'rgba(255,165,0,0.6)');
      g.addColorStop(0.4, 'rgba(255,255,0,0.6)');
      g.addColorStop(0.6, 'rgba(0,255,102,0.6)');
      g.addColorStop(0.8, 'rgba(0,179,255,0.6)');
      g.addColorStop(1.0, 'rgba(139,0,255,0.6)');
      ctx.globalAlpha = flick;
      ctx.fillStyle = g;
      ctx.fillRect(x, y, dw, dh);
      ctx.globalAlpha = 1;
    });
    // Screen flicker / overlay
    if (this.screen) {
      const a = 0.25 + 0.25 * Math.sin(this.screen.t * 20);
      if (this.screen.type === 'blue') {
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0, 120, 255, 1)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      } else if (this.screen.type === 'rainbow') {
        ctx.globalAlpha = a;
        // rainbow: vertical gradient bands
        const g = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
        g.addColorStop(0.0, '#ff0044');
        g.addColorStop(0.2, '#ffa500');
        g.addColorStop(0.4, '#ffff00');
        g.addColorStop(0.6, '#00ff66');
        g.addColorStop(0.8, '#00b3ff');
        g.addColorStop(1.0, '#8b00ff');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      } else if (this.screen.type === 'vignette-red') {
        // red vignette: dark edges, subtle center transparency
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.sqrt(cx*cx + cy*cy);
        const rad = ctx.createRadialGradient(cx, cy, Math.max(0, maxR * 0.35), cx, cy, maxR);
        rad.addColorStop(0, 'rgba(139,0,51,0.0)');
        rad.addColorStop(0.6, 'rgba(139,0,51,0.35)');
        rad.addColorStop(1, 'rgba(139,0,51,0.6)');
        ctx.globalAlpha = 1; // gradient carries its own alpha
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
      } else if (this.screen.type === 'vignette-black') {
        // black vignette with slow flicker
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.sqrt(cx*cx + cy*cy);
        const base = 0.2;
        const flicker = 0.15 * (0.5 + 0.5 * Math.sin(this.screen.t * 2.0));
        const a0 = 0.0;
        const a1 = Math.min(1, (base + flicker) * 0.5);
        const a2 = Math.min(1, base + flicker);
        const rad = ctx.createRadialGradient(cx, cy, Math.max(0, maxR * 0.35), cx, cy, maxR);
        rad.addColorStop(0, `rgba(0,0,0,${a0})`);
        rad.addColorStop(0.6, `rgba(0,0,0,${a1})`);
        rad.addColorStop(1, `rgba(0,0,0,${a2})`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;
    }
  }
  screenFlash(type = 'blue', duration = 2) {
    this.screen = { type, dur: duration, t: 0 };
  }
  vignetteRed(duration = 0.6) {
    this.screen = { type: 'vignette-red', dur: duration, t: 0 };
  }
  vignetteBlack(duration = 4.0) {
    this.screen = { type: 'vignette-black', dur: duration, t: 0 };
  }
  showPopupImage(img, x, y, duration = 1.6, scale0 = 0.6, scale1 = 1.6) {
    this.popups.push({ img, x, y, dur: duration, t: 0, s0: scale0, s1: scale1 });
  }
}
