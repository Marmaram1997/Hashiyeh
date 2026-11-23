/* The Lion and the Hare: scroll-driven scene.
   Three concerns, kept apart:
     content  -> /data/scenes/lion_and_hare.content.json   (interface text)
     passage  -> /data/scenes/lion_and_hare.passage.json   (verbatim Monshi, built by scripts/build_scene.py)
     visuals  -> /data/scenes/lion_and_hare.config.json    (normalized crops, water ellipse, timeline)
   This file only turns scroll position into a camera and handles ripples and the panel. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var NS = "http://www.w3.org/2000/svg";
  var CFG, CONTENT, PASSAGE, R;
  var scene = $("scene"), stage = $("stage"), art = $("art"), img = $("img"), svgBox = $("water");
  var rmq = matchMedia("(prefers-reduced-motion: reduce)"), nq;
  var mode = null, narrow = null, curState = "approach", stirIdx = 0;
  var SW = 0, SH = 0, pending = false, waterLayer = null;

  function get(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function lang() { return H.lang; }

  /* ---------- camera ---------- */
  // k = stage pixels per image-width; (cx, cy) = point of the artwork placed at (SW/2, SH*anchorY)
  function shotCam(s) {
    var r = s.rect, rw = r[2] - r[0], rh = (r[3] - r[1]) * R;
    return { k: Math.min(SW / rw, SH / rh) * (s.fit || 1), cx: (r[0] + r[2]) / 2, cy: (r[1] + r[3]) / 2 * R, a: s.anchorY == null ? 0.5 : s.anchorY };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function camAt(p) {
    var T = (narrow ? CFG.timeline.narrow : CFG.timeline.desktop).stops, S = narrow ? CFG.shots.narrow : CFG.shots.desktop, i = 0;
    while (i < T.length - 2 && p > T[i + 1][0]) i++;
    var a = T[i], b = T[i + 1], t = a[1] === b[1] ? 0 : smooth((p - a[0]) / (b[0] - a[0]));
    var A = shotCam(S[a[1]]), B = shotCam(S[b[1]]);
    return { k: Math.exp(lerp(Math.log(A.k), Math.log(B.k), t)), cx: lerp(A.cx, B.cx, t), cy: lerp(A.cy, B.cy, t), a: lerp(A.a, B.a, t) };
  }
  function place(c) {
    var x = SW / 2 - c.cx * c.k, y = SH * c.a - c.cy * c.k;
    art.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + (c.k / SW).toFixed(5) + ")";
  }
  function progress() {
    var r = scene.getBoundingClientRect(), span = scene.offsetHeight - stage.clientHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }
  function stateFor(p) { var b = CFG.stateBands; return p >= b.reflectionFrom ? "reflection" : p >= b.rimFrom ? "rim" : "approach"; }
  var lastP = 0;
  function setHint(p) {
    lastP = p; var h = $("capHint"), cue = curState === "approach" && p < 0.06 && mode === "scroll";
    var t = curState === "approach" ? (cue ? H.t("scroll") : "") : H.t("lookWater");
    if (h.textContent !== t) h.textContent = t;
    h.classList.toggle("cue", cue);
  }
  function setState(id, force) {
    if (id === curState && !force) return;
    var changed = id !== curState; curState = id; stage.dataset.state = id;
    $("capState").textContent = H.t("s_" + id);
    setHint(lastP);
    if (changed) $("live").textContent = H.t("s_" + id);
  }
  function frame() {
    pending = false;
    if (mode !== "scroll") return;
    var p = progress();
    place(camAt(p));
    setState(stateFor(p));
    stage.dataset.live = String(p >= CFG.stateBands.waterLiveFrom);
    setHint(p);
  }
  function queue() { if (!pending) { pending = true; requestAnimationFrame(frame); } }

  /* ---------- water layer (ripples) ---------- */
  function makeWater(svg, viewBox) {
    svg.setAttribute("viewBox", viewBox.join(" ")); svg.setAttribute("preserveAspectRatio", "none");
    svg.textContent = "";
    var w = CFG.water, cy = w.cy * R, ratio = (w.ry * R) / w.rx;
    var id = "wc" + Math.random().toString(36).slice(2, 7);
    var defs = document.createElementNS(NS, "defs"), cp = document.createElementNS(NS, "clipPath"), ce = document.createElementNS(NS, "ellipse");
    cp.id = id; ce.setAttribute("cx", w.cx); ce.setAttribute("cy", cy); ce.setAttribute("rx", w.rx * w.inset);     ce.setAttribute("ry", w.ry * R * w.inset);
    cp.appendChild(ce); defs.appendChild(cp); svg.appendChild(defs);
    var g = document.createElementNS(NS, "g"); g.setAttribute("clip-path", "url(#" + id + ")"); svg.appendChild(g);
    var hit = document.createElementNS(NS, "ellipse"); hit.setAttribute("class", "hit");
    hit.setAttribute("cx", w.cx); hit.setAttribute("cy", cy); hit.setAttribute("rx", w.rx * w.inset); hit.setAttribute("ry", w.ry * R * w.inset);
    svg.appendChild(hit);
    var rings = [], raf = 0;
    function tick(now) {
      raf = 0;
      rings = rings.filter(function (r) {
        var t = (now - r.t0) / CFG.ripples.durationMs;
        if (t >= 1) { r.el.remove(); return false; }
        if (t < 0) { r.el.setAttribute("opacity", 0); return true; }
        var e = 1 - Math.pow(1 - t, 2), rad = CFG.ripples.maxRadius * (0.12 + 0.88 * e);
        if (r.still) rad = CFG.ripples.maxRadius * 0.5;
        r.el.setAttribute("rx", rad); r.el.setAttribute("ry", rad * ratio);
        r.el.setAttribute("opacity", (CFG.ripples.peakOpacity * Math.pow(1 - t, 1.6)).toFixed(3));
        return true;
      });
      if (rings.length) raf = requestAnimationFrame(tick);
    }
    function ring(x, y, delay, still) {
      var el = document.createElementNS(NS, "ellipse");
      el.setAttribute("class", "ring"); el.setAttribute("cx", x); el.setAttribute("cy", y * R);
      el.setAttribute("stroke-width", CFG.ripples.strokePx); el.setAttribute("opacity", 0); el.setAttribute("rx", 0.001); el.setAttribute("ry", 0.0004);
      g.appendChild(el); rings.push({ el: el, t0: performance.now() + delay, still: still });
      while (rings.length > CFG.ripples.maxRings) rings.shift().el.remove();
    }
    function inside(x, y) { var dx = (x - w.cx) / (w.rx * w.inset), dy = (y - w.cy) / (w.ry * w.inset); return dx * dx + dy * dy <= 1; }
    function ripple(x, y) {
      if (!inside(x, y)) return;
      var still = rmq.matches;
      ring(x, y, 0, still); if (!still) ring(x, y, 220, false);
      if (!raf) raf = requestAnimationFrame(tick);
    }
    hit.addEventListener("click", function (e) {
      var m = svg.getScreenCTM(); if (!m) return;
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var q = pt.matrixTransform(m.inverse());
      ripple(q.x, q.y / R);
    });
    return { ripple: ripple };
  }

  /* ---------- modes ---------- */
  function sizeStage() { SW = stage.clientWidth; SH = stage.clientHeight; art.style.width = SW + "px"; art.style.height = SW * R + "px"; }
  function buildScroll() {
    document.documentElement.classList.remove("static");
    $("shots").hidden = true; $("shots").textContent = "";
    var extra = (narrow ? CFG.timeline.narrow : CFG.timeline.desktop).scrollVh;
    scene.style.setProperty("--extra", extra + "vh");
    waterLayer = makeWater(svgBox, [0, 0, 1, R]);
    sizeStage(); frame();
  }
  function buildStatic() {
    document.documentElement.classList.add("static");
    scene.style.removeProperty("--extra");
    var S = narrow ? CFG.shots.narrow : CFG.shots.desktop, box = $("shots"), ids = ["approach", "rim", "reflection"];
    box.textContent = ""; box.hidden = false;
    ids.forEach(function (id, n) {
      var r = S[id].rect, rw = r[2] - r[0], rh = r[3] - r[1];
      var fig = document.createElement("figure"); fig.className = "shot";
      var f = document.createElement("div"); f.className = "fig" + (id === "reflection" ? " live" : "");
      var asp = (rw * CFG.image.width) / (rh * CFG.image.height);
      f.style.aspectRatio = asp + " / 1";
      f.style.width = "min(100%, calc(80svh * " + asp.toFixed(4) + "))"; f.style.marginInline = "auto";
      var im = document.createElement("img"); im.src = CFG.image.src; im.width = CFG.image.width; im.height = CFG.image.height;
      im.alt = n === 0 ? CFG.image.alt[lang()] : ""; im.decoding = "async";
      im.style.width = (100 / rw) + "%"; im.style.left = (-r[0] / rw * 100) + "%"; im.style.top = (-r[1] / rh * 100) + "%";
      f.appendChild(im);
      if (id === "reflection") { var sv = document.createElementNS(NS, "svg"); sv.setAttribute("aria-hidden", "true"); f.appendChild(sv); waterLayer = makeWater(sv, [r[0], r[1] * R, rw, rh * R]); }
      var cap = document.createElement("figcaption"); cap.innerHTML = '<p class="st" data-state="' + id + '"></p>' + (id !== "approach" ? '<p class="hint"></p>' : "");
      fig.appendChild(f); fig.appendChild(cap); box.appendChild(fig);
    });
    labelStatic();
  }
  function labelStatic() {
    document.querySelectorAll("#shots .st").forEach(function (e) { e.textContent = H.t("s_" + e.dataset.state); });
    document.querySelectorAll("#shots .hint").forEach(function (e) { e.textContent = H.t("lookWater"); });
    var first = document.querySelector("#shots img"); if (first) first.alt = CFG.image.alt[lang()];
  }
  function rebuild() {
    var m = rmq.matches ? "static" : "scroll", n = nq.matches;
    if (m === mode && n === narrow) return;
    var y = scrollY; mode = m; narrow = n;
    m === "scroll" ? buildScroll() : buildStatic();
    scrollTo(0, y);
  }

  /* ---------- controls ---------- */
  function stir() {
    var pts = CFG.ripples.keyboardPoints, pt = pts[stirIdx++ % pts.length];
    if (mode === "scroll") {
      var p = progress(), target = CFG.stateBands.waterLiveFrom;
      if (p < target) {
        var span = scene.offsetHeight - stage.clientHeight, y = scene.offsetTop + span * 0.97;
        scrollTo({ top: y, behavior: "smooth" });
        setTimeout(function () { waterLayer.ripple(pt[0], pt[1]); }, 900); return;
      }
    } else {
      var f = document.querySelector("#shots .fig.live"); if (f) f.scrollIntoView({ block: "center" });
    }
    waterLayer.ripple(pt[0], pt[1]);
  }
  var lastFocus = null, savedY = 0;
  function openPanel() {
    var d = $("panel"); if (!d.showModal) return;
    lastFocus = document.activeElement; savedY = scrollY; d.showModal(); $("closeP").focus();
  }
  function renderPanel() {
    $("ptext").innerHTML = PASSAGE.lines.map(function (l) { return "<p>" + H.esc(l.text.trim()) + "</p>"; }).join("");
    $("pnote").textContent = H.t("passageNote");
    $("psrc").textContent = PASSAGE.source + ". Status: " + PASSAGE.status + ".";
  }

  /* ---------- start ---------- */
  Promise.all([get("/data/scenes/lion_and_hare.config.json"), get("/data/scenes/lion_and_hare.content.json"), get("/data/scenes/lion_and_hare.passage.json")]).then(function (d) {
    CFG = d[0]; CONTENT = d[1]; PASSAGE = d[2]; R = CFG.image.height / CFG.image.width; nq = matchMedia(CFG.narrowQuery);
    H.add(CONTENT.i18n);
    document.documentElement.classList.add("smooth"); if (rmq.matches) document.documentElement.classList.remove("smooth");
    H.on(function () {
      setState(curState, true); renderPanel(); labelStatic();
      if (img.dataset.ok) img.alt = CFG.image.alt[lang()];
      if (img.dataset.err) $("missing").textContent = H.t("missing") + " " + CFG.image.src;
    });
    H.init();
    img.addEventListener("load", function () { img.dataset.ok = "1"; img.alt = CFG.image.alt[lang()]; art.classList.add("ready"); art.hidden = false; queue(); });
    img.addEventListener("error", function () { img.dataset.err = "1"; art.hidden = true; $("missing").hidden = false; $("missing").textContent = H.t("missing") + " " + CFG.image.src; });
    art.hidden = false; img.src = CFG.image.src;
    rebuild();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", function () { var w = stage.clientWidth, h = stage.clientHeight; if (mode === "scroll") { sizeStage(); queue(); } rebuild(); });
    rmq.addEventListener ? rmq.addEventListener("change", rebuild) : rmq.addListener(rebuild);
    nq.addEventListener ? nq.addEventListener("change", rebuild) : nq.addListener(rebuild);
    $("stir").addEventListener("click", stir);
    $("read").addEventListener("click", openPanel);
    $("closeP").addEventListener("click", function () { $("panel").close(); });
    $("panel").addEventListener("click", function (e) { if (e.target === $("panel")) $("panel").close(); });
    $("panel").addEventListener("close", function () { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); scrollTo(0, savedY); });
  }).catch(function (e) {
    stage.insertAdjacentHTML("beforeend", '<p class="missing">Could not load the scene data (' + H.esc(e.message) + '). Serve the site with npm run dev.</p>');
  });
})();
