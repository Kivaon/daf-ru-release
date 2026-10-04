export type Comment = {ref:string;translation:string;explanation:string};
export type SourceComment = {ref:string;original:string};
export type SourcePart = {ref:string;original:string;rashi:SourceComment[];tosafot:SourceComment[]};
export type Unit = {id:string;parts:SourcePart[];boundary:boolean};
export type Draft = {title:string;explanation:string;parts:{ref:string;translation:string}[];pages:{ref:string;rashi:Comment[];tosafot:Comment[]}[]};
export type Entry = {unit:Unit;saved:Draft;draft:Draft;skipped:boolean;started:boolean;published:boolean;rawInput?:string};
export type Batch = {tractate:string;page:string;index:number;entries:Entry[];revision:number;updatedAt?:string};
export type SavedRow = {ref:string;title:string;translation:string;explanation:string;unit_ref:string|null;parts_json:string;rashi_json:string;tosafot_json:string;updated_at:string};
export const filled=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0;
export function emptyDraft(unit:Unit):Draft {
 return {title:'',explanation:'',parts:unit.parts.map(p=>({ref:p.ref,translation:''})),pages:unit.parts.map(p=>({ref:p.ref,rashi:p.rashi.map(c=>({ref:c.ref,translation:'',explanation:''})),tosafot:p.tosafot.map(c=>({ref:c.ref,translation:'',explanation:''}))}))};
}
export function savedDraft(unit:Unit,rows:SavedRow[]):Draft {
 const draft=emptyDraft(unit), relevant=unit.parts.map(p=>rows.find(r=>r.ref===p.ref)).filter((r):r is SavedRow=>!!r);
 draft.title=relevant.find(r=>filled(r.title))?.title||'';draft.explanation=relevant.find(r=>filled(r.explanation))?.explanation||'';
 draft.parts.forEach(part=>{
  for(const row of relevant){const stored=JSON.parse(row.parts_json||'[]') as Draft['parts'];const found=stored.find(p=>p.ref===part.ref);if(filled(found?.translation)){part.translation=found.translation;break;}}
  if(!part.translation){const own=relevant.find(r=>r.ref===part.ref);if(own&&!own.unit_ref)part.translation=own.translation;}
 });
 draft.pages.forEach(page=>{const row=relevant.find(r=>r.ref===page.ref);if(!row)return;for(const key of ['rashi','tosafot'] as const){const stored=JSON.parse(row[`${key}_json`]||'[]') as Comment[];page[key]=page[key].map(c=>({...c,...stored.find(s=>s.ref===c.ref)}));}});
 return draft;
}
/** Existing nonempty published values win; a partial response can only fill gaps. */
export function mergeDraft(base:Draft,addition:Draft):Draft {
 const value=(old:string,next:string|undefined)=>filled(old)?old:next||'';
 return {title:value(base.title,addition.title),explanation:value(base.explanation,addition.explanation),parts:base.parts.map(p=>({...p,translation:value(p.translation,addition.parts.find(x=>x.ref===p.ref)?.translation)})),pages:base.pages.map(p=>({ref:p.ref,...Object.fromEntries((['rashi','tosafot'] as const).map(key=>[key,p[key].map(c=>{const next=addition.pages.find(x=>x.ref===p.ref)?.[key].find(x=>x.ref===c.ref);return {ref:c.ref,translation:value(c.translation,next?.translation),explanation:value(c.explanation,next?.explanation)};})]))})) as Draft['pages']};
}
export function readiness(draft:Draft){
 const gemara=filled(draft.title)&&filled(draft.explanation)&&draft.parts.every(p=>filled(p.translation));
 const comments=(key:'rashi'|'tosafot')=>draft.pages.every(p=>p[key].every(c=>filled(c.translation)&&filled(c.explanation)));
 const rashi=comments('rashi'),tosafot=comments('tosafot');return {gemara,rashi,tosafot,complete:gemara&&rashi&&tosafot};
}
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Ожидается JSON-объект статьи');return v as Record<string,unknown>;};
const string=(v:unknown,max=30000)=>{if(typeof v!=='string')throw new Error('Текстовые поля должны быть строками');if(v.length>max)throw new Error(`Поле превышает ${max} символов; разделите ответ`);return v;};
function array(v:unknown,max:number):unknown[]{if(!Array.isArray(v)||v.length>max)throw new Error('Неверный массив в ответе');return v;}
/** Accept partial patches, but never foreign refs, duplicate refs, or wrong types. */
export function importDraft(unit:Unit,raw:unknown,previous:Draft):Draft {
 const input=object(raw), next=structuredClone(previous);
 for(const key of Object.keys(input))if(!['title','explanation','translation','parts','pages','rashi','tosafot','ref'].includes(key))throw new Error(`Неизвестное поле: ${key}`);
 if(input.ref!==undefined&&!unit.parts.some(p=>p.ref===input.ref))throw new Error('Ответ относится к другой реплике');
 if(input.title!==undefined)next.title=string(input.title,300);
 if(input.explanation!==undefined)next.explanation=string(input.explanation);
 if(input.translation!==undefined){if(unit.parts.length!==1)throw new Error('Для составной реплики нужны переводы parts');next.parts[0].translation=string(input.translation);}
 const patchComments=(value:unknown,allowed:SourceComment[],target:Comment[])=>{
  const seen=new Set<string>();for(const item of array(value,200)){const c=object(item),ref=string(c.ref,300);if(!allowed.some(x=>x.ref===ref)||seen.has(ref))throw new Error(`Неизвестный или повторный ref комментария: ${ref}`);seen.add(ref);const dest=target.find(x=>x.ref===ref)!;for(const key of Object.keys(c))if(!['ref','translation','explanation'].includes(key))throw new Error(`Неизвестное поле комментария: ${key}`);if(c.translation!==undefined)dest.translation=string(c.translation);if(c.explanation!==undefined)dest.explanation=string(c.explanation);}
 };
 if(input.parts!==undefined){const seen=new Set<string>();for(const item of array(input.parts,10)){const p=object(item),ref=string(p.ref,100);if(seen.has(ref)||!unit.parts.some(x=>x.ref===ref))throw new Error(`Неизвестная или повторная часть: ${ref}`);seen.add(ref);for(const key of Object.keys(p))if(!['ref','translation'].includes(key))throw new Error(`Неизвестное поле части: ${key}`);next.parts.find(x=>x.ref===ref)!.translation=string(p.translation);}}
 if(input.pages!==undefined){const seen=new Set<string>();for(const item of array(input.pages,10)){const p=object(item),ref=string(p.ref,100),source=unit.parts.find(x=>x.ref===ref),target=next.pages.find(x=>x.ref===ref);if(!source||!target||seen.has(ref))throw new Error(`Неизвестная или повторная страница: ${ref}`);seen.add(ref);for(const key of Object.keys(p))if(!['ref','rashi','tosafot'].includes(key))throw new Error(`Неизвестное поле страницы: ${key}`);for(const key of ['rashi','tosafot'] as const)if(p[key]!==undefined)patchComments(p[key],source[key],target[key]);}}
 for(const key of ['rashi','tosafot'] as const)if(input[key]!==undefined){if(unit.parts.length!==1)throw new Error('Для составной реплики комментарии должны быть в pages');patchComments(input[key],unit.parts[0][key],next.pages[0][key]);}
 return next;
}
export function missingFields(draft:Draft):string[]{
 const missing:string[]=[];if(!filled(draft.title))missing.push('заголовок');if(!filled(draft.explanation))missing.push('объяснение Гемары');
 draft.parts.forEach(p=>{if(!filled(p.translation))missing.push(`перевод ${p.ref}`);});
 draft.pages.forEach(p=>(['rashi','tosafot'] as const).forEach(key=>p[key].forEach(c=>{if(!filled(c.translation))missing.push(`перевод ${c.ref}`);if(!filled(c.explanation))missing.push(`объяснение ${c.ref}`);})));return missing;
}
export function nextPending(entries:Entry[],current:number):number {
 for(let n=1;n<=entries.length;n++){const i=(current+n)%entries.length;if(!entries[i].skipped&&!entryReady(entries[i]))return i;}return current;
}
export function batchPrompt(tractate:string,entry:Entry):string{
 const draft=mergeDraft(entry.saved,entry.draft);
 return `Подготовь учебную статью DAF-RU на русском. Оригиналы не изменяй и не дополняй. Точный близкий перевод; отдельное краткое объяснение. Для каждого Раши и Тосафот — свой перевод и объяснение. Составную реплику разбери целиком, сохрани перевод каждой части и комментарии обеих сторон под их refs. Заполни только перечисленные недостающие поля. Уже готовые поля не переписывай. Верни только JSON, без Markdown; не добавляй original.\nТрактат: ${tractate}\nИсточники:\n${JSON.stringify(entry.unit.parts)}\nГотовый материал для контекста:\n${JSON.stringify(draft)}\nНедостаёт:\n${missingFields(draft).join('\n')}\nСхема ответа (все refs точно из источников; можно опустить готовые поля):\n{"title":"…","explanation":"…","parts":[{"ref":"…","translation":"…"}],"pages":[{"ref":"…","rashi":[{"ref":"…","translation":"…","explanation":"…"}],"tosafot":[]}]} `;
}

export const entryReady=(entry:Entry)=>entry.published&&readiness(entry.saved).complete;
