import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { canEdit, registerAndGetRole } from '../../roles';
import { articleRows, BatchError, changeBatch, createBatch, getBatch } from '../../../db/batchStore';
import { buildUnits, continues, loadBundle, pageIdentity } from '../../batchSources';
import type { Bundle } from '../../batchSources';
async function editor(){const user=await getChatGPTUser();if(!user)throw new BatchError('Требуется вход',401);if(!canEdit(await registerAndGetRole(user)))throw new BatchError('Пакеты доступны редакторам',403);return user;}
const failure=(error:unknown)=>{console.error('Editorial batch failed',error instanceof Error?error.message:'unknown');return Response.json({error:error instanceof Error?error.message:'Не удалось сохранить пакет. Повторите попытку.'},{status:error instanceof BatchError?error.status:503});};
export async function GET(request:Request){try{
 const user=await editor(),url=new URL(request.url),tractate=url.searchParams.get('tractate')||'',page=url.searchParams.get('page')||'';
 pageIdentity(tractate,page);return Response.json({batch:await getBatch(env.DB,user.userId,tractate,page)},{headers:{'cache-control':'no-store'}});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const user=await editor(),raw=await request.text();if(raw.length>1500000)throw new BatchError('Ответ слишком большой');let input:Record<string,unknown>;try{input=JSON.parse(raw);}catch{throw new BatchError('Некорректный JSON');}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new BatchError('Некорректный запрос');
 const {tractate,page,action}=input;if(typeof tractate!=='string'||typeof page!=='string'||typeof action!=='string')throw new BatchError('Не указан лист');
 const identity=pageIdentity(tractate,page);
 if(action==='start'){
  const existing=await getBatch(env.DB,user.userId,tractate,page);if(existing)return Response.json({batch:existing});
  const keys=[identity.previous,page,identity.next].filter((p):p is string=>!!p),bundles=await Promise.all(keys.map(key=>loadBundle(tractate,key)));
  // Continue outward when a fragment spans more than two sides. Fail closed at a bounded limit.
  for(let i=0;i<6;i++){
   const left=bundles[0],right=bundles.at(-1)!,prev=pageIdentity(tractate,left.page).previous,next=pageIdentity(tractate,right.page).next;
   const needLeft=left.parts.length===1&&bundles.length>1&&continues(left,bundles[1])&&prev;
   const needRight=right.parts.length===1&&bundles.length>1&&continues(bundles.at(-2)!,right)&&next;
   if(!needLeft&&!needRight)break;if(i===5)throw new BatchError('Слишком длинная составная реплика; подготовьте её отдельно');
   if(needLeft)bundles.unshift(await loadBundle(tractate,needLeft));if(needRight)bundles.push(await loadBundle(tractate,needRight));
  }
  const rows=await articleRows(env.DB,tractate,bundles.flatMap(b=>b.parts.map(p=>p.ref)));
  // A saved unit is authoritative for its membership; fetch any missing source pages.
  const extra=new Set<string>();for(const row of rows)if(row.unit_ref)for(const part of JSON.parse(row.parts_json||'[]') as {ref:string}[]){const key=part.ref.split(':')[0];if(!bundles.some(b=>b.page===key))extra.add(key);}
  if(extra.size>6)throw new BatchError('Нужна отдельная проверка границ составной статьи');
  bundles.push(...await Promise.all([...extra].map(key=>loadBundle(tractate,key))));
  const current=bundles.find(b=>b.page===page) as Bundle,units=buildUnits(tractate,current,bundles,rows);
  return Response.json({batch:await createBatch(env.DB,user.userId,tractate,page,units)});
 }
 if(!Number.isInteger(input.revision)||!Number.isInteger(input.index))throw new BatchError('Не указана версия очереди');
 return Response.json({batch:await changeBatch(env.DB,user.userId,{tractate,page,action,revision:input.revision as number,index:input.index as number,draft:input.draft,nextIndex:input.nextIndex as number|undefined,rawInput:input.rawInput as string|undefined})});
}catch(e){return failure(e);}}
