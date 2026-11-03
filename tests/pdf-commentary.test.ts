import {test} from 'node:test';
import assert from 'node:assert/strict';
import {columnOrder,findDiburim} from '../app/pdfCommentary.ts';

const word=(text:string,left:number,baseline:number)=>({word:text,left,top:baseline-10,width:20,height:10});

test('columns are read one after the other, each line right to left',()=>{
 const words=[word('a1',500,100),word('a2',478,100),word('b1',100,100),word('b2',78,100),word('a3',500,112),word('b3',100,112)];
 assert.deepEqual(columnOrder(words,3.5,7).map(w=>w.word),['a1','a2','a3','b1','b2','b3']);
});

test('a dibur continuing on the next line stays together despite the column beside it',()=>{
 const words=[word('נ',500,100),word('א',478,100),word('x',100,100),word('ב',500,112),word('y',100,112)];
 const ordered=columnOrder(words,3.5,7).map(w=>w.word);
 assert.ok(ordered.indexOf('ב')===ordered.indexOf('א')+1);
});

const printed=(...texts:string[])=>texts.map((text,index)=>word(text,1000-index*30,100));

test('a word whose nun printed as a space still matches',()=>{
 const found=findDiburim(printed('לפני','ס','דל','אחר'),[{ref:'r',dibur:'סנדל'}]);
 assert.deepEqual(found.r.map(w=>w.word),['ס','דל']);
});

test('a missing nun does not stop a multi-word dibur',()=>{
 const found=findDiburim(printed('לפני','הבא','אחר','פלים','שיצא'),[{ref:'r',dibur:'הבא אחר נפלים'}]);
 assert.deepEqual(found.r.map(w=>w.word),['הבא','אחר','פלים']);
});

test('a dibur whose first words Sefaria quotes from the Gemara is still found by its later words',()=>{
 const found=findDiburim(printed('x','הלכתא','אפי','למד','כו'),[{ref:'r',dibur:'אמר אמימר הלכתא אפי למד כו'}]);
 assert.deepEqual(found.r.map(w=>w.word),['הלכתא','אפי','למד','כו']);
});

test('an unrelated dibur is not found',()=>{
 assert.deepEqual(findDiburim(printed('אחד','שני','שלישי'),[{ref:'r',dibur:'מרוקם מחותך'}]),{});
});
