import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readingOrder,tokenLeft} from '../app/pdfWordOrder.ts';

test('real-Hebrew items put their first token at the right edge, glyph-coded items keep visual order',()=>{
 assert.equal(tokenLeft(100,60,10,0,4,true),100+60*(1-4/10));
 assert.equal(tokenLeft(100,60,10,5,5,true),100);
 assert.equal(tokenLeft(100,60,10,5,5,false),130);
 assert.equal(tokenLeft(100,40,3,0,3,true),100);
});

test('a lead-in word one point off the baseline stays in its row and rows read right to left',()=>{
 const word=(name:string,left:number,baseline:number,height=10)=>({name,left,top:baseline-height,height,line:0});
 const words=[word('footnote',560,31),word('lead',505,100,14),word('second',482,99),word('third',466,99),word('next-row',500,120),word('other-column',100,99.5)];
 const ordered=readingOrder(words,3.5);
 assert.deepEqual(ordered.map(w=>w.name),['footnote','lead','second','third','other-column','next-row']);
 assert.equal(ordered[1].line,ordered[2].line);assert.equal(ordered[2].line,ordered[3].line);assert.notEqual(ordered[1].line,ordered[5].line);
});
