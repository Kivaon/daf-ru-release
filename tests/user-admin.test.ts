import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {deleteUser} from '../db/userAdmin.ts';

test('deleteUser removes readers and their drafts but protects admins and authors',async()=>{
 const sql=new DatabaseSync(':memory:');
 for(const file of ['0000_amused_newton_destine','0001_spanning_articles','0002_user_roles','0003_editor_batches'])sql.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
 const stmt=(query:string,args:unknown[])=>({run:()=>sql.prepare(query).run(...args as never[]),first:async()=>sql.prepare(query).get(...args as never[])??null});
 const db={prepare:(query:string)=>({bind:(...args:unknown[])=>stmt(query,args)}),batch:async(items:{run:()=>unknown}[])=>items.map(item=>item.run())} as unknown as D1Database;
 const add=(id:string,role:string)=>sql.prepare("INSERT INTO users(user_id,email,name,role,created_at,updated_at) VALUES(?,?,?,?,'t','t')").run(id,id+'@example.com',id,role);
 add('reader','reader');add('author','editor');add('boss','admin');
 sql.prepare("INSERT INTO articles(tractate,ref,title,translation,explanation,provider,author_user_id,created_at,updated_at) VALUES('Nazir','2a:1','t','t','e','p','author','t','t')").run();
 sql.prepare("INSERT INTO editor_batches(id,user_id,tractate,page,state_json,updated_at) VALUES('b','reader','Nazir','2a','{}','t')").run();
 assert.deepEqual(await deleteUser(db,'nobody'),{ok:false,status:404,error:'Пользователь не найден'});
 assert.equal((await deleteUser(db,'boss') as {status:number}).status,403);
 assert.equal((await deleteUser(db,'author') as {status:number}).status,409);
 assert.deepEqual(await deleteUser(db,'reader'),{ok:true});
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM users WHERE user_id='reader'").get()!.n,0);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM editor_batches').get()!.n,0);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM users').get()!.n,2);
});
