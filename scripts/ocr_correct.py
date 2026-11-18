"""Stage 2 of the English OCR clean-up: reviewed, logged substitutions.

Each correction is (old, new, reason[, expected_count]). `old` must occur exactly the stated
number of times (default 1) in the stage-1 text of that tale, or the script stops. Nothing is
reworded: only clear OCR misreadings, stray marks and dropped punctuation are changed.
Everything else that looks doubtful is listed in UNRESOLVED and left as the OCR has it.

Status of all changes: applied by a model (Claude), NOT yet reviewed by a human.
"""
import re, json, csv, random, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import ocr_clean as oc

L_, W_, P_ = 'letters misread', 'stray mark', 'punctuation dropped'
C = {
 'ape_carpenter': [
  ('tAvo pieces','two pieces',L_), ('froin the carpenter','from the carpenter',L_),
  ('blows men severe','blows more severe',L_),
  ('caused by the log of wood','caused by the log of wood.',P_+' (final full stop)'),
 ],
 'crow_serpent': [
  ('Kalllah. What did','Kalilah. What did',L_), ('said to Kalllah :','said to Kalilah :',L_),
  ('wdiich','which',L_), ('IS destroyed himself','is destroyed himself',L_),
  ('The Haven. How runs','The Raven. How runs',L_), ('27ie Jackal.','The Jackal.',L_),
  ('TIw Heron.','The Heron.',L_), ('j^eople','people',L_),
  ('saying : * O brother',"saying : ' O brother",W_+' (asterisk for opening quote)'),
 ],
 'lion_hare': [
  ('Kalllah. How runs','Kalilah. How runs',L_), ('(avIio lived)','(who lived)',L_),
  ('perhaps 1 shall','perhaps I shall',L_), ('28 I500K OF KALILAII AND DIMNAII. ','','running page header left in the text'),
  ('the Hon and the fat','the lion and the fat',L_), ("And she said; 'Here","And she said: 'Here",P_+' (colon read as semicolon)'),
 ],
 'three_fishes': [
  ('brouglit','brought',L_), ('ami look him','and took him',L_), ('0 king','O king',L_), ('tlie ox','the ox',L_),
 ],
 'camel': [
  ('remain with yon','remain with you',L_), ('t6 the camel','to the camel',L_), ('OAvn nourishment','own nourishment',L_),
  ("king,'and all","king,' and all",P_), ('0 glory','O glory',L_), ('\\dctorious','victorious',L_),
  ('o^\\ti hand','own hand',L_), ('Ave should go','we should go',L_), ('agi-eed','agreed',L_),
  ('A\\dlling','willing',L_), ('5* Now I have related','Now I have related',W_+' (margin number and asterisk)'),
  ('But / shall satisfy','But I shall satisfy','italic I read as slash'),
  ('But / am not thus: so','But I am not thus: so','italic I read as slash'),
  ('king, / am not thus','king, I am not thus','italic I read as slash'),
  ('days -without','days without',W_),
 ],
 'sandpiper': [
  ('The O.r. What','The Ox. What',L_), ('that is S for eggs','that is for eggs','margin line number 5 read as a letter'),
  ("'0 how weak","'O how weak",L_), ('to her V The hen-bird',"to her?' The hen-bird",L_+' (question mark and quote read as V)'),
  ('geese repUed','geese replied',L_), ("theu' nest",'their nest',L_), ("wi'onged",'wronged',L_),
  ('cliildren','children',L_), ('he Avill hear','he will hear',L_),
 ],
 'apes_glowworm': [
  ('blo^^ing','blowing',L_), ("bu'd",'bird',L_),
 ],
 'two_partners': [
  ('Kalllah. It is','Kalilah. It is',L_), ('(^ay)','(Nay)',L_), ('the .simpleton said','the simpleton said',W_),
  ("saying : * The tree","saying : ' The tree",W_+' (asterisk for opening quote)'),
  ('for himself And the judge','for himself. And the judge',P_),
 ],
 'iron_merchant': [
  ('liis mind','his mind',L_), ('ofif a boy','off a boy',L_), ('fall mil come','fall will come',L_),
 ],
}

# Left exactly as in the OCR because the right reading is not certain from the page alone.
UNRESOLVED = [
 ('camel', "eat me! (Then) the crow", 'a closing quote mark may be missing after "me!"'),
 ('camel', 'I give you myself" As each', 'a full stop may be missing after the closing quote'),
 ('camel', 'Then said] the wolf', 'closing square bracket; the opening bracket is far above, so the bracketed passage should be checked on the page'),
 ('lion_hare', 'fill your belly with bean food', 'unusual wording; check against the page image'),
 ('iron_merchant', 'and the mice eat it up', '"eat" may be OCR for "ate"; check against the page image'),
 ('sandpiper', 'wilfulness and disobedience.\'', 'closing quote kept; sentence boundary of the nested tale to be checked'),
]

# nested tales cut from their parent's corrected text: (parent, first words, last words)
NESTED = {
 'heron_crab': ('crow_serpent', r'The Raven\. How runs', r'perishes by his own artifices\.'),
 'tortoise_geese': ('sandpiper', r'The cock said', r"wilfulness and disobedience\.'"),
}

def lev(a, b):
    p = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        c = [i]
        for j, y in enumerate(b, 1):
            c.append(min(p[j] + 1, c[-1] + 1, p[j - 1] + (x != y)))
        p = c
    return p[-1]

def run():
    base, logs1, ends = oc.base_texts()
    lines = oc.load()
    final, raw, lines_span, log = {}, {}, {}, []
    for tale, t in base.items():
        log += logs1[tale]
        for ch in C.get(tale, []):
            old, new, why = ch[:3]; n = ch[3] if len(ch) > 3 else 1
            assert t.count(old) == n, (tale, old, t.count(old))
            i = t.index(old)
            ctx = t[max(0, i - 40): i + len(old) + 40]
            t = t.replace(old, new)
            log.append(dict(tale=tale, stage=2, rule=why, before=old, after=new, context=ctx,
                            edit_distance=lev(old, new), flag=lev(old, new) > 4))
        final[tale] = t
        a = oc.SPANS[tale][0]
        lines_span[tale] = [a, ends[tale]]
        raw[tale] = '\n'.join(lines[a - 1: ends[tale]])
    for u in UNRESOLVED:
        assert u[1] in final[u[0]], u
    # nested tales
    for tale, (par, s, e) in NESTED.items():
        t = final[par]
        ms = re.search(s, t); me = re.search(e, t)
        assert ms and me and ms.start() < me.end(), tale
        final[tale] = t[ms.start(): me.end()]
        # raw lines: smallest range of the parent's raw lines holding both markers
        a0, b0 = lines_span[par]; V = oc.vocab(lines)
        la = next(x for x in range(a0, b0 + 1) if re.search(s, oc.clean(lines, a0, x, V, []).replace('The Haven.', 'The Raven.')))
        lb = next(x for x in range(la, b0 + 1) if re.search(e, oc.clean(lines, a0, x, V, [])))
        lines_span[tale] = [la, lb]
        raw[tale] = '\n'.join(lines[la - 1: lb])
    return final, raw, lines_span, log, base

def main():
    final, raw, spans, log, base = run()
    for i, x in enumerate(log, 1):
        x['id'] = f'c{i:03d}'
        x['review'] = 'not yet reviewed'
    out = 'data/ocr_corrections'; os.makedirs(out, exist_ok=True)
    json.dump(dict(status='Applied by a model (Claude) under fixed rules; not yet reviewed by a human.',
                   stage1='Deterministic rules (scripts/ocr_clean.py)', stage2='Listed substitutions (scripts/ocr_correct.py)',
                   changes=log, unresolved=[dict(tale=a, text=b, note=c) for a, b, c in UNRESOLVED]),
              open(f'{out}/changes.json', 'w'), ensure_ascii=False, indent=1)
    cols = ['id', 'tale', 'stage', 'rule', 'line', 'before', 'after', 'context', 'edit_distance', 'flag', 'review']
    with open(f'{out}/changes.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore'); w.writeheader(); w.writerows(log)
    rnd = random.Random(1885)
    s1 = [x for x in log if x['stage'] == 1]; s2 = [x for x in log if x['stage'] == 2]
    sample = rnd.sample(s1, 25) + s2    # all model substitutions are small in number, so all are checked
    with open(f'{out}/review_sample.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, ['id', 'tale', 'stage', 'rule', 'before', 'after', 'context', 'correct? (y/n)', 'note']); w.writeheader()
        for x in sample: w.writerow({k: x.get(k, '') for k in w.fieldnames})
    return final, raw, spans, log

if __name__ == '__main__':
    final, raw, spans, log = main()
    print(len(log), 'changes;', sum(x['stage'] == 1 for x in log), 'stage 1;', sum(x['stage'] == 2 for x in log), 'stage 2;', sum(x.get('flag', False) for x in log), 'flagged')
    for k, v in final.items(): print(f'{k:15} {spans[k]} {len(v.split())} words | {v[:60]} ... {v[-50:]}')
