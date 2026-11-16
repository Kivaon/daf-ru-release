import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isVocalSide, letters, signature, vocalAvailable, vocalizedSegment, type VocalSide } from '../app/vocalized.ts';

const load = (tractate: string, side: string): VocalSide => {
  const data = JSON.parse(readFileSync(new URL(`../public/vocal/${tractate}/${side}.json`, import.meta.url), 'utf8'));
  assert.ok(isVocalSide(data), `${tractate}/${side}: структура файла`);
  return data;
};
/** Огласовки у одной буквы могут стоять в разном порядке: сравниваем в канонической форме. */
const has = (text: string, part: string) => text.normalize('NFC').includes(part.normalize('NFC'));
const starts = (text: string, part: string) => text.normalize('NFC').startsWith(part.normalize('NFC'));
const FILES: [string, string][] = [['Berakhot', '2a'], ['Bekhorot', '2a'], ['Pesachim', '2a']];
/** Текст реплики Sefaria, как он собирается из записи: слова Sefaria, кроме вставок Dicta. */
const plainOf = (side: VocalSide, ref: string) => side.segments[ref].w.filter((word) => word[2] !== 'dic').map((word) => word[0]).join(' ');

test('signature ignores niqqud and punctuation and matches the build script', () => {
  assert.equal(letters('הֶקְטֵר, חֲלָבִים!'), 'הקטרחלבים');
  assert.deepEqual(signature('אבג'), { sig: '7c0a7478', n: 3 });
  assert.deepEqual(signature('הֶקְטֵר חֲלָבִים וְאֵבָרִים'), { sig: '2bce2b12', n: 15 });
  assert.deepEqual(signature('מתני׳ מאימתי קורין'), { sig: '926c297a', n: 15 });
  assert.deepEqual(signature('מאימתי, קורין (שמות)'), signature('מאימתי קורין שמות'));
});

test('malformed side files are rejected instead of shown', () => {
  assert.equal(isVocalSide(null), false);
  assert.equal(isVocalSide('x'), false);
  assert.equal(isVocalSide({ v: 2, use: 'vocalized', segments: {} }), false);
  assert.equal(isVocalSide({ v: 1, use: 'maybe', segments: {} }), false);
  assert.equal(isVocalSide({ v: 1, use: 'plain', segments: { '2a:1': { sig: 'x', n: 1, w: [[1, null, 'eq']] } } }), false);
  assert.equal(isVocalSide({ v: 1, use: 'plain', segments: {} }), true);
  assert.equal(vocalAvailable(null), false);
});

for (const [tractate, side] of FILES) {
  test(`${tractate} ${side}: every segment is reproduced exactly and signatures match`, () => {
    const data = load(tractate, side);
    assert.equal(data.use, 'vocalized');
    assert.ok(data.stats.match >= 0.98);
    for (const ref of Object.keys(data.segments)) {
      const plain = plainOf(data, ref);
      const segment = data.segments[ref];
      assert.deepEqual(signature(plain), { sig: segment.sig, n: segment.n }, ref);
      const text = vocalizedSegment(data, ref, plain);
      assert.ok(text, `${ref}: огласованный текст есть`);
      assert.ok(!/\s{2,}/.test(text!), `${ref}: нет двойных пробелов`);
      // совпавшие слова меняются только добавлением огласовок
      for (const [raw, shown, type] of segment.w) {
        if (type === 'eq') assert.equal(letters(shown!), letters(raw), `${ref}: ${raw}`);
      }
    }
  });
}

test('a changed Sefaria text, a plain side or an unknown reply never gets vocalization', () => {
  const data = load('Berakhot', '2a');
  const plain = plainOf(data, '2a:5');
  assert.ok(vocalizedSegment(data, '2a:5', plain));
  assert.equal(vocalizedSegment(data, '2a:5', plain.replace('הקטר', 'הקשר')), null);
  assert.equal(vocalizedSegment(data, '2a:5', ''), null);
  assert.equal(vocalizedSegment(data, '9z:1', plain), null);
  assert.equal(vocalizedSegment({ ...data, use: 'plain' }, '2a:5', plain), null);
  assert.equal(vocalizedSegment(null, '2a:5', plain), null);
});

test('known words come out with their contextual vocalization', () => {
  const berakhot = load('Berakhot', '2a');
  assert.ok(starts(vocalizedSegment(berakhot, '2a:5', plainOf(berakhot, '2a:5'))!, 'הֶקְטֵר חֲלָבִים וְאֵבָרִים'));
  assert.ok(has(vocalizedSegment(berakhot, '2a:8', plainOf(berakhot, '2a:8'))!, 'אַקְּרָא קָאֵי'));
  assert.ok(has(vocalizedSegment(berakhot, '2a:13', plainOf(berakhot, '2a:13'))!, 'שִׁמְשׁוֹ') && has(vocalizedSegment(berakhot, '2a:13', plainOf(berakhot, '2a:13'))!, 'אַגַּב אוֹרְחֵיהּ'));
  // служебная метка остаётся как у Sefaria, без огласовок; точка в конце слова сохранена
  const first = vocalizedSegment(berakhot, '2a:1', plainOf(berakhot, '2a:1'))!;
  assert.ok(first.startsWith('מתני׳ '));
  assert.ok(has(first, 'בָּעֲרָבִין.'));
});

test('abbreviations and variant wordings follow Dicta and leave no stray marks', () => {
  const bekhorot = load('Bekhorot', '2a');
  const reply1 = vocalizedSegment(bekhorot, '2a:1', plainOf(bekhorot, '2a:1'))!;
  assert.ok(reply1.startsWith('מתני׳ '), 'метка без огласовок и без лишнего значка');
  assert.ok(has(reply1, 'נָכְרִי') && !reply1.includes('כוכבים'));
  assert.ok(has(reply1, 'אַף עַל פִּי') && !reply1.includes('אע"פ'));
  const reply3 = vocalizedSegment(bekhorot, '2a:3', plainOf(bekhorot, '2a:3'))!;
  assert.ok(has(reply3, 'קָא מַשְׁמַע לַן') && !reply3.includes('קמ"ל'));
  const pesachim = load('Pesachim', '2a');
  const mishna = vocalizedSegment(pesachim, '2a:1', plainOf(pesachim, '2a:1'))!;
  assert.ok(has(mishna, 'שְׁתֵּי שׁוּרוֹת'));
  // ссылка на источник в скобках остаётся как есть
  const quote = vocalizedSegment(pesachim, '2a:3', plainOf(pesachim, '2a:3'))!;
  assert.ok(quote.includes('(בראשית מד, ג)'));
});
