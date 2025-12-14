export class UI {
  constructor({ scoreEl, pauseBtn, restartBtn }) {
    this.scoreEl = scoreEl;
    this.pauseBtn = pauseBtn;
    this.restartBtn = restartBtn;
    this.timeEl = document.getElementById('time');
    this.gunbarFill = document.getElementById('gunbarFill');
    this._onPause = () => {};
    this._onRestart = () => {};

    pauseBtn.addEventListener('click', () => this._onPause());
    restartBtn.addEventListener('click', () => this._onRestart());
  }
  setScore(v) { this.scoreEl.textContent = `Score: ${v}`; }
  setTime(sec) { this.timeEl.textContent = `Time: ${Math.max(0, Math.ceil(sec))}`; }
  setGunProgress(current, total) {
    if (!this.gunbarFill) return;
    if (!total || total <= 0 || !current || current <= 0) { this.gunbarFill.style.width = '0%'; return; }
    const pct = Math.max(0, Math.min(100, Math.floor((current / total) * 100)));
    this.gunbarFill.style.width = pct + '%';
  }
  onPause(fn) { this._onPause = fn; }
  onRestart(fn) { this._onRestart = fn; }
  setPaused(paused) {
    this.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  }
  flashHit() {
    const hud = this.scoreEl.closest('.hud');
    hud.style.boxShadow = '0 0 0 3px var(--accent-red) inset';
    clearTimeout(this._hitTimer);
    this._hitTimer = setTimeout(() => { hud.style.boxShadow = 'none'; }, 120);
  }
}
