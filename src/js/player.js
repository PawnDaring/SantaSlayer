export class Player {
  constructor() {
    this.w = 24; this.h = 14;
    this.x = 100; this.y = 100;
    this.speed = 220; // px/sec
    this.sprite = null;
    this.scale = 1;
    this.aspectY = 5; // stretch vertically for ~1:5 feel
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); this.w = Math.floor(24 * this.scale); this.h = Math.floor(14 * this.scale) * this.aspectY; }
  setSprite(img) { this.sprite = img || null; }
  reset() { this.x = 100; this.y = 100; }
  setBottomCenter(w, h) {
    this.x = Math.floor((w - this.w) / 2);
    this.y = Math.floor(h - this.h - 24);
  }
  setCenter(w, h) {
    this.x = Math.floor((w - this.w) / 2);
    this.y = Math.floor((h - this.h) / 2);
  }
  clampTo(w, h) {
    this.x = Math.max(0, Math.min(w - this.w, this.x));
    this.y = Math.max(0, Math.min(h - this.h, this.y));
  }
  nudge(dx, dy) { this.x += dx; this.y += dy; }
  draw(ctx) {
    if (this.sprite) {
      // Draw sprite with vertical stretch for 3:1 ratio
      const dw = this.w + 8 * this.scale;
      const dh = (this.h + 12 * this.scale) * 1; // already accounted in h
      ctx.drawImage(this.sprite, this.x - 4 * this.scale, this.y - 6 * this.scale, dw, dh);
      return;
    }
    // Fallback: 8-bit sleigh + santa
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
    ctx.fillStyle = ink; // sleigh
    ctx.fillRect(this.x, this.y + 6 * this.scale, this.w, 6 * this.scale * this.aspectY);
    ctx.fillRect(this.x + 3 * this.scale, this.y + 2 * this.scale, this.w - 6 * this.scale, 6 * this.scale * this.aspectY);
    ctx.fillStyle = red; // santa blob
    ctx.fillRect(this.x + 6 * this.scale, this.y - 2 * this.scale, 6 * this.scale, 6 * this.scale * this.aspectY);
  }
  get bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
