import json,re,sys,os
sys.path.insert(0,'.')
import a,b,c
D={}
for m in (a,b,c): D.update(m.D)

# pneumonia restructure: causes+complications; treatment+recovery
p=D['pneumonia']['secs']
comp="Pneumonia can lead to serious complications, including a collection of pus around the lung (empyema), sepsis, respiratory failure and lung abscess. These are uncommon in healthy people."
rec=p[4][2].replace("\n\n"+comp,"")
assert rec!=p[4][2]
causes=p[1][2]+"\n\n"+comp
treat=p[3][2]+"\n\n"+rec
D['pneumonia']['secs']=[p[0],("What causes pneumonia, and what are the complications?",p[1][1]+[p[4][1][1]],causes),p[2],("How is pneumonia treated, and how long does recovery take?",p[3][1]+p[4][1],treat),p[5]]
art={}; led={}
for k,v in D.items():
    secs=[{"heading":h,"body":body.replace('\\n','\n')} for h,u,body in v['secs']]
    art[k]={"article":{"sections":secs,"faqs":[{"q":q,"a":ans} for q,ans,u in v['faqs']],"keyFacts":[{"label":l,"value":x} for l,x in v['facts']]},"references":[{"title":t,"url":u} for t,u in v['refs']]}
    ent=[]
    for i,(h,u,body) in enumerate(v['secs']):
        for s in re.split(r'(?<=[.!?])\s+',body.replace('\\n',' ').strip()):
            ent.append({"where":f"article.sections[{i}]","sentence":s,"basis":"excerpt","urls":u,"note":"first pass: written from the retrieved search summary text; attributed to the page(s) whose title matches (summaries blend pages)"})
    for i,(q,ans,u) in enumerate(v['faqs']):
        for s in re.split(r'(?<=[.!?])\s+',ans):
            ent.append({"where":f"article.faqs[{i}].a","sentence":s,"basis":"excerpt","urls":u,"note":"first pass: from retrieved text"})
    for i,(l,x) in enumerate(v['facts']):
        ent.append({"where":f"article.keyFacts[{i}]","sentence":f"{l}: {x}","basis":"excerpt","urls":[],"note":"first pass: from retrieved text"})
    led[k]={"id":k,"searchesUsed":v['searches'],"entries":ent}
    wc=sum(len(s['body'].split()) for s in secs)
    print(k,[len(s['body'].split()) for s in secs],len(ent))
os.makedirs('../ledgers',exist_ok=True)
for k,l in led.items(): json.dump(l,open(f'../ledgers/{k}.ledger.json','w'),indent=1,ensure_ascii=False)
json.dump(art,open('articles.json','w'),indent=1,ensure_ascii=False)
