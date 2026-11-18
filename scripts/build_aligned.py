import json,re
fa=json.load(open('data/kelile_monshi.json'))['chapters'][4]['sections']
import sys; sys.path.insert(0,'scripts')
import ocr_correct
EN_FINAL,EN_RAW,EN_LINES,CHANGES=ocr_correct.main()[:4]   # also writes data/ocr_corrections/*
def fa_text(idxs):
    return [{"title":fa[i-1]['title'],"url":fa[i-1]['url'],"text":'\n'.join(v['text'] for v in fa[i-1]['verses'])} for i in idxs]
tales=[
 dict(id="ape_carpenter",fa_title="بوزنه و درودگر",en_title="The Ape and the Carpenter",teller="Kalilah → Dimnah",parent=None,fa=[3]),
 dict(id="crow_serpent",fa_title="زاغ و مار",en_title="The Raven and the Serpent",teller="Kalilah → Dimnah",parent=None,fa=[19,20]),
 dict(id="heron_crab",fa_title="ماهی‌خوار و پنج‌پایک",en_title="The Heron and the Crab",teller="Jackal → Raven",parent="crow_serpent",fa=[20]),
 dict(id="lion_hare",fa_title="شیر و خرگوش",en_title="The Lion and the Hare",teller="Kalilah → Dimnah",parent=None,fa=[22]),
 dict(id="three_fishes",fa_title="سه ماهی",en_title="The Three Fishes",teller="Dimnah → Lion",parent=None,fa=[24]),
 dict(id="camel",fa_title="گرگ و زاغ و شغال (و اشتر)",en_title="The Wolf, the Crow, the Jackal and the Camel",teller="Ox → Dimnah",parent=None,fa=[32]),
 dict(id="sandpiper",fa_title="طیطوی و دریا",en_title="The Sandpiper and the Sea",teller="Dimnah → Ox",parent=None,fa=[34,36]),
 dict(id="tortoise_geese",fa_title="باخه و دو بط",en_title="The Tortoise and the Geese",teller="Hen-bird → Cock-bird",parent="sandpiper",fa=[35]),
 dict(id="apes_glowworm",fa_title="بوزینگان و کرم شب‌تاب",en_title="The Apes and the Glow-worm",teller="Kalilah → Dimnah",parent=None,fa=[38]),
 dict(id="two_partners",fa_title="دو شریک",en_title="The Rogue and the Simpleton",teller="Kalilah → Dimnah",parent=None,fa=[39,41]),
 dict(id="frog_snake",fa_title="غوک و مار",en_title=None,teller="Rogue → Simpleton (Persian only)",parent="two_partners",fa=[40]),
 dict(id="iron_merchant",fa_title="بازرگان آهن‌فروش",en_title="The Mice that Ate Iron",teller="Kalilah → Dimnah",parent=None,fa=[43]),
]
out=[]
for t in tales:
    f=t.pop('fa')
    t['fa_sections']=fa_text(f)
    k=t['id']
    t['en_text']=EN_FINAL.get(k)
    t['en_text_raw_ocr']=EN_RAW.get(k)
    t['en_source_lines']=EN_LINES.get(k)
    t['en_changes']=(sum(1 for c in CHANGES if c['tale']==k) if k in EN_FINAL and not t['parent'] else None)
    t['en_status']='model-corrected under logged rules; not yet human-reviewed' if k in EN_FINAL else None
    t['fa_words']=sum(len(s['text'].split()) for s in t['fa_sections'])
    t['en_words']=len(t['en_text'].split()) if t['en_text'] else 0
    out.append(t)
meta={"chapter_fa":"باب الاسد و الثور (نصرالله منشی، ganjoor.net)","chapter_en":"The Story of the Lion and the Ox — I.G.N. Keith-Falconer, Kalilah and Dimnah (Cambridge 1885), from the later Syriac; archive.org/details/kalilahdimnahorf00bdpkuoft","note":"fa_sections are whole Ganjoor sections that contain the tale (may include frame dialogue). en_text is the archive.org OCR after logged post-correction (scripts/ocr_clean.py, scripts/ocr_correct.py; every change in data/ocr_corrections/). en_text_raw_ocr is the untouched OCR for the same lines. Corrections are model-applied and not yet human-reviewed. Nested tales carry the changes of their parent."}
json.dump({"meta":meta,"tales":out},open('data/lion_ox_aligned.json','w'),ensure_ascii=False,indent=1)
for t in out: print(f"{t['id']:15} fa={t['fa_words']:5} en={t['en_words']:5}  parent={t['parent']}")
for t in out: print(t['id'],'|',(t['en_text'] or '')[:95])
