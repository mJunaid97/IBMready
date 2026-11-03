import sys, json, importlib, re, os
sys.path.insert(0, os.path.dirname(__file__))
from common import U, P
names = sys.argv[1:]
import re
def title(k):
    u=U[k]
    T={"nhs.uk":"NHS","gov.uk":"GOV.UK","medlineplus.gov":"MedlinePlus","nibib.nih.gov":"NIBIB","cancerresearchuk.org":"Cancer Research UK","bhf.org.uk":"British Heart Foundation","theros.org.uk":"Royal Osteoporosis Society","111.wales.nhs.uk":"NHS 111 Wales","ncbi.nlm.nih.gov":"PubMed Central review"}
    host=re.sub(r"^https://(www\.)?","",u).split("/")[0]
    pub=T.get(host) or ("NHS trust leaflet ("+host.replace(".nhs.uk","")+")" if host.endswith("nhs.uk") else host)
    return f"{pub}: "+k.replace("_"," ")

frag = {"blog": {}}
for n in names:
    G = importlib.import_module(n).G
    body=[]; led=[]
    def add(where, s):
        led.append(dict(where=where, sentence=s["sentence"], basis=s["basis"], urls=s["urls"], note=s["note"]))
    for i,(h,items) in enumerate(G["sections"]):
        paras=[[]]
        for it in items:
            if it==P: paras.append([]); continue
            paras[-1].append(it["sentence"]); add(f"body[{i}]", it)
        body.append({"heading":h,"body":"\n\n".join(" ".join(p) for p in paras if p)})
    for k in G["keyPoints"]: add("keyPoints", k)
    led.append(dict(where="summary", sentence=G["summary"], basis="excerpt", urls=[], note="Summary restates the supported sentences below."))
    words=sum(len(b["body"].split()) for b in body)
    refs=[]
    for k in G["refs"]:
        refs.append({"title":title(k),"url":U[k]})
    post=dict(name=G["name"],kind="guide",published="2026-11-03",updated="2026-11-03",summary=G["summary"],
      keyPoints=[k["sentence"] for k in G["keyPoints"]],body=body,references=G.get("refs_full") or refs,**{k:v for k,v in G["links"].items() if v},
      anatomy=G["anatomy"])
    frag["blog"][G["slug"]]=post
    json.dump(dict(id=G["slug"],ledger=led),open(f"../ledgers/{G['slug']}.ledger.json","w"),indent=1)
    nb=sum(1 for l in led if l["basis"]=="textbook")
    print(G["slug"],"words",words,"sentences",len(led),"textbook",nb,"name",len(G["name"]),"summary",len(G["summary"]))
json.dump(frag,open("../fragment.json","w"),indent=1)
