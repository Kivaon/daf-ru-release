import {test} from 'node:test';
import assert from 'node:assert/strict';
import {centerScroll} from '../app/pdfScroll.ts';

const stage={left:20,top:14,width:900};
const view={width:420,height:500};
// the Gemara zone: replies between x=200 and x=600 of the sheet
const gemara=[{left:200,top:0,width:400,height:20},{left:230,top:700,width:370,height:20}];

test('a reply that fits is put in the middle of the view, across the middle of the Gemara zone',()=>{
 const at=centerScroll(stage,[{left:300,top:600,width:200,height:20},{left:300,top:620,width:200,height:20}],gemara,view);
 assert.equal(at.top,14+620-250);
 assert.equal(at.left,20+400-210);
});

test('a short reply at one edge of the Gemara does not move the view across',()=>{
 const edge=centerScroll(stage,[{left:210,top:600,width:40,height:20}],gemara,view);
 const wide=centerScroll(stage,[{left:210,top:600,width:380,height:20}],gemara,view);
 assert.equal(edge.left,wide.left);
});

test('a reply taller than the view is shown from its beginning',()=>{
 const at=centerScroll(stage,[{left:100,top:300,width:300,height:20},{left:100,top:320,width:300,height:600}],gemara,view);
 assert.equal(at.top,14+300-24);
});

test('a reply near the start of the sheet cannot scroll above the top',()=>{
 assert.equal(centerScroll(stage,[{left:100,top:20,width:50,height:20}],gemara,view).top,0);
});

test('a sheet without a marked reply is shown from the top, centred across',()=>{
 assert.deepEqual(centerScroll(stage,[],[],view),{top:0,left:20+450-210});
});
