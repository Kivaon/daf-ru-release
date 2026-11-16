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

// Прежняя реализация оценки слов и выравнивания (до того, как признаки слов стали считаться один раз на слово):
// новая должна давать те же совпадения на любых словах.
import {sameEditionWord,normalizeHebrew} from '../app/pdfCommentary.ts';
const oldStrip = (word: string) => word.replace(/[נן]/g, "");
const oldSkeleton = (word: string) => oldStrip(word).replace(/[יו]/g, "");
// cheap test first: words whose letters differ much cannot be spelled alike
const oldAlike = (first: string, second: string) => {
  if (Math.abs(first.length - second.length) > 2) return false;
  const counts = new Map<string, number>();
  for (const letter of first) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  let shared = 0;
  for (const letter of second) { const left = counts.get(letter) ?? 0; if (left > 0) { shared++; counts.set(letter, left - 1); } }
  return shared >= Math.max(first.length, second.length) - 2;
};
const oldScore = (printed: string, source: string) => {
  if (printed === source) return 2;
  if (printed.length < 2 || source.length < 2) return -1.2;
  if (oldAlike(printed, source) && sameEditionWord(printed, source)) return 1.2;
  if (printed.length >= 2 && source.length >= 2 && (oldStrip(printed) === oldStrip(source) || oldSkeleton(printed) === oldSkeleton(source))) return 1;
  return -1.2;
};

// Best local alignment of the printed words of one column with a run of source
// words: the printed words that correspond to a source word, by index.
function oldAlignLocally(printed: string[], source: string[]) {
  const n = printed.length, m = source.length, width = m + 1;
  const cells = new Float32Array((n + 1) * width);
  const steps = new Uint8Array((n + 1) * width);
  let best = 0, bestRow = 0, bestColumn = 0;
  for (let row = 1; row <= n; row++) for (let column = 1; column <= m; column++) {
    const diagonal = cells[(row - 1) * width + column - 1] + oldScore(printed[row - 1], source[column - 1]);
    const up = cells[(row - 1) * width + column] - 1, left = cells[row * width + column - 1] - 1;
    let value = 0, step = 0;
    if (diagonal > value) { value = diagonal; step = 1; }
    if (up > value) { value = up; step = 2; }
    if (left > value) { value = left; step = 3; }
    cells[row * width + column] = value; steps[row * width + column] = step;
    if (value > best) { best = value; bestRow = row; bestColumn = column; }
  }
  const matches = new Map<number, number>();
  let row = bestRow, column = bestColumn;
  while (row > 0 && column > 0 && cells[row * width + column] > 0) {
    const step = steps[row * width + column];
    if (step === 1) { if (oldScore(printed[row - 1], source[column - 1]) > 0) matches.set(row - 1, column - 1); row--; column--; }
    else if (step === 2) row--;
    else if (step === 3) column--;
    else break;
  }
  return { score: best, matches };
}



test('быстрое выравнивание даёт те же совпадения, что прежнее, на случайных словах',()=>{
 let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
 const letters='אבגדהוזחטיכלמנסעפצקרשת';
 const randomWord=()=>{const length=1+Math.floor(rnd()*7);let word='';for(let i=0;i<length;i++)word+=letters[Math.floor(rnd()*letters.length)];return word;};
 const pool=Array.from({length:60},randomWord);
 const mutate=(word:string)=>{const r=rnd();if(r<.6)return word;if(r<.75)return word.replace(/[יו]/,'');if(r<.85)return word.slice(1)||word;if(r<.92)return word+letters[Math.floor(rnd()*letters.length)];return randomWord();};
 for(let round=0;round<40;round++){
  const source=Array.from({length:40+Math.floor(rnd()*160)},()=>pool[Math.floor(rnd()*pool.length)]);
  const start=Math.floor(rnd()*Math.max(1,source.length-20));
  const printed=source.slice(start,start+10+Math.floor(rnd()*60)).map(mutate);
  const expected=oldAlignLocally(printed,source),actual=alignLocally(printed,source);
  assert.equal(actual.score,expected.score);
  assert.deepEqual([...actual.matches].sort((a,b)=>a[0]-b[0]),[...expected.matches].sort((a,b)=>a[0]-b[0]));
 }
});
