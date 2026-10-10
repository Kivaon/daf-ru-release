import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readModelResponse,diagnoseResponse} from '../app/responseDiagnostics.ts';
import {emptyDraft,importDraft,missingFields} from '../app/batchModel.ts';
const unit={id:'u',boundary:false,parts:[{ref:'2a:2',original:'מקור',rashi:[{ref:'Rashi on Pesachim 2a:2:1',original:'מקור'}],tosafot:[]}]};
test('automatic closures feed validated import without completing missing content',()=>{
 const text='{"title":"Тема","parts":[{"ref":"2a:2","translation":"Текст"}],"pages":[{"ref":"2a:2","rashi":[]}';
 const parsed=readModelResponse(text);assert.equal(parsed.suffix,']}');
 const draft=importDraft(unit,parsed.value,emptyDraft(unit));assert.equal(draft.title,'Тема');assert.ok(missingFields(draft).includes('объяснение Rashi on Pesachim 2a:2:1'));
 assert.throws(()=>readModelResponse('{"translation":"оборван'),/Не закрыта строка/);
});
test('diagnosis identifies nested field, ref and position without browser-specific errors',()=>{
 const result=diagnoseResponse('{\n"rashi":[{"ref":"Rashi on Pesachim 2a:2:1","translation":"обрыв');
 assert.match(result,/rashi\[0\].translation/);assert.match(result,/Ref: Rashi on Pesachim 2a:2:1/);assert.match(result,/Строка 2, столбец/);assert.match(result,/▸/);
});
test('diagnosis distinguishes punctuation, escapes, extra content, wrappers and incomplete values',()=>{
 for(const [input,expected] of [['{"title":"a" "explanation":"b"}',/запятая/],['{"x" "y"}',/двоеточие/],['{"x":[1}',/Несовпадающая скобка/],['{"x":1,}',/Лишняя запятая/],['{"x":"a\\q"}',/escape/],['{"x":"a\nb"}',/перенос/],['{} }',/лишний текст/],['```json\n{}\n```',/Markdown/],['{"x":',/отсутствует значение/]] as const)assert.match(diagnoseResponse(input),expected);
});
test('valid and smart-quoted responses preserve text, schema errors name the field and ref',()=>{
 assert.deepEqual(readModelResponse('{"title":"[text]"}'),{value:{title:'[text]'},suffix:''});
 assert.equal((readModelResponse('{“title”:“Тема”}').value as {title:string}).title,'Тема');
 assert.throws(()=>importDraft(unit,{rashi:[{ref:'Rashi on Pesachim 2a:2:1',translation:123}]},emptyDraft(unit)),/перевод Rashi on Pesachim 2a:2:1/);
 assert.throws(()=>importDraft(unit,{rashi:[{ref:'foreign'}]},emptyDraft(unit)),/отсутствует в источниках/);
 assert.throws(()=>importDraft(unit,{rashi:[{ref:'Rashi on Pesachim 2a:2:1'},{ref:'Rashi on Pesachim 2a:2:1'}]},emptyDraft(unit)),/Повторяется ref/);
});

test('copy/paste framing and non-JSON spaces recover only outside text',()=>{
 const title='עברית «слова» “слова”\u00a0\u202f\u200b\u200f😀';
 const strict=JSON.stringify({title});
 for(const raw of ['\ufeff'+strict,'```json\r\n'+strict+'\r\n```','```\n'+strict+'\n```','{\u00a0\u202f"title":'+JSON.stringify(title)+'}']){
  const result=readModelResponse(raw);assert.deepEqual(result.value,{title});assert.ok(result.recoveredText);assert.deepEqual(JSON.parse(result.recoveredText),{title});
 }
 assert.deepEqual(readModelResponse(strict),{value:{title},suffix:''});
});
test('combined BOM, fence, smart quotes, unusual spaces and missing brackets recover together',()=>{
 const raw='\ufeff```json\n{\u00a0“title”:”Текст”,“parts”:[{“ref”:“2a:2”,“translation”:“«слова»”}\n```';
 const result=readModelResponse(raw);assert.equal(result.suffix,']}');
 assert.deepEqual(result.value,{title:'Текст',parts:[{ref:'2a:2',translation:'«слова»'}]});
 assert.deepEqual(JSON.parse(result.recoveredText!),result.value);
 assert.equal(importDraft(unit,result.value,emptyDraft(unit)).title,'Текст');
});
test('duplicate fields including escaped equivalents are rejected before values can be lost',()=>{
 for(const raw of ['{"title":"a","title":"b"}','{"title":"a","\\u0074itle":"b"}','{“title”:“a”,“title”:“b”}','```json\n{"x":[{"ref":"a","ref":"b"}]}\n```','{"title":"a","title":"b"'])assert.throws(()=>readModelResponse(raw),/Повторяется поле/);
 assert.deepEqual(readModelResponse('{"a":{"ref":"x"},"b":{"ref":"y"}}').value,{a:{ref:'x'},b:{ref:'y'}});
});
test('invisible syntax characters report code and position but remain legal inside text',()=>{
 for(const char of ['\u200b','\u200e','\u200f','\u2060','\u202e','\u2067']){
  assert.throws(()=>readModelResponse('{'+char+'"title":"x"}'),new RegExp('U\\+'+char.charCodeAt(0).toString(16).toUpperCase()));
  assert.deepEqual(readModelResponse(JSON.stringify({title:char})).value,{title:char});
 }
 assert.match(diagnoseResponse('{\u00a0"title":"x"}'),/неразрывный пробел.*U\+00A0/);
});
test('ambiguous quotation, prose, escapes, truncation and multiple fences stay rejected',()=>{
 for(const raw of ['Вот JSON:\n{"title":"x"}','```json\n{}\n```\n```json\n{}\n```','{"title”:"x”}','{„title“:„x“}','{"title":"a\\q"}','{"title":"a\nb"}','{“title”:“обрыв','{"title":"x",}'])assert.throws(()=>readModelResponse(raw));
});
