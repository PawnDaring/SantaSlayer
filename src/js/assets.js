export class Assets {
  constructor(list = []) {
    this.list = list;
    this.images = new Map();
  }
  async loadAll() {
    const loads = this.list.map(({ key, url }) =>
      this.loadImageFlexible(url)
        .then(img => this.images.set(key, img))
        .catch((err) => { console.warn('Asset failed', url, err?.message || err); })
    );
    await Promise.all(loads);
  }
  get(key) { return this.images.get(key) || null; }
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.loading = 'eager';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed: ' + url));
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(); // bust cache during dev
    });
  }
  async loadImageFlexible(url) {
    // Try original URL, then a lowercased filename variant for case-sensitive hosts
    try {
      const img = await this.loadImage(url);
      // If decode is supported, wait to ensure render-ready
      if (img && img.decode) {
        try { await img.decode(); } catch { /* ignore */ }
      }
      return img;
    } catch (e1) {
      // Lowercase the basename portion after last '/'
      try {
        const parts = url.split('/');
        const fname = parts.pop();
        const lower = fname ? fname.toLowerCase() : fname;
        const alt = [...parts, lower].join('/');
        const img2 = await this.loadImage(alt);
        if (img2 && img2.decode) {
          try { await img2.decode(); } catch { /* ignore */ }
        }
        return img2;
      } catch (e2) {
        // As a final attempt, try uppercased basename
        const parts2 = url.split('/');
        const fname2 = parts2.pop();
        const upper = fname2 ? fname2.toUpperCase() : fname2;
        const alt2 = [...parts2, upper].join('/');
        return this.loadImage(alt2);
      }
    }
  }
}
