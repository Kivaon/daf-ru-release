import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articleMailLink,mailTestMessage} from '../db/mailLinks.ts';

test('notification links use the serving origin and encode source addresses',()=>{
 const url=new URL(articleMailLink('https://reader.example.test/api/articles','Avodah Zarah','11b:12'));
 assert.equal(url.origin,'https://reader.example.test');
 assert.equal(url.pathname,'/');
 assert.equal(url.searchParams.get('tractate'),'Avodah Zarah');
 assert.equal(url.searchParams.get('daf'),'11b');
});

test('migration test campaign differs across origins but stays stable across repeated visits',()=>{
 const old=mailTestMessage('https://old.example.test');
 const current=mailTestMessage('https://new.example.test');
 assert.notEqual(old.id,current.id);
 assert.deepEqual(current,mailTestMessage('https://new.example.test/notifications'));
 assert.ok(current.body.endsWith('https://new.example.test/translation-map'));
 assert.ok(!current.body.includes('old.example.test'));
});
