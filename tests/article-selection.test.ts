import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleForSelection, readArticleResponse } from '../app/articleSelection.ts';

test('same short ref from another tractate never supplies the visible article or editor',()=>{
  const article={tractate:'Bekhorot',ref:'2a:3',translation:'saved translation'};
  assert.equal(articleForSelection(article,'Berakhot','2a:3'),null);
  assert.equal(articleForSelection(article,'Bekhorot','2a:4'),null);
  assert.equal(articleForSelection(article,'Bekhorot','2a:3'),article);
  assert.equal(articleForSelection(null,'Bekhorot','2a:3'),null);
});
test('an empty database result differs from a failed or malformed response',async()=>{
  assert.equal(await readArticleResponse(Response.json({article:null}),'2a:3'),null);
  for(const response of [new Response('',{status:500}),Response.json({}),new Response('invalid'),Response.json({article:{ref:'2a:4'}})]) {
    await assert.rejects(readArticleResponse(response,'2a:3'));
  }
  assert.deepEqual(await readArticleResponse(Response.json({article:{ref:'2a:3',title:'saved'}}),'2a:3'),{ref:'2a:3',title:'saved'});
});
