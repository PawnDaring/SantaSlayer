function rectsIntersect(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

export class Presents {
  constructor() {
    this.items = [];
    this.sprites = { good: null, bad: null };
    this.spawnTimer = 0;
    this.scale = 1;
    this.speedMul = 1;
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); }
  setSpeedMul(m) { this.speedMul = Math.max(0.5, m || 1); }
  setSprites({ good, bad } = {}) {
    this.sprites.good = good && Array.isArray(good) ? good.filter(Boolean) : (good ? [good] : null);
    this.sprites.bad = bad && Array.isArray(bad) ? bad.filter(Boolean) : (bad ? [bad] : null);
  }
  reset() { this.items = []; this.spawnTimer = 0; }
  update(dt, w, h) {
    this.spawnTimer -= dt * this.speedMul;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = (0.9 + Math.random() * 0.8) / this.speedMul;
      const size = Math.floor((14 + Math.floor(Math.random() * 10)) * this.scale);
      const x = Math.random() * (w - size);
      const y = -size;
      const vx = (Math.random() - 0.5) * 40; // gentle drift
      const vy = (80 + Math.random() * 120) * this.speedMul;   // slower than obstacles
      const isBad = Math.random() < 0.45; // increased chance for mimic
      const pool = isBad ? this.sprites.bad : this.sprites.good;
      const spriteIndex = pool ? Math.floor(Math.random() * pool.length) : -1;
      // for bad presents, add scale-shift animation and hp for bullet hits
      const anim = isBad ? { t: 0, min: 1.0, max: 2.0 } : null;
      const hp = isBad ? 3 : 0;
      this.items.push({ x, y, w: size, h: size, vx, vy, si: spriteIndex, bad: isBad, anim, hp });
    }
    this.items.forEach(it => { it.x += it.vx * dt; it.y += it.vy * dt; });
    // advance animation time for bad mimics
    this.items.forEach(it => { if (it.bad && it.anim) it.anim.t += dt; });
    this.items = this.items.filter(it => it.x < w + 40 && it.x > -40 && it.y < h + 40);
  }
  collect(player) {
    const p = player.bounds;
    let collected = [];
    this.items = this.items.filter(it => {
      if (rectsIntersect(p, it)) { collected.push(it); return false; }
      return true;
    });
    return collected;
  }
  draw(ctx) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
    for (const it of this.items) {
      const pool = it.bad ? this.sprites.bad : this.sprites.good;
      if (pool && it.si >= 0) {
        if (it.bad && it.anim) {
          const phase = it.anim.t * 4; // speed
          const k = it.anim.min + (Math.sin(phase) * 0.5 + 0.5) * (it.anim.max - it.anim.min); // 1..2
          const dw = it.w * k;
          const dh = it.h * k;
          const cx = it.x + it.w/2;
          const cy = it.y + it.h/2;
          ctx.drawImage(pool[it.si], cx - dw/2, cy - dh/2, dw, dh);
        } else {
          ctx.drawImage(pool[it.si], it.x, it.y, it.w, it.h);
        }
      } else {
        ctx.fillStyle = it.bad ? red : red;
        ctx.fillRect(it.x, it.y, it.w, it.h);
        ctx.fillStyle = ink;
        ctx.fillRect(it.x + 3, it.y + 3, Math.max(2, it.w - 6), Math.max(2, it.h - 6));
      }
    }
  }
  damageByBullets(bullets) {
    // bullets are rects with x,y,w,h
    const collided = [];
    const died = [];
    this.items.forEach(it => {
      if (!it.bad) return;
      for (const b of bullets) {
        if (!(it.x + it.w < b.x || it.x > b.x + b.w || it.y + it.h < b.y || it.y > b.y + b.h)) {
          it.hp = Math.max(0, (it.hp || 0) - 1);
          collided.push({ it, b });
          if ((it.hp || 0) <= 0) died.push({ x: it.x, y: it.y, w: it.w, h: it.h });
          break;
        }
      }
    });
    // remove dead mimics
    this.items = this.items.filter(it => !(it.bad && (it.hp||0) <= 0));
    return { collided, died };
  }
}
