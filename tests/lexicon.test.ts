import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex, isLexicon, lookupWord, senseAt, type Lexicon } from '../app/lexicon.ts';
import { isVocalSide, letters, vocalFormsFor, type VocalSide } from '../app/vocalized.ts';
import { wordBounds } from '../app/wordAtPoint.ts';

const lexicon = JSON.parse(readFileSync(new URL('../public/lexicon/test.json', import.meta.url), 'utf8')) as Lexicon;
const index = buildIndex(lexicon);

test('the test dictionary file is well formed and its entries are unique and non-empty', () => {
  assert.ok(isLexicon(lexicon));
  const ids = new Set<string>();
  for (const entry of lexicon.entries) {
    assert.ok(!ids.has(entry.id), `повтор id ${entry.id}`);
    ids.add(entry.id);
    assert.ok(entry.ru.length > 0 && entry.ru.every((text) => text.trim()), entry.id);
    assert.ok(entry.forms.length > 0, entry.id);
    for (const form of entry.forms) assert.equal(form, letters(form), `${entry.id}: форма «${form}» должна быть без огласовок и знаков`);
    for (const sense of entry.ctx ?? []) assert.match(sense.at, /^[A-Za-z]+ \d+[ab]:\d+$/, `${entry.id}: ${sense.at}`);
  }
});

test('malformed dictionaries are rejected', () => {
  assert.equal(isLexicon(null), false);
  assert.equal(isLexicon({ v: 2, status: 'x', entries: [] }), false);
  assert.equal(isLexicon({ v: 1, status: 'x', entries: [{ id: 'a', lemma: 'א', forms: [1], ru: ['x'] }] }), false);
  assert.equal(isLexicon({ v: 1, status: 'x', entries: [] }), true);
});

test('lookup finds exact forms, ignores niqqud and strips one prefix when needed', () => {
  assert.equal(lookupWord(index, 'הֶקְטֵר').entries[0].id, 'hektar');
  assert.equal(lookupWord(index, 'הקטר').via, null);
  const prefixed = lookupWord(index, 'וְאֵבָרִים');
  assert.equal(prefixed.entries[0].id, 'evarim');
  assert.equal(prefixed.via, 'ו + אברים');
  assert.equal(lookupWord(index, 'ולפניה').entries[0].id, 'lifnei');
  assert.equal(lookupWord(index, 'זזזזז').entries.length, 0);
  assert.equal(lookupWord(index, '').entries.length, 0);
});

test('a spelling that fits two entries returns both, so the card can show the candidates', () => {
  const ids = lookupWord(index, 'קרא').entries.map((entry) => entry.id).sort();
  assert.deepEqual(ids, ['kra-read', 'kra-verse']);
});

test('the meaning for a place is found only for the exact tractate and reply', () => {
  const entry = lookupWord(index, 'הקטר').entries[0];
  assert.match(senseAt(entry, 'Berakhot', '2a:5')!, /воскурение/);
  assert.equal(senseAt(entry, 'Bekhorot', '2a:5'), null);
  assert.equal(senseAt(entry, 'Berakhot', '2a:6'), null);
  assert.equal(senseAt(entry, 'Berakhot', undefined), null);
});

test('word boundaries: letters with niqqud form a word, punctuation and maqaf split it, inner quotes stay', () => {
  const text = 'הֶקְטֵר חֲלָבִים, אע"פ ר\' כל־דבר.';
  const at = (needle: string, shift = 1) => { const start = text.indexOf(needle) + shift; return wordBounds(text, start); };
  const slice = (b: { start: number; end: number } | null) => (b ? text.slice(b.start, b.end) : null);
  assert.equal(slice(at('הֶקְטֵר')), 'הֶקְטֵר');
  assert.equal(slice(at('חֲלָבִים')), 'חֲלָבִים');
  assert.equal(slice(at('אע"פ')), 'אע"פ');
  assert.equal(slice(at("ר'")), "ר'");
  assert.equal(slice(at('כל־דבר')), 'כל');
  assert.equal(slice(at('דבר')), 'דבר');
  assert.equal(slice(wordBounds(text, text.indexOf(','))), 'חֲלָבִים', 'запятая сразу после слова относится к слову слева');
  assert.equal(wordBounds('abc', 1), null);
  assert.equal(wordBounds('', 0), null);
});

test('vocalized forms of a word are listed from the reply first and without punctuation', () => {
  const side = JSON.parse(readFileSync(new URL('../public/vocal/Berakhot/2a.json', import.meta.url), 'utf8')) as VocalSide;
  assert.ok(isVocalSide(side));
  const forms = vocalFormsFor(side, letters('אקרא'), '2a:8');
  assert.ok(forms.length >= 1);
  assert.equal(forms[0].normalize('NFC'), 'אַקְּרָא'.normalize('NFC'));
  assert.deepEqual(vocalFormsFor(side, 'זזזז', '2a:8'), []);
  assert.deepEqual(vocalFormsFor(null, letters('אקרא')), []);
  assert.deepEqual(vocalFormsFor({ ...side, use: 'plain' }, letters('אקרא')), []);
  for (const form of vocalFormsFor(side, letters('בערבין'))) assert.ok(!/[.,:()]/.test(form));
});
