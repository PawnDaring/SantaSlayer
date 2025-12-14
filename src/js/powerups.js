function rectsIntersect(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

export class PowerUps {
  constructor() {
    this.items = [];
    this.sprites = { tree: null, snowman: null };
    this.spawnTimer = 0;
    this.scale = 1;
    this.speedMul = 1;
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); }
  setSpeedMul(m) { this.speedMul = Math.max(0.5, m || 1); }
  setSprites(s) { this.sprites = { ...this.sprites, ...(s||{}) }; }
  reset() { this.items = []; this.spawnTimer = 0; }
  update(dt, w, h) {
    this.spawnTimer -= dt * this.speedMul;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = (2.5 + Math.random() * 2) / this.speedMul; // cadence scales with speed
      const kind = Math.random() < 0.5 ? 'tree' : 'snowman';
      const size = Math.floor(22 * this.scale);
      const x = Math.random() * (w - size);
      const y = -size;
      const vx = (Math.random() - 0.5) * 30;
      const vy = (90 + Math.random() * 110) * this.speedMul;
      this.items.push({ kind, x, y, w: size, h: size, vx, vy });
    }
    this.items.forEach(it => { it.x += it.vx * dt; it.y += it.vy * dt; });
    this.items = this.items.filter(it => it.x < w + 40 && it.x > -40 && it.y < h + 40);
  }
  collect(player) {
    const p = player.bounds;
    const activated = [];
    this.items = this.items.filter(it => {
      if (rectsIntersect(p, it)) { activated.push(it); return false; }
      return true;
    });
    return activated;
  }
  draw(ctx) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    for (const it of this.items) {
      const sprite = it.kind === 'tree' ? this.sprites.tree : this.sprites.snowman;
      if (sprite) {
        ctx.drawImage(sprite, it.x, it.y, it.w, it.h);
      } else {
        // no fallback to avoid stray boxes; skip render
      }
    }
  }
}
