import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addOpeningWords,columnOrder,findCommentary,findDiburim,labelColumns} from '../app/pdfCommentary.ts';

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
 assert.deepEqual(found.r.words.map(w=>w.word),['ס','דל']);
});

test('a missing nun does not stop a multi-word dibur',()=>{
 const found=findDiburim(printed('לפני','הבא','אחר','פלים','שיצא'),[{ref:'r',dibur:'הבא אחר נפלים'}]);
 assert.deepEqual(found.r.words.map(w=>w.word),['הבא','אחר','פלים']);
});

test('a dibur whose first words Sefaria quotes from the Gemara is still found by its later words',()=>{
 const found=findDiburim(printed('x','הלכתא','אפי','למד','כו'),[{ref:'r',dibur:'אמר אמימר הלכתא אפי למד כו'}]);
 assert.deepEqual(found.r.words.map(w=>w.word),['הלכתא','אפי','למד','כו']);
});

test('an unrelated dibur is not found',()=>{
 assert.deepEqual(findDiburim(printed('אחד','שני','שלישי'),[{ref:'r',dibur:'מרוקם מחותך'}]),{});
});

test('larger opening words of a dibur are taken from the right of its first found word',()=>{
 const found=findDiburim([word('בכור',500,100),word('לנחלה',470,100)],[{ref:'r',dibur:'מתני יש בכור לנחלה'}]);
 const opening={...word('יש',522,100),height:14};
 const far={...word('יש',200,100)};
 const result=addOpeningWords(found,[opening,far,...found.r.words],1);
 assert.deepEqual(result.r.map(w=>w.word),['יש','בכור','לנחלה']);
});

test('a dibur both commentators begin with is taken only from its own commentator\'s column',()=>{
 const right=['אחד','שני','שלישי','שלום'].map((text,i)=>word(text,550,100+i*12));
 const left=['מילה','אות','שלום'].map((text,i)=>word(text,150,100+i*12));
 const columns=[right,left];
 const comments=[
  {ref:'a',dibur:'אחד',commentator:'Rashi'},{ref:'b',dibur:'שני',commentator:'Rashi'},{ref:'d',dibur:'שלום',commentator:'Rashi'},
  {ref:'m',dibur:'מילה',commentator:'Tosafot'},{ref:'o',dibur:'אות',commentator:'Tosafot'},
 ];
 const labels=labelColumns(columns,comments);
 assert.deepEqual(labels,['Rashi','Tosafot']);
 const found=findCommentary(columns,comments,labels);
 assert.equal(found.d.words[0].left,550);
});

test('a dibur spelled with and without yod is still found',()=>{
 const found=findDiburim(printed('בהמה','לית','לה','פרוזדור'),[{ref:'r',dibur:'בהמה לית ליה פרוזדור'}]);
 assert.equal(found.r.words.length,4);
});
