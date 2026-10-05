import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseModelResponse,suggestClosingBrackets} from '../app/parseModelResponse.ts';
test('proposes the missing pages and document closures without changing existing text',()=>{
 const input='{"title":"Псахим — «ор»","parts":[{"ref":"2a:2","translation":"Перевод"}],"pages":[{"ref":"2a:2","rashi":[],"tosafot":[{"ref":"Tosafot on Pesachim 2a:2:1","translation":"Текст","explanation":"Добавлено попутно."}]}';
 assert.throws(()=>parseModelResponse(input));const result=suggestClosingBrackets(input)!;
 assert.equal(result.suffix,']}');assert.equal(result.text,input+']}');assert.equal((parseModelResponse(result.text) as {pages:unknown[]}).pages.length,1);
});
test('does not guess text, missing values, punctuation, numbers or mismatched brackets',()=>{
 for(const input of ['{"translation":"обрыв','{"x":','{"x":tru','{"x":12','{"x":1e','{"x":"done",','{"x":[}', '{"x":"a" "y":"b"','{"x":"escape\\','{"x":[]}','{"x":["a",'])assert.equal(suggestClosingBrackets(input),null,input);
});
test('ignores brackets and escaped quotations within complete strings',()=>{
 const input=JSON.stringify({translation:'Скобки ] } [ { и "кавычки" \\ конец'}).slice(0,-1)+'\n';
 const result=suggestClosingBrackets(input)!;assert.equal(result.text,input+'}');assert.deepEqual(JSON.parse(result.text),{translation:'Скобки ] } [ { и "кавычки" \\ конец'});
});
