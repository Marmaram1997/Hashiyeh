"""Builds data/scenes/lion_and_hare.passage.json: the two lines of Monshi's text where the hare
leads the lion to the well and the lion looks in (verbatim from data/kelile_monshi.json)."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
book = json.loads((root / "data/kelile_monshi.json").read_text(encoding="utf-8"))
SEC, ORDERS = "shirogav/sh22", [8, 9]
ch = next(c for c in book["chapters"] if c["slug"] == "shirogav")
sec = next(s for s in ch["sections"] if s["url"].rstrip("/").endswith("sh22"))
lines = [{"order": v["order"], "text": v["text"]} for v in sec["verses"] if v["order"] in ORDERS]
assert [l["order"] for l in lines] == ORDERS, "lines not found"
out = {
    "section": SEC, "section_title": sec["title"], "chapter_title": ch["title"],
    "lines": lines,
    "source": "Ganjoor text of Nasrollah Monshi, Kelileh o Demneh (ganjoor.net/monshi/kelile-demni)",
    "ganjoor_url": "https://ganjoor.net" + sec["url"] if sec["url"].startswith("/") else sec["url"],
    "status": "verbatim from the Ganjoor text; not yet compared with a critical edition",
    "why_these_lines": "They narrate the hare leading the lion to the well and the lion looking into it and seeing his image.",
}
(root / "data/scenes/lion_and_hare.passage.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=1)[:900])
