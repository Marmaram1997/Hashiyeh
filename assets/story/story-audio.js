/* Scroll-synced sound ("tape scrub"). Web Audio API, no <audio> elements.
   Each scene has one sound clip (the clip's own track). The clip position follows the scene's frame position:
   - scroll forward  -> the clip plays forward, at a speed that follows how fast you scroll;
   - scroll back     -> the clip plays in reverse;
   - stop scrolling  -> silence (the picture holds, so does the sound); scrolling extremely fast -> silence.
   On by default (remembered if the visitor turns it off). Browsers keep the audio engine suspended until a click, tap or key press
   on the page; a wheel or trackpad scroll does not count, so until then the button says so.
   Config: { segments:[{scene:"s1", src, volume}] }   API: enabled, toggle(), update(si, f01), stop(), resume(), state, onState */
export function createAudio(cfg, sceneIds) {
  const segs = cfg && cfg.segments; if (!segs || !segs.length) return null;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  let ctx; try { ctx = new AC(); } catch (e) { return null; }
  const KEY = "hashiyeh-story-sound";
  let on = true; try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  const master = ctx.createGain(); master.connect(ctx.destination);
  const bufs = {}, rev = {}, loading = {};
  const MINV = 0.12, MAXV = 8, RMIN = 0.25, RMAX = 4;      // clip-seconds per second: below MINV = stopped, above MAXV = too fast to hear
  let si = -1, dur = 1, t = 0, tPrev = 0, tPrevMs = 0, lastUpd = 0, v = 0, lastTick = 0, raf = 0;
  let src = null, g = null, dir = 0, pos = 0, rate = 1;
  const api = { onState() {}, get enabled() { return on; }, get state() { return ctx.state; } };
  ctx.onstatechange = () => api.onState();

  function load(k) {
    if (k < 0 || k >= segs.length || bufs[k] || loading[k]) return;
    loading[k] = true;
    fetch(segs[k].src).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then((b) => { bufs[k] = b; loading[k] = false; }).catch(() => { loading[k] = false; });
  }
  function reversed(k) {
    if (rev[k]) return rev[k]; const b = bufs[k], r = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) { const a = b.getChannelData(c), o = r.getChannelData(c); for (let i = 0, n = a.length; i < n; i++) o[i] = a[n - 1 - i]; }
    return (rev[k] = r);
  }
  function stopSrc(ms = 40) {
    if (!src) return; const s = src, gg = g; src = null; g = null; dir = 0;
    const now = ctx.currentTime; gg.gain.cancelScheduledValues(now); gg.gain.setValueAtTime(gg.gain.value, now); gg.gain.linearRampToValueAtTime(0, now + ms / 1000);
    s.stop(now + ms / 1000 + 0.02); s.onended = () => { try { s.disconnect(); gg.disconnect(); } catch (e) {} };
  }
  function startSrc(d, p, r) {
    stopSrc(30); const b = bufs[si]; if (!b) return;
    const s = ctx.createBufferSource(), gg = ctx.createGain(), vol = segs[si].volume == null ? 1 : segs[si].volume;
    s.buffer = d > 0 ? b : reversed(si); s.playbackRate.value = r;
    const off = d > 0 ? p : b.duration - p; if (off < 0 || off >= b.duration) return;
    const now = ctx.currentTime; gg.gain.setValueAtTime(0, now); gg.gain.linearRampToValueAtTime(vol, now + 0.03);
    s.connect(gg); gg.connect(master); s.start(0, off); src = s; g = gg; dir = d; pos = p; rate = r;
  }
  function tick(now) {
    raf = 0; const dt = lastTick ? now - lastTick : 16; lastTick = now;
    if (!on || ctx.state !== "running") { stopSrc(); if (on) raf = requestAnimationFrame(tick); return; }
    if (now - lastUpd > 90) v *= 0.55;                                       // no recent scrolling: decay to a stop
    const av = Math.abs(v);
    if (av < MINV || av > MAXV || !bufs[si]) { stopSrc(); }
    else {
      const d = v > 0 ? 1 : -1, r = Math.min(RMAX, Math.max(RMIN, av));
      if (!src || d !== dir) startSrc(d, t, r);
      else {
        pos += d * rate * dt / 1000; rate = r; src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.03);
        if (Math.abs(pos - t) > 0.25 || pos < 0 || pos > dur) startSrc(d, Math.min(Math.max(t, 0), dur - 0.01), r);   // re-sync to the picture
      }
    }
    if (on && (src || now - lastUpd < 600)) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  Object.assign(api, {
    /* called on every scroll update: si = scene index, f01 = position in the scene's frames (0..1) */
    update(s, f01) {
      if (s !== si) { stopSrc(30); si = s; load(s); load(s + 1); load(s - 1); dur = bufs[s] ? bufs[s].duration : 4; tPrev = f01 * dur; tPrevMs = performance.now(); t = tPrev; kick(); return; }
      const now = performance.now(); dur = bufs[s] ? bufs[s].duration : dur; t = f01 * dur;
      const dtm = now - tPrevMs;
      if (dtm > 8) { const inst = (t - tPrev) / (dtm / 1000); v = v * 0.65 + inst * 0.35; tPrev = t; tPrevMs = now; lastUpd = now; }
      load(s + 1); kick();
    },
    resume() { if (on && ctx.state === "suspended") ctx.resume().then(() => api.onState()).catch(() => {}); },
    toggle() { on = !on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} if (on) { api.resume(); load(Math.max(si, 0)); kick(); } else stopSrc(60); api.onState(); return on; },
    stop() { stopSrc(120); },
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopSrc(60); });
  load(0); load(1);
  return api;
}
