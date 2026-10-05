import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {queueMail,mailJobId,allReady,sendMail} from '../db/mailJobs.ts';
import type {SavedRow} from '../app/batchModel.ts';
test('durable job captures state before save, deduplicates composite order and preserves initial snapshot',async()=>{
 const sql=new DatabaseSync(':memory:');for(const file of ['0000_amused_newton_destine','0001_spanning_articles','0005_amazing_pet_avengers'])sql.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8'));
 const db={prepare(query:string){return {bind(...args:never[]){return {run:()=>sql.prepare(query).run(...args)}}}}} as unknown as D1Database;
 await queueMail(db,'Pesachim',['2a:1','2b:1']).run();
 assert.equal(sql.prepare('SELECT before_json FROM mail_jobs').get()!.before_json,'[]');
 await queueMail(db,'Pesachim',['2b:1','2a:1']).run();assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM mail_jobs').get()!.n,1);
 sql.exec("UPDATE mail_jobs SET status='sent'");await queueMail(db,'Pesachim',['2a:1','2b:1']).run();assert.equal(sql.prepare('SELECT status FROM mail_jobs').get()!.status,'sent');
 await queueMail(db,'Pesachim',['3a:1'],'0').run();assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM mail_jobs').get()!.n,1);
 assert.equal(mailJobId('Pesachim',['2a:1','2b:1']),mailJobId('Pesachim',['2b:1','2a:1']));
});
test('readiness requires source comments and all composite siblings',()=>{
 const a:SavedRow={ref:'2a:1',title:'t',translation:'t',explanation:'e',unit_ref:null,parts_json:'[]',rashi_json:'[]',tosafot_json:'[]',updated_at:'now'};
 const req=new Map([[a.ref,{ref:a.ref,rashi:['R1'],tosafot:[]}]]);
 assert.equal(allReady([a.ref],[a],req),false);a.rashi_json=JSON.stringify([{ref:'R1',translation:'r',explanation:'e'}]);assert.equal(allReady([a.ref],[a],req),true);
 assert.equal(allReady([a.ref],[a],new Map()),false);assert.equal(allReady(['2a:1','2b:1'],[a],req),false);
});
test('Mailjet payload uses fixed recipient and stable server-side deduplication; failures are not success',async()=>{
 const payloads:Record<string,unknown>[]=[];const mock=(async(_url:unknown,options:RequestInit)=>{payloads.push(JSON.parse(options.body as string));return Response.json({Messages:[{Status:'success',To:[{MessageUUID:'uuid'}]}]});}) as typeof fetch;
 const config={MAILJET_API_KEY:'test',MAILJET_SECRET_KEY:'test'};
 assert.equal(await sendMail(config,'unit','subject','body',mock),'uuid');await sendMail(config,'unit','subject','body',mock);
 assert.deepEqual(payloads[0],payloads[1]);const message=(payloads[0].Messages as Record<string,unknown>[])[0];assert.equal(message.DeduplicateCampaign,true);assert.deepEqual(message.To,[{Email:'pitronot@proton.me'}]);
 await assert.rejects(sendMail(config,'unit','s','b',(async()=>Response.json({Messages:[{Status:'error',Errors:[{ErrorCode:'sender'}]}]},{status:400})) as typeof fetch),/sender/);
});

test('delivery suppresses existing complete articles and sends a new completion only once',async()=>{
 const {deliverMail}=await import('../db/mailDelivery.ts');
 const sql=new DatabaseSync(':memory:');for(const file of ['0000_amused_newton_destine','0001_spanning_articles','0002_user_roles','0004_flashy_zaladane','0005_amazing_pet_avengers'])sql.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8'));
 const db={prepare(query:string){let args:never[]=[];const stmt={bind(...values:never[]){args=values;return stmt},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}}},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}}};return stmt}} as unknown as D1Database;
 sql.prepare('INSERT INTO translation_map_sources VALUES(?,?,?,?)').run('Pesachim','2a',JSON.stringify([{ref:'2a:1',rashi:[],tosafot:[]}]),'now');
 await queueMail(db,'Pesachim',['2a:1']).run();
 sql.exec("INSERT INTO articles(tractate,ref,title,translation,explanation,provider,author_user_id,created_at,updated_at) VALUES('Pesachim','2a:1','Title','Translation','Explanation','AI','editor','now','now')");
 const original=globalThis.fetch;let calls=0;globalThis.fetch=(async()=>{calls++;return Response.json({Messages:[{Status:'success',To:[{MessageUUID:'id'}]}]})}) as typeof fetch;
 try{
  const config={MAILJET_API_KEY:'test',MAILJET_SECRET_KEY:'test'};
  await deliverMail(db,config);await deliverMail(db,config);assert.equal(calls,1);assert.equal(sql.prepare('SELECT status FROM mail_jobs').get()!.status,'sent');
  sql.exec('DELETE FROM mail_jobs');await queueMail(db,'Pesachim',['2a:1']).run();await deliverMail(db,config);assert.equal(calls,1);assert.equal(sql.prepare('SELECT status FROM mail_jobs').get()!.status,'suppressed');
  sql.exec("DELETE FROM mail_jobs; UPDATE articles SET explanation=''");await queueMail(db,'Pesachim',['2a:1']).run();sql.exec("UPDATE articles SET explanation='Complete'");
  globalThis.fetch=(async()=>Response.json({Messages:[{Status:'error'}]},{status:503})) as typeof fetch;await deliverMail(db,config);
  const job=sql.prepare('SELECT status,attempts,next_at,lease FROM mail_jobs').get()!;assert.equal(job.status,'pending');assert.equal(job.attempts,1);assert.equal(job.lease,null);assert.ok(Number(job.next_at)>Date.now());assert.equal(sql.prepare('SELECT explanation FROM articles').get()!.explanation,'Complete');
 }finally{globalThis.fetch=original;}
});
