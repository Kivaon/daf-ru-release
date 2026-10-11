import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceComments,anchorIncludes} from '../app/sefariaLinks.ts';
import {loadBundle,buildUnits} from '../app/batchSources.ts';
import {emptyDraft,importDraft,batchPrompt,missingFields} from '../app/batchModel.ts';
import {pageProgress,printedProgress} from '../app/translationMapModel.ts';
import {printedRefs} from '../app/printedSources.ts';
const sources=JSON.parse(readFileSync(new URL('./fixtures/nazir-sources.json',import.meta.url),'utf8'));
const comments=(page:string)=>sourceComments(sources[page].links,'Nazir',sources[page].source.he.map((_:unknown,i:number)=>`${page}:${i+1}`));
test('real Nazir 33a owns two Rashi and one Tosafot, independently of printed coordinates',()=>{
 const all=comments('33a');assert.deepEqual(all.map(c=>c.ref).sort(),['Rashi on Nazir 33a:1:1','Rashi on Nazir 33a:1:2','Tosafot on Nazir 33a:2:1']);
 const c=all.find(c=>c.commentator==='Tosafot')!;
 const unit={id:'Nazir 33a:2',boundary:false,parts:[{ref:'33a:2',original:sources['33a'].source.he[1],rashi:[],tosafot:[{ref:c.ref,original:c.text}]}]};
 const draft=emptyDraft(unit);
 const prompt=batchPrompt("Nazir",{unit,saved:draft,draft,skipped:false,started:false,published:false});assert.ok(prompt.includes(c.ref));assert.ok(prompt.includes(JSON.stringify(c.text)));assert.ok(missingFields(draft).length);
 const imported=importDraft(unit,{title:'Тема',translation:'Перевод',explanation:'Объяснение',rashi:[],tosafot:[{ref:c.ref,translation:'Полный перевод',explanation:'Пояснение'}]},draft);
 assert.equal(missingFields(imported).length,0);
});
test('ranges retain every associated ref across page boundaries and to end of last page',()=>{
 assert.equal(anchorIncludes('Nazir 31b:12-32a:3','Nazir','32a:2'),true);
 assert.equal(anchorIncludes('Nazir 31b:12-32a','Nazir','32a:99'),true);
 assert.equal(anchorIncludes('Nazir 31b:12-32a:3','Nazir','31b:11'),false);
 assert.equal(anchorIncludes('Nazir 31b:12-32a:3','Nazir','32a:4'),false);
 const link={collectiveTitle:{en:'Rashi'},ref:'Rashi on Nazir 31b:12:1',anchorRef:'Nazir 31b:12-32a:3',he:['начало','продолжение']};
 const result=sourceComments([link,link],'Nazir',['31b:12','32a:1','32a:3']);assert.equal(result.length,3);assert.ok(result.every(c=>c.text==='начало продолжение'));
 assert.throws(()=>sourceComments([{...link,anchorRef:'unknown'}],'Nazir',['32a:1']));
 assert.throws(()=>sourceComments([{...link,he:''}],'Nazir',['32a:1']));
 assert.throws(()=>sourceComments({error:'unavailable'},'Nazir',['32a:1']));
});
test('printed cross-page continuation points to its original article and retains its entire text',()=>{
 const ref='Tosafot on Nazir 31b:3:1';
 assert.ok(printedRefs('Nazir','33a').some(c=>c.ref===ref&&c.base==='31b:3'));
 assert.ok(printedRefs('Nazir','33b').some(c=>c.ref===ref&&c.base==='31b:3'));
 assert.ok(comments('31b').find(c=>c.ref===ref)!.text.length>500);
 for(const p of ['33a','33b'])for(const printed of printedRefs('Nazir',p))assert.ok(comments(printed.base.split(':')[0]).some(c=>c.ref===printed.ref&&c.base===printed.base));
});
test('confirmed empty Nazir 33b is not a source failure or automatic 100 percent',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input)=>{const url=String(input),page=decodeURIComponent(url).match(/Nazir[. ](\d+[ab])/)![1];return Response.json(url.includes('/links/')?sources[page].links:url.includes('Wikisource')?sources[page].source:sources[page].default);};
 try{
  const bundle=await loadBundle('Nazir','33b');assert.equal(bundle.parts.length,0);
  assert.deepEqual(buildUnits('Nazir',bundle,[bundle],[]),[]);
  const progress=pageProgress('33b',[],[],new Set(),new Map());assert.equal(progress.complete,false);
  const printed=printedProgress(progress,printedRefs('Nazir','33b'),[]);assert.equal(printed.complete,false);assert.ok(printed.commentary!.total>0);assert.equal(printed.commentary!.ready,0);
 }finally{globalThis.fetch=originalFetch;}
});
