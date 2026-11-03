import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addOpeningWords,columnOrder,findCommentary,findDiburim,labelColumns,splitColumns,commentAreas} from '../app/pdfCommentary.ts';

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

test('a word that differs does not stop the search for the words after it',()=>{
 const found=findDiburim(printed('בהמה','לית','אחר','פרוזדור'),[{ref:'r',dibur:'בהמה לית ליה פרוזדור'}]);
 assert.deepEqual(found.r.words.map(w=>w.word),['בהמה','לית','אחר','פרוזדור']);
});

test('of two places for a short dibur, the one followed by the comment\'s own text is taken',()=>{
 const stream=printed('שנאמר','אחר','דבר','זה','שנאמר','הקדשתי','לי','כל','בכור');
 const found=findDiburim(stream,[{ref:'r',dibur:'שנאמר',text:'שנאמר - הקדשתי לי כל בכור'}]);
 assert.equal(found.r.words[0],stream[4]);
});

test('the Mishnah / Gemara sign before a dibur goes with the dibur',()=>{
 const found=findDiburim([word('אותו',500,100),word('ולא',478,100),word('בנו',456,100)],[{ref:'r',dibur:'אותו ולא בנו'}]);
 const sign={...word("מתני'",528,100),height:14};
 const elsewhere={...word("גמ'",528,300)};
 const result=addOpeningWords(found,[sign,elsewhere,...found.r.words],1);
 assert.deepEqual(result.r.map(x=>x.word),["מתני'",'אותו','ולא','בנו']);
});

test('a line across both columns does not join them: its neighbours keep to their own column',()=>{
 const box=(name:string,left:number,width:number,baseline:number)=>({word:name,left,width,top:baseline-10,height:10});
 const wide=[box('w1',320,30,20),box('w2',290,30,20),box('w3',260,30,20),box('w4',230,30,20),box('w5',200,30,20),box('w6',170,30,20),box('w7',140,30,20),box('w8',110,30,20),box('w9',80,30,20)];
 const rows=[0,1,2].flatMap((i)=>[box(`r${i}a`,330,40,60+i*12),box(`r${i}b`,285,40,60+i*12),box(`l${i}a`,80,40,60+i*12),box(`l${i}b`,125,40,60+i*12)]);
 const columns=splitColumns([...wide,...rows],3.5,7);
 const names=columns.map((column)=>column.map((w)=>w.word[0]).join(''));
 assert.equal(columns.length,3);
 assert.ok(names.some((n)=>/^w+$/.test(n)),'the wide line is a column of its own');
 assert.ok(names.some((n)=>/^r+$/.test(n))&&names.some((n)=>/^l+$/.test(n)));
});

test('between two words and between two lines of one comment the pointer is still inside the comment',()=>{
 const word=(ref:string,left:number,baseline:number)=>({ref,left,width:20,top:baseline-8,height:8});
 const zones=[word('a',100,50),word('a',130,50),word('a',100,60),word('a',130,60),word('b',100,70),word('b',130,70)];
 const areas=commentAreas(zones,3.5,30);
 const at=(x:number,y:number)=>areas.find((a)=>x>=a.left&&x<=a.left+a.width&&y>=a.top&&y<=a.top+a.height)?.ref;
 assert.equal(at(125,46),'a');   // in the gap between two words
 assert.equal(at(110,55.5),'a'); // between the first and the second line of a
 assert.equal(at(110,65.5),'b'); // between the second line of a and the line of b: half and half
 assert.equal(at(110,59),'a');
 assert.equal(at(300,46),undefined); // far from any word
});
