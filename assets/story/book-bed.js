/* Background bed: each page's own sound (animals, water, music as the clip has it) as a seamless loop that keeps going once the page's video has ended,
   so the page is not silent while the visitor reads. Web Audio buffer loops are gapless; beds fade in/out. Starts only after a user gesture (init()). */
export function createBeds(urls, volume = 0.55) {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  let ctx = null, master = null, cur = null, want = -1; const bufs = {}, loading = {};
  const api = {
    init() { if (!ctx) { try { ctx = new AC(); master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination); } catch (e) { ctx = null; return; } } if (ctx.state === "suspended") ctx.resume().catch(() => {}); },
    start(i, fadeMs = 900) {
      want = i; if (!ctx) return; api.stop(200, true);
      const go = () => {
        if (want !== i || !bufs[i] || cur) return;
        const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[i]; s.loop = true;
        g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeMs / 1000);
        s.connect(g); g.connect(master); s.start(); cur = { s, g };
      };
      if (bufs[i]) go();
      else if (!loading[i]) { loading[i] = true; fetch(urls[i]).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))).then((b) => { bufs[i] = b; loading[i] = false; go(); }).catch(() => { loading[i] = false; }); }
    },
    stop(fadeMs = 300, keepWant) {
      if (!keepWant) want = -1; if (!cur || !ctx) return; const { s, g } = cur; cur = null; const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
      s.stop(t + fadeMs / 1000 + 0.05); s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) {} };
    },
  };
  return api;
}
