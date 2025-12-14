export class Krampus {
  constructor() {
    this.sprite = null;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.w = 64;
    this.h = 64;
    this.vx = 120; // horizontal hover speed
    this.hp = 200; // bullets to kill
    this.throwCooldown = 0;
    this.throwPeriod = 1.8; // seconds between mimic throws
    this.scale = 1;
    this.rewarded = false; // guard for one-time death reward
    this.defeated = false; // prevent respawn after death
    this.hitFlashT = 0; // flash timer when hit
    this.hpBadge = null;
  }
  setScale(s) { this.scale = s; this.w = Math.floor(64 * s); this.h = Math.floor(64 * s); }
  setSprite(img) { this.sprite = img; }
  setHPBadge(img) { this.hpBadge = img; }
  spawn(canvasWidth) {
    this.active = true;
    this.x = Math.floor(canvasWidth / 2 - this.w / 2);
    this.y = Math.floor(this.h * 0.5);
    this.hp = 200;
    this.throwCooldown = 0;
    this.rewarded = false;
    this.defeated = false;
    this.hitFlashT = 0;
  }
  reset() { this.active = false; this.defeated = false; this.rewarded = false; this.hitFlashT = 0; }
  update(dt, canvasWidth, presents, effects) {
    if (!this.active) return;
    if (this.hitFlashT > 0) this.hitFlashT = Math.max(0, this.hitFlashT - dt);
    // Hover left-right across top
    this.x += this.vx * dt;
    const left = 0, right = canvasWidth - this.w;
    if (this.x <= left) { this.x = left; this.vx = Math.abs(this.vx); }
    if (this.x >= right) { this.x = right; this.vx = -Math.abs(this.vx); }
    // Throw mimics downward
    this.throwCooldown -= dt;
    if (this.throwCooldown <= 0) {
      this.throwCooldown = this.throwPeriod;
      const size = Math.floor((18 + Math.floor(Math.random() * 8)) * this.scale);
      const vx = (Math.random() - 0.5) * 50;
      const vy = 160;
      presents.items.push({ x: this.x + this.w/2 - size/2, y: this.y + this.h, w: size, h: size, vx, vy, si: -1, bad: true, anim: null, hp: 3 });
    }
  }
  damageByBullets(bullets, effects) {
    if (!this.active) return { collided: [], died: false };
    const hits = [];
    for (const b of bullets) {
      if (b.dead) continue;
      const bx = b.x, by = b.y, bw = b.w, bh = b.h;
      if (bx < this.x + this.w && bx + bw > this.x && by < this.y + this.h && by + bh > this.y) {
        hits.push({ x: bx, y: by });
        b.dead = true;
        this.hp -= 1;
        this.hitFlashT = 0.2;
      }
    }
    let died = false;
    if (this.hp <= 0) {
      died = true;
      this.active = false;
      this.defeated = true;
      if (effects) {
        effects.burstGood(this.x + this.w/2, this.y + this.h/2);
      }
    } else if (hits.length && effects) {
      effects.vignetteRed(0.25);
    }
    return { collided: hits, died };
  }
  draw(ctx) {
    if (!this.active) return;
    if (this.sprite) {
      ctx.drawImage(this.sprite, this.x, this.y, this.w, this.h);
      if (this.hitFlashT > 0) {
        const a = 0.35 * (this.hitFlashT / 0.2);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(255,0,0,1)';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = '#400';
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }
  drawHealthBar(ctx) {
    if (!this.active) return;
    const w = ctx.canvas.width;
    const h = Math.max(6, Math.floor(10 * this.scale));
    const pad = Math.floor(8 * this.scale);
    const x = pad, y = Math.floor(40 * this.scale);
    const pct = Math.max(0, Math.min(1, this.hp / 200));
    // Background bar
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#330000';
    ctx.fillRect(x, y, w - 2*pad, h);
    // Foreground
    ctx.globalAlpha = 0.9;
    const grad = ctx.createLinearGradient(x, y, x + (w - 2*pad), y);
    grad.addColorStop(0, '#ff3333');
    grad.addColorStop(1, '#cc0000');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, Math.floor((w - 2*pad) * pct), h);
    // Flash red overlay on hit
    if (this.hitFlashT > 0) {
      const a = 0.35 * (this.hitFlashT / 0.2);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,0,0,1)';
      ctx.fillRect(x, y, w - 2*pad, h);
      ctx.globalAlpha = 1;
    }
    // HP badge on right side
    if (this.hpBadge) {
      const bw = Math.floor(18 * this.scale);
      const bh = Math.floor(18 * this.scale);
      const bx = x + (w - 2*pad) + Math.floor(6 * this.scale);
      const by = y + Math.floor((h - bh)/2);
      ctx.drawImage(this.hpBadge, bx, by, bw, bh);
      if (this.hitFlashT > 0) {
        const a = 0.35 * (this.hitFlashT / 0.2);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(255,0,0,1)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalAlpha = 1;
  }
  canSpawn() { return !this.active && !this.defeated; }
}
