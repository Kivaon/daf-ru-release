import {sendMail} from './mailJobs.ts';
import type {MailConfig} from './mailJobs.ts';

export type UserMailKind='welcome'|'editor';
type MailUser={userId:string;email:string;name:string};
const CONTACT='pitronot@proton.me',MAX_ATTEMPTS=8;

// Idempotent: a repeated key for the same letter is ignored. `key` lets a later promotion send again.
export function queueUserMail(db:D1Database,kind:UserMailKind,user:MailUser,key=''){
 return db.prepare('INSERT INTO user_mail_jobs(id,user_id,email,name,kind,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
  .bind(`${kind}:${user.userId}${key?':'+key:''}`,user.userId,user.email,user.name,kind,new Date().toISOString());
}

export function userMailMessage(kind:UserMailKind,name:string,origin:string){
 const site=new URL(origin).origin,who=name.trim()||'коллега';
 if(kind==='welcome')return {
  subject:'DAF-RU — вы подключены',
  body:`Здравствуйте, ${who}!

Вы подключены к DAF-RU — базе знаний для подготовки к изучению Гемары на русском языке: оригинал, перевод, краткое объяснение и комментарии Раши и Тосафот.

Как пользоваться
1. Откройте ${site}.
2. Выберите трактат и лист, затем нужную реплику.
3. Читайте оригинал, перевод, объяснение и комментарии. Можно открыть PDF оригинала листа для печати.

Сейчас у вас доступ для чтения. Чтобы добавлять переводы и пояснения, попросите администратора выдать право редактора: вы получите отдельное письмо с инструкцией.

Вход на сайт — по коду, который приходит на эту почту.

Вопросы: ${CONTACT}
`};
 return {
  subject:'DAF-RU — вам выдано право редактора',
  body:`Здравствуйте, ${who}!

Администратор выдал вам право редактора DAF-RU: теперь вы можете добавлять переводы и пояснения.

Как работать
1. Войдите на ${site} и откройте нужный лист.
2. Нажмите «Подготовить весь лист»: откроется очередь реплик листа с оригиналами.
3. «1. Скопировать задание для AI» — вставьте задание в выбранную модель (ChatGPT, Claude и т. п.).
4. «2. Вставьте ответ AI» — вставьте ответ модели в это поле, он разберётся автоматически.
5. Проверьте и при необходимости поправьте перевод и объяснение.
   «Сохранить черновик» — черновик виден только вам.
   «Сохранить и дальше» — публикует реплику и открывает следующую.
   «Пропустить» — пропустить реплику.
6. «Карта перевода» в верхней панели показывает, какие листы уже подготовлены.

Опубликованные материалы видны всем пользователям, поэтому публикуйте только проверенный текст.

Вопросы: ${CONTACT}
`};
}

export async function deliverUserMail(db:D1Database,config:MailConfig,siteOrigin:string,fetcher:typeof fetch=fetch){
 if(!config.MAILJET_API_KEY||!config.MAILJET_SECRET_KEY)return;
 const now=Date.now(),job=await db.prepare("SELECT * FROM user_mail_jobs WHERE status='pending' AND next_at<=? ORDER BY created_at LIMIT 1").bind(now).first<{id:string;email:string;name:string;kind:UserMailKind;attempts:number}>();
 if(!job)return;const lease=crypto.randomUUID();
 const claim=await db.prepare("UPDATE user_mail_jobs SET lease=?,next_at=? WHERE id=? AND status='pending' AND next_at<=?").bind(lease,now+60000,job.id,now).run();if(claim.meta.changes!==1)return;
 try{
  if(!job.email.includes('@')){await db.prepare("UPDATE user_mail_jobs SET status='failed',lease=NULL,error=? WHERE id=? AND lease=?").bind('Нет адреса почты',job.id,lease).run();return;}
  const message=userMailMessage(job.kind,job.name,siteOrigin);
  const messageId=await sendMail(config,job.id,message.subject,message.body,fetcher,job.email);
  await db.prepare("UPDATE user_mail_jobs SET status='sent',message_id=?,lease=NULL,error=NULL WHERE id=? AND lease=?").bind(messageId,job.id,lease).run();
 }catch(error){
  const attempts=job.attempts+1,text=error instanceof Error?error.message.slice(0,400):'Ошибка отправки';
  await db.prepare('UPDATE user_mail_jobs SET attempts=?,status=?,error=?,lease=NULL,next_at=? WHERE id=? AND lease=?').bind(attempts,attempts>=MAX_ATTEMPTS?'failed':'pending',text,now+Math.min(86400000,60000*2**Math.min(job.attempts,10)),job.id,lease).run();
 }
}
