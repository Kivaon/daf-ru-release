import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {pageProgress,sumProgress,pagesFor,editorHref,editorLocation} from '../app/translationMapModel.ts';
import type {Requirement} from '../app/translationMapModel.ts';
import type {SavedRow} from '../app/batchModel.ts';
import {mapProgress} from '../db/translationMapStore.ts';
import {TRACTATES} from '../app/talmudCatalog.ts';
const row=(ref:string):SavedRow=>({ref,title:'Тема',translation:'Перевод',explanation:'Объяснение',unit_ref:null,parts_json:'[]',rashi_json:'[]',tosafot_json:'[]',updated_at:'now'});
const refs=Array.from({length:10},(_,i)=>`2a:${i+1}`),requirements=new Map<string,Requirement>(refs.map(ref=>[ref,{ref,rashi:[],tosafot:[]}])) ;
test('ten source refs produce exact 40/30/30 proportions independently of translations',()=>{
 const p=pageProgress('2a',refs,refs.slice(0,4).map(row),new Set(refs.slice(4,7)),requirements);
 assert.deepEqual([p.total,p.ready,p.draft,p.missing,p.complete],[10,4,3,3,false]);
 assert.equal(pageProgress('2a',refs,[],new Set(),requirements).total,10);
 assert.equal(pageProgress('2a',refs,refs.map(row),new Set(refs),requirements).complete,true);
});
test('missing explanations/comments are drafts, ready takes precedence and unknown sources are not zeros',()=>{
 const r=row('2a:1');r.rashi_json=JSON.stringify([{ref:'Rashi 1',translation:'текст',explanation:''}]);
 const needs=new Map([['2a:1',{ref:'2a:1',rashi:['Rashi 1'],tosafot:[]}]]);
 assert.equal(pageProgress('2a',['2a:1'],[r],new Set(),needs).draft,1);
 assert.equal(pageProgress('2a',['2a:1'],[row('2a:1')],new Set(),new Map()).ready,null);
 assert.equal(pageProgress('2a',undefined,[],new Set(),needs).total,null);
 assert.equal(pageProgress('2a',[],[],new Set(),needs).complete,false);
});
test('composite fragment is ready only when both sides and their own comments are ready',()=>{
 const a=row('2a:10'),b=row('2b:1');for(const r of [a,b]){r.unit_ref='unit';r.parts_json=JSON.stringify([{ref:a.ref,translation:'a'},{ref:b.ref,translation:'b'}]);}
 const req=new Map([a,b].map(r=>[r.ref,{ref:r.ref,rashi:[],tosafot:[]} ]));
 assert.equal(pageProgress('2a',[a.ref],[a],new Set(),req).ready,0);
 assert.equal(pageProgress('2a',[a.ref],[a,b],new Set(),req).ready,1);
 b.explanation='';assert.equal(pageProgress('2a',[a.ref],[a,b],new Set(),req).draft,1);
});
test('navigation selects exact tractate/page, including empty pages, and validates bounds',()=>{
 const href=editorHref('Bava Metzia','119a'),target=editorLocation(href.slice(1));assert.equal(target?.tractate,'Bava Metzia');assert.equal(target?.page,'119a');assert.equal(target?.prepare,true);
 assert.equal(editorLocation('?tractate=Bava%20Metzia&daf=119b'),null);assert.equal(editorLocation('?tractate=Unknown&daf=2a'),null);
 assert.equal(pagesFor(TRACTATES.find(t=>t.sefaria==='Pesachim')!).length,240);
});
test('source snapshot has refs from source pages, no translation-derived denominators',()=>{
 const data=JSON.parse(readFileSync(new URL('../app/data/source-index.json',import.meta.url),'utf8'));
 for(const t of TRACTATES){const index=data.tractates[t.sefaria];assert.ok(index);for(const [page,items] of Object.entries(index.pages) as [string,string[]][]){assert.ok(pagesFor(t).includes(page));assert.equal(new Set(items).size,items.length);assert.ok(items.every(ref=>ref.startsWith(page+':')));}}
 assert.equal(Object.keys(data.tractates.Pesachim.pages).length,240);assert.equal(Object.values(data.tractates.Pesachim.pages).flat().length,3519);
 assert.ok(data.tractates.Shekalim.error);
});
test('SQL aggregates drafts across editors once and never returns private text or owners',async()=>{
 const sqlite=new DatabaseSync(':memory:');for(const file of ['0000_amused_newton_destine','0001_spanning_articles','0002_user_roles','0003_editor_batches','0004_flashy_zaladane'])sqlite.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8'));
 const state=(translation:string)=>JSON.stringify({entries:[{unit:{parts:[{ref:'2a:1'}]},draft:{title:'',parts:[{ref:'2a:1',translation}],pages:[]},started:true}]});
 for(const [owner,translation] of [['alice','PRIVATE A'],['bob','PRIVATE B'],['empty','']])sqlite.prepare('INSERT INTO editor_batches(id,user_id,tractate,page,state_json,updated_at) VALUES (?,?,?,?,?,?)').run(owner,owner,'Pesachim','2a',state(translation),'now');
 const db={prepare(sql:string){let args:unknown[]=[];const statement={bind(...v:unknown[]){args=v;return statement;},async all(){return {results:sqlite.prepare(sql).all(...args as never[])}}};return statement;}} as unknown as D1Database;
 const result=await mapProgress(db,'Pesachim',{'2a':['2a:1','2a:2']},['2a']);assert.equal(result.pages[0].draft,1);assert.equal(result.pages[0].missing,1);assert.doesNotMatch(JSON.stringify(result),/PRIVATE|alice|bob/);
 sqlite.exec('DELETE FROM editor_batches WHERE user_id != \'empty\'');assert.equal((await mapProgress(db,'Pesachim',{'2a':['2a:1']},['2a'])).pages[0].draft,0);
 assert.equal(sumProgress(result.pages).known,true);
});
