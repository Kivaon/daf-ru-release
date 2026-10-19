import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyAccessJwt,readCookie,normalizeTeamDomain,type Jwk} from '../app/cfAccess.ts';

const b64=(data:ArrayBuffer|string)=>Buffer.from(typeof data==='string'?data:new Uint8Array(data)).toString('base64url');
const TEAM='daf.cloudflareaccess.com', AUD='aud-123';
async function setup(){
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...(await crypto.subtle.exportKey('jwk',pair.publicKey)),kid:'k1'} as Jwk;
 const sign=async(payload:Record<string,unknown>,header:Record<string,unknown>={alg:'RS256',kid:'k1'})=>{
  const head=b64(JSON.stringify(header)), body=b64(JSON.stringify(payload));
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(sig)}`;
 };
 return {jwk,sign,fetchKeys:async()=>[jwk]};
}
const now=1_800_000_000;
const good={iss:`https://${TEAM}`,aud:[AUD],exp:now+600,email:'Reader@Example.com',name:'Reader'};

test('валидный токен даёт email в нижнем регистре и имя',async()=>{
 const {sign,fetchKeys}=await setup();
 const id=await verifyAccessJwt(await sign(good),{teamDomain:TEAM,audience:AUD},fetchKeys,now);
 assert.deepEqual(id,{email:'reader@example.com',name:'Reader'});
});
test('отклоняются: чужой audience, issuer, истёкший, чужая подпись, alg none',async()=>{
 const {sign,fetchKeys}=await setup(), other=await setup();
 const cfg={teamDomain:TEAM,audience:AUD};
 assert.equal(await verifyAccessJwt(await sign({...good,aud:['other']}),cfg,fetchKeys,now),null);
 assert.equal(await verifyAccessJwt(await sign({...good,iss:'https://evil.example'}),cfg,fetchKeys,now),null);
 assert.equal(await verifyAccessJwt(await sign({...good,exp:now-1}),cfg,fetchKeys,now),null);
 assert.equal(await verifyAccessJwt(await other.sign(good),cfg,fetchKeys,now),null);
 assert.equal(await verifyAccessJwt(await sign(good,{alg:'none',kid:'k1'}),cfg,fetchKeys,now),null);
 assert.equal(await verifyAccessJwt(await sign({...good,email:''}),cfg,fetchKeys,now),null);
});
test('ошибка загрузки ключей и пустая конфигурация — не авторизован',async()=>{
 const {sign}=await setup();
 const token=await sign(good);
 assert.equal(await verifyAccessJwt(token,{teamDomain:TEAM,audience:AUD},async()=>{throw new Error('down')},now),null);
 assert.equal(await verifyAccessJwt(token,{teamDomain:'',audience:AUD},async()=>[],now),null);
 assert.equal(await verifyAccessJwt('a.b',{teamDomain:TEAM,audience:AUD},async()=>[],now),null);
});
test('cookie и домен команды',()=>{
 assert.equal(readCookie('a=1; CF_Authorization=tok.en; b=2','CF_Authorization'),'tok.en');
 assert.equal(readCookie(null,'x'),null);
 assert.equal(normalizeTeamDomain('https://Daf.cloudflareaccess.com/'),TEAM);
});
