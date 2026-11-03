import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commentarySizes,sizeOf} from '../app/pdfSizes.ts';

const known=['אין','רחם','שלה','בין','ירכותיה','הלכך','חשיב','הראש','לידה','דבגלוי'];
const text=known.join(' ');
const run=(count:number,height:number,font:string,words:string[])=>Array.from({length:count},(_,i)=>({word:words[i%words.length],height,font}));
const strange=['אלפא','בטא','גמא','דלתא','אפסילון','זטא','איטא','תטא','יוטא','קאפא'];

test('the size whose words are nearly all comment words is the commentary size, whatever it is',()=>{
 const words=[...run(60,9,'f3',known),...run(60,13.5,'f1',strange),...run(60,6.5,'f6',strange)];
 assert.deepEqual([...commentarySizes(words,[{text}],'f1')],[9]);
});

test('the Gemara font does not count even at a size that commentary also uses',()=>{
 const words=[...run(60,11,'f3',known),...run(60,11,'f1',strange)];
 assert.deepEqual([...commentarySizes(words,[{text}],'f1')],[11]);
});

test('a few bold words close in size to the commentary are taken, far ones are not',()=>{
 const words=[...run(60,11,'f3',known),...run(10,11.5,'f9',known),...run(10,13.5,'f8',known)];
 const sizes=commentarySizes(words,[{text}],'f1');
 assert.ok(sizes.has(11)&&sizes.has(11.5));
 assert.ok(!sizes.has(13.5));
});

test('sizes are told to half a point',()=>{
 assert.equal(sizeOf(10.9),11);assert.equal(sizeOf(11.3),11.5);
});
