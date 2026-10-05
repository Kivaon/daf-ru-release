"""Refresh only source refs, never translation-derived counts. No DB credentials needed."""
import concurrent.futures, datetime, json, pathlib, re, time, urllib.request, urllib.parse
root=pathlib.Path(__file__).resolve().parents[1]
catalog=re.findall(r'sefaria:"([^"]+)".*?lastDaf:(\d+), lastSide:"([ab])"', (root/'app/talmudCatalog.ts').read_text())
def fetch(t):
 name,last,side=t;count=int(last)*2+(side=='b')-3
 url='https://www.sefaria.org/api/texts/'+urllib.parse.quote(f'{name}.2a-{last}{side}',safe='')+'/he/Wikisource_Talmud_Bavli?context=0&commentary=0'
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=90) as r:d=json.load(r)
   he=d.get('he');assert isinstance(he,list) and len(he)==count,(name,d.get('error'),len(he or []),count)
   pages={};missing=[]
   for i,parts in enumerate(he):
    assert isinstance(parts,list),(name,i,'not a page')
    key=f'{(i+4)//2}{"b" if i%2 else "a"}'
    refs=[f'{key}:{j+1}' for j,value in enumerate(parts) if isinstance(value,str) and re.sub('<[^>]*>','',value).strip()]
    if refs:pages[key]=refs
    else:missing.append(key)
   print(name,len(pages),sum(map(len,pages.values())),flush=True)
   return name,{'version':d.get('heVersionTitle'),'url':url,'pages':pages,**({'error':'В источнике отсутствуют реплики: '+', '.join(missing)} if missing else {})}
  except Exception:
   if attempt==2:
    print(name,'SOURCE UNAVAILABLE',flush=True)
    return name,{'error':'Источник не вернул полный список refs','url':url,'pages':{}}
   time.sleep(2)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:result=dict(pool.map(fetch,catalog))
output={'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tractates':result}
(root/'app/data/source-index.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
print('Complete source index written.',flush=True)
