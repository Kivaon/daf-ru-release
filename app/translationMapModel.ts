import type {PrintedRef} from './printedSources.ts';
import type {SavedRow, Comment} from './batchModel.ts';
import {filled} from './batchModel.ts';
import {TRACTATES} from './talmudCatalog.ts';
import type {Tractate} from './talmudCatalog.ts';
export type Requirement={ref:string;rashi:string[];tosafot:string[]};
export type PageProgress={page:string;total:number|null;ready:number|null;draft:number|null;missing:number|null;complete:boolean;pending:boolean;commentary?:{total:number;ready:number;draft:number;missing:number}};
export function pagesFor(t:Tractate){return Array.from({length:t.lastDaf*2+(t.lastSide==='b'?1:0)-3},(_,i)=>`${Math.floor((i+4)/2)}${i%2?'b':'a'}`);}
export const editorHref=(tractate:string,page:string)=>`/?tractate=${encodeURIComponent(tractate)}&daf=${page}&prepare=1`;
const list=<T,>(value:string):T[]=>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[];}catch{return [];}};
export function pageProgress(page:string,refs:string[]|undefined,rows:SavedRow[],draftRefs:Set<string>,requirements:Map<string,Requirement>):PageProgress{
 if(!refs)return {page,total:null,ready:null,draft:null,missing:null,complete:false,pending:false};
 const byRef=new Map(rows.map(r=>[r.ref,r]));let ready=0,draft=0,pending=false;
 const ownReady=(r:SavedRow):boolean|null=>{
  if(!filled(r.title)||!filled(r.translation)||!filled(r.explanation))return false;
  const source=requirements.get(r.ref);if(!source)return null;
  for(const key of ['rashi','tosafot'] as const){const comments=list<Comment>(r[`${key}_json`]);if(!source[key].every(ref=>comments.some(c=>c.ref===ref&&filled(c.translation)&&filled(c.explanation))))return false;}
  return true;
 };
 for(const ref of refs){
  const row=byRef.get(ref);let done:boolean|null=false;
  if(row){done=ownReady(row);if(row.unit_ref){const parts=list<{ref:string;translation:string}>(row.parts_json);if(parts.length<2||!parts.some(p=>p.ref===ref)||!parts.every(p=>filled(p.translation)&&byRef.get(p.ref)?.unit_ref===row.unit_ref))done=false;
    else {const states=parts.map(p=>ownReady(byRef.get(p.ref)!));done=states.includes(false)?false:states.includes(null)?null:done;}
   }}
  if(done===null)pending=true;else if(done)ready++;else if(row||draftRefs.has(ref))draft++;
 }
 return {page,total:refs.length,ready:pending?null:ready,draft:pending?null:draft,missing:pending?null:refs.length-ready-draft,complete:!pending&&refs.length>0&&ready===refs.length,pending};
}
export function sumProgress(pages:PageProgress[]){
 const known=pages.every(p=>p.total!==null&&p.ready!==null&&p.draft!==null);
 return {known,total:pages.reduce((s,p)=>s+(p.total||0),0),ready:pages.reduce((s,p)=>s+(p.ready||0),0),draft:pages.reduce((s,p)=>s+(p.draft||0),0),complete:pages.filter(p=>p.complete).length,pages:pages.length};
}

export function editorLocation(search:string){const params=new URLSearchParams(search),t=TRACTATES.find(t=>t.sefaria===params.get('tractate')),page=params.get('daf')||'';if(!t||!pagesFor(t).includes(page))return null;return {tractate:t.sefaria,page,daf:Number(page.slice(0,-1)),side:page.slice(-1) as 'a'|'b',prepare:params.get('prepare')==='1'};}

export function printedProgress(page:PageProgress,refs:PrintedRef[],rows:SavedRow[]):PageProgress{
 if(page.total!==0||!refs.length)return page;let ready=0,draft=0;
 for(const item of refs){const row=rows.find(r=>r.ref===item.base),comment=row?list<Comment>(row[`${item.kind}_json`]).find(c=>c.ref===item.ref):undefined;
  if(comment&&filled(comment.translation)&&filled(comment.explanation))ready++;else if(comment&&(filled(comment.translation)||filled(comment.explanation)))draft++;
 }
 return {...page,complete:ready===refs.length,commentary:{total:refs.length,ready,draft,missing:refs.length-ready-draft}};
}
