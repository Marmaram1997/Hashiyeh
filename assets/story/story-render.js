/* Frame store + canvas drawing. No scroll logic here.
   - Frames are fetched as compressed blobs, scene by scene (current scene first, then the next, then the previous);
     blobs and decoded bitmaps of scenes further than one scene away are released.
   - Only a window of frames around the current one is kept decoded, plus every `coarse`-th frame of the current scene
     and the first/last frame of the neighbouring scenes (so a cut is instant in either direction). */
const pad3 = (n) => String(n).padStart(3, "0");
export class FrameStore {
  constructor(scenes, opt = {}) {
    this.scenes = scenes;
    this.opt = Object.assign({ concurrency: 4, win: 5, keep: 10, coarse: 8, maxFails: 12 }, opt);
    this.blobs = scenes.map((s) => new Array(s.frames.count));
    this.bmp = scenes.map((s) => new Array(s.frames.count));
    this.pending = new Set();       // "s:i" being fetched or decoded
    this.fails = 0; this.failed = false;
    this.cur = { s: 0, f: 0 };
    this.queue = []; this.running = 0; this.onChange = () => {}; this.onFail = () => {};
    this.firstReady = scenes.map(() => false);
  }
  url(s, i) { const f = this.scenes[s].frames; return f.dir + "/" + pad3(i + 1) + ".webp"; }
  count(s) { return this.scenes[s].frames.count; }
  /* progressive order inside one scene: first, last, then coarse to fine */
  order(s, full = true) {
    const n = this.count(s), seen = new Set(), o = [], add = (i) => { if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); o.push(i); } };
    add(0); add(n - 1);
    const strides = full ? [16, 8, 4, 2, 1] : [16, 8];
    strides.forEach((st) => { for (let i = 0; i < n; i += st) add(i); });
    return o;
  }
  plan() {
    const { s } = this.cur, q = [];
    const push = (sc, full) => { if (sc < 0 || sc >= this.scenes.length) return; this.order(sc, full).forEach((i) => q.push([sc, i])); };
    push(s, true);
    push(s + 1, false);               // next scene: first, last and coarse frames while the current one is being read
    push(s - 1, false);
    push(s + 1, true);
    this.queue = q.filter(([sc, i]) => !this.blobs[sc][i]);
    this.pump();
  }
  pump() {
    if (this.failed) return;
    while (this.running < this.opt.concurrency && this.queue.length) {
      const [s, i] = this.queue.shift(), key = s + ":" + i;
      if (this.blobs[s][i] || this.pending.has(key) || Math.abs(s - this.cur.s) > 1) continue;
      this.pending.add(key); this.running++;
      this.fetch(s, i, 0).then((ok) => {
        this.running--; this.pending.delete(key);
        if (ok) { if (this.wantDecoded(s, i)) this.decode(s, i); }
        else if (++this.fails > this.opt.maxFails || (i === 0 && this.cur.s === s)) { this.failed = true; this.onFail(); return; }
        this.pump();
      });
    }
  }
  fetch(s, i, retry) {
    return fetch(this.url(s, i)).then((r) => { if (!r.ok) throw 0; return r.blob(); })
      .then((b) => { if (Math.abs(s - this.cur.s) <= 1) this.blobs[s][i] = b; return true; })
      .catch(() => (retry ? false : this.fetch(s, i, 1)));
  }
  wantDecoded(s, i) {
    const n = this.count(s), { win, keep, coarse } = this.opt;
    if (s === this.cur.s) return Math.abs(i - Math.round(this.cur.f)) <= keep || i % coarse === 0 || i === n - 1;
    if (Math.abs(s - this.cur.s) === 1) return i === 0 || i === n - 1;
    return false;
  }
  decode(s, i) {
    const key = "d" + s + ":" + i;
    if (this.bmp[s][i] || this.pending.has(key) || !this.blobs[s][i]) return;
    this.pending.add(key);
    createImageBitmap(this.blobs[s][i]).then((b) => {
      this.pending.delete(key);
      if (this.wantDecoded(s, i)) { this.bmp[s][i] = b; this.firstReady[s] = this.firstReady[s] || i === 0; this.onChange(); } else b.close();
    }).catch(() => this.pending.delete(key));
  }
  /* called on every scroll update */
  setActive(s, f) {
    const changed = s !== this.cur.s;
    this.cur = { s, f };
    if (changed || !this.planned) { this.planned = true; this.release(); this.plan(); }
    const n = this.count(s), c = Math.round(f), w = this.opt.win;
    for (let i = Math.max(0, c - w); i <= Math.min(n - 1, c + w + 2); i++) this.decode(s, i);
    this.evict();
  }
  release() {
    this.scenes.forEach((_, sc) => {
      if (Math.abs(sc - this.cur.s) > 1) { this.bmp[sc].forEach((b) => b && b.close()); this.bmp[sc] = new Array(this.count(sc)); this.blobs[sc] = new Array(this.count(sc)); }
    });
  }
  evict() {
    this.scenes.forEach((_, sc) => this.bmp[sc].forEach((b, i) => { if (b && !this.wantDecoded(sc, i)) { b.close(); this.bmp[sc][i] = null; } }));
    // neighbours keep only first and last (wantDecoded already says so)
  }
  nearest(s, i) {
    const a = this.bmp[s], n = a.length;
    if (a[i]) return a[i];
    for (let k = 1; k < n; k++) { if (i - k >= 0 && a[i - k]) return a[i - k]; if (i + k < n && a[i + k]) return a[i + k]; }
    return null;
  }
  stats() { let d = 0, b = 0; this.bmp.forEach((a) => a.forEach((x) => x && d++)); this.blobs.forEach((a) => a.forEach((x) => x && b++)); return { decoded: d, blobs: b }; }
}
export class Painter {
  constructor(canvas, store) { this.cv = canvas; this.ctx = canvas.getContext("2d"); this.store = store; this.scene = -1; this.key = null; }
  /* size the backing store for the scene's aspect and the displayed box (CSS object-fit:contain letterboxes it) */
  fit(sceneIdx, boxW, boxH) {
    const f = this.store.scenes[sceneIdx].frames, d = Math.min(window.devicePixelRatio || 1, 2), ar = f.w / f.h;
    let w = boxW, h = boxW / ar; if (h > boxH) { h = boxH; w = boxH * ar; }
    this.cv.width = Math.max(2, Math.round(w * d)); this.cv.height = Math.max(2, Math.round(h * d));
    this.scene = sceneIdx; this.key = null;
  }
  /* returns true if a frame of this scene was drawn */
  draw(s, ft) {
    const i = Math.floor(ft), t = ft - i, key = s + ":" + (i + t * 0.999).toFixed(4);
    if (key === this.key) return true;
    const a = this.store.nearest(s, i); if (!a) return false;
    this.key = key; const { ctx, cv } = this;
    ctx.globalAlpha = 1; ctx.imageSmoothingQuality = "high"; ctx.drawImage(a, 0, 0, cv.width, cv.height);
    const b = t > 0.02 && i + 1 < this.store.count(s) ? this.store.bmp[s][i + 1] : null;
    if (b && this.store.bmp[s][i]) { ctx.globalAlpha = t; ctx.drawImage(b, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
    return true;
  }
}
