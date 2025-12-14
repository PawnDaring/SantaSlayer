export class Gun {
  constructor() {
    this.active = false;
    this.kind = null; // 'tree'
    this.time = 0; // remaining seconds
    this.duration = 0;
    this.durationMax = 60; // cap to avoid runaway timers
    this.scale = 1;
    this.sprite = null; // treegun image
    this.bulletSprite = null;
    this.fireTimer = 0;
    this.bullets = [];
    this.stacks = 0; // number of collections; shooters capped visually to 3
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); }
  setSprites({ gun, bullet } = {}) { this.sprite = gun || null; this.bulletSprite = bullet || null; }
  // Map number of collected trees to total active time
  // 1 -> 3s, 2 -> 6s, 3 -> 8s, 4 -> 9s, 5 -> 10s, ...
  // After 3, adds +1s per stack, up to durationMax
  getTotalDuration(stacks) {
    if (stacks <= 0) return 0;
    if (stacks === 1) return 3;
    if (stacks === 2) return 6;
    if (stacks === 3) return 8;
    return Math.min(8 + (stacks - 3), this.durationMax);
  }
  activate(kind, durationSec = 6) {
    // Stacked timing for tree gun: recompute total time on each collection
    if (kind === 'tree') {
      if (this.active && this.kind === 'tree') {
        this.stacks = (this.stacks || 1) + 1;
        const total = this.getTotalDuration(this.stacks);
        this.duration = total;
        this.time = total;
        this.fireTimer = 0; // feels refreshed
        return;
      }
      // Fresh activation
      this.active = true; this.kind = 'tree'; this.stacks = Math.max(1, this.stacks || 1);
      const total = this.getTotalDuration(this.stacks);
      this.duration = total; this.time = total; this.fireTimer = 0; this.bullets = [];
      return;
    }
    // Default activation behavior for other kinds (if added later)
    this.active = true; this.kind = kind; this.time = durationSec; this.duration = durationSec; this.fireTimer = 0; this.bullets = [];
  }
  addDuration(seconds) {
    if (!this.active) return;
    this.duration = Math.min(this.duration + seconds, this.durationMax);
    this.time = Math.min(this.time + seconds, this.durationMax);
  }
  cancel() { this.active = false; this.kind = null; this.time = 0; this.bullets = []; this.stacks = 0; }
  addStack() { this.stacks = (this.stacks || 0) + 1; this.active = true; }
  update(dt, player) {
    if (!this.active) return;
    this.time = Math.max(0, this.time - dt);
    if (this.time === 0) { this.cancel(); return; }
    // rapid vertical grow/shrink and fire bullets
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.12; // rapid fire
      const speed = 380 * this.scale;
      const rows = Math.min(3, Math.max(1, this.stacks || 1));
      const offsets = rows === 1 ? [0] : (rows === 2 ? [-player.w*0.25, player.w*0.25] : [-player.w*0.4, 0, player.w*0.4]);
      for (const ox of offsets) {
        // spawn bullets from gun top-center to emphasize vertical gun
        const gw = 14 * this.scale; // keep consistent with draw
        const gh = gw * 3;          // strict 1:3 ratio
        const gx = player.x + player.w - gw + 2;
        const gy = player.y + player.h - gh + 2;
        const bx = gx + gw/2 + ox;
        const by = gy;
        this.bullets.push({ x: bx, y: by, w: 6 * this.scale, h: 12 * this.scale, vx: 0, vy: -speed });
      }
    }
    // move bullets
    this.bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
    // cull bullets when they leave the top of the screen
    this.bullets = this.bullets.filter(b => b.y > -100);
  }
  draw(ctx, player) {
    // draw gun attached to santa bottom-right; vertical pulsing
    if (this.active && this.kind === 'tree') {
      // Keep a subtle pulse without changing aspect ratio
      const pulse = 1 + (Math.sin(this.time * 12) * 0.08); // ~±8%
      const gw = 14 * this.scale * pulse; // width baseline
      const gh = (14 * this.scale) * 3 * pulse; // strict 1:3 ratio
      const baseX = player.x + player.w - gw + 2;
      const gy = player.y + player.h - gh + 2;
      const rows = Math.min(3, Math.max(1, this.stacks || 1));
      const offsets = rows === 1 ? [0] : (rows === 2 ? [-player.w*0.25, player.w*0.25] : [-player.w*0.4, 0, player.w*0.4]);
      // Draw a tree gun sprite for each row at matching offsets
      for (const ox of offsets) {
        const gx = baseX + ox;
        if (this.sprite) ctx.drawImage(this.sprite, gx, gy, gw, gh);
        else {
          const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
          const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
          ctx.fillStyle = ink;
          ctx.fillRect(gx, gy, gw, gh);
          ctx.fillStyle = red;
          ctx.fillRect(gx+2, gy+2, gw-4, gh-4);
        }
      }
    }
    // bullets
    for (const b of this.bullets) {
      if (this.bulletSprite) ctx.drawImage(this.bulletSprite, b.x, b.y, b.w, b.h);
      else {
        const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
        ctx.fillStyle = ink;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    }
  }
}
