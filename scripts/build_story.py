#!/usr/bin/env python3
"""Build data/story/lion_and_hare.story.json: scene configuration + verbatim Persian beats.

Every beat is cut out of the Ganjoor text of shirogav/sh22 (data/kelile_monshi.json) by start/end phrase.
The script FAILS if a phrase is not found, so no wording can be invented or altered. Beats are excerpts;
`starts_mid` / `ends_mid` say whether the excerpt begins/ends inside a sentence (the page shows an ellipsis).
Only the Persian is shown as story text: no reviewed English translation or summary exists for sh22
(data/summaries_en.json holds drafts only), so none is used.
Scroll lengths (vh), holds and beat windows live here and are the knobs for pacing.
Run:  python3 scripts/build_story.py
"""
import json, re, sys
src = json.load(open("data/kelile_monshi.json"))
ch = [c for c in src["chapters"] if c["slug"] == "shirogav"][0]
sec = ch["sections"][21]          # sh22, Ganjoor id 45114
assert sec["id"] == 45114
lines = [v["text"] for v in sec["verses"]]
ZW = "‌‍"
def norm_map(s):
    out, idx = [], []
    for i, c in enumerate(s):
        if c in ZW: continue
        out.append(c); idx.append(i)
    return "".join(out), idx
def cut(line_no, start, end):
    """line_no is 1-based. start/end are phrases (end inclusive), compared without ZWNJ."""
    t = lines[line_no-1]; n, idx = norm_map(t)
    ns = norm_map(start)[0]; ne = norm_map(end)[0]
    i = n.find(ns); assert i >= 0, ("start not found", line_no, start)
    j = n.find(ne, i); assert j >= 0, ("end not found", line_no, end)
    a, b = idx[i], idx[j+len(ne)-1]+1
    text = t[a:b].strip()
    assert text in t
    return dict(line=line_no, text=text,
                starts_mid=bool(t[:a].strip()), ends_mid=bool(t[b:].strip()))
B = lambda *a: cut(*a)
scenes = [
 dict(id="s1", n=1, frames=dict(dir="/assets/story/frames/s1", count=61, w=960, h=720), still="/assets/story/s1-still.jpg", bg="#FAF1E4",
      scrollVh=160, hold=dict(start=0.06, end=0.08),
      alt=dict(en="Illustration: deer, a goat, a boar, a wolf and a hare stand close together in a flowering meadow by a stream, all looking toward a lion seated on the far bank.",
               fa="تصویر: آهو، بز، گراز، گرگ و خرگوش در مرغزاری پرگل کنار جویی کنار هم ایستاده‌اند و همه به شیری می‌نگرند که آن سوی جوی نشسته است."),
      beats=[B(1,"آورده‌اند که در مرغزاری","معطر کرده بود"), B(6,"وحوش بسیار بود","منغص بود.")]),
 dict(id="s2", n=2, frames=dict(dir="/assets/story/frames/s2", count=42, w=1024, h=576), still="/assets/story/s2-still.jpg", bg="#F2EADF",
      scrollVh=150, hold=dict(start=0.06, end=0.08),
      alt=dict(en="Illustration: the foremost deer steps toward the seated lion and raises its head to him while the other animals wait behind it; the lion inclines his head.",
               fa="تصویر: آهوی پیشین گامی به سوی شیر نشسته برمی‌دارد و سر به سوی او بالا می‌برد، و دیگر جانوران پشت او می‌ایستند؛ شیر سر خود را اندکی خم می‌کند."),
      beats=[B(6,"روزی فراهم آمدند","نزدیک شیر رفتند"), B(6,"اگر تعرض خویش","مدتی بران برآمد.")]),
 dict(id="s3", n=3, frames=dict(dir="/assets/story/frames/s3", count=41, w=1024, h=576), still="/assets/story/s3-still.jpg", bg="#F2EADF",
      scrollVh=170, hold=dict(start=0.06, end=0.08),
      alt=dict(en="Illustration: a hare waits beside flowers in the foreground while, far off across the hills, the lion moves restlessly.",
               fa="تصویر: خرگوشی در پیش‌زمینه کنار گل‌ها می‌ایستد و در دوردست، آن سوی تپه‌ها، شیر بی‌قرار گام برمی‌دارد."),
      beats=[B(6,"او ساعتی توقف کرد","روی بسوی شیر نهاد."), B(6,"شیر را دل تنگ یافت","پدید آمده")]),
 dict(id="s4", n=4, frames=dict(dir="/assets/story/frames/s4", count=41, w=1024, h=576), still="/assets/story/s4-still.jpg", bg="#F2EADF",
      scrollVh=200, hold=dict(start=0.05, end=0.07),
      alt=dict(en="Illustration: the lion, teeth slightly bared, stands over the small hare, who looks up at him calmly and then turns its head.",
               fa="تصویر: شیر با دندان‌هایی اندکی آشکار بر فراز خرگوش کوچک ایستاده است؛ خرگوش آرام به او می‌نگرد و سپس سر می‌گرداند."),
      beats=[B(7,"خرگوش را بدید","حال وحوش چیست؟"), B(7,"گفت: در صحبت من","التفات ننمود و جفاها راند"), B(7,"و گفت: «این شکارگاه","او را بمن نمای.")]),
 dict(id="s5", n=5, frames=dict(dir="/assets/story/frames/s5", count=42, w=1024, h=576), still="/assets/story/s5-still.jpg", bg="#F2EADF",
      scrollVh=200, hold=dict(start=0.05, end=0.07),
      alt=dict(en="Illustration: the lion holds the hare against his chest and leans over the rim of a stone well; ",
               fa="تصویر: شیر در حالی که خرگوشی را به سینه گرفته، بر لبهٔ چاهی سنگی خم شده و به آب تیره می‌نگرد که بازتاب‌هایی در آن پدیدار می‌شود؛ خرگوشی دیگر در سمت چپ کنار لبهٔ چاه ایستاده است."),
      beats=[B(8,"خرگوش پیش ایستاد","بر شمردی."), B(9,"و گفت: در این چاهست","او را نمایم."), B(9,"شیر او را در برگرفت","خرگوش بدید")]),
 dict(id="s6", n=6, frames=dict(dir="/assets/story/frames/s6", count=39, w=1024, h=576), still="/assets/story/s6-still.jpg", bg="#F2EADF",
      scrollVh=130, hold=dict(start=0.05, end=0.08),
      alt=dict(en="Illustration: the lion throws himself headfirst into the well; water splashes at the rim and the hare stands beside the well.",
               fa="تصویر: شیر خود را سرازیر به چاه می‌افکند؛ آب بر لبهٔ چاه می‌پاشد و خرگوش کنار چاه ایستاده است."),
      beats=[B(9,"او را بگذاشت","جان مردار بمالک سپرد.")]),
 dict(id="s7", n=7, frames=dict(dir="/assets/story/frames/s7", count=39, w=1024, h=576), still="/assets/story/s7-still.jpg", bg="#F2EADF",
      scrollVh=170, hold=dict(start=0.05, end=0.12),
      alt=dict(en="Illustration: the meadow again, now with no lion; a deer drinks from the stream, a goat grazes, a boar walks through the grass and the hare sits among the animals.",
               fa="تصویر: مرغزار، این بار بی‌شیر؛ آهویی از جوی آب می‌نوشد، بزی می‌چرد، گرازی در میان علف‌ها گام برمی‌دارد و خرگوش در میان جانوران نشسته است."),
      beats=[B(10,"خرگوش بسلامت باز رفت","خاک خورد شد."), B(10,"همه بر مرکب","جولانی نمودند")]),
]
# even beat windows inside each scene (local scroll progress 0..1); override by hand if needed
for s in scenes:
    k = len(s["beats"]); lo, hi, gap = 0.05, 0.97, 0.03
    w = (hi-lo-gap*(k-1))/k
    for i, b in enumerate(s["beats"]):
        b["a"] = round(lo+i*(w+gap), 3); b["b"] = round(lo+i*(w+gap)+w, 3)
full = []
for i, v in enumerate(sec["verses"], 1):
    t = v["text"].strip()
    if t.startswith("[") and "در منبع" in t:      # placeholder lines (the closing couplet is missing in our source)
        continue
    full.append(dict(line=i, pos=v["pos"], text=t))
out = dict(
  work="lion-and-hare", chapter="shirogav", section="sh22", ganjoor_id=45114,
  reader="/read#shirogav/sh22",
  source=dict(en="Nasrollah Monshi, Kelileh o Demneh, text from Ganjoor (ganjoor.net/monshi/kelile-demni).",
              fa="نصرالله منشی، کلیله و دمنه؛ متن از گنجور (ganjoor.net/monshi/kelile-demni)."),
  closing_couplet_missing=True,
  audio=dict(segments=[dict(scene=f's{k}', src=f'/assets/story/audio/s{k}.m4a', volume=0.8) for k in range(1,8)]),
  aspect_stage=[16,9],
  fade=0.05, scenes=scenes, full_passage=full)
json.dump(out, open("data/story/lion_and_hare.story.json","w"), ensure_ascii=False, indent=1)
tot = sum(s["scrollVh"] for s in scenes)
print("scenes", len(scenes), "total scroll", tot, "vh;", sum(len(s["beats"]) for s in scenes), "beats")
for s in scenes:
    for b in s["beats"]: print(s["id"], b["line"], ("…" if b["starts_mid"] else "")+b["text"][:60]+("…" if b["ends_mid"] else ""))
