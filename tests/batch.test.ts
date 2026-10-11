import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { emptyDraft, importDraft, mergeDraft, readiness, entryReady, missingFields, nextPending, batchPrompt } from '../app/batchModel.ts';
import type { Unit, Draft, Entry } from '../app/batchModel.ts';
import { buildUnits, pageIdentity } from '../app/batchSources.ts';
import type { Bundle } from '../app/batchSources.ts';
import { createBatch, getBatch, changeBatch, articleRows } from '../db/batchStore.ts';
const part=(ref:string)=>({ref,original:`מקור ${ref}`,rashi:[{ref:`Rashi ${ref}`,original:'רשי'}],tosafot:[]});
const unit:Unit={id:'Bekhorot 2a:9+2b:1',parts:[part('2a:9'),part('2b:1')],boundary:true};
const complete=(u=unit):Draft=>{const d=emptyDraft(u);d.title='Заголовок';d.explanation='Объяснение';d.parts.forEach(p=>p.translation=`Перевод ${p.ref}`);d.pages.forEach(p=>p.rashi.forEach(c=>{c.translation=`Перевод ${c.ref}`;c.explanation='Комментарий';}));return d;};
const entry=(u=unit):Entry=>({unit:u,saved:emptyDraft(u),draft:emptyDraft(u),skipped:false,started:false,published:false});
function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['0000_amused_newton_destine','0001_spanning_articles','0002_user_roles','0003_editor_batches','0004_flashy_zaladane','0005_amazing_pet_avengers'])sqlite.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8'));
 const prepare=(sql:string)=>{let bindings:unknown[]=[];const statement={bind(...v:unknown[]){bindings=v;return statement;},async first(){return sqlite.prepare(sql).get(...bindings as never[])||null;},async all(){return {results:sqlite.prepare(sql).all(...bindings as never[])};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...bindings as never[]).changes)}};}};return statement;};
 const db={prepare,async batch(statements:ReturnType<typeof prepare>[]){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}} as unknown as D1Database;
 return {db,sqlite};
}
test('queue deduplicates composite units and includes incoming/outgoing fragments',()=>{
 const bundle=(page:string,refs:string[],he:string[],en:string[]):Bundle=>({page,parts:refs.map(part),he,en});
 const previous=bundle('2a',['2a:8','2a:9'],['x','left'],['Complete.','continues']);
 const current=bundle('2b',['2b:1','2b:2','2b:3'],['right','middle','left'],['continuation','Complete.','continues']);
 const next=bundle('3a',['3a:1','3a:2'],['right','end.'],['continuation','End.']);
 const units=buildUnits('Bekhorot',current,[previous,current,next],[]);
 assert.deepEqual(units.map(u=>u.parts.map(p=>p.ref)),[['2a:9','2b:1'],['2b:2'],['2b:3','3a:1']]);
 assert.throws(()=>pageIdentity('Bogus','2a'));assert.throws(()=>pageIdentity('Bekhorot','1000b'));
});
test('missing comments are incomplete; no source comments is complete',()=>{
 const d=complete();d.pages[1].rashi[0].explanation='';assert.equal(readiness(d).complete,false);assert.match(missingFields(d).join(' '),/Rashi 2b:1/);
 d.pages.forEach(p=>p.rashi=[]);assert.equal(readiness(d).complete,true);
 const e=entry();e.saved=complete();assert.equal(entryReady(e),false);e.published=true;assert.equal(entryReady(e),true);
});
test('partial response merges without replacing published Gemara or sibling commentary',()=>{
 const saved=complete();saved.pages[1].rashi[0].translation='';
 const patch=importDraft(unit,{title:'replacement',pages:[{ref:'2b:1',rashi:[{ref:'Rashi 2b:1',translation:'new'}]}]},emptyDraft(unit));
 const merged=mergeDraft(saved,patch);assert.equal(merged.title,saved.title);assert.equal(merged.pages[0].rashi[0].translation,saved.pages[0].rashi[0].translation);assert.equal(merged.pages[1].rashi[0].translation,'new');
 assert.equal(readiness(merged).complete,true);
});
test('import refuses foreign refs, duplicate refs, wrong types, unknown fields and flat composite translations',()=>{
 for(const raw of [null,[],{title:{}},{original:'fabricated'},{translation:'whole'},{parts:[{ref:'99a:1',translation:'bad'}]},{parts:[{ref:'2a:9',translation:'one'},{ref:'2a:9',translation:'two'}]},{pages:[{ref:'2a:9',rashi:[{ref:'Rashi 2b:1',translation:'bad'}]}]},{pages:[{ref:'2a:9',rashi:[]},{ref:'2a:9',rashi:[]}]}])assert.throws(()=>importDraft(unit,raw,emptyDraft(unit)));
});
test('standard single article response and smart quote parser shape stay compatible',()=>{
 const single:Unit={id:'x',parts:[part('2a:1')],boundary:false};
 const d=importDraft(single,{title:'t',translation:'tr',explanation:'ex',rashi:[{ref:'Rashi 2a:1',translation:'r',explanation:'e'}],tosafot:[]},emptyDraft(single));assert.equal(readiness(d).complete,true);
});
test('prompt identifies only missing fields, retaining both source parts as context',()=>{
 const e=entry();e.saved=complete();e.saved.pages[1].rashi[0].explanation='';
 const prompt=batchPrompt('Bekhorot',e);assert.ok(prompt.includes('2a:9')&&prompt.includes('2b:1'));const missing=prompt.split('Недостаёт:')[1].split('Схема')[0];assert.match(missing,/объяснение Rashi 2b:1/);assert.doesNotMatch(missing,/перевод/);
});
test('next skips complete and skipped entries, but can return to an earlier unfinished item',()=>{
 const entries=[entry(),entry(),entry()];entries[1].saved=complete();entries[1].published=true;entries[2].skipped=true;assert.equal(nextPending(entries,0),0);entries[2].skipped=false;assert.equal(nextPending(entries,0),2);
});
test('private drafts survive reopen, and another editor cannot read or overwrite them',async()=>{
 const {db}=database();const a=await createBatch(db,'alice','Bekhorot','2a',[unit]);
 const b=await changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:a.revision,action:'draft',draft:{title:'Private'},rawInput:'{unfinished'});
 assert.equal(b.revision,1);assert.equal((await getBatch(db,'alice','Bekhorot','2a'))!.entries[0].draft.title,'Private');assert.equal((await getBatch(db,'alice','Bekhorot','2a'))!.entries[0].rawInput,'{unfinished');
 assert.equal(await getBatch(db,'bob','Bekhorot','2a'),null);assert.equal((await articleRows(db,'Bekhorot',['2a:9'])).length,0);
 await assert.rejects(changeBatch(db,'bob',{tractate:'Bekhorot',page:'2a',index:0,revision:1,action:'draft',draft:{title:'intrusion'}}));
});
test('publishing incomplete input never writes either half of a composite',async()=>{
 const {db}=database();await createBatch(db,'alice','Bekhorot','2a',[unit]);
 await assert.rejects(changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'publish',draft:{title:'partial'}}),/Не заполнено/);
 assert.equal((await articleRows(db,'Bekhorot',unit.parts.map(p=>p.ref))).length,0);
});
test('publish atomically saves both sides, advances, and neighbouring queue sees completion',async()=>{
 const {db}=database(),single:Unit={id:'next',parts:[part('2a:8')],boundary:false};
 await createBatch(db,'alice','Bekhorot','2a',[unit,single]);await createBatch(db,'bob','Bekhorot','2b',[unit]);
 const result=await changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'publish',draft:complete()});
 assert.equal(result.index,1);assert.equal(result.entries[0].published,true);
 const rows=await articleRows(db,'Bekhorot',['2a:9','2b:1']);assert.equal(rows.length,2);assert.equal(rows[0].unit_ref,rows[1].unit_ref);assert.equal(JSON.parse(rows.find(r=>r.ref==='2b:1')!.rashi_json)[0].ref,'Rashi 2b:1');
 assert.equal(entryReady((await getBatch(db,'bob','Bekhorot','2b'))!.entries[0]),true);
});
test('stale revision does not write articles or advance queue',async()=>{
 const {db}=database();await createBatch(db,'alice','Bekhorot','2a',[unit]);await changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'draft',draft:{title:'newer'}});
 await assert.rejects(changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'publish',draft:complete()}),/другом окне/);
 assert.equal((await articleRows(db,'Bekhorot',['2a:9','2b:1'])).length,0);
});
test('existing source material and unlisted historical comments survive supplementation',async()=>{
 const {db,sqlite}=database();await createBatch(db,'alice','Bekhorot','2a',[unit]);await changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'publish',draft:complete()});
 const historical={ref:'old-ref',translation:'keep old',explanation:'keep old explanation'};
 sqlite.prepare('UPDATE articles SET rashi_json=? WHERE ref=?').run(JSON.stringify([{ref:'Rashi 2b:1',translation:'',explanation:''},historical]),'2b:1');
 const patch=complete();patch.title='replace title';patch.parts[0].translation='replace translation';patch.pages[0].rashi[0].translation='replace sibling';
 await changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:1,action:'publish',draft:patch});
 const rows=await articleRows(db,'Bekhorot',['2a:9','2b:1']);assert.equal(rows[0].title,'Заголовок');assert.notEqual(rows[0].translation,'replace translation');assert.equal(JSON.parse(rows.find(r=>r.ref==='2a:9')!.rashi_json)[0].translation,'Перевод Rashi 2a:9');assert.deepEqual(JSON.parse(rows.find(r=>r.ref==='2b:1')!.rashi_json).at(-1),historical);
});
test('conflicting published composite copies are refused without overwriting either copy',async()=>{
 const {db,sqlite}=database();await createBatch(db,'alice','Bekhorot','2a',[unit]);await changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'publish',draft:complete()});
 sqlite.prepare('UPDATE articles SET explanation=? WHERE ref=?').run('Другое сохранённое объяснение','2b:1');
 await assert.rejects(changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:1,action:'publish',draft:complete()}),/разные заголовки или объяснения/);
 assert.equal((await articleRows(db,'Bekhorot',['2b:1']))[0].explanation,'Другое сохранённое объяснение');
});
test('an intervening article write aborts publication and preserves session revision',async()=>{
 const {db,sqlite}=database();await createBatch(db,'alice','Bekhorot','2a',[unit]);
 const original=db.batch.bind(db);db.batch=(async(statements:D1PreparedStatement[])=>{sqlite.prepare("INSERT INTO articles (tractate,ref,title,translation,explanation,provider,author_user_id,created_at,updated_at) VALUES ('Bekhorot','2b:1','Concurrent','','','test','bob','now','new timestamp')").run();return original(statements);}) as typeof db.batch;
 await assert.rejects(changeBatch(db,'alice',{tractate:'Bekhorot',page:'2a',index:0,revision:0,action:'publish',draft:complete()}),/Материал изменился/);
 const rows=await articleRows(db,'Bekhorot',['2a:9','2b:1']);assert.equal(rows.length,1);assert.equal(rows[0].title,'Concurrent');assert.equal((await getBatch(db,'alice','Bekhorot','2a'))!.revision,0);
});

for(const decorated of [false,true]) test(`real phone response ${decorated?'with combined copy/paste damage':''} traverses recovery, schema validation, private save, reopen and publication`,async()=>{
 const {readModelResponse}=await import('../app/responseDiagnostics.ts');
 const fixture=readFileSync(new URL('./fixtures/chullin-105b-phone.txt',import.meta.url),'utf8');
 const raw=decorated?'\ufeff```json\n'+fixture.trim().slice(0,-2).replace('{','{\u00a0')+'\n```':fixture;
 const u:Unit={id:'Chullin 105b:9',boundary:false,parts:[{ref:'105b:9',original:'מקור',rashi:[1,2].map(n=>({ref:`Rashi on Chullin 105b:9:${n}`,original:'רשי'})),tosafot:[]}]};
 const parsed=readModelResponse(raw);assert.ok(parsed.recoveredText);assert.deepEqual(JSON.parse(parsed.recoveredText!),parsed.value);
 const imported=importDraft(u,parsed.value,emptyDraft(u));assert.deepEqual(missingFields(imported),[]);
 const {db}=database();await createBatch(db,'phone-editor','Chullin','105b',[u]);
 await changeBatch(db,'phone-editor',{tractate:'Chullin',page:'105b',action:'draft',index:0,revision:0,draft:imported,rawInput:parsed.recoveredText});
 const reopened=(await getBatch(db,'phone-editor','Chullin','105b'))!;assert.equal(reopened.entries[0].draft.pages[0].rashi.length,2);assert.equal(readModelResponse(reopened.entries[0].rawInput!).recoveredText,undefined);
 await changeBatch(db,'phone-editor',{tractate:'Chullin',page:'105b',action:'publish',index:0,revision:1,draft:reopened.entries[0].draft});
 const rows=await articleRows(db,'Chullin',['105b:9']);assert.equal(rows.length,1);assert.equal(rows[0].title,imported.title);assert.deepEqual(JSON.parse(rows[0].rashi_json),imported.pages[0].rashi);assert.deepEqual(JSON.parse(rows[0].tosafot_json),[]);
 const wrong=structuredClone(parsed.value) as {pages:{rashi:{ref:string}[]}[]};wrong.pages[0].rashi[0].ref='Rashi on Chullin 105b:99:1';assert.throws(()=>importDraft(u,wrong,emptyDraft(u)),/отсутствует в источниках/);
});

test('empty source side cannot create a falsely complete queue',async()=>{
 const {db,sqlite}=database();
 await assert.rejects(()=>createBatch(db,'alice','Nazir','33b',[]),/нет реплик/);
 assert.equal((sqlite.prepare('SELECT count(*) AS n FROM editor_batches').get() as {n:number}).n,0);
});

test('real Nazir Tosafot survives draft reopen and atomic publication without any PDF data',async()=>{
 const sources=JSON.parse(readFileSync(new URL('./fixtures/nazir-sources.json',import.meta.url),'utf8'));
 const link=sources['33a'].links.find((l:{ref:string})=>l.ref==='Tosafot on Nazir 33a:2:1');
 const u:Unit={id:'Nazir 33a:2',boundary:false,parts:[{ref:'33a:2',original:sources['33a'].source.he[1],rashi:[],tosafot:[{ref:link.ref,original:link.he}]}]};
 const {db}=database();let state=await createBatch(db,'alice','Nazir','33a',[u]);
 const draft=importDraft(u,{title:'Тест источника',translation:'Тест перевода',explanation:'Тест объяснения',tosafot:[{ref:link.ref,translation:'Тест полного Тосафот',explanation:'Тест комментария'}]},emptyDraft(u));
 state=await changeBatch(db,'alice',{tractate:'Nazir',page:'33a',revision:state.revision,index:0,action:'draft',draft});
 const reopened=await getBatch(db,'alice','Nazir','33a');assert.equal(reopened!.entries[0].unit.parts[0].tosafot[0].original,link.he);
 state=await changeBatch(db,'alice',{tractate:'Nazir',page:'33a',revision:state.revision,index:0,action:'publish'});
 const rows=await articleRows(db,'Nazir',['33a:2']);assert.deepEqual(JSON.parse(rows[0].tosafot_json),draft.pages[0].tosafot);assert.equal(state.entries[0].published,true);
});
