"""Stage 1 of the English OCR clean-up: deterministic rules only, every removal logged.

Reads data/keith_falconer_1885_ocr.txt (archive.org OCR of Keith-Falconer, 1885) and returns
cleaned text for a line range plus a log of what each rule removed or joined.
"""
import re, collections

OCR = 'data/keith_falconer_1885_ocr.txt'
MARGIN = {'5','10','15','20','25','30','35','40','45','50','lo','l0','1o','i5','l5','2o','3o'}
HEADER = re.compile(r'BOOK\s+OF\s+K[A-Z]+\s+AND|K[A-Z]*AH\s+AND\s+DIM|STORY\s+OF\s+THE\s+LION|^\s*K\.\s*F\.\s*-?\s*[A-Z]?\s*$', re.I)
KEEP_HYPHEN = {'sea-shore','eye-balls','far-off','well-fed','wine-drinking','glow-worm','hen-bird','cock-bird','messmate'}

def load():
    return open(OCR, encoding='utf-8').read().split('\n')

def vocab(lines):
    c = collections.Counter(w.lower() for w in re.findall(r"[A-Za-z]+", ' '.join(lines)))
    return {w for w, n in c.items() if n >= 2}

def clean(lines, a, b, voc, log):
    """Return cleaned text for OCR lines a..b (1-based, inclusive). log gets dicts."""
    out = []
    for n in range(a, b + 1):
        ln = lines[n - 1]
        if HEADER.search(ln) or not ln.strip():
            if ln.strip(): log.append(dict(line=n, rule='page header dropped', before=ln.strip(), after=''))
            continue
        toks = ln.split()
        # marginal line numbers at the start or end of a line
        while toks and toks[0] in MARGIN:
            log.append(dict(line=n, rule='margin line number', before=toks[0], after='')); toks.pop(0)
        while toks and toks[-1] in MARGIN:
            log.append(dict(line=n, rule='margin line number', before=toks[-1], after='')); toks.pop()
        # a margin marker that landed in the middle of a line (the word "lo" is never lower-case prose here)
        keep = []
        for t in toks:
            if t in ('lo', 'l0', '1o'):
                log.append(dict(line=n, rule='margin line number (inside line)', before=t, after='')); continue
            keep.append(t)
        s = ' '.join(keep)
        s2 = re.sub(r'\s*\(\s*-?\d{1,3}\s*\)', '', s)          # footnote markers such as (44)
        if s2 != s: log.append(dict(line=n, rule='footnote marker removed', before=s, after=s2))
        out.append((n, s2.strip()))
    # join lines, repairing words broken by a hyphen at the line end
    text = ''
    for n, s in out:
        if text.endswith('-') and s and s[0].islower():
            pre = re.search(r'([A-Za-z]+)-$', text)
            m = re.match(r'[A-Za-z]+', s)
            if pre and m:
                comb = (pre.group(1) + m.group(0)).lower()
                if (pre.group(1) + '-' + m.group(0)).lower() in KEEP_HYPHEN:
                    text += s
                else:
                    text = text[:-1] + s
                    log.append(dict(line=n, rule='line-end hyphen joined', before=pre.group(1) + '- ' + m.group(0), after=pre.group(1) + m.group(0)))
                continue
        text += (' ' if text else '') + s
    return re.sub(r'\s{2,}', ' ', text).strip()

# Tale spans in the OCR: (first line, last line to scan, regex for the last words of the tale).
# Each tale starts at its opening question and ends at the end of the teller's own moral,
# before the other speaker replies.
SPANS = {
 'ape_carpenter': (4096, 4140, r'caused by the log of wood'),
 'crow_serpent':  (5065, 5215, r"inaccessible strongholds\.'"),
 'lion_hare':     (5225, 5300, r'escaped to the other side\.'),
 'three_fishes':  (5437, 5480, r'resists force\.'),
 'camel':         (6044, 6215, r'take away a wholesome mind\.'),
 'sandpiper':     (6246, 6380, r'allows time for stratagem\.'),
 'apes_glowworm': (6624, 6665, r'has abased you\.'),
 'two_partners':  (6661, 6760, r'fall into them himself\.'),
 'iron_merchant': (6804, 6860, r'fall mil come suddenly\.'),
}
# Nested tales are cut out of their parent's text (start marker, end marker).
NESTED = {
 'heron_crab':     ('crow_serpent', r'The Haven\. How runs|The Raven\. How runs', r"perishes by his own artifices\."),
 'tortoise_geese': ('sandpiper', r'The cock said', r'wilfulness and disobedience\.\''),
}

def base_texts():
    """Stage-1 text for each top-level tale: (texts, logs-per-tale, end-line-per-tale)."""
    L = load(); V = vocab(L); out = {}; logs = {}; ends = {}
    for k, (a, b, end) in SPANS.items():
        log = []
        t = clean(L, a, b, V, log)
        m = re.search(end, t)
        assert m, k
        out[k] = t[:m.end()]
        # last OCR line needed to reach the end of the tale
        for e in range(a, b + 1):
            if re.search(end, clean(L, a, e, V, [])):
                ends[k] = e; break
        logs[k] = [dict(x, tale=k, stage=1) for x in log if x['line'] <= ends[k]]
    return out, logs, ends
