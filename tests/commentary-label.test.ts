import test from 'node:test';
import assert from 'node:assert/strict';
import {commentaryLabel,commentaryStart,printedRefs} from '../app/printedSources.ts';
import starts from '../app/data/commentary-starts.json' with {type:'json'};
test('concise Russian label points to the start page only when different',()=>{
 assert.equal(commentaryLabel('Nazir','Tosafot on Nazir 32b:3:1'),'на Назир 32b:3:1 (см. на стр.33b)');
 assert.equal(commentaryLabel('Nazir','Rashi on Nazir 34a:3:1'),'на Назир 34a:3:1');
 assert.equal(commentaryLabel('Berakhot','Rashi on Berakhot 2a:1:1'),'на Брахот 2a:1:1');
});
test('incoming continuation keeps its original start; outgoing text gets last number',()=>{
 assert.equal(commentaryStart('Nazir','Tosafot on Nazir 31b:3:1')?.page,'33a');
 assert.equal(commentaryStart('Nazir','Tosafot on Nazir 31b:3:1')?.ordinal,11);
 assert.equal(commentaryLabel('Nazir','Tosafot on Nazir 32b:9:2'),'на Назир 32b:9:2');
 assert.deepEqual(commentaryStart('Nazir','Tosafot on Nazir 32b:10:1'),{page:'33b',kind:'tosafot',ordinal:26,pagesSpanned:['33b','34a']});
 assert.equal(commentaryStart('Nazir','Tosafot on Nazir 31b:10:2')?.ordinal,11);
 assert.ok(printedRefs('Nazir','33b').some(x=>x.ref==='Tosafot on Nazir 31b:10:2'));
});
test('two semantic refs retain the same physical address',()=>{
 assert.deepEqual(commentaryStart('Nazir','Tosafot on Nazir 34a:4:2'),commentaryStart('Nazir','Tosafot on Nazir 34a:8:1'));
 assert.equal(commentaryStart('Nazir','Tosafot on Nazir 34a:8:1')?.ordinal,6);
 assert.equal(Object.keys(starts.Nazir).length,145);
});
test('uncertain order and out-of-scope locations are not fabricated',()=>{
 assert.equal(commentaryStart('Nazir','Rashi on Nazir 31b:1:1')?.ordinal,undefined);
 assert.equal(commentaryStart('Berakhot','Rashi on Berakhot 2a:1:1'),undefined);
 const refs=Object.keys(starts.Nazir).filter(ref=>commentaryStart('Nazir',ref)?.page==='33b');
 assert.deepEqual(refs.map(ref=>commentaryStart('Nazir',ref)!.ordinal).sort((a,b)=>a!-b!),Array.from({length:26},(_,i)=>i+1));
});
