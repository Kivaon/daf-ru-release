import { TRACTATES } from './talmudCatalog.ts';
import type { SourcePart, Unit, SavedRow } from './batchModel.ts';
export type Bundle={page:string;parts:SourcePart[];he:string[];en:string[]};
const clean=(v:string)=>v.replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
const text=(v:unknown):string=>Array.isArray(v)?v.map(text).join(' '):typeof v==='string'?clean(v):'';
export const refOrder=(a:string,b:string)=>{const parts=(s:string)=>{const m=s.match(/^(\d+)([ab]):(\d+)$/);if(!m)throw new Error('Неверный ref части');return [Number(m[1])*2+(m[2]==='b'?1:0),Number(m[3])];};const x=parts(a),y=parts(b);return x[0]-y[0]||x[1]-y[1];};
export function pageIdentity(tractate:string,page:string){const t=TRACTATES.find(t=>t.sefaria===tractate),m=page.match(/^(\d+)([ab])$/);if(!t||!m)throw new Error('Неизвестный трактат или лист');const n=Number(m[1])*2+(m[2]==='b'?1:0),last=t.lastDaf*2+(t.lastSide==='b'?1:0);if(n<4||n>last)throw new Error('Лист вне трактата');const key=(v:number)=>`${Math.floor(v/2)}${v%2?'b':'a'}`;return {t,previous:n>4?key(n-1):null,next:n<last?key(n+1):null};}
async function json(url:string){const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('Sefaria временно недоступна. Повторите подготовку.');const data=await response.json();if(data&&typeof data==='object'&&'error' in data)throw new Error('Sefaria не вернула полный источник');return data;}
export async function loadBundle(tractate:string,page:string):Promise<Bundle>{
 pageIdentity(tractate,page);const ref=encodeURIComponent(`${tractate}.${page}`);
 const [raw,comparison,links]=await Promise.all([json(`https://www.sefaria.org/api/texts/${ref}/he/Wikisource_Talmud_Bavli?context=0&commentary=0`),json(`https://www.sefaria.org/api/texts/${ref}?context=0&commentary=0`),json(`https://www.sefaria.org/api/links/${ref}?with_text=1`)]);
 const source=raw as {he?:unknown[]},davidson=comparison as {he?:unknown[];text?:unknown[]};
 if(!Array.isArray(source.he)||!Array.isArray(links)||!Array.isArray(davidson.he)||!Array.isArray(davidson.text))throw new Error('Неполный ответ Sefaria; пакет не создан');
 const parts:SourcePart[]=source.he.map((v,i)=>({ref:`${page}:${i+1}`,original:text(v),rashi:[],tosafot:[]})).filter(p=>p.original);
 if(!parts.length)throw new Error('В источнике нет реплик');
 for(const link of links as Record<string,unknown>[]){const name=(link.collectiveTitle as {en?:string})?.en;if(name!=='Rashi'&&name!=='Tosafot')continue;const ref=text(link.ref||link.sourceRef),original=text(link.he),anchor=String(link.anchorRef||'');const m=anchor.match(/(\d+[ab]):(\d+)(?:-(?:(\d+[ab]):)?(\d+))?$/);if(!m)throw new Error('Не удалось определить привязку комментария Sefaria');if(m[1]!==page)continue;if(!original||!ref)throw new Error('Оригинал комментария не получен; попробуйте позже');const end=m[3]&&m[3]!==page?parts.length:Number(m[4]||m[2]);for(const part of parts){const n=Number(part.ref.split(':')[1]);if(n>=Number(m[2])&&n<=end){const target=name==='Rashi'?part.rashi:part.tosafot;if(!target.some(c=>c.ref===ref))target.push({ref,original});}}}
 return {page,parts,he:davidson.he.map(text),en:davidson.text.map(text)};
}
export function continues(left:Bundle,right:Bundle){const ends=(s:string)=>/[.!?׃։][\s"'׳״’”)]*$/.test(s);return !!(left.he.at(-1)&&right.he[0]&&left.en.at(-1)&&right.en[0]&&!ends(left.he.at(-1)!)&&!ends(left.en.at(-1)!)&&/^[^A-Za-z]*[a-z]/.test(right.en[0]));}
export function buildUnits(tractate:string,current:Bundle,bundles:Bundle[],rows:SavedRow[]):Unit[]{
 const all=bundles.flatMap(b=>b.parts),groups=new Map(all.map(p=>[p.ref,new Set([p.ref])]));
 const join=(refs:string[])=>{const combined=new Set<string>();for(const ref of refs){const group=groups.get(ref);if(!group)throw new Error(`Для составной статьи не получен оригинал ${ref}`);group.forEach(r=>combined.add(r));}combined.forEach(ref=>groups.set(ref,combined));};
 const ordered=[...bundles].sort((a,b)=>refOrder(`${a.page}:1`,`${b.page}:1`));
 for(let i=1;i<ordered.length;i++)if(pageIdentity(tractate,ordered[i-1].page).next===ordered[i].page&&continues(ordered[i-1],ordered[i]))join([ordered[i-1].parts.at(-1)!.ref,ordered[i].parts[0].ref]);
 for(const row of rows)if(row.unit_ref){const parts=JSON.parse(row.parts_json||'[]') as {ref:string}[];join(parts.map(p=>p.ref));}
 const units:Unit[]=[],seen=new Set<string>();for(const part of current.parts){const refs=[...groups.get(part.ref)!].sort(refOrder),id=`${tractate} ${refs.join('+')}`;if(seen.has(id))continue;seen.add(id);units.push({id,parts:refs.map(ref=>all.find(p=>p.ref===ref)!),boundary:refs.length>1});}return units;
}
