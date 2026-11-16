import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alignFromFile, alignSide, diffOps, isWordsFile, type WordsFile } from '../app/vocalAlign.ts';
import { isVocalSide, vocalizedSegment, type VocalSide } from '../app/vocalized.ts';

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const GOLDEN: [string, string][] = [['Berakhot', '2a'], ['Bekhorot', '2a'], ['Pesachim', '2a']];
const NFC = (text: string | null) => (text ?? '').normalize('NFC');

test('diff finds equal runs, gaps and replacements like a sequence matcher', () => {
  assert.deepEqual(diffOps(['a', 'b', 'c'], ['a', 'b', 'c']), [{ tag: 'equal', i1: 0, i2: 3, j1: 0, j2: 3 }]);
  assert.deepEqual(diffOps(['a', 'x', 'c'], ['a', 'y', 'c']).map((op) => op.tag), ['equal', 'replace', 'equal']);
  assert.deepEqual(diffOps(['a', 'b'], ['a']).map((op) => op.tag), ['equal', 'delete']);
  assert.deepEqual(diffOps(['a'], ['a', 'b']).map((op) => op.tag), ['equal', 'insert']);
  assert.deepEqual(diffOps([], []), []);
});

test('word files are validated', () => {
  const file = read('../public/vocal/words/Berakhot.json');
  assert.ok(isWordsFile(file));
  assert.equal(isWordsFile({ v: 1, tractate: 'X', order: ['2a'], sides: {} }), false);
  assert.equal(isWordsFile(null), false);
  assert.ok(file.order.includes('2a') && file.order.includes('2b'));
});

for (const [tractate, side] of GOLDEN) {
  test(`${tractate} ${side}: alignment in the app reproduces the prepared file word for word`, () => {
    const file = read(`../public/vocal/words/${tractate}.json`) as WordsFile;
    const golden = read(`../public/vocal/${tractate}/${side}.json`) as VocalSide;
    assert.ok(isVocalSide(golden));
    const segments = Object.entries(golden.segments).map(([id, segment]) => ({ id, text: segment.w.filter((word) => word[2] !== 'dic').map((word) => word[0]).join(' ') }));
    const live = alignFromFile(file, side, segments)!;
    assert.equal(live.use, 'vocalized');
    assert.equal(live.stats.match, golden.stats.match);
    for (const { id, text } of segments) {
      assert.equal(NFC(vocalizedSegment(live, id, text)), NFC(vocalizedSegment(golden, id, text)), id);
    }
  });
}

test('a text that does not fit the Dicta side is shown without vocalization instead of a wrong one', () => {
  const file = read('../public/vocal/words/Berakhot.json') as WordsFile;
  const segments = [{ id: '2a:1', text: 'זה טקסט אחר לגמרי שאין לו שום קשר לצד הזה של הדף ואין בו אף מילה משותפת עם דיקטה כלל וכלל' }];
  const live = alignFromFile(file, '2a', segments)!;
  assert.equal(live.use, 'plain');
  assert.equal(vocalizedSegment(live, '2a:1', segments[0].text), null);
  assert.equal(alignFromFile(file, '99z', segments), null);
  assert.equal(alignFromFile(file, '2a', []), null);
});

test('abbreviations, substitutions and quoted sources follow the rules', () => {
  const result = alignSide(
    [{ id: '2a:1', text: 'גמ׳ אע"פ שאינו רשאי (בראשית א, ה) ואמר קמ"ל ואמר עובד כוכבים ואמר' }],
    ['גְּמָ׳', 'אַף', 'עַל', 'פִּי', 'שֶׁאֵינוֹ', 'רַשַּׁאי', 'וְאָמַר', 'קָא', 'מַשְׁמַע', 'לַן', 'וְאָמַר', 'נָכְרִי', 'וְאָמַר'], [], []);
  const words = result.segments['2a:1'].w;
  assert.deepEqual(words.map((word) => word[2]), ['sef', 'ab', 'eq', 'eq', 'cite', 'cite', 'cite', 'eq', 'ab', 'eq', 'sub', 'sub', 'eq']);
  assert.equal(words[1][1], 'אַף עַל פִּי');
  assert.equal(words[8][1], 'קָא מַשְׁמַע לַן');
  assert.equal(words[10][1], 'נָכְרִי');
  assert.equal(words[11][1], '');
  assert.equal(result.counts.cite, 3);
  assert.equal(result.match, 1);
});

test('words of a neighbouring side at the boundary are used for matching but are not inserted', () => {
  const segments = [{ id: '3a:1', text: 'אמר רב הונא כל' }];
  const result = alignSide(segments, ['אָמַר', 'רַב', 'הוּנָא'], [], ['כׇּל', 'דָּבָר']);
  assert.deepEqual(result.segments['3a:1'].w.map((word) => word[2]), ['eq', 'eq', 'eq', 'eq']);
  assert.equal(result.counts.dic, 0);
});

test('a side that was already aligned is taken from memory, a changed text is aligned again', () => {
  const file = read('../public/vocal/words/Berakhot.json') as WordsFile;
  const golden = read('../public/vocal/Berakhot/2a.json') as VocalSide;
  const segments = Object.entries(golden.segments).map(([id, segment]) => ({ id, text: segment.w.filter((word) => word[2] !== 'dic').map((word) => word[0]).join(' ') }));
  const first = alignFromFile(file, '2a', segments);
  assert.equal(alignFromFile(file, '2a', segments), first);
  const changed = segments.map((segment, index) => (index === 0 ? { ...segment, text: segment.text + ' נוספת' } : segment));
  const second = alignFromFile(file, '2a', changed);
  assert.notEqual(second, first);
  assert.equal(alignFromFile(file, '2a', changed), second);
});
