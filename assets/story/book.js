/* Book-style story page: one page per scene. Each page = the scene's video (with its own sound) + its Persian text.
   Visitor clicks to begin; "Next" turns the paper page (spine on the right, as in a Persian book) and the next scene plays from its first frame.
   Data: the story JSON (scenes[].video / poster / alt / beats, full_passage). Reuses Panel (full-passage dialog) from story-text.js. */
import { Panel } from "./story-text.js";
import { createBeds } from "./book-bed.js?v=1";
const H = window.H, $ = (id) => document.getElementById(id);
const root = $("book"); if (!root) throw new Error("no book");
const rm = matchMedia("(prefers-reduced-motion: reduce)");
const KEY = "hashiyeh-story-sound";
let data, leaves = [], vids = [], cur = 0, busy = false, started = false, sound = true, panel, beds = null;
try { sound = localStorage.getItem(KEY) !== "off"; } catch (e) {}
const stage = $("bbook"), bnext = $("bnext"), bprev = $("bprev"), count = $("bcount"), bsound = $("bsound"), live = $("blive"), link = $("breadlink"), dlg = $("spanel");
const faNum = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

function build() {
  stage.textContent = ""; leaves = []; vids = [];
  data.scenes.forEach((sc, i) => {
    const leaf = el("article", "leaf"); leaf.style.zIndex = String(data.scenes.length - i); leaf.dataset.i = i;
    const face = el("div", "face");
    const fig = el("div", "bfig"); const v = document.createElement("video");
    v.playsInline = true; v.preload = i < 2 ? "auto" : "metadata"; v.poster = sc.poster; v.src = sc.video; v.muted = !sound; v.setAttribute("disablepictureinpicture", ""); v.setAttribute("controlslist", "nodownload noplaybackrate");
    v.tabIndex = -1; v.setAttribute("aria-hidden", "true"); v.width = sc.size.w; v.height = sc.size.h;
    const play = el("button", "bplay"); play.type = "button"; play.dataset.k = i === 0 ? "begin" : "playScene";
    fig.style.width = Math.min(100, (sc.size.w / sc.size.h) / (16 / 9) * 100).toFixed(2) + "%"; fig.style.marginInline = "auto";   // same picture height on every page
    fig.append(v, play);
    fig.setAttribute("role", "group");
    const beats = el("div", "bbeats"); beats.lang = "fa"; beats.dir = "rtl";
    sc.beats.forEach((b) => { const p = el("p", "beat"); if (b.starts_mid) p.append(el("span", "gap", "… ")); p.append(document.createTextNode(b.text)); if (b.ends_mid) p.append(el("span", "gap", " …")); beats.append(p); });
    const shade = el("i", "shade"); shade.setAttribute("aria-hidden", "true");
    face.append(fig, beats, shade);
    const back = el("div", "back"); back.setAttribute("aria-hidden", "true"); back.append(el("i", "shade"));
    leaf.append(face, back); stage.append(leaf); leaves.push(leaf); vids.push(v);
    v.addEventListener("ended", () => { fig.classList.add("done"); if (i === cur && sound && beds && !document.hidden) beds.start(i, 900); });   // the video is over: its sound carries on as a quiet loop
    v.addEventListener("playing", () => { fig.classList.remove("done", "idle"); if (beds) beds.stop(250); });
    fig.addEventListener("click", (e) => { if (i !== cur) return; if (v.ended) { v.currentTime = 0; v.play().catch(() => {}); } else if (v.paused) play_(i); else v.pause(); });
    play.addEventListener("click", (e) => { e.stopPropagation(); started = true; if (beds) beds.init(); play_(i, true); });
  });
  texts();
  leaves.forEach((l, i) => { if (i !== cur) l.setAttribute("inert", ""); else l.removeAttribute("inert"); });
  syncUI(); labels();
}
function play_(i, fromStart) {
  const v = vids[i]; v.muted = !sound; v.volume = 1;
  if (fromStart && !v.ended && v.currentTime < 0.05) { /* already at the first frame */ } else if (fromStart) v.currentTime = 0;
  const p = v.play(); if (p) p.catch(() => { v.closest(".bfig").classList.add("idle"); });
}
function texts() { document.querySelectorAll(".bplay").forEach((b) => { b.textContent = H.t(b.dataset.k); }); }
function syncUI() {
  const n = data.scenes.length, fa = H.lang === "fa", num = (x) => (fa ? faNum(x) : String(x));
  count.textContent = num(cur + 1) + " / " + num(n);
  bprev.disabled = cur === 0; bnext.disabled = cur === n - 1;
  link.classList.toggle("on", cur === n - 1);
  vids.forEach((v, i) => { const fig = v.closest(".bfig"); fig.classList.toggle("first", i === 0 && !started && i === cur); });
  const sc = data.scenes[cur]; live.textContent = H.t("pageOf").replace("{n}", num(cur + 1)).replace("{t}", num(n)) + ". " + (sc.alt[H.lang] || sc.alt.en);
  bsound.textContent = H.t(sound ? "soundOn" : "soundOff"); bsound.setAttribute("aria-pressed", String(sound));
}
function labels() { data.scenes.forEach((sc, i) => { vids[i].closest(".bfig").setAttribute("aria-label", sc.alt[H.lang] || sc.alt.en); }); }
function shadeAnim(node, ms, peak) { if (node.animate) node.animate([{ opacity: 0 }, { opacity: peak, offset: 0.5 }, { opacity: 0 }], { duration: ms, easing: "ease-in-out" }); }

function go(to) {
  if (busy || to < 0 || to >= data.scenes.length || to === cur) return;
  const from = cur, fwd = to > from, ms = rm.matches ? 0 : 950;
  const turning = fwd ? leaves[from] : leaves[to];                    // forward: the current leaf turns away; back: the previous leaf turns back over
  const nextIdx = to;
  vids[from].pause(); if (beds) { beds.init(); beds.stop(350); }
  busy = true; started = true;
  { const r = stage.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.5) window.scrollTo({ top: scrollY + r.top - 70, behavior: rm.matches ? "auto" : "smooth" }); }   // keep the page in view (phones)
  // unlock the destination video inside this click, then start it when the page is about half turned
  const v = vids[nextIdx]; v.muted = !sound; v.currentTime = 0;
  const unlock = v.play(); if (unlock && unlock.then) unlock.then(() => { v.pause(); v.currentTime = 0; }).catch(() => {});
  cur = nextIdx; leaves.forEach((l, i) => { if (i !== cur) l.setAttribute("inert", ""); else l.removeAttribute("inert"); });
  syncUI();
  const finish = () => {
    if (fwd) turning.classList.add("gone"); busy = false;
    if (rm.matches) { return; }
    play_(cur, true);
  };
  if (!ms) { if (fwd) turning.classList.add("gone"); else turning.classList.remove("gone"); busy = false; return; }   // reduced motion: swap, no autoplay
  if (!fwd) turning.classList.remove("gone");
  const frames = fwd ? [{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }] : [{ transform: "rotateY(180deg)" }, { transform: "rotateY(0deg)" }];
  const a = turning.animate(frames, { duration: ms, easing: "cubic-bezier(.55,.06,.25,1)", fill: "forwards" });
  shadeAnim(turning.querySelector(".face .shade"), ms, 0.22); shadeAnim(turning.querySelector(".back .shade"), ms, 0.22);
  setTimeout(() => { if (!rm.matches) play_(cur, true); }, ms * 0.55);             // the new page is visible under the turning leaf: its scene starts
  a.onfinish = () => { a.cancel(); turning.style.transform = fwd ? "rotateY(180deg)" : ""; if (fwd) turning.classList.add("gone"); busy = false; };
}
bnext.addEventListener("click", () => go(cur + 1));
bprev.addEventListener("click", () => go(cur - 1));
addEventListener("keydown", (e) => {
  if (dlg.open || e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (e.key === "ArrowLeft") { e.preventDefault(); go(cur + 1); } else if (e.key === "ArrowRight") { e.preventDefault(); go(cur - 1); }
});
bsound.addEventListener("click", () => { sound = !sound; try { localStorage.setItem(KEY, sound ? "on" : "off"); } catch (e) {} vids.forEach((v) => { v.muted = !sound; }); if (beds) { if (!sound) beds.stop(200); else { beds.init(); if (vids[cur].ended) beds.start(cur, 600); } } syncUI(); });
$("sfull").addEventListener("click", (e) => panel.open(cur, e.currentTarget));
$("spclose").addEventListener("click", () => dlg.close());
document.addEventListener("visibilitychange", () => { if (document.hidden) { vids.forEach((v) => v.pause()); if (beds) beds.stop(150); } else if (beds && sound && vids[cur] && vids[cur].ended && started) beds.start(cur, 900); });
// leaving the page area pauses the sound; coming back leaves it paused (the visitor taps the picture to continue)
if ("IntersectionObserver" in window) new IntersectionObserver((es) => { if (!es[0].isIntersecting) { vids.forEach((v) => v.pause()); if (beds) beds.stop(300); } else if (beds && sound && started && vids[cur] && vids[cur].ended) beds.start(cur, 900); }, { threshold: 0.05 }).observe(stage);
H.on(() => { if (data) { texts(); syncUI(); labels(); } });

fetch(root.dataset.story, { cache: "no-cache" }).then((r) => r.json()).then((d) => {
  data = d; beds = createBeds(data.scenes.map((x) => x.bed)); panel = new Panel(dlg, data); root.classList.add("book--on"); build();
  if (new URLSearchParams(location.search).has("storydebug")) window.__book = { go, state: () => ({ cur, busy, started, sound, paused: vids.map((v) => v.paused), t: vids.map((v) => +v.currentTime.toFixed(2)), muted: vids.map((v) => v.muted) }) };
}).catch(() => { /* stays as the static reading sequence */ });
