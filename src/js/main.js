import { Assets } from './assets.js';
import { Parallax } from './parallax.js';
import { Player } from './player.js';
import { Obstacles } from './obstacles.js';
import { UI } from './ui.js';
import { Presents } from './presents.js';
import { Effects } from './effects.js';
import { PowerUps } from './powerups.js';
import { Gun } from './gun.js';
import { Krampus } from './krampus.js';

const appEl = document.getElementById('app');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Game state
let running = true;
let score = 0;
let lastTime = performance.now();
let timeLeft = 60; // seconds
let hitCooldown = 0; // brief invulnerability after obstacle hit
const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
const SCALE = 1.6; // scale up visuals
let slowStacks = []; // snowman time-slow stacks (seconds)
let speedStacks = 0; // present speed-up stacks
let elapsedTime = 0; // total runtime in seconds
const MAX_SPEED_MUL = 2.5; // cap for global speed-up
let krampusCooldown = 0; // seconds until Krampus can spawn again

// Systems
const assets = new Assets([
  { key: 'santa', url: './assets/png/Santa.png' },
  { key: 'cloud', url: './assets/png/cloud.png' },
  { key: 'tile0', url: './assets/png/tile0.png' },
  { key: 'tile1', url: './assets/png/tile1.png' },
  { key: 'tile2', url: './assets/png/tile2.png' },
  { key: 'tile3', url: './assets/png/tile3.png' },
  { key: 'tile4', url: './assets/png/tile4.png' },
  { key: 'tile5', url: './assets/png/tile5.png' },
  { key: 'obstacle', url: './assets/png/obstacle.png' },
  { key: 'present0', url: './assets/png/Present0.png' },
  { key: 'present1', url: './assets/png/Present1.png' },
  { key: 'present2', url: './assets/png/Present2.png' },
  { key: 'mimic1', url: './assets/png/mimic1.png' },
  { key: 'mimic2', url: './assets/png/mimic2.png' },
  { key: 'tree', url: './assets/png/Tree.png' },
  { key: 'snowman', url: './assets/png/Snowman.png' },
  { key: 'treegun', url: './assets/png/Treegun.png' },
  { key: 'bullet', url: './assets/png/bullet.png' },
  { key: 'krampus', url: './assets/png/Krampus.png' },
  { key: 'hp', url: './assets/png/HP.png' },
  { key: '500', url: './assets/png/500.png' },
]);
const ui = new UI({
  scoreEl: document.getElementById('score'),
  pauseBtn: document.getElementById('btnPause'),
  restartBtn: document.getElementById('modalRestart')
});
const parallax = new Parallax();
const player = new Player();
const obstacles = new Obstacles();
const presents = new Presents();
const powerups = new PowerUps();
const effects = new Effects();
const gun = new Gun();
const krampus = new Krampus();

// Resize canvas to device pixels
function resize() {
  const rect = appEl.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  player.setCenter(canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// Apply global scale
player.setScale(SCALE);
parallax.setScale(SCALE);
obstacles.setScale(SCALE);
presents.setScale(SCALE);
effects.setScale(SCALE);
powerups.setScale(SCALE);
gun.setScale(SCALE);
krampus.setScale(SCALE);

// Input: keyboard
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
    keys.add(e.key.toLowerCase());
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// Input: pointer drag to move
let dragging = false;
let dragId = null;
let lastPointer = null;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true; dragId = e.pointerId; canvas.setPointerCapture(dragId);
  lastPointer = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || e.pointerId !== dragId) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = { x: e.clientX, y: e.clientY };
  player.nudge(dx, dy);
});
canvas.addEventListener('pointerup', (e) => { if (e.pointerId === dragId) { dragging = false; dragId = null; } });
canvas.addEventListener('pointercancel', () => { dragging = false; dragId = null; });

// UI hooks
ui.onPause(() => { running = !running; ui.setPaused(!running); });
ui.onRestart(() => {
  score = 0; timeLeft = 60; hitCooldown = 0;
  obstacles.reset(); presents.reset(); powerups.reset();
  player.reset(); player.setCenter(canvas.width, canvas.height);
  slowStacks = [];
  speedStacks = 0;
  krampus.reset();
  krampusCooldown = 0;
  running = true; ui.setPaused(false);
});

// Load assets (optional; game draws fallbacks if missing)
assets.loadAll().then(() => {
  player.setSprite(assets.get('santa'));
  parallax.setSprites({ 
    cloud: assets.get('cloud'), 
    tile: assets.get('tile1'),
    tiles: [assets.get('tile0'), assets.get('tile1'), assets.get('tile2'), assets.get('tile3'), assets.get('tile4'), assets.get('tile5')].filter(Boolean)
  });
  obstacles.setSprite(assets.get('obstacle'));
  // rotate through any present sprites provided (good + bad/mimic)
  presents.setSprites({
    good: [assets.get('present0'), assets.get('present1'), assets.get('present2')].filter(Boolean),
    bad: [assets.get('mimic1'), assets.get('mimic2')].filter(Boolean)
  });
  powerups.setSprites({ tree: assets.get('tree'), snowman: assets.get('snowman') });
  gun.setSprites({ gun: assets.get('treegun'), bullet: assets.get('bullet') });
  krampus.setSprite(assets.get('krampus'));
  krampus.setHPBadge(assets.get('hp'));
  // Ensure pause cover image loads with cache-busting
  const coverImg = document.querySelector('.modal-cover');
  if (coverImg) {
    const base = './assets/png/santacover.png';
    coverImg.onerror = () => console.warn('Pause cover image failed to load:', coverImg.src);
    coverImg.src = base + (base.includes('?') ? '&' : '?') + 't=' + Date.now();
  }
  // Modal controls
  const pauseModal = document.getElementById('pauseModal');
  const modalContinue = document.getElementById('modalContinue');
  const modalRestart = document.getElementById('modalRestart');
  const showModal = () => { pauseModal.classList.add('show'); };
  const hideModal = () => { pauseModal.classList.remove('show'); };
  // Wire Pause button to modal
  document.getElementById('btnPause').addEventListener('click', () => { running = false; ui.setPaused(true); showModal(); });
  modalContinue.addEventListener('click', () => { hideModal(); running = true; ui.setPaused(false); });
  modalRestart.addEventListener('click', () => { hideModal(); 
    score = 0; timeLeft = 60; hitCooldown = 0;
    obstacles.reset(); presents.reset(); powerups.reset();
    player.reset(); player.setBottomCenter(canvas.width, canvas.height);
    slowStacks = [];
    speedStacks = 0;
    krampus.reset();
    krampusCooldown = 0;
    running = true; ui.setPaused(false);
  });
  // Sound controls removed

  // Game Over modal controls
  const gameOverModal = document.getElementById('gameOverModal');
  const gameOverRestart = document.getElementById('gameOverRestart');
  const finalScoreEl = document.getElementById('finalScore');
  const showGameOver = () => { if (finalScoreEl) finalScoreEl.textContent = `Score: ${Math.floor(score)}`; gameOverModal.classList.add('show'); };
  const hideGameOver = () => { gameOverModal.classList.remove('show'); };
  gameOverRestart.addEventListener('click', () => {
    hideGameOver();
    score = 0; timeLeft = 60; hitCooldown = 0;
    obstacles.reset(); presents.reset(); powerups.reset();
    player.reset(); player.setBottomCenter(canvas.width, canvas.height);
    slowStacks = [];
    speedStacks = 0;
    krampus.reset();
    krampusCooldown = 0;
    running = true; ui.setPaused(false);
  });
});

function update(dt) {
  // Time countdown
  timeLeft = Math.max(0, timeLeft - dt);
  elapsedTime += dt;
  if (timeLeft <= 0) { running = false; ui.setPaused(true); const m = document.getElementById('gameOverModal'); if (m && !m.classList.contains('show')) { const fs = document.getElementById('finalScore'); if (fs) fs.textContent = `Score: ${Math.floor(score)}`; m.classList.add('show'); } }

  // Scene slow stacks update
  if (slowStacks.length) {
    for (let i = 0; i < slowStacks.length; i++) slowStacks[i] = Math.max(0, slowStacks[i] - dt);
    slowStacks = slowStacks.filter(s => s > 0);
  }
  const slowMultiplier = slowStacks.length ? (1 / (1 + 0.5 * slowStacks.length)) : 1;
  const speedMultiplier = Math.min(MAX_SPEED_MUL, 1 + 0.06 * speedStacks); // ~6% faster per good present, capped
  const sdt = dt * slowMultiplier;

  // Movement from keys
  const speed = player.speed;
  const vx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  const vy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
  player.x += vx * speed * sdt;
  player.y += vy * speed * sdt;
  player.clampTo(canvas.width, canvas.height);

  // Parallax: vertical downward motion, modulated by vertical input
  parallax.setSpeedMul(speedMultiplier);
  parallax.update(sdt, { vx, vy });

  // Presents (collect for score + time)
  presents.setSpeedMul(speedMultiplier);
  presents.update(sdt, canvas.width, canvas.height);
  // Spawn Krampus when time is high
  if (krampusCooldown > 0) krampusCooldown = Math.max(0, krampusCooldown - dt);
  if (timeLeft >= 500 && krampus.canSpawn() && krampusCooldown === 0) {
    krampus.spawn(canvas.width);
    effects.vignetteBlack(6.0);
  }
  const got = presents.collect(player);
  if (got.length) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
    for (const it of got) {
      if (it.bad) {
        // Mimic: negative present — penalty scales with speed and elapsed time
        const speedScale = (speedMultiplier - 1) / (MAX_SPEED_MUL - 1); // 0..1
        const timeScale = Math.min(elapsedTime / 120, 1); // reaches max over ~2 minutes
        const scale = Math.max(speedScale, timeScale);
        const penalty = Math.round(20 + 80 * scale); // 20..100
        score = Math.max(0, score - penalty);
        timeLeft = Math.max(0, timeLeft - penalty);
        effects.burstBad(it.x + it.w/2, it.y + it.h/2);
        effects.floatText(it.x + it.w/2, it.y, `-${penalty} -${penalty}s`, red);
        // Red vignette for mimic hit
        effects.vignetteRed(0.7);
        // sound disabled
      } else {
        score += 10;
        timeLeft += 5;
        effects.pulseGood(it.x + it.w/2, it.y + it.h/2);
        effects.floatText(it.x + it.w/2, it.y, '+10 +5s', ink);
        // sound disabled
        // Stack global speed-up
        speedStacks += 1;
      }
    }
  }

  // Power-ups (tree/snowman triggers)
  powerups.setSpeedMul(speedMultiplier);
  powerups.update(sdt, canvas.width, canvas.height);
  const activated = powerups.collect(player);
  if (activated.length) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    for (const pu of activated) {
      // temporary buff: speed boost and small time bonus
      timeLeft += 8;
      player.speed = Math.min(340, player.speed + 60);
      effects.pulseGood(pu.x + pu.w/2, pu.y + pu.h/2);
      effects.floatText(pu.x + pu.w/2, pu.y, '+8s Power!', ink);
      // screen flicker: blue for snowman, rainbow for tree
      if (pu.kind === 'snowman') {
        effects.screenFlash('blue', 0.8);
        // snowman cancels treegun
        gun.cancel();
        // add a slow stack (e.g., 4s duration) that stacks
        slowStacks.push(4);
        // sound disabled
      } else {
        // Tree stacks the gun timer and shooters; show feedback
        effects.screenFlash('rainbow', 1.2);
        gun.activate('tree');
        effects.floatText(pu.x + pu.w/2, pu.y - 10, 'TREE STACK!', ink);
        // sound disabled
        // picking tree cancels slow stacks
        slowStacks = [];
      }
    }
    // decay speed boost slowly
  }

  // Obstacles (downward); variable penalties
  obstacles.setSpeedMul(speedMultiplier);
  obstacles.update(sdt, canvas.width, canvas.height, player);
  // Gun update (firing bullets)
  gun.update(sdt, player);
  // Krampus update and bullet damage
  krampus.update(sdt, canvas.width, presents, effects);
  const kHit = krampus.damageByBullets(gun.bullets, effects);
  if (kHit && kHit.died && !krampus.rewarded) {
    krampus.rewarded = true;
    score += 500;
    // Flash big reward text and continue game
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    effects.floatText(krampus.x + krampus.w/2, krampus.y + krampus.h/2, '+500 KRAMPUS!', ink);
    // Popup animation with 500.png
    const img500 = assets.get('500');
    if (img500) {
      effects.showPopupImage(img500, krampus.x + krampus.w/2, krampus.y + krampus.h/2, 1.8, 0.8, 1.8);
    }
    // Start cooldown to avoid immediate respawn
    krampusCooldown = 200;
  }
  // Bullets can damage mimics (3 hits) and cause drops on death
  const hitResult = presents.damageByBullets(gun.bullets);
  const hits = hitResult && hitResult.collided ? hitResult.collided : [];
  const died = hitResult && hitResult.died ? hitResult.died : [];
  if (hits && hits.length) {
    const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
    for (const h of hits) {
      effects.burstBad(h.it.x + h.it.w/2, h.it.y + h.it.h/2);
      effects.floatText(h.it.x + h.it.w/2, h.it.y, '-1', red);
      // Red vignette flash on bullet hit
      effects.vignetteRed(0.4);
    }
    // Optionally remove bullets on hit to avoid multi-hit per frame
    // keep bullets simple for now
  }
  if (died && died.length) {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-green');
    for (const d of died) {
      // sound disabled
      // Randomly drop one: tree powerup, snowman powerup, or good present
      const choice = Math.floor(Math.random() * 3);
      if (choice === 0) {
        // Tree powerup
        const size = Math.floor(22 * SCALE);
        powerups.items.push({ kind: 'tree', x: d.x, y: d.y, w: size, h: size, vx: (Math.random()-0.5)*30, vy: 120 });
        effects.floatText(d.x + d.w/2, d.y, 'DROP: TREE', ink);
      } else if (choice === 1) {
        // Snowman powerup
        const size = Math.floor(22 * SCALE);
        powerups.items.push({ kind: 'snowman', x: d.x, y: d.y, w: size, h: size, vx: (Math.random()-0.5)*30, vy: 120 });
        effects.floatText(d.x + d.w/2, d.y, 'DROP: SNOW', ink);
      } else {
        // Good present
        const size = Math.floor((14 + Math.floor(Math.random() * 10)) * SCALE);
        const pool = presents.sprites.good;
        const si = pool ? Math.floor(Math.random() * pool.length) : -1;
        presents.items.push({ x: d.x, y: d.y, w: size, h: size, vx: (Math.random()-0.5)*40, vy: 120, si, bad: false, anim: null, hp: 0 });
        effects.floatText(d.x + d.w/2, d.y, 'DROP: GIFT', ink);
      }
    }
  }
  if (hitCooldown > 0) hitCooldown = Math.max(0, hitCooldown - dt);
  const collided = hitCooldown > 0 ? [] : obstacles.checkCollisions(player);
  if (collided.length) {
    // penalty scaled to obstacle size
    let penaltyScore = 0;
    let penaltyTime = 0;
    for (const it of collided) {
      penaltyScore += Math.max(3, Math.floor(it.w / 2));
      penaltyTime += Math.max(1, Math.floor(it.w / 20));
      const red = getComputedStyle(document.documentElement).getPropertyValue('--accent-red');
      effects.burstBad(it.x + it.w/2, it.y + it.h/2);
      effects.floatText(it.x + it.w/2, it.y, `-${Math.max(3, Math.floor(it.w / 2))} -${Math.max(1, Math.floor(it.w / 20))}s`, red);
    }
    score = Math.max(0, score - penaltyScore);
    timeLeft = Math.max(0, timeLeft - penaltyTime);
    ui.flashHit();
    // remove collided obstacles so they don't persist after explosion
    obstacles.destroy(collided);
    hitCooldown = 0.6; // brief invulnerability window
  }

  // Passive score
  score += dt * 2; // small passive score over time
  ui.setScore(Math.floor(score));
  ui.setTime(timeLeft);
  effects.update(dt);
  // Update gun timer bar
  ui.setGunProgress(gun.time, gun.duration);
}

function draw() {
  // Clear
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper-beige');
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background parallax
  parallax.draw(ctx, canvas.width, canvas.height);

  // Power-ups
  powerups.draw(ctx);

  // Player
  player.draw(ctx);

  // Obstacles
  obstacles.draw(ctx);

  // Presents
  presents.draw(ctx);
  // Krampus
  krampus.draw(ctx);

  // Gun (attached and bullets)
  gun.draw(ctx, player);

  // Krampus health bar (if active)
  krampus.drawHealthBar(ctx);

  // Effects overlay
  effects.draw(ctx);

  // Foreground accents (optional scanlines for retro vibe)
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.globalAlpha = 1;
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000); // clamp dt
  lastTime = now;
  if (running) update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
