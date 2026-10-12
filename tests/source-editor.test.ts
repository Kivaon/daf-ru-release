import test from 'node:test';
import assert from 'node:assert/strict';
import {includeSourceComments} from '../app/includeSourceComments.ts';
import {printedPages} from '../app/printedSources.ts';
test('source refresh retains translation while adding commentary absent from old article',()=>{
 const saved=[{ref:'old',translation:'Сохранённый перевод'}];
 assert.deepEqual(includeSourceComments(saved,[{ref:'old',translation:''},{ref:'new',translation:''}]),[...saved,{ref:'new',translation:''}]);
 assert.equal(saved.length,1);
});
test('printed page and semantic Sefaria reference remain distinct',()=>{
 assert.deepEqual(printedPages('Nazir','Tosafot on Nazir 32b:3:1'),['33b']);
 assert.deepEqual(printedPages('Nazir','Tosafot on Nazir 32b:9:2'),['33a']);
 assert.deepEqual(printedPages('Nazir','Tosafot on Nazir 31b:3:1'),['33a','33b']);
 assert.deepEqual(printedPages('Berakhot','Tosafot on Berakhot 2a:1:1'),[]);
});
