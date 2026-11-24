/* Scene sound, played in its own time at natural speed (one <audio> element per scene = the clip's own track).
   - The sound of a scene starts when the visitor scrolls FORWARD into the scene, plays through to its end (3-5 s) even if they stop to read, then is silent.
   - Leaving a scene fades its sound out quickly; the next scene's sound starts. Scrolling back into a scene does not play it; a scene's sound
     is not restarted within 6 s of its last start (small back-and-forth scrolls never retrigger it; a cut-off sound just resumes). Leaving the story or hiding the tab fades it out.
   - On by default (kept in localStorage if turned off). Browsers allow sound only after a click, tap or key press on the page (wheel or trackpad
     scrolling does not count), so until then `state` is "suspended" and the button says so; the current scene then starts right after the first click.
   Config: { segments:[{scene:"s1", src, dur, volume}] }   API: enabled, toggle(), update(si, active), stop(), resume(), state, onState */
export function createAudio(cfg, sceneIds) {
  const segs = cfg && cfg.segments; if (!segs || !segs.length) return null;
  const KEY = "hashiyeh-story-sound", GUARD = 6000;
  let on = true; try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  const els = [], started = [], fades = new Map();
  let unlocked = false, trying = false, cur = -1, wasActive = false;
  const api = { onState() {}, get enabled() { return on; }, get state() { return unlocked ? "running" : "suspended"; } };
  function el(k) {
    if (k < 0 || k >= segs.length) return null;
    if (!els[k]) { const a = new Audio(); a.preload = "auto"; a.src = segs[k].src; try { a.preservesPitch = true; } catch (e) {} els[k] = a; }
    return els[k];
  }
  function fadeOut(a, ms) {
    if (!a || a.paused) return; clearInterval(fades.get(a)); const v0 = a.volume, t0 = performance.now();
    const id = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = v0 * (1 - k); if (k >= 1) { clearInterval(id); fades.delete(a); a.pause(); } }, 30);
    fades.set(a, id);
  }
  function play(k, force) {
    const a = el(k); if (!a || !on || !unlocked) return;
    const now = performance.now(), vol = segs[k].volume == null ? 1 : segs[k].volume;
    if (!force && started[k] && now - started[k] < GUARD) {              // recently started (scroll jitter): never restart; only resume it if it was cut off part-way
      if (a.currentTime < (a.duration || 99) - 0.2) { clearInterval(fades.get(a)); fades.delete(a); a.volume = vol; if (a.paused) a.play().catch(() => {}); }
      return;
    }
    started[k] = now; clearInterval(fades.get(a)); fades.delete(a);
    try { a.currentTime = 0; } catch (e) {} a.volume = vol;
    a.play().catch(() => { unlocked = false; api.onState(); });
  }
  const fadeAll = (ms, except) => els.forEach((a, k) => { if (a && k !== except) fadeOut(a, ms); });
  Object.assign(api, {
    /* si = scene index; active = the pinned story stage is on screen */
    update(si, active) {
      if (!active) { if (wasActive) { fadeAll(300); cur = -1; } wasActive = false; return; }
      wasActive = true; el(si); el(si + 1);
      if (si === cur) return;
      const prev = cur; cur = si; fadeAll(250, si);
      if (prev === -1 || si > prev) play(si, false);                       // forward entry (or first arrival): play; backward entry: stay silent
    },
    /* must run inside a click / key press / tap: lets the browser play sound later without a gesture */
    resume() {
      if (!on || unlocked || trying) return; trying = true;
      const a = el(Math.max(cur, 0)); if (!a) { trying = false; return; }
      a.muted = true; a.volume = 0;
      a.play().then(() => { a.pause(); a.muted = false; unlocked = true; trying = false; api.onState(); if (wasActive && cur >= 0) play(cur, true); })
        .catch(() => { a.muted = false; trying = false; });
    },
    toggle() { on = !on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} if (on) api.resume(); else fadeAll(120); if (on && unlocked && wasActive && cur >= 0) play(cur, true); api.onState(); return on; },
    stop() { fadeAll(200); cur = -1; wasActive = false; },
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { fadeAll(100); cur = -1; wasActive = false; } });
  el(0); el(1);
  return api;
}
