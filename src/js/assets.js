export class Assets {
  constructor(list = []) {
    this.list = list;
    this.images = new Map();
  }
  async loadAll() {
    const loads = this.list.map(({ key, url }) => this.loadImage(url).then(img => this.images.set(key, img)).catch(() => null));
    await Promise.all(loads);
  }
  get(key) { return this.images.get(key) || null; }
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed: ' + url));
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(); // bust cache during dev
    });
  }
}
