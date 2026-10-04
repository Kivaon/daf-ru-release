import { filled, emptyDraft, importDraft, mergeDraft, savedDraft, missingFields, nextPending } from '../app/batchModel.ts';
import type { Batch, SavedRow, Unit } from '../app/batchModel.ts';
export class BatchError extends Error { status:number;constructor(message:string,status=400){super(message);this.status=status;} }
function serialize(state:Batch){const value=JSON.stringify(state);if(new TextEncoder().encode(value).length>1800000)throw new BatchError('Пакет слишком большой; подготовьте статьи отдельно');return value;}
export async function articleRows(db:D1Database,tractate:string,refs:string[]):Promise<SavedRow[]>{
 return (await db.prepare('SELECT * FROM articles WHERE tractate = ? AND ref IN (SELECT value FROM json_each(?))').bind(tractate,JSON.stringify([...new Set(refs)])).all<SavedRow>()).results;
}
export async function getBatch(db:D1Database,userId:string,tractate:string,page:string):Promise<Batch|null>{
 const row=await db.prepare('SELECT state_json, revision, updated_at FROM editor_batches WHERE user_id=? AND tractate=? AND page=?').bind(userId,tractate,page).first<{state_json:string;revision:number;updated_at:string}>();
 if(!row)return null;const state=JSON.parse(row.state_json) as Batch;state.revision=row.revision;state.updatedAt=row.updated_at;return refreshBatch(db,state);
}
export async function refreshBatch(db:D1Database,state:Batch){
 const rows=await articleRows(db,state.tractate,state.entries.flatMap(e=>e.unit.parts.map(p=>p.ref)));
 for(const entry of state.entries){entry.saved=savedDraft(entry.unit,rows);entry.draft=mergeDraft(entry.saved,entry.draft);entry.published=entry.unit.parts.every(p=>rows.some(r=>r.ref===p.ref));}return state;
}
export async function createBatch(db:D1Database,userId:string,tractate:string,page:string,units:Unit[]):Promise<Batch>{
 const state:Batch={tractate,page,index:0,revision:0,entries:units.map(unit=>({unit,saved:emptyDraft(unit),draft:emptyDraft(unit),skipped:false,started:false,published:false}))};
 await refreshBatch(db,state);state.index=nextPending(state.entries,state.entries.length-1);
 await db.prepare('INSERT INTO editor_batches (id,user_id,tractate,page,state_json,revision,updated_at) VALUES (?,?,?,?,?,0,?) ON CONFLICT(user_id,tractate,page) DO NOTHING').bind(crypto.randomUUID(),userId,tractate,page,serialize(state),new Date().toISOString()).run();
 return (await getBatch(db,userId,tractate,page))!;
}
export async function changeBatch(db:D1Database,userId:string,input:{tractate:string;page:string;revision:number;index:number;action:string;draft?:unknown;nextIndex?:number;rawInput?:string}):Promise<Batch>{
 const state=await getBatch(db,userId,input.tractate,input.page);
 if(!state)throw new BatchError('Пакет не найден',404);
 if(state.revision!==input.revision)throw new BatchError('Очередь изменена в другом окне. Скопируйте несохранённый ответ и загрузите свежую очередь.',409);
 if(!Number.isInteger(input.index)||!state.entries[input.index])throw new BatchError('Неизвестная статья');
 const entry=state.entries[input.index];
 if(input.draft!==undefined){entry.draft=mergeDraft(entry.saved,importDraft(entry.unit,input.draft,entry.draft));entry.started=true;}
 if(input.rawInput!==undefined){if(typeof input.rawInput!=='string'||input.rawInput.length>300000)throw new BatchError('Ответ слишком большой');entry.rawInput=input.rawInput;}
 const statements:D1PreparedStatement[]=[];
 let guards='',guardValues:(string|null)[]=[];
 const now=new Date().toISOString(),token=crypto.randomUUID(),revision=state.revision+1;
 const ownerClause='user_id=? AND tractate=? AND page=? AND revision=? AND write_token=?';
 if(input.action==='publish'){
  const missing=missingFields(entry.draft);if(missing.length)throw new BatchError(`Не заполнено: ${missing.slice(0,8).join('; ')}${missing.length>8?'…':''}`);
  const rows=await articleRows(db,state.tractate,entry.unit.parts.map(p=>p.ref));
  // Re-read immediately before the guarded transaction. Published text wins.
  entry.draft=mergeDraft(savedDraft(entry.unit,rows),entry.draft);
  const refs=entry.unit.parts.map(p=>p.ref),unitRef=refs.length>1?`${state.tractate} ${refs[0]}-${refs.at(-1)}`:null;
  for(const row of rows){const old=JSON.parse(row.parts_json||'[]') as {ref:string}[];if(row.unit_ref&&old.some(p=>!refs.includes(p.ref)))throw new BatchError('Границы сохранённой статьи изменились. Откройте её отдельно; пакет не будет разрывать составную статью.',409);}
  // A common article must never silently reconcile conflicting published copies.
  for(const key of ['title','explanation'] as const){if(new Set(rows.map(r=>r[key]).filter(filled)).size>1)throw new BatchError('Сохранённые части имеют разные заголовки или объяснения. Согласуйте их в обычном редакторе перед дополнением пакета.',409);}
  for(const ref of refs){const values=rows.flatMap(r=>{const parts=JSON.parse(r.parts_json||'[]') as {ref:string;translation:string}[];return [...parts.filter(p=>p.ref===ref).map(p=>p.translation),...(r.ref===ref&&!r.unit_ref?[r.translation]:[])];}).filter(filled);if(new Set(values).size>1)throw new BatchError('Сохранённые копии перевода расходятся. Согласуйте их в обычном редакторе перед дополнением пакета.',409);}
  guards=refs.map(()=> ' AND (SELECT updated_at FROM articles WHERE tractate=? AND ref=?) IS ?').join('');
  guardValues=refs.flatMap(ref=>[state.tractate,ref,rows.find(r=>r.ref===ref)?.updated_at??null]);
  const sql=`INSERT INTO articles (tractate,ref,title,translation,explanation,unit_ref,parts_json,rashi_json,tosafot_json,provider,author_user_id,created_at,updated_at)
   SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM editor_batches WHERE ${ownerClause})
   ON CONFLICT(tractate,ref) DO UPDATE SET title=excluded.title,translation=excluded.translation,explanation=excluded.explanation,unit_ref=excluded.unit_ref,parts_json=excluded.parts_json,rashi_json=excluded.rashi_json,tosafot_json=excluded.tosafot_json,provider=excluded.provider,author_user_id=excluded.author_user_id,updated_at=excluded.updated_at`;
  for(const page of entry.draft.pages){
   const row=rows.find(r=>r.ref===page.ref);
   // Keep even historical comments no longer returned by the current source.
   const comments=(key:'rashi'|'tosafot')=>{const old:typeof page.rashi=JSON.parse(row?.[`${key}_json`]||'[]');return [...page[key],...old.filter(c=>!page[key].some(n=>n.ref===c.ref))];};
   statements.push(db.prepare(sql).bind(state.tractate,page.ref,entry.draft.title,entry.draft.parts.map(p=>p.translation).join(' '),entry.draft.explanation,unitRef,JSON.stringify(refs.length>1?entry.draft.parts:[]),JSON.stringify(comments('rashi')),JSON.stringify(comments('tosafot')),'Редактор · пакет',userId,now,now,userId,state.tractate,state.page,revision,token));
  }
  entry.rawInput='';entry.saved=structuredClone(entry.draft);entry.published=true;entry.skipped=false;entry.started=false;state.index=nextPending(state.entries,input.index);
 }else if(input.action==='skip'){entry.skipped=true;state.index=nextPending(state.entries,input.index);}
 else if(input.action==='select'){if(!Number.isInteger(input.nextIndex)||!state.entries[input.nextIndex!])throw new BatchError('Неизвестный пункт очереди');state.index=input.nextIndex!;state.entries[state.index].skipped=false;}
 else if(input.action==='draft'){state.index=input.index;entry.skipped=false;}
 else throw new BatchError('Неизвестное действие');
 state.revision=revision;state.updatedAt=now;
 const serialized=serialize(state);
 const update=db.prepare(`UPDATE editor_batches SET state_json=?,revision=?,write_token=?,updated_at=? WHERE user_id=? AND tractate=? AND page=? AND revision=?${guards}`).bind(serialized,revision,token,now,userId,state.tractate,state.page,input.revision,...guardValues);
 const result=await db.batch([update,...statements]);
 if(result[0].meta.changes!==1)throw new BatchError('Материал изменился в другом окне. Введённый текст сохранён на экране; загрузите свежую очередь.',409);
 return state;
}
