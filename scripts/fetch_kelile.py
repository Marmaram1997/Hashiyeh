import json, re, time, urllib.request, html, sys
API="https://api.ganjoor.net/api/ganjoor"
def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(url, timeout=30) as r: return json.load(r)
        except Exception as e:
            time.sleep(2*(i+1)); err=e
    raise err
book=get(f"{API}/page?url=/monshi/kelile-demni")["poetOrCat"]["cat"]
out={"source":"ganjoor.net","work":"کلیله و دمنه — نصرالله منشی","chapters":[]}
for ch in book["children"]:
    cat=get(f"{API}/cat/{ch['id']}?poems=true")["cat"]
    secs=[]
    for p in cat["poems"]:
        poem=get(f"{API}/poem/{p['id']}?catInfo=false&rhymes=false&recitations=false&images=false&songs=false&comments=false&verseDetails=true&navigation=false&relatedpoems=false")
        verses=[{"order":v["vOrder"],"pos":v["versePosition"],"text":v["text"]} for v in poem["verses"]]
        secs.append({"id":p["id"],"title":p["title"],"url":"https://ganjoor.net"+(p.get("fullUrl") or ch["fullUrl"]+"/"+p.get("urlSlug","")),"verses":verses})
        time.sleep(0.15)
    out["chapters"].append({"id":ch["id"],"title":ch["title"],"slug":ch["urlSlug"],"sections":secs})
    print(ch["title"], len(secs), file=sys.stderr)
json.dump(out, open("data/kelile_monshi.json","w"), ensure_ascii=False, indent=1)
