import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tokenLeft} from '../app/pdfWordOrder.ts';

test('real-Hebrew items put their first token at the right edge, glyph-coded items keep visual order',()=>{
 assert.equal(tokenLeft(100,60,10,0,4,true),100+60*(1-4/10));
 assert.equal(tokenLeft(100,60,10,5,5,true),100);
 assert.equal(tokenLeft(100,60,10,5,5,false),130);
 assert.equal(tokenLeft(100,40,3,0,3,true),100);
});
