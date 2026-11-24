/* Scroll logic: maps the scroll position inside the tall section to (scene, local progress, frame).
   Pure functions + one layout helper. Scene lengths (scrollVh) and holds come from the scene config. */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Timeline {
  constructor(scenes) { this.scenes = scenes; this.layout(innerHeight); }
  /* stageH: height of the sticky stage in px (100svh) */
  layout(stageH) {
    this.stageH = stageH; let acc = 0;
    this.spans = this.scenes.map((s) => { const len = s.scrollVh / 100 * stageH, o = { start: acc, len }; acc += len; return o; });
    this.total = acc; this.sectionH = Math.round(stageH + acc);
  }
  /* y = scroll distance past the top of the section (0..total) */
  at(y) {
    y = clamp(y, 0, this.total);
    let si = this.spans.length - 1;
    for (let k = 0; k < this.spans.length; k++) { if (y < this.spans[k].start + this.spans[k].len) { si = k; break; } }
    const sp = this.spans[si], u = clamp((y - sp.start) / sp.len, 0, 1), sc = this.scenes[si], h = sc.hold;
    const f01 = clamp((u - h.start) / (1 - h.start - h.end), 0, 1);
    return { si, u, frame: f01 * (sc.frames.count - 1), y, p: this.total ? y / this.total : 0 };
  }
  /* beat opacity for local progress u: fade in at a, fade out ending at b */
  static beatAlpha(b, u, fade) { return clamp((u - b.a) / fade, 0, 1) * clamp((b.b - u) / fade, 0, 1); }
}
