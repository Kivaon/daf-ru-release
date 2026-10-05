import {pageProgress} from '../app/translationMapModel.ts';
import type {Requirement} from '../app/translationMapModel.ts';
import type {SavedRow} from '../app/batchModel.ts';
import {loadBundle} from '../app/batchSources.ts';
export async function mapProgress(db:D1Database,tractate:string,pages:Record<string,string[]>,allPages:string[]){
 const [articles,caches,drafts]=await Promise.all([
  db.prepare('SELECT ref,title,translation,explanation,unit_ref,parts_json,rashi_json,tosafot_json,updated_at FROM articles WHERE tractate=?').bind(tractate).all<SavedRow>(),
  db.prepare('SELECT requirements_json FROM translation_map_sources WHERE tractate=?').bind(tractate).all<{requirements_json:string}>(),
  // Only aggregate refs leave this query; never return private draft text or owners.
  db.prepare(`SELECT DISTINCT json_extract(part.value,'$.ref') AS ref FROM editor_batches b, json_each(b.state_json,'$.entries') entry, json_each(entry.value,'$.unit.parts') part
   WHERE b.tractate=? AND (length(trim(COALESCE(json_extract(entry.value,'$.rawInput'),'')))>0 OR EXISTS
   (SELECT 1 FROM json_tree(entry.value,'$.draft') field WHERE field.key IN ('title','translation','explanation') AND field.type='text' AND length(trim(field.value))>0))`).bind(tractate).all<{ref:string}>()
 ]);
 const requirements=new Map<string,Requirement>();for(const cache of caches.results)for(const item of JSON.parse(cache.requirements_json) as Requirement[])requirements.set(item.ref,item);
 const draftRefs=new Set(drafts.results.map(r=>r.ref));
 const result=allPages.map(page=>pageProgress(page,pages[page],articles.results,draftRefs,requirements));
 const needed=[...new Set(articles.results.filter(r=>pages[r.ref.split(':')[0]]&&!requirements.has(r.ref)).map(r=>r.ref.split(':')[0]))];
 return {pages:result,pendingPages:needed};
}
export async function cacheMapSources(db:D1Database,tractate:string,page:string,refs:string[]){
 const existing=await db.prepare('SELECT fetched_at FROM translation_map_sources WHERE tractate=? AND page=?').bind(tractate,page).first();if(existing)return;
 const bundle=await loadBundle(tractate,page);
 if(JSON.stringify(bundle.parts.map(p=>p.ref))!==JSON.stringify(refs))throw new Error('Структура источника изменилась; требуется обновить индекс refs карты.');
 const requirements=bundle.parts.map(p=>({ref:p.ref,rashi:p.rashi.map(c=>c.ref),tosafot:p.tosafot.map(c=>c.ref)}));
 await db.prepare('INSERT INTO translation_map_sources (tractate,page,requirements_json,fetched_at) VALUES (?,?,?,?) ON CONFLICT(tractate,page) DO UPDATE SET requirements_json=excluded.requirements_json,fetched_at=excluded.fetched_at').bind(tractate,page,JSON.stringify(requirements),new Date().toISOString()).run();
}
