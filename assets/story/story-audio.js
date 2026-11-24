/* Scroll-synced sound. One <audio> element per scene (the clip's own track), played at NATURAL pitch.
   The sound follows the picture: while the visitor scrolls forward it plays, its speed nudged up or down (0.6x-2.2x, pitch preserved by the browser)
   so it stays with the picture; if the picture is behind, the sound waits; when scrolling stops, the sound stops; scrolling back pauses it.
   On by default (remembered in localStorage if turned off). Browsers allow sound only after a click, tap or key press on the page
   (wheel or trackpad scrolling does not count), so until then `state` is "suspended" and the button says so.
   Config: { segments:[{scene:"s1", src, dur, volume}] }   API: enabled, toggle(), update(si, f01), stop(), resume(), state, onState */
export function createAudio(cfg, sceneIds) {
  const segs = cfg && cfg.segments; if (!segs || !segs.length) return null;
  const KEY = "hashiyeh-story-sound";
  let on = true; try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  const els = [], api = { onState() {}, get enabled() { return on; }, get state() { return unlocked ? "running" : "suspended"; } };
  let unlocked = false, si = -1, t = 0, tPrev = 0, tPrevMs = 0, lastUpd = 0, v = 0, raf = 0, trying = false;
  const MINV = 0.05, AHEAD = 0.35, SEEK = 1.5, RMIN = 0.6, RMAX = 2.2;
  const dur = (k) => (els[k] && isFinite(els[k].duration) && els[k].duration) || segs[k].dur || 4;
  function el(k) {
    if (k < 0 || k >= segs.length) return null;
    if (!els[k]) { const a = new Audio(); a.preload = "auto"; a.src = segs[k].src; a.volume = segs[k].volume == null ? 1 : segs[k].volume; try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; } catch (e) {} els[k] = a; }
    return els[k];
  }
  function pauseAll(except) { els.forEach((a, k) => { if (a && k !== except && !a.paused) a.pause(); }); }
  function tick(now) {
    raf = 0; const a = el(si);
    if (now - lastUpd > 120) v *= 0.6;                                  // no recent scrolling: decay to a stop
    if (!on || !unlocked || !a || !(v > MINV)) { if (a && !a.paused) a.pause(); }
    else {
      const diff = t - a.currentTime;                                    // >0: the picture is ahead of the sound
      if (Math.abs(diff) > SEEK) { try { a.currentTime = Math.max(0, Math.min(t, dur(si) - 0.05)); } catch (e) {} }
      else if (diff < -AHEAD) { if (!a.paused) a.pause(); }              // sound got ahead of the picture: wait for it
      else {
        a.playbackRate = Math.min(RMAX, Math.max(RMIN, 1 + 1.2 * diff));
        if (a.paused && a.currentTime < dur(si) - 0.05) a.play().catch(() => { unlocked = false; api.onState(); });
      }
    }
    if (on && (now - lastUpd < 800 || (a && !a.paused))) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  Object.assign(api, {
    /* called on every scroll update: si = scene index, f01 = position in the scene's frames (0..1) */
    update(s, f01) {
      const now = performance.now();
      if (s !== si) { pauseAll(); si = s; el(s); el(s + 1); t = f01 * dur(s); tPrev = t; tPrevMs = now; v = 0; const a = els[s]; if (a) { try { a.currentTime = Math.max(0, t); } catch (e) {} } kick(); return; }
      t = f01 * dur(s); const dtm = now - tPrevMs;
      if (dtm > 8) { const inst = (t - tPrev) / (dtm / 1000); v = v * 0.6 + inst * 0.4; tPrev = t; tPrevMs = now; lastUpd = now; }
      el(s + 1); kick();
    },
    /* must run inside a click / key press / tap: lets the browser play sound later without a gesture */
    resume() {
      if (!on || unlocked || trying) return; trying = true;
      const a = el(Math.max(si, 0)); if (!a) { trying = false; return; }
      a.muted = true;
      a.play().then(() => { a.pause(); a.muted = false; try { a.currentTime = Math.max(0, t); } catch (e) {} unlocked = true; trying = false; api.onState(); kick(); })
        .catch(() => { a.muted = false; trying = false; });
    },
    toggle() { on = !on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} if (on) { api.resume(); kick(); } else pauseAll(); api.onState(); return on; },
    stop() { pauseAll(); },
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseAll(); });
  el(0); el(1);
  return api;
}
