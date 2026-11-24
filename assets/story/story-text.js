/* Full passage in a native <dialog>. Opening/closing never moves the page: scroll position and focus are restored. */
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export class Panel {
  constructor(dlg, data, t) { this.dlg = dlg; this.data = data; this.t = t; this.built = false; this.opener = null; this.y = 0;
    dlg.addEventListener("close", () => this.afterClose());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }
  build() {
    if (this.built) return; this.built = true;
    const body = this.dlg.querySelector(".body"); body.textContent = ""; body.lang = "fa"; body.dir = "rtl";
    const L = this.data.full_passage; let i = 0;
    while (i < L.length) {
      const v = L[i]; let p;
      if (v.pos === 0 && L[i + 1] && L[i + 1].pos === 1) {   // a couplet: two hemistichs
        p = el("p", "v"); p.dataset.line = v.line; const a = el("span", "", v.text), b = el("span", "", L[i + 1].text); b.style.marginInlineStart = "2.2em"; p.append(a, b); i += 2;
      } else { p = el("p", v.pos === -1 ? "" : "v", v.text); p.dataset.line = v.line; i++; }
      body.append(p);
    }
  }
  open(si, opener) {
    this.build(); this.opener = opener || document.activeElement; this.y = window.scrollY;
    const body = this.dlg.querySelector(".body");
    body.querySelectorAll(".cur").forEach((n) => n.classList.remove("cur"));
    const sc = this.data.scenes[si]; let first = null;
    sc.beats.forEach((b) => { const p = body.querySelector('[data-line="' + b.line + '"]'); if (p) { p.classList.add("cur"); first = first || p; } });
    this.dlg.showModal();
    if (first) body.scrollTop = Math.max(0, first.offsetTop - 60);
  }
  afterClose() {
    if (Math.abs(window.scrollY - this.y) > 1) window.scrollTo(0, this.y);
    if (this.opener && this.opener.focus) this.opener.focus({ preventScroll: true });
  }
}
