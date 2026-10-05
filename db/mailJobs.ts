import type {SavedRow} from '../app/batchModel.ts';
import {pageProgress} from '../app/translationMapModel.ts';
import type {Requirement} from '../app/translationMapModel.ts';

export const mailJobId=(tractate:string,refs:string[])=>JSON.stringify([tractate,[...new Set(refs)].sort()]);
// Must run BEFORE article writes, in the same transaction. The optional guard is
// the batch editor's successful optimistic-lock token, never client SQL.
export function queueMail(db:D1Database,tractate:string,refs:string[],guard='1',bindings:unknown[]=[]){
 return db.prepare(`INSERT INTO mail_jobs(id,tractate,refs_json,before_json,created_at)
 SELECT ?,?,?,COALESCE((SELECT json_group_array(json_object('ref',ref,'title',title,'translation',translation,'explanation',explanation,'unit_ref',unit_ref,'parts_json',parts_json,'rashi_json',rashi_json,'tosafot_json',tosafot_json,'updated_at',updated_at)) FROM articles WHERE tractate=? AND ref IN (SELECT value FROM json_each(?))),'[]'),? WHERE ${guard}
 ON CONFLICT(id) DO UPDATE SET next_at=0 WHERE mail_jobs.status='pending' AND mail_jobs.lease IS NULL`).bind(mailJobId(tractate,refs),tractate,JSON.stringify(refs),tractate,JSON.stringify(refs),new Date().toISOString(),...bindings);
}
export function allReady(refs:string[],rows:SavedRow[],requirements:Map<string,Requirement>){
 return refs.length>0&&refs.every(ref=>pageProgress(ref.split(':')[0],[ref],rows,new Set(),requirements).ready===1);
}
export type MailConfig={MAILJET_API_KEY?:string;MAILJET_SECRET_KEY?:string};
export async function sendMail(config:MailConfig,id:string,subject:string,body:string,fetcher:typeof fetch=fetch){
 if(!config.MAILJET_API_KEY||!config.MAILJET_SECRET_KEY)throw new Error('Mailjet: ключи не настроены');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));
 const campaign='dafru-'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 const response=await fetcher('https://api.mailjet.com/v3.1/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Basic '+btoa(config.MAILJET_API_KEY+':'+config.MAILJET_SECRET_KEY)},signal:AbortSignal.timeout(10000),body:JSON.stringify({Messages:[{From:{Email:'pitronot@proton.me',Name:'DAF-RU'},To:[{Email:'pitronot@proton.me'}],Subject:subject,TextPart:body,CustomCampaign:campaign,DeduplicateCampaign:true}]})});
 const result=await response.json() as {Messages?:{Status:string;To?:{MessageUUID?:string}[];Errors?:{ErrorCode?:string;ErrorMessage?:string}[]}[]};
 const message=result.Messages?.[0];
 if(!response.ok||message?.Status!=='success')throw new Error('Mailjet '+response.status+': '+(message?.Errors?.map(e=>e.ErrorCode||e.ErrorMessage).join('; ')||'отправка не подтверждена').slice(0,300));
 return message.To?.[0]?.MessageUUID||'accepted';
}
