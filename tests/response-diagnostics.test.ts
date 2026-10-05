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
