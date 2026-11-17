import json,re
fa=json.load(open('data/kelile_monshi.json'))['chapters'][4]['sections']
kf=open('data/keith_falconer_1885_ocr.txt',encoding='utf-8').read().split('\n')
def clean_en(a,b):
    out=[]
    for ln in kf[a-1:b]:
        if re.search(r'BOOK\s+OF\s+KAL|STORY\s+OF\s+THE\s+LION',ln): continue
        ln=re.sub(r'^\s*\d{1,2}\s+','',ln)          # leading line numbers
        ln=re.sub(r'\s+\d{1,2}\s*$','',ln)          # trailing line numbers
        ln=re.sub(r'\(\d{1,3}\)','',ln)             # note refs
        out.append(ln.strip())
    t=' '.join(out)
    t=re.sub(r'(\w)-\s+(\w)',r'\1\2',t)             # de-hyphenate
    t=re.sub(r'\s{2,}',' ',t)
    for x,y in {'tAvo':'two','Avickedness':'wickedness','Ave ':'we ','bu-d':'bird','bu\'d':'bird','wliat':'what','tlie':'the','liis':'his','ami ':'and ','theu\'':'their','froin':'from','men severe':'more severe'}.items(): t=t.replace(x,y)
    return t.strip()
def fa_text(idxs):
    return [{"title":fa[i-1]['title'],"url":fa[i-1]['url'],"text":'\n'.join(v['text'] for v in fa[i-1]['verses'])} for i in idxs]
tales=[
 dict(id="ape_carpenter",fa_title="بوزنه و درودگر",en_title="The Ape and the Carpenter",teller="Kalilah → Dimnah",parent=None,fa=[3],en=(4096,4121)),
 dict(id="crow_serpent",fa_title="زاغ و مار",en_title="The Raven and the Serpent",teller="Kalilah → Dimnah",parent=None,fa=[19,20],en=(5061,5201)),
 dict(id="heron_crab",fa_title="ماهی‌خوار و پنج‌پایک",en_title="The Heron and the Crab",teller="Jackal → Raven",parent="crow_serpent",fa=[20],en=(5091,5166)),
 dict(id="lion_hare",fa_title="شیر و خرگوش",en_title="The Lion and the Hare",teller="Kalilah → Dimnah",parent=None,fa=[22],en=(5238,5281)),
 dict(id="three_fishes",fa_title="سه ماهی",en_title="The Three Fishes",teller="Dimnah → Lion",parent=None,fa=[24],en=(5436,5473)),
 dict(id="camel",fa_title="گرگ و زاغ و شغال (و اشتر)",en_title="The Wolf, the Crow, the Jackal and the Camel",teller="Ox → Dimnah",parent=None,fa=[32],en=(6042,6198)),
 dict(id="sandpiper",fa_title="طیطوی و دریا",en_title="The Sandpiper and the Sea",teller="Dimnah → Ox",parent=None,fa=[34,36],en=(6248,6365)),
 dict(id="tortoise_geese",fa_title="باخه و دو بط",en_title="The Tortoise and the Geese",teller="Hen-bird → Cock-bird",parent="sandpiper",fa=[35],en=(6282,6316)),
 dict(id="apes_glowworm",fa_title="بوزینگان و کرم شب‌تاب",en_title="The Apes and the Glow-worm",teller="Kalilah → Dimnah",parent=None,fa=[38],en=(6625,6650)),
 dict(id="two_partners",fa_title="دو شریک",en_title="The Rogue and the Simpleton",teller="Kalilah → Dimnah",parent=None,fa=[39,41],en=(6661,6745)),
 dict(id="frog_snake",fa_title="غوک و مار",en_title=None,teller="Rogue → Simpleton (Persian only)",parent="two_partners",fa=[40],en=None),
 dict(id="iron_merchant",fa_title="بازرگان آهن‌فروش",en_title="The Mice that Ate Iron",teller="Kalilah → Dimnah",parent=None,fa=[43],en=(6800,6845)),
]
out=[]
for t in tales:
    e=t.pop('en'); f=t.pop('fa')
    t['fa_sections']=fa_text(f)
    t['en_text']=clean_en(*e) if e else None
    t['en_source_lines']=list(e) if e else None
    t['fa_words']=sum(len(s['text'].split()) for s in t['fa_sections'])
    t['en_words']=len(t['en_text'].split()) if e else 0
    out.append(t)
meta={"chapter_fa":"باب الاسد و الثور (نصرالله منشی، ganjoor.net)","chapter_en":"The Story of the Lion and the Ox — I.G.N. Keith-Falconer, Kalilah and Dimnah (Cambridge 1885), from the later Syriac; archive.org/details/kalilahdimnahorf00bdpkuoft","note":"fa_sections are whole Ganjoor sections that contain the tale (may include frame dialogue). en spans are line ranges in the archive.org OCR, lightly cleaned."}
json.dump({"meta":meta,"tales":out},open('data/lion_ox_aligned.json','w'),ensure_ascii=False,indent=1)
for t in out: print(f"{t['id']:15} fa={t['fa_words']:5} en={t['en_words']:5}  parent={t['parent']}")
print(out[3]['en_text'][:500])
