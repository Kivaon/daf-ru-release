import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alignColumns,alignLocally} from '../app/pdfAlignment.ts';
import {locateCommentary} from '../app/pdfLocate.ts';

const w=(word:string,font='body')=>({word,font});
const sentence=(text:string,font?:string)=>text.split(' ').map(word=>w(word,font));

const rashi='אין רחם שלה בין ירכותיה הלכך חשיב הראש לידה דבגלוי הוא אבל אשה דירכים שלה מכסים את הרחם';
const tosafot='פירוש דאתי למיחלף בבהמה אחריתי ועוד מצי למימר משום דעתיד להוליד ולהיות ראוי למלאכה בלא ר יהודה';

test('a missing or misspelled word does not stop the local alignment',()=>{
 const printed='אין רחם שלה בין ירכותיה הלכך חשיב ראש לידה דבגלוי'.split(' ');
 const source='אין רחם שלה בין ירכותיה הלכך חשיב הראש לידה דבגלוי הוא'.split(' ');
 const {matches}=alignLocally(printed,source);
 assert.ok(matches.size>=9);
 assert.equal(matches.get(0),0);
 assert.equal(matches.get(9),9);
});

test('a column is split where Rashi passes into Tosafot, and every word gets its comment',()=>{
 const column=[...sentence(rashi),...sentence(tosafot)];
 const comments=[{ref:'Rashi on X 1a:1:1',commentator:'Rashi',text:rashi},{ref:'Tosafot on X 1a:1:1',commentator:'Tosafot',text:tosafot}];
 const {labelOf,assigned}=alignColumns([column],comments);
 assert.equal(labelOf(column[0]),'Rashi');
 assert.equal(labelOf(column.at(-1)!),'Tosafot');
 assert.equal(assigned.get(column[3])!.ref,'Rashi on X 1a:1:1');
 assert.equal(assigned.get(column.at(-2)!)!.ref,'Tosafot on X 1a:1:1');
});

test('a column that matches no commentary stays unlabelled',()=>{
 const column=sentence('אחד שני שלישי רביעי חמישי שישי שביעי שמיני תשיעי עשירי אחד עשר שנים עשר');
 const {labelOf}=alignColumns([column],[{ref:'Rashi on X 1a:1:1',commentator:'Rashi',text:rashi}]);
 assert.equal(labelOf(column[0]),undefined);
});

test('a comment without a dibur found by words takes the bold start from the alignment',()=>{
 const body='מלאכה גדולה היא בכל מקום ואין להקל בה ראש כלל וכלל כך שנו חכמים בעניין זה';
 const text='הלכך חשיב ראש לידה - '+body;
 const column=[...sentence('הלכך חשיב ראש לידה','bold'),...sentence(body)];
 const found=locateCommentary([column],[{ref:'Rashi on X 1a:1:1',commentator:'Rashi',text,dibur:'שונה לגמרי'}],[]);
 assert.deepEqual(found.diburs['Rashi on X 1a:1:1'].words.map(x=>x.word),['הלכך','חשיב','ראש','לידה']);
 assert.equal(found.zones.get(column.at(-1)!),'Rashi on X 1a:1:1');
});
