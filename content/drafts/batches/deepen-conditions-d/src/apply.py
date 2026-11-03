import json,re,sys,glob,os
art=json.load(open('articles.json'))
rep_dir='../reports'; led_dir='../ledgers'
issues=[]
for rf in sorted(glob.glob(rep_dir+'/*.report.json')):
    r=json.load(open(rf)); k=r['id']
    led=json.load(open(f'{led_dir}/{k}.ledger.json'))['entries']
    cl=r['claims']
    if len(cl)!=len(led): issues.append(f'{k}: {len(cl)} claims vs {len(led)} entries')
    A=art[k]['article']
    facts_remove=set(); facts_edit={}
    for i,c in enumerate(cl):
        if i>=len(led): break
        e=led[i]; w=e['where']; s=e['sentence']; act=c['action']; ns=c.get('newSentence','').strip()
        if c['classification'] in('supported','textbook') and act=='kept': continue
        if act=='kept': issues.append(f'{k} {c["id"]}: classified {c["classification"]} but kept'); continue
        if act=='edited' and not ns: act='removed'
        m=re.match(r'article\.sections\[(\d+)\]',w); f=re.match(r'article\.faqs\[(\d+)\]\.a',w); kf=re.match(r'article\.keyFacts\[(\d+)\]',w)
        if m: o=A['sections'][int(m.group(1))]; key='body'
        elif f: o=A['faqs'][int(f.group(1))]; key='a'
        elif kf:
            j=int(kf.group(1))
            if act=='removed': facts_remove.add(j)
            else:
                l,_,v=ns.partition(': ')
                if not v: issues.append(f'{k} keyFact {j} edit not label: value'); facts_remove.add(j)
                else: facts_edit[j]=(l,v)
            continue
        else: issues.append(f'{k}: unknown where {w}'); continue
        t=o[key]
        if s not in t: issues.append(f'{k} {c["id"]}: sentence not found ({s[:50]})'); continue
        if act=='edited': o[key]=t.replace(s,ns,1)
        else:
            o[key]=t.replace(s,'',1)
    for j,(l,v) in facts_edit.items(): A['keyFacts'][j]={'label':l,'value':v}
    A['keyFacts']=[x for j,x in enumerate(A['keyFacts']) if j not in facts_remove]
    for o in A['sections']:
        o['body']=re.sub(r'[ \t]+\n','\n',re.sub(r' {2,}',' ',o['body'])); o['body']=re.sub(r'\n{3,}','\n\n',o['body']).strip()
    for o in A['faqs']: o['a']=re.sub(r' {2,}',' ',o['a']).strip()
    A['faqs']=[o for o in A['faqs'] if len(o['a'])>=60]
    if len(A['faqs'])<4: issues.append(f'{k}: only {len(A["faqs"])} faqs')
    # report
    for o in A['sections']:
        n=len(o['body'].split())
        if not 110<=n<=220: issues.append(f'{k}: section "{o["heading"]}" has {n} words')
    for o in A['faqs']:
        n=len(o['a'].split())
        if not 40<=n<=90: issues.append(f'{k}: faq "{o["q"][:40]}" has {n} words')
    if not 5<=len(A['keyFacts'])<=7: issues.append(f'{k}: {len(A["keyFacts"])} key facts')
    print(k,'words',sum(len(o['body'].split()) for o in A['sections']))
json.dump(art,open('final.json','w'),indent=1,ensure_ascii=False)
json.dump({"patch":{"conditions":art}},open('../fragment.final.json','w'),indent=1,ensure_ascii=False)
print('\n'.join(issues))
