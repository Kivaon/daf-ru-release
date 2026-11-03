import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {queueUserMail,userMailMessage,deliverUserMail} from '../db/userMail.ts';

const migrate=(sql:DatabaseSync,files:string[])=>{for(const file of files)sql.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));};
const wrap=(sql:DatabaseSync)=>({prepare(query:string){const run=(args:unknown[])=>{const r=sql.prepare(query).run(...args as never[]);return {meta:{changes:Number(r.changes)}};};
 return {bind(...args:unknown[]){return {run:async()=>run(args),first:async()=>sql.prepare(query).get(...args as never[])??null};}};}}) as unknown as D1Database;
const user={userId:'cf:a@example.com',email:'a@example.com',name:'Анна'};
const config={MAILJET_API_KEY:'k',MAILJET_SECRET_KEY:'s'};

test('migration backfills existing users as already welcomed, new users are queued once',async()=>{
 const sql=new DatabaseSync(':memory:');migrate(sql,['0002_user_roles']);
 sql.exec("INSERT INTO users(user_id,email,name,role,created_at,updated_at) VALUES('cf:old@example.com','old@example.com','Old','reader','t','t')");
 migrate(sql,['0006_user_mail']);const db=wrap(sql);
 assert.deepEqual(sql.prepare('SELECT status,message_id FROM user_mail_jobs').all().map(r=>({...r})),[{status:'sent',message_id:'backfill'}]);
 await queueUserMail(db,'welcome',user).run();await queueUserMail(db,'welcome',user).run();
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM user_mail_jobs WHERE status='pending'").get()!.n,1);
 await queueUserMail(db,'editor',user,'2026-01-01').run();await queueUserMail(db,'editor',user,'2026-01-01').run();await queueUserMail(db,'editor',user,'2026-02-01').run();
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM user_mail_jobs WHERE kind='editor'").get()!.n,2);
});

test('letters carry a short instruction, the site address and no secrets',()=>{
 const welcome=userMailMessage('welcome','Анна','https://daf-ru.kivaon.workers.dev/some/path'),editor=userMailMessage('editor','Анна','https://daf-ru.kivaon.workers.dev');
 assert.match(welcome.subject,/подключены/);assert.match(welcome.body,/Здравствуйте, Анна!/);assert.match(welcome.body,/https:\/\/daf-ru\.kivaon\.workers\.dev\./);assert.doesNotMatch(welcome.body,/some\/path/);
 assert.match(editor.subject,/право редактора/);for(const letter of [welcome,editor])assert.match(letter.body,/\n\nКоманда DAF-RU\n$/);assert.match(editor.body,/Подготовить весь лист/);assert.match(editor.body,/Сохранить и дальше/);
 for(const name of ['  ','a@b.example'])assert.match(userMailMessage('welcome',name,'https://x.example').body,/^Здравствуйте!\n/);
});

test('delivery sends to the user address once, retries failures and gives up after the limit',async()=>{
 const sql=new DatabaseSync(':memory:');migrate(sql,['0002_user_roles','0006_user_mail']);const db=wrap(sql);
 await queueUserMail(db,'welcome',user).run();
 const sent:Record<string,unknown>[]=[];
 const ok=(async(_u:unknown,o:RequestInit)=>{sent.push(JSON.parse(o.body as string));return Response.json({Messages:[{Status:'success',To:[{MessageUUID:'u1'}]}]});}) as typeof fetch;
 await deliverUserMail(db,config,'https://site.example',ok);await deliverUserMail(db,config,'https://site.example',ok);
 assert.equal(sent.length,1);const message=(sent[0].Messages as Record<string,unknown>[])[0];assert.deepEqual(message.To,[{Email:'a@example.com'}]);
 assert.equal(sql.prepare('SELECT status FROM user_mail_jobs').get()!.status,'sent');
 await deliverUserMail(db,{},'https://site.example',ok);assert.equal(sent.length,1);
 sql.exec('DELETE FROM user_mail_jobs');await queueUserMail(db,'editor',user,'k').run();
 const bad=(async()=>Response.json({Messages:[{Status:'error',Errors:[{ErrorCode:'x'}]}]},{status:400})) as typeof fetch;
 await deliverUserMail(db,config,'https://site.example',bad);
 let row=sql.prepare('SELECT status,attempts,lease FROM user_mail_jobs').get()!;assert.deepEqual({...row},{status:'pending',attempts:1,lease:null});
 for(let i=0;i<10;i++){sql.exec('UPDATE user_mail_jobs SET next_at=0');await deliverUserMail(db,config,'https://site.example',bad);}
 row=sql.prepare('SELECT status,attempts FROM user_mail_jobs').get()!;assert.equal(row.status,'failed');assert.equal(row.attempts,8);
});
