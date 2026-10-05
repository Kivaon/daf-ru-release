import {allReady,sendMail} from './mailJobs.ts';
import type {MailConfig} from './mailJobs.ts';
import type {SavedRow} from '../app/batchModel.ts';
import type {Requirement} from '../app/translationMapModel.ts';
import {loadBundle} from '../app/batchSources.ts';
import {TRACTATES} from '../app/talmudCatalog.ts';
export async function deliverMail(db:D1Database,config:MailConfig){
 if(!config.MAILJET_API_KEY||!config.MAILJET_SECRET_KEY)return;
 const now=Date.now(),job=await db.prepare("SELECT * FROM mail_jobs WHERE status='pending' AND next_at<=? ORDER BY created_at LIMIT 1").bind(now).first<{id:string;tractate:string;refs_json:string;before_json:string;attempts:number}>();
 if(!job)return;const lease=crypto.randomUUID();
 const claim=await db.prepare("UPDATE mail_jobs SET lease=?,next_at=? WHERE id=? AND status='pending' AND next_at<=?").bind(lease,now+60000,job.id,now).run();if(claim.meta.changes!==1)return;
 try{
  const refs=JSON.parse(job.refs_json) as string[],rows=(await db.prepare('SELECT * FROM articles WHERE tractate=? AND ref IN (SELECT value FROM json_each(?))').bind(job.tractate,job.refs_json).all<SavedRow>()).results;
  const requirements=new Map<string,Requirement>();
  for(const page of new Set(refs.map(ref=>ref.split(':')[0]))){
   const cached=await db.prepare('SELECT requirements_json FROM translation_map_sources WHERE tractate=? AND page=?').bind(job.tractate,page).first<{requirements_json:string}>();
   let items:Requirement[];
   if(cached)items=JSON.parse(cached.requirements_json);else{
    const bundle=await loadBundle(job.tractate,page);items=bundle.parts.map(p=>({ref:p.ref,rashi:p.rashi.map(c=>c.ref),tosafot:p.tosafot.map(c=>c.ref)}));
    await db.prepare('INSERT INTO translation_map_sources(tractate,page,requirements_json,fetched_at) VALUES(?,?,?,?) ON CONFLICT(tractate,page) DO NOTHING').bind(job.tractate,page,JSON.stringify(items),new Date().toISOString()).run();
   }for(const item of items)requirements.set(item.ref,item);
  }
  if(allReady(refs,JSON.parse(job.before_json),requirements)){
   await db.prepare("UPDATE mail_jobs SET status='suppressed',lease=NULL,error=NULL WHERE id=? AND lease=?").bind(job.id,lease).run();return;
  }
  if(!allReady(refs,rows,requirements)){
   await db.prepare('UPDATE mail_jobs SET lease=NULL,next_at=? WHERE id=? AND lease=?').bind(now+86400000,job.id,lease).run();return;
  }
  const author=await db.prepare('SELECT name FROM users WHERE user_id=(SELECT author_user_id FROM articles WHERE tractate=? AND ref=?)').bind(job.tractate,refs[0]).first<{name:string}>();
  const tractate=TRACTATES.find(t=>t.sefaria===job.tractate)?.ru||job.tractate;
  const link=`https://daf-ru.mffkk78khq.chatgpt.site/?tractate=${encodeURIComponent(job.tractate)}&daf=${refs[0].split(':')[0]}`;
  const messageId=await sendMail(config,job.id,`DAF-RU: ${tractate} ${refs.join(', ')} — статья готова`,`${rows[0].title}\n\nТрактат: ${tractate}\nРеплики: ${refs.join(', ')}\nРедактор: ${author?.name||'Редактор DAF-RU'}\n\nПеревод, объяснение и предусмотренные источником комментарии заполнены.\n\nОткрыть страницу: ${link}`);
  await db.prepare("UPDATE mail_jobs SET status='sent',message_id=?,lease=NULL,error=NULL WHERE id=? AND lease=?").bind(messageId,job.id,lease).run();
 }catch(error){
  await db.prepare('UPDATE mail_jobs SET attempts=attempts+1,error=?,lease=NULL,next_at=? WHERE id=? AND lease=?').bind(error instanceof Error?error.message.slice(0,400):'Ошибка отправки',now+Math.min(86400000,60000*2**Math.min(job.attempts,10)),job.id,lease).run();
 }
}
