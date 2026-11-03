import sys, json, importlib, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import U, P
import build_titles
names = sys.argv[1:]
frag={"blog":{}}
for n in names:
    G = importlib.import_module(n).G; slug=G["slug"]
    rep=json.load(open(f"../reports/{slug}.report.json"))
    cl={}
    for c in rep["claims"]: cl.setdefault(c["sentence"],c)
    def final(s):
        c=cl.get(s["sentence"])
        if c is None: print("MISSING",slug,s["sentence"][:60]); return None
        if c["action"]=="removed": return None
        if c["action"]=="edited": return c.get("newSentence") or None, c
        return s["sentence"], c
    led=[]; body=[]
    for i,(h,items) in enumerate(G["sections"]):
        paras=[[]]
        for it in items:
            if it==P: paras.append([]); continue
            r=final(it)
            if not r: continue
            t,c=r; paras[-1].append(t)
            led.append(dict(where=f"body[{i}]",sentence=t,basis="textbook" if c["classification"]=="textbook" and c["action"]=="kept" else "excerpt",urls=[c["url"]] if c.get("url") else it["urls"],note=c["evidence"][:300]))
        txt="\n\n".join(" ".join(p) for p in paras if p)
        if len(txt)>=120: body.append({"heading":h,"body":txt})
        elif txt: print("SECTION DROPPED (short)",slug,h); 
    kps=[]
    for k in G["keyPoints"]:
        r=final(k)
        if r:
            t,c=r
            if 15<=len(t)<=260: kps.append(t); led.append(dict(where="keyPoints",sentence=t,basis="excerpt",urls=[c["url"]] if c.get("url") else k["urls"],note=c["evidence"][:300]))
    summ=G["summary"]; c=cl.get(summ)
    if c and c["action"]=="edited" and c.get("newSentence"): summ=c["newSentence"]
    words=sum(len(b["body"].split()) for b in body)
    refs=[{"title":build_titles.title(k),"url":U[k]} for k in G["refs"]]
    post=dict(name=G["name"],kind="guide",published="2026-11-03",updated="2026-11-03",summary=summ,keyPoints=kps,body=body,references=refs,**{k:v for k,v in G["links"].items() if v},anatomy=G["anatomy"])
    frag["blog"][slug]=post
    json.dump(dict(id=slug,ledger=led),open(f"../ledgers/{slug}.ledger.json","w"),indent=1)
    print(slug,"words",words,"sections",len(body),"kp",len(kps),"summary",len(summ),"sentences",len(led))
json.dump(frag,open("../fragment.json","w"),indent=1)
