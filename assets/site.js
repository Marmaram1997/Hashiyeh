/* Shared bilingual layer: language state, header, [data-k] text. */
(function () {
  var C = {
    en: {
      tagline: "Kalila and Dimna, read in the margins",
      nJourney: "The Journey", nTales: "The Tales", nRead: "Read", nMethod: "Method", nAbout: "About",
      cover: "← Cover", coverTitle: "Back to the cover", langLabel: "Language", mainNav: "Main"
    },
    fa: {
      tagline: "کلیله و دمنه، خوانده‌شده در حاشیه",
      nJourney: "سفر کتاب", nTales: "حکایت‌ها", nRead: "خواندن", nMethod: "روش", nAbout: "دربارهٔ پروژه",
      cover: "→ صفحهٔ نخست", coverTitle: "بازگشت به صفحهٔ نخست", langLabel: "زبان", mainNav: "پیمایش اصلی"
    }
  };
  var lang = "en", subs = [];
  try {
    var q = new URLSearchParams(location.search).get("lang"), st = localStorage.getItem("hashiyeh-lang");
    lang = q === "fa" || q === "en" ? q : st === "fa" ? "fa" : "en";
  } catch (e) {}

  var LINKS = [["/journey", "nJourney", "journey"], ["/tales", "nTales", "tales"], ["/method", "nMethod", "method"], ["/about", "nAbout", "about"]];

  var H = (window.H = {
    get lang() { return lang; },
    add: function (d) { for (var l in d) C[l] = Object.assign(C[l] || {}, d[l]); },
    t: function (k) { var v = C[lang] && C[lang][k]; return v != null ? v : C.en[k] != null ? C.en[k] : ""; },
    on: function (f) { subs.push(f); },
    set: function (l) { lang = l; try { localStorage.setItem("hashiyeh-lang", l); } catch (e) {} render(); },
    init: function () { render(); },
    esc: function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  });

  function header() {
    var page = document.body.dataset.page || ""; if (page === "read") page = "tales";
    return '<div class="hdr-left"><a class="back" href="/" title="' + H.t("coverTitle") + '">' + H.t("cover") + "</a>" +
      '<a class="brand" href="/"><b>حاشیه</b><i>Hashiyeh</i></a></div>' +
      '<nav aria-label="' + H.t("mainNav") + '">' +
      LINKS.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === page ? ' aria-current="page"' : "") + ">" + H.t(l[1]) + "</a>"; }).join("") +
      "</nav>" +
      '<div class="langsw" role="group" aria-label="' + H.t("langLabel") + '"><button data-lang="en">EN</button><span aria-hidden="true">/</span><button data-lang="fa">فارسی</button></div>';
  }

  function render() {
    var de = document.documentElement;
    de.lang = lang; de.dir = lang === "fa" ? "rtl" : "ltr";
    var h = document.getElementById("hdr");
    if (h) h.innerHTML = header();
    document.querySelectorAll("[data-k]").forEach(function (e) { var v = H.t(e.dataset.k); if (v) e.textContent = v; });
    document.querySelectorAll("[data-html]").forEach(function (e) { var v = H.t(e.dataset.html); if (v) e.innerHTML = v; });
    document.querySelectorAll("[data-alt]").forEach(function (e) {
      var v = H.t(e.dataset.alt); if (e.tagName === "IMG") e.alt = v; else e.setAttribute("aria-label", v);
    });
    document.querySelectorAll("[data-title]").forEach(function (e) { var v = H.t(e.dataset.title); e.title = v; e.setAttribute("aria-label", v); });
    var t = H.t("title"); if (t) document.title = t + " · Hashiyeh";
    document.querySelectorAll("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    subs.forEach(function (f) { f(); });
  }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lang]"); if (b) H.set(b.dataset.lang); });
})();
