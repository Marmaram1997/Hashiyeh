/* Glue for the scroll-driven story on the landing page.
   Data: /data/story/lion_and_hare.story.json (scene config + verbatim Persian beats; see scripts/build_story.py)
   Rendering: story-render.js   Scroll logic: story-scroll.js   Text/panel: story-text.js   Audio: story-audio.js
   Modes: scrub (sticky stage, frames follow scroll) | static (no JS, reduced motion, or frames failed): the plain reading sequence. */
import { FrameStore, Painter } from "./story-render.js";
import { Timeline, clamp } from "./story-scroll.js";
import { Beats, Panel } from "./story-text.js";
import { createAudio } from "./story-audio.js";
const H = window.H, $ = (id) => document.getElementById(id);
const sec = $("story"); if (!sec) throw new Error("no story section");
const rm = matchMedia("(prefers-reduced-motion: reduce)");
let data = null, tl, store, painter, beats, panel, audio, on = false, raf = 0, cur = { si: -1 }, lastY = -1;
const stage = $("sstage"), fig = $("sfig"), cv = $("scv"), still = $("sstill"), cue = $("scue"), link = $("sreadlink"), ticks = $("sticks"), dlg = $("spanel");
const debug = /storydebug/.test(location.search);

function label() {
  if (!data) return;
  const k = cur.si >= 0 ? cur.si : 0, sc = data.scenes[k], alt = (sc.alt[H.lang] || sc.alt.en);
  fig.setAttribute("aria-label", alt);
  document.querySelectorAll(".sseq img").forEach((im) => { im.alt = (H.lang === "fa" && im.dataset.altFa) || im.dataset.altEn || im.alt; });
}
function enable() {
  if (on || !data) return; on = true;
  sec.classList.add("story--scrub");
  document.querySelectorAll(".sseq img").forEach((im) => { if (im.getAttribute("src")) { im.dataset.src = im.getAttribute("src"); im.removeAttribute("src"); } });
  tl = new Timeline(data.scenes);
  store = new FrameStore(data.scenes);
  store.onChange = () => schedule(true);
  store.onFail = () => { disable(); };
  painter = new Painter(cv, store);
  beats = new Beats($("sbeats"), data);
  ticks.textContent = ""; data.scenes.forEach((s) => { const li = document.createElement("li"); ticks.append(li); });
  layout(); cur = { si: -1 }; lastY = -1; schedule(true);
}
function disable() {
  if (!on) return; on = false;
  sec.classList.remove("story--scrub"); sec.style.height = "";
  cv.hidden = true; if (audio) audio.stop();
  document.querySelectorAll(".sseq img").forEach((im) => { if (im.dataset.src) im.setAttribute("src", im.dataset.src); });
  if (store) { store.failed = true; store.release = () => {}; }
}
function layout() {
  if (!on) return;
  tl.layout(stage.clientHeight || innerHeight);
  sec.style.height = tl.sectionH + "px";
  cur.si = -1; painter.key = null; schedule(true);
}
function schedule(force) { if (force) lastY = -1; if (!raf) raf = requestAnimationFrame(update); }
function nearView() { return sec.getBoundingClientRect().top < innerHeight * 1.6; }
function update() {
  raf = 0; if (!on) return;
  const r = sec.getBoundingClientRect(), y = clamp(-r.top, 0, tl.total);
  if (!store.started) { if (!nearView()) return; store.started = true; }
  const st = tl.at(y);
  if (st.si !== cur.si) sceneChange(st.si);
  store.setActive(st.si, st.frame);
  const ok = painter.draw(st.si, st.frame);
  cv.hidden = !ok;
  still.hidden = ok;
  beats.update(st.si, st.u);
  cue.style.opacity = String(1 - clamp(y / (tl.stageH * 0.2), 0, 1));
  link.classList.toggle("on", st.si === data.scenes.length - 1 && st.u >= 0.9);
  if (audio) audio.scene(st.si, st.u);
  cur.u = st.u; cur.frame = st.frame; cur.y = y; lastY = y;
}
function sceneChange(si) {
  cur.si = si; const sc = data.scenes[si]; label();
  sec.style.setProperty("--story-bg", sc.bg || "#F2EADF");
  const b = fig.getBoundingClientRect(); painter.fit(si, b.width, b.height);
  still.src = sc.still;
  [...ticks.children].forEach((li, k) => li.setAttribute("aria-current", String(k === si)));
}
addEventListener("scroll", () => { if (on) schedule(); }, { passive: true });
if ("ResizeObserver" in window) new ResizeObserver(() => { if (on) layout(); }).observe(stage); else addEventListener("resize", () => layout());
addEventListener("load", () => schedule());
function mode() { if (rm.matches) disable(); else enable(); }
(rm.addEventListener ? rm.addEventListener("change", mode) : rm.addListener(mode));
H.on(label);

/* leaving the story silences it; coming back restarts the current scene's sound once */
if ("IntersectionObserver" in window) new IntersectionObserver((es) => { if (!audio || !audio.enabled) return; if (es[0].isIntersecting) audio.scene(Math.max(0, cur.si), cur.u || 0, true); else audio.stop(); }).observe(sec);
/* ---- panel, skip, sound ---- */
$("sfull").addEventListener("click", (e) => panel.open(Math.max(0, cur.si), e.currentTarget));
$("spclose").addEventListener("click", () => dlg.close());
const sbtn = $("ssound");
function soundLabel() { sbtn.textContent = H.t(audio && audio.enabled ? "soundOn" : "soundOff"); sbtn.setAttribute("aria-pressed", String(!!(audio && audio.enabled))); }
H.on(soundLabel);

fetch(sec.parentElement.dataset.story || "/data/story/lion_and_hare.story.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
  const patch = window.__storyPatch; if (patch) d = Object.assign(d, patch(d) || {});
  data = d;
  panel = new Panel(dlg, data);
  audio = createAudio(data.audio, data.scenes.map((s) => s.id));
  if (audio) { sbtn.hidden = false; sbtn.addEventListener("click", () => { audio.toggle(); soundLabel(); }); soundLabel(); }
  if (debug) window.__story = { state: () => Object.assign({}, cur, { on, total: tl && tl.total, sectionH: tl && tl.sectionH }), stats: () => store.stats(), store: () => store, timeline: () => tl, audio: () => audio, scrub: () => on };
  label(); if (!rm.matches) enable();
}).catch(() => { /* stay static */ });
