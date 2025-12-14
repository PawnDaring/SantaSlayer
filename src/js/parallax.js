function drawCloud(ctx, x, y, scale = 1) {
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.rect(x, y, 24*scale, 8*scale);
  ctx.rect(x+6*scale, y-6*scale, 12*scale, 6*scale);
  ctx.rect(x+18*scale, y-3*scale, 8*scale, 5*scale);
  ctx.fill();
}

function drawCityRow(ctx, y, w) {
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
  const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
  // simple rooftops row across the width
  let x = 0;
  while (x < w) {
    const bw = 24 + Math.floor(Math.random()*20);
    const bh = 12 + Math.floor(Math.random()*20);
    ctx.fillStyle = ink;
    ctx.fillRect(x, y - bh, bw, bh);
    ctx.fillStyle = red;
    for (let ix = x + 3; ix < x + bw - 3; ix += 8) {
      ctx.fillRect(ix, y - bh + 4, 3, 3);
    }
    x += bw + 6;
  }
}

export class Parallax {
  constructor() {
    this.sprites = { cloud: null, tile: null, tiles: null };
    this.offsetY = 0;
    this.speed = 90;
    this.scale = 1;
    this.tileScale = 0.125; // even smaller: one more halving (eighth size)
    this.speedMul = 1;
  }
  setScale(s) { this.scale = Math.max(0.5, s || 1); }
  setSprites(s) { 
    this.sprites.cloud = (s && s.cloud) || null; 
    this.sprites.tile = (s && s.tile) || null;
    this.sprites.tiles = (s && s.tiles && Array.isArray(s.tiles)) ? s.tiles.filter(Boolean) : null;
  }
  setSpeedMul(m) { this.speedMul = Math.max(0.5, m || 1); }
  update(dt, input = { vx: 0, vy: 0 }) {
    // Reverse direction: scroll upward instead of downward
    this.offsetY -= (this.speed * this.speedMul - input.vy * 20) * dt;
  }
  draw(ctx, w, h) {
    // If multiple tiles are provided, draw a grid that selects tiles 0..N-1 deterministically per cell
    if (this.sprites.tiles && this.sprites.tiles.length) {
      const sample = this.sprites.tiles.find(t => t);
      const tw = Math.floor(sample.width * this.scale * this.tileScale);
      const th = Math.floor(sample.height * this.scale * this.tileScale);
      // start Y based on offset, reversed
      const startY = - (this.offsetY % th) - th;
      // Determine world-space cell indices so selection stays fixed while on-screen
      for (let y = startY; y < h + th; y += th) {
        for (let x = 0; x < w + tw; x += tw) {
          const worldY = y + this.offsetY; // invert of draw offset
          const worldX = x; // no horizontal scroll
          const cellY = Math.floor(worldY / th);
          const cellX = Math.floor(worldX / tw);
          // Simple hash from world cell coords to pick a tile index
          const hval = ((cellX * 374761393) ^ (cellY * 668265263)) >>> 0;
          const idx = hval % this.sprites.tiles.length;
          const img = this.sprites.tiles[idx] || sample;
          ctx.drawImage(img, x, y, tw, th);
        }
      }
      return;
    }
    // If a single background tile is provided, draw it as a repeating pattern
    if (this.sprites.tile) {
      const tw = Math.floor(this.sprites.tile.width * this.scale * this.tileScale);
      const th = Math.floor(this.sprites.tile.height * this.scale * this.tileScale);
      const startY = - (this.offsetY % th) - th;
      for (let y = startY; y < h + th; y += th) {
        for (let x = 0; x < w + tw; x += tw) {
          ctx.drawImage(this.sprites.tile, x, y, tw, th);
        }
      }
      return;
    }
    // Fallback cloud rows (also reversed direction)
    const tileHCloud = Math.floor(80 * this.scale);
    const startYCloud = - (this.offsetY % tileHCloud) - tileHCloud;
    for (let y = startYCloud; y < h + tileHCloud; y += tileHCloud) {
      for (let x = -60 * this.scale; x < w + 60 * this.scale; x += 120 * this.scale) {
        if (this.sprites.cloud) {
          ctx.drawImage(this.sprites.cloud, x, y, 96 * this.scale, 32 * this.scale);
        } else {
          drawCloud(ctx, x + 12 * this.scale, y + 16 * this.scale, 1.2 * this.scale);
          drawCloud(ctx, x + 60 * this.scale, y + 28 * this.scale, 1 * this.scale);
        }
      }
    }
  }
}
