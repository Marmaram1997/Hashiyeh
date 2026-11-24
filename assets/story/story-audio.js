/* Audio, independent of the scroll-scrubbed frames. Off until the visitor switches it on (a user gesture).
   Config (optional, per story): { ambience:[{scene:"s1", src, volume}], cues:[{scene:"s6", at:0.3, src, volume}] }
   - ambience: one loop per scene, cross-faded when the scene changes.
   - cues: fired once on a FORWARD crossing of `at`; re-armed only after the visitor scrolls back before that scene.
   - never scrubbed or reversed; everything fades out when the tab is hidden or the story is left.
   segments: [{scene:"s2", src, volume}] = the clip's own mixed soundtrack for that scene, played once from its start on a forward entry (not synced to scroll speed, never reversed).
   With no audio config createAudio returns null and no control is shown. */
export function createAudio(cfg, sceneIds) {
  if (!cfg || !((cfg.ambience && cfg.ambience.length) || (cfg.cues && cfg.cues.length) || (cfg.segments && cfg.segments.length))) return null;
  const amb = {}, fired = new Set(); let on = false, cur = null, lastU = 0, lastS = 0, ramps = new Map();
  const mk = (src, loop, vol) => { const a = new Audio(src); a.loop = loop; a.preload = "none"; a.volume = 0; a._max = vol == null ? 1 : vol; return a; };
  const ramp = (a, to, ms, done) => { clearInterval(ramps.get(a)); const from = a.volume, t0 = performance.now();
    const id = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = from + (to - from) * k; if (k >= 1) { clearInterval(id); ramps.delete(a); done && done(); } }, 40); ramps.set(a, id); };
  const fadeOutAll = (ms = 400) => Object.values(Object.assign({}, amb, segs)).forEach((a) => { if (!a.paused) ramp(a, 0, ms, () => a.pause()); });
  (cfg.ambience || []).forEach((c) => { amb[c.scene] = mk(c.src, true, c.volume); });
  const segs = {}, segT = {}; (cfg.segments || []).forEach((c) => { segs[c.scene] = mk(c.src, false, c.volume); });
  const cues = (cfg.cues || []).map((c) => Object.assign({ audio: mk(c.src, false, c.volume) }, c));
  const api = {
    get enabled() { return on; },
    toggle() { on = !on; if (on) { Object.keys(segs).forEach((k) => { const a = segs[k]; if (k !== sceneIds[lastS]) { a.volume = 0; a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); } }); api.scene(lastS, lastU, true); } else { fadeOutAll(); } return on; },
    scene(si, u, force) {
      const id = sceneIds[si];
      if (on && (id !== cur || force)) { Object.keys(segs).forEach((k) => { if (k !== id && !segs[k].paused) ramp(segs[k], 0, 350, () => segs[k].pause()); }); if (amb[id] || Object.keys(amb).length) fadeOutAll(600); const a = amb[id]; if (a) { a.play().catch(() => {}); ramp(a, a._max, 600); } }
      if (on && segs[id] && (id !== cur || force) && (force || si > lastS)) {   // a scene's own sound plays once, from its start, on a FORWARD entry only
        const a = segs[id], now = performance.now();
        if (force || !segT[id] || now - segT[id] > 6000) { segT[id] = now; a.currentTime = 0; a.volume = a._max; a.play().catch(() => {}); }
      }
      cur = id;
      cues.forEach((c) => { const ci = sceneIds.indexOf(c.scene);
        if (si < ci) fired.delete(c.scene + c.at);                                   // scrolled back before the scene: re-arm
        else if (si === ci && on && !fired.has(c.scene + c.at) && lastS === si && lastU < c.at && u >= c.at && u - lastU < 0.25) { fired.add(c.scene + c.at); c.audio.currentTime = 0; c.audio.volume = c.audio._max; c.audio.play().catch(() => {}); } });
      lastS = si; lastU = u;
    },
    stop() { fadeOutAll(300); cues.forEach((c) => c.audio.pause()); },
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) api.stop(); else if (on) api.scene(lastS, lastU, true); });
  return api;
}
