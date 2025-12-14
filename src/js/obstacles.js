function rectsIntersect(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

export class Obstacles {
  constructor() {
    this.items = [];
    this.sprite = null;
    this.spawnTimer = 0;
    this.scale = 1;
    this.speedMul = 1;
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); }
  setSprite(img) { this.sprite = img || null; }
  setSpeedMul(m) { this.speedMul = Math.max(0.5, m || 1); }
  reset() { this.items = []; this.spawnTimer = 0; }
  update(dt, w, h, player) {
    // If no sprite is available, disable obstacles entirely to avoid invisible collisions
    if (!this.sprite) { this.items = []; return; }
    this.spawnTimer -= dt * this.speedMul;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = (0.5 + Math.random() * 0.6) / this.speedMul; // cadence scales with speed
      const size = Math.floor((12 + Math.floor(Math.random() * 18)) * this.scale);
      const x = Math.random() * (w - size);
      const y = -size;
      const vx = (Math.random() - 0.5) * 60; // slight drift left/right
      const vy = (120 + Math.random() * 180) * this.speedMul;  // coming down towards player
      this.items.push({ x, y, w: size, h: size, vx, vy });
    }
    // Move and cull
    this.items.forEach(it => { it.x += it.vx * dt; it.y += it.vy * dt; });
    this.items = this.items.filter(it => it.x < w + 40 && it.x > -40 && it.y < h + 40);
  }
  checkCollisions(player) {
    const p = player.bounds;
    const collided = [];
    for (const it of this.items) {
      if (rectsIntersect(p, it)) { collided.push(it); }
    }
    return collided;
  }
  destroy(collided) {
    if (!collided || collided.length === 0) return;
    const set = new Set(collided);
    this.items = this.items.filter(it => !set.has(it));
  }
  draw(ctx) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
    for (const it of this.items) {
      if (this.sprite) {
        ctx.drawImage(this.sprite, it.x, it.y, it.w, it.h);
      } else {
        // If no sprite, skip drawing to avoid placeholder boxes
      }
    }
  }
}
