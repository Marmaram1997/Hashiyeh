"""Builds the data files used by the Persian-first reader (/read).

    python3 scripts/build_reader_data.py            # (re)builds machine-made files, keeps hand-edited ones
    python3 scripts/build_reader_data.py --force    # also overwrites the hand-edited files (summaries, glossary, translations)

Machine-made, always rebuilt (all marked "verified": false unless built from the hand-aligned tales):
  data/chapters.json         chapter list (Ganjoor titles + draft English names)
  data/tale_tree.json        frame/tale tree per chapter
  data/tellers.json          verified tellers (from data/lion_ox_aligned.json only)
  data/arabic_spans.json     detected Arabic passages, to be checked by hand

Created once, then edited by hand (never overwritten without --force):
  data/glossary.json         hard words, every meaning a draft ("verified": false)
  data/summaries_en.json     English summaries per section + optional translation_en
  data/arabic_translations.json  translations for Arabic spans; starts with the Minovi couplet

Section ids look like "shirogav/sh22" (chapter slug / Ganjoor section slug).
"""
import json, re, sys, os, collections

ROOT = os.path.join(os.path.dirname(__file__), '..')
D = lambda n: os.path.join(ROOT, 'data', n)
FORCE = '--force' in sys.argv
book = json.load(open(D('kelile_monshi.json'), encoding='utf-8'))['chapters']
aligned = json.load(open(D('lion_ox_aligned.json'), encoding='utf-8'))['tales']
ZW = '‌'
norm = lambda t: re.sub(r'[ً-ٰٟ]', '', t.replace(ZW, ' '))
sid = lambda ch, s: ch['slug'] + '/' + s['url'].rstrip('/').split('/')[-1]
def write(name, obj, once=False):
    p = D(name)
    if once and os.path.exists(p) and not FORCE:
        print('kept (hand-edited):', name); return
    json.dump(obj, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('wrote', name)

# ---------------------------------------------------------------- chapters
EN = {
 'mghdme-nasr': "Nasrollah Monshi's preface", 'moghaffa': "Opening of the book, in Ibn al-Muqaffaʿ's order",
 'bozorgmehr': "Beginning of Kalila and Dimna: words of Buzurgmihr", 'borzooye': "Borzuya the physician",
 'shirogav': "The Lion and the Ox", 'demne': "Examining the case of Dimna",
 'kzmba': "The Ringdove, the Mouse, the Crow, the Tortoise and the Gazelle", 'boofozagh': "The Owls and the Crows",
 'boozineobakhe': "The Monkey and the Tortoise", 'zahedorasoo': "The Ascetic and the Weasel", 'gorbeomoosh': "The Cat and the Mouse",
 'paadorpar': "The King and the bird Fanzah", 'shiroshoghal': "The Lion and the Jackal", 'tirandaz': "The Archer and the Lioness",
 'zahedomehman': "The Ascetic and the Guest", 'shahobaraheme': "The King and the Brahmans", 'zargarosayyah': "The Goldsmith and the Traveller",
 'shahzade': "The Prince and his Companions", 'khtmonshi': "The translator's conclusion"}
chapters = [dict(slug=c['slug'], n=i + 1, title_fa=c['title'], title_en=EN[c['slug']],
                 title_en_status='draft: English rendering of the Ganjoor chapter title', sections=len(c['sections']))
            for i, c in enumerate(book)]
write('chapters.json', chapters)

# ---------------------------------------------------------------- tellers (verified only)
VER = {  # tale id: (fa, en), checked against the text (see CLAUDE.md)
 'ape_carpenter': ('کلیله ← دمنه', 'Kalila → Dimna'), 'three_fishes': ('دمنه ← شیر', 'Dimna → Lion'),
 'camel': ('گاو ← دمنه', 'Ox → Dimna'), 'sandpiper': ('دمنه ← گاو', 'Dimna → Ox'),
 'apes_glowworm': ('کلیله ← دمنه', 'Kalila → Dimna'), 'two_partners': ('کلیله ← دمنه', 'Kalila → Dimna'),
 'tortoise_geese': ('طیطوی ماده ← طیطوی نر', 'Hen sandpiper → cock sandpiper')}
tellers = {k: dict(fa=v[0], en=v[1], verified=True, basis='checked against the text (see CLAUDE.md)') for k, v in VER.items()}
write('tellers.json', dict(
    note='Only tellers checked against the text are listed. Every other tale has no entry: the reader shows nothing until it is confirmed.',
    tellers=tellers))

# ---------------------------------------------------------------- tale tree
CUE = re.compile(r'(آورده ?اند که|گویند که|چنین آورده ?اند|حکایت)')
Q = re.compile(r'چگونه (?:بود|بوده|باشد|است)')
trees = []
for c in book:
    nodes = []
    if c['slug'] == 'shirogav':
        order = {sid(c, s): i for i, s in enumerate(c['sections'])}
        for t in sorted(aligned, key=lambda t: order[c['slug'] + '/' + t['fa_sections'][0]['url'].rstrip('/').split('/')[-1]]):
            secs = [c['slug'] + '/' + s['url'].rstrip('/').split('/')[-1] for s in t['fa_sections']]
            nodes.append(dict(id=t['id'], title_fa=t['fa_title'], title_en=t['en_title'] or 'The Frog and the Snake',
                              section=secs[0], sections=secs, parent=t['parent'],
                              teller=t['id'] if t['id'] in tellers else None,
                              source='hand-aligned', verified=False))
    else:
        for s in c['sections']:
            tx = norm(' '.join(v['text'] for v in s['verses']))
            m = CUE.search(tx); title = re.sub(r'^بخش [\d۰-۹]+\s*-?\s*', '', s['title']).strip()
            if m or 'حکایت' in s['title']:
                excerpt = ' '.join(tx[m.start():].split()[:7]) if m else ''
                nodes.append(dict(id=sid(c, s).replace('/', '_'), title_fa=title or None, excerpt_fa=excerpt,
                                  cue=m.group(1) if m else 'section title', question_cue=bool(Q.search(tx)),
                                  section=sid(c, s), parent=None, teller=None, source='detected from text cues',
                                  nesting='unknown (all listed flat)', verified=False))
    trees.append(dict(chapter=c['slug'], hand_aligned=c['slug'] == 'shirogav', nodes=nodes))
write('tale_tree.json', dict(
    note='Lion and Ox: the 12 hand-aligned tales with their nesting. Other chapters: tale starts guessed from text cues ("آورده‌اند که", "گویند که", "حکایت" in the section title); nesting is not detected. Nothing here is verified.',
    chapters=trees))

# ---------------------------------------------------------------- Arabic spans
AR = set('لا لم لن قد فی علی الی عن ان انه انما قال قالت فقال ثم بل هذا هذه ذلک الذی کان کانت لکن اذا ایها لمن فمن لیس ذو ذا فیه بین حتی کیف مع ولا فلا ولم وقد وان فان لانه لان انی انا انت هو هی الله اللهم تعالی سبحانه'.split())
PERS = set('را که است بود بدان بدو نمود ننمود باشد کرد شد می این آن با بر از تا بگوی گفت'.split())
isar = lambda w: (w.startswith('ال') and len(w) > 3) or w[:3] in ('وال', 'بال', 'فال', 'لال', 'کال') or w in AR
WORD = re.compile(r'[ء-يٱ-ۓ]+')
CUEW = re.compile(r'(قرآن|آیت|آیه|تعالی|خدای|ایزد|خبر|حدیث|مصطفی|رسول|النبی|پیغمبر|قال)')
spans = []
for c in book:
    for s in c['sections']:
        for v in s['verses']:
            t = v['text']
            parts = [(m.start(), m.end()) for m in re.finditer(r'[^.،؛:!؟?«»"\n]+', t)] if v['pos'] == -1 else [(0, len(t))]
            for a, b in parts:
                seg = t[a:b]; tk = WORD.findall(seg)
                if len(tk) < (4 if v['pos'] == -1 else 3): continue
                if any(w in PERS for w in tk): continue
                sc = sum(map(isar, tk)) / len(tk)
                if sc < (.5 if v['pos'] == -1 else .3): continue
                a2 = a + len(seg) - len(seg.lstrip()); b2 = b - (len(seg) - len(seg.rstrip()))
                before = t[max(0, a2 - 70):a2]
                spans.append(dict(id='ar%04d' % (len(spans) + 1), section=sid(c, s), line=v['order'], start=a2, end=b2,
                                  text=t[a2:b2], kind='verse' if v['pos'] != -1 else 'prose', score=round(sc, 2),
                                  cue_before=(CUEW.search(before).group(1) if CUEW.search(before) else None), verified=False))
# the Minovi couplet is not in the Ganjoor text; it is stored as an insertion (see lion_ox_aligned.json)
ins = [i for t in aligned for s in t['fa_sections'] for i in s.get('inserts', [])][0]
spans.append(dict(id='minovi_sh22', section='shirogav/sh22', line=None, text=' / '.join(ins['hemistichs']), kind='verse',
                  inserted=True, source=ins['source'], verified=False))
write('arabic_spans.json', dict(
    note='Passages guessed to be Arabic (Arabic function words and the article ال, no Persian function words). Expect false positives and misses. Check by hand, then set "verified": true.',
    spans=spans))
write('arabic_translations.json', dict(
    note='Translations for Arabic spans, keyed by span id. Only entries with a source are shown. Empty entries are not shown.',
    translations={'minovi_sh22': dict(
        translation_en=ins['translation_en'], source=ins['source'],
        status='provided by the project editor with the couplet; the page reference has not been checked by the model')}), once=True)

# ---------------------------------------------------------------- glossary (draft, unverified)
G = [
 ('مناصحت', 'نصیحت کردن از روی خیرخواهی', 'giving sincere advice'), ('حصافت', 'خردمندی و استواریِ رأی', 'soundness of judgement'),
 ('مفاوضت', 'گفتگو و رایزنی با یکدیگر', 'conversation, consultation'), ('نهمت', 'آرزوی بزرگ، میل بسیار', 'aspiration, strong desire'),
 ('کیاست', 'زیرکی و هوشمندی', 'shrewdness'), ('تحرز', 'پرهیز و خود را نگه داشتن از زیان', 'guarding oneself, caution'),
 ('عزیمت', 'آهنگ رفتن؛ تصمیم استوار', 'setting out; firm resolve'), ('مروت', 'جوانمردی و بزرگواری', 'manly virtue, generosity'),
 ('اصطناع', 'نیکی کردن و پروردنِ کسی', 'patronage, bestowing favour'), ('ملاطفت', 'مهربانی و نرمی', 'gentleness, kindness'),
 ('مشاورت', 'رأی زدن، مشورت کردن', 'consultation'), ('بسطت', 'گشادگی؛ فراوانی نعمت و قدرت', 'expansiveness, ample power'),
 ('عقوبت', 'کیفر و مجازات', 'punishment'), ('حیلت', 'چاره‌جویی؛ نیرنگ', 'stratagem, device'), ('فکرت', 'اندیشه', 'thought, reflection'),
 ('شبهت', 'شک و گمان', 'doubt, uncertainty'), ('مستولی', 'چیره و غالب', 'dominant, prevailing'),
 ('نفاذ', 'روا شدن و اجرا شدنِ فرمان', 'taking effect (of an order)'), ('مضرت', 'زیان', 'harm'), ('شفقت', 'مهربانی و دلسوزی', 'compassion'),
 ('ثمرت', 'میوه؛ نتیجه', 'fruit; result'), ('مودت', 'دوستی', 'affection, friendship'), ('مبالغت', 'زیاده‌روی؛ کوشش بسیار', 'exaggeration; great effort'),
 ('تجربت', 'آزمودن؛ آزمودگی', 'trial; experience'), ('عواقب', 'سرانجام‌ها', 'consequences'), ('مقاومت', 'ایستادگی', 'resistance'),
 ('رغبت', 'میل و خواست', 'desire, inclination'), ('اشارت', 'نشانه؛ فرمان', 'sign; intimation'), ('پیرایه', 'آرایه و زیور', 'ornament'),
 ('وسیلت', 'دستاویز و راه رسیدن به چیزی', 'means, recourse'), ('مهمات', 'کارهای مهم', 'important affairs'),
 ('تاویل', 'تفسیر؛ برگرداندنِ سخن به معنایی دیگر', 'interpretation'), ('قاصر', 'ناتوان؛ کوتاه‌آمده', 'inadequate, falling short'),
 ('معذور', 'کسی که عذرش پذیرفته است', 'excused'), ('متابعت', 'پیروی', 'following, obedience'), ('اعراض', 'روی گرداندن', 'turning away'),
 ('اکرام', 'گرامی داشتن', 'honouring'), ('تدارک', 'جبران؛ چاره', 'making good, remedy'), ('تردد', 'رفت‌وآمد؛ دودلی', 'going to and fro; hesitation'),
 ('مقرون', 'همراه و پیوسته', 'joined, accompanied'), ('فراخور', 'شایسته و متناسب', 'suitable, proportionate'), ('ضمیر', 'دل و درون', 'inner mind, heart'),
 ('حوادث', 'رویدادها، به‌ویژه ناگوار', 'events, misfortunes'), ('مخدوم', 'کسی که به او خدمت می‌کنند', 'master, one who is served'),
 ('حجام', 'خون‌گیر، حجامت‌کننده', 'cupper (bloodletter)'), ('مزاج', 'سرشت و طبع', 'temperament'), ('ایزد', 'خدا', 'God')]
SUF = ['', 'ها', 'های', 'ی', 'ان', 'ات', 'ش', 'ت', 'م']
allw = collections.defaultdict(list)
for c in book:
    for s in c['sections']:
        for v in s['verses']:
            for w in re.findall(r'[ء-يٱ-ۓ]+', norm(v['text']).replace(' ', '​') if False else norm(v['text'])):
                allw[w].append(sid(c, s))
entries = []
for w, fa, en in G:
    forms = [w + x for x in SUF if w + x in allw]
    hits = [x for f in forms for x in allw[f]]
    if not hits: print('glossary word not in text, dropped:', w); continue
    entries.append(dict(word=w, forms=forms, meaning_fa=fa, meaning_en=en, occurrences=len(hits),
                        example_sections=sorted(set(hits), key=hits.index)[:3],
                        source='draft by Claude (a model); not checked against a dictionary', verified=False))
write('glossary.json', dict(note='Draft meanings of hard words. Every entry is unverified until "verified" is set to true by hand.', entries=entries), once=True)

# ---------------------------------------------------------------- summaries / translations skeleton
sm = {}
for c in book:
    for s in c['sections']:
        sm[sid(c, s)] = dict(summary_en='', status='empty', translation_en='')
write('summaries_en.json', dict(
    note='English summary per section (editorial summary, not a quotation). status: "empty" (none yet), "draft" (drafted by Claude from the Persian text, unreviewed), "reviewed" (set by hand). translation_en: optional full English of the section, filled in by hand; when present the reader shows it as a facing page.',
    sections=sm), once=True)
