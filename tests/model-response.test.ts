import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseModelResponse } from "../app/parseModelResponse.ts";

const phone = readFileSync(new URL("./fixtures/pesachim-2a-smart-quotes.txt", import.meta.url), "utf8");

test("valid JSON uses the standard parser once, preserving all text", () => {
  const value = { title: "Псахим 2а — Проверка хамеца", text: '«Текст» “цитата”, одиночная ” и “; "ASCII" \\ путь', n: 4, ok: true, empty: null };
  const input = JSON.stringify(value);
  const standardParse = JSON.parse;
  const calls: string[] = [];
  JSON.parse = (text: string) => { calls.push(text); return standardParse(text); };
  try {
    assert.deepEqual(parseModelResponse(input), value);
    assert.deepEqual(calls, [input]);
  } finally {
    JSON.parse = standardParse;
  }
});

test("complete original Pesachim phone response recovers only after parse error", () => {
  assert.throws(() => JSON.parse(phone), SyntaxError);
  const result = parseModelResponse(phone) as { title: string; rashi: unknown[]; tosafot: unknown[] };
  assert.equal(result.title, "Псахим 2а — Проверка хамеца");
  assert.equal(result.rashi.length, 7);
  assert.equal(result.tosafot.length, 1);
  // This particular fixture contains guillemets but no inner smart quotations.
  assert.deepEqual(result, JSON.parse(phone.replace(/[“”]/g, '"')));
});

test("smart quotations within recovered strings stay text, including adjacent punctuation", () => {
  assert.deepEqual(
    parseModelResponse('{“text”:“Он называет это “особым случаем”, а также «примером».”,“nested”:““внешняя “внутренняя” цитата””,“items”:[““a”, “b””,“конец”]}'),
    { text: "Он называет это “особым случаем”, а также «примером».", nested: "“внешняя “внутренняя” цитата”", items: ["“a”, “b”", "конец"] },
  );
});

test("mixed ASCII and smart strings preserve quotes and escapes in ASCII text", () => {
  const text = 'Непарная “, «пример», "ASCII", \\ путь\nстрока';
  const input = '{“text”:' + JSON.stringify(text) + ',"other":“готово”,“values”:[null,true,42]}';
  assert.deepEqual(parseModelResponse(input), { text, other: "готово", values: [null, true, 42] });
});

test("JSON escapes remain valid inside smart delimiters", () => {
  const text = 'Строка\n"цитата" \\ путь';
  const encoded = JSON.stringify(text);
  assert.deepEqual(parseModelResponse('{“text”:“' + encoded.slice(1, -1) + '”}'), { text });
});

test("truncated input, unmatched quotations and unrelated syntax errors are rejected", () => {
  for (const input of [
    '{“text”:“обрыв',
    '{“text”:“цитата “без конца”}',
    '{“text”:“готово”,}',
    '{“text”:“готово” “other”:“нет запятой”}',
    'prefix {“text”:“готово”}',
    '{"text":"обычный",}',
  ]) assert.throws(() => parseModelResponse(input), SyntaxError);
});

test('exact Chullin phone response recovers inconsistent opening orientations',()=>{
 const input=readFileSync(new URL('./fixtures/chullin-105b-phone.txt',import.meta.url),'utf8');
 const result=parseModelResponse(input) as {title:string;parts:unknown[];pages:{rashi:{translation:string}[];tosafot:unknown[]}[]};
 assert.equal(result.title,'Хулин 105b:9 — Убирать крошки, чтобы избежать бедности');
 assert.equal(result.parts.length,1);assert.equal(result.pages.length,1);assert.equal(result.pages[0].rashi.length,2);assert.equal(result.pages[0].tosafot.length,0);
 assert.equal(result.pages[0].rashi[0].translation,'«Собирают крошки» — подметают из дома крошки пищи.');
});
test('structural smart quotes use position rather than orientation; internal quotations and escapes survive',()=>{
 for(const input of ['{“key”:”value”}','{”key“:“value“}','{”key”:”value”}','{“key”:“value”}'])assert.deepEqual(parseModelResponse(input),{key:'value'});
 assert.deepEqual(parseModelResponse('{“key”:”Текст “слова” и «слова» и \\"ASCII\\".”}'),{key:'Текст “слова” и «слова» и "ASCII".'});
});
