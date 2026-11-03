import json, glob, os, sys, importlib.util
here=os.path.dirname(os.path.abspath(__file__)); root=os.path.dirname(here)
def load(n):
    s=importlib.util.spec_from_file_location(n,os.path.join(here,n+'.py')); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); return m.B
B={}
for n in sys.argv[1:]: B.update(load(n))
orig={}
for f in glob.glob(os.path.join(here,'verify_job*.json')):
    orig.update(json.load(open(f)))
def cur(b):
    out=[b['summary']]+b['keyPoints']
    for h,ss in b['sections']: out+=[t if isinstance(t,str) else t[0] for t in ss]
    return out
for slug,b in B.items():
    vf=os.path.join(here,'verify_out',slug+'.json')
    if not os.path.exists(vf): print('no verify for',slug); continue
    v=json.load(open(vf)); present=set(cur(b)); osent={s['id']:s['sentence'] for s in orig[slug]['sentences']}
    counts=dict(supported=0,textbook=0,unsupported=0,wrong=0,unsafe=0,unchecked=0); claims=[]
    for i,c in enumerate(v['claims']):
        cl=c['classification']; counts[cl]=counts.get(cl,0)+1
        kept=osent.get(c['id']) in present
        act='kept' if kept else ('edited' if c.get('fix') else 'removed')
        d=dict(id=f'c{i+1:02d}',sentenceId=c['id'],classification=cl,evidence=c['evidence'],url=c['url'],action=act)
        if act=='edited': d['newSentence']=c['fix']
        claims.append(d)
    json.dump(dict(id=slug,searchesUsed=v.get('searchesUsed'),counts=counts,claims=claims,notes=v.get('notes','')),open(os.path.join(root,'reports',slug+'.report.json'),'w'),indent=1,ensure_ascii=False)
print('reports done')
