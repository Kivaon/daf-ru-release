import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPageFlow, flowProgress, translationFor } from '../app/pageFlowModel.ts';

const segments = [
  { id: '2a:1', kind: 'Мишна', text: 'מתני׳ א' },
  { id: '2a:2', kind: 'Гемара', text: 'גמ׳ ב' },
  { id: '2a:3', kind: 'Гемара', text: 'ג' },
];

test('each segment gets its own saved translation and the selected one is marked', () => {
  const flow = buildPageFlow(segments, [
    { ref: '2a:1', translation: ' Первый. ' },
    { ref: '2a:3', translation: 'Третий.' },
  ], '2a:3');
  assert.deepEqual(flow.map((item) => item.translation), ['Первый.', null, 'Третий.']);
  assert.deepEqual(flow.map((item) => item.selected), [false, false, true]);
  assert.deepEqual(flow.map((item) => item.number), [1, 2, 3]);
  assert.deepEqual(flowProgress(flow), { done: 2, total: 3 });
});

test('a composite article supplies its own part to every row, never the joined text', () => {
  const unit = { unitRef: 'T 11b:12-12a:1', parts: [{ ref: '11b:12', translation: 'Часть А.' }, { ref: '12a:1', translation: 'Часть Б.' }], translation: 'Часть А. Часть Б.' };
  const articles = [{ ref: '12a:1', ...unit }];
  assert.equal(translationFor(articles, '12a:1'), 'Часть Б.');
  assert.equal(translationFor(articles, '11b:12'), 'Часть А.');
  assert.equal(translationFor([{ ref: '12a:1', ...unit, parts: [{ ref: '11b:12', translation: 'Только А.' }] }], '12a:1'), null);
});

test('missing, empty or malformed translations are reported as absent', () => {
  assert.equal(translationFor([], '2a:1'), null);
  assert.equal(translationFor([{ ref: '2a:1', translation: '   ' }], '2a:1'), null);
  assert.equal(translationFor([{ ref: '2a:1', translation: undefined }], '2a:1'), null);
  assert.equal(translationFor([{ ref: '2a:9', translation: 'Чужая.' }], '2a:1'), null);
});

test('an unknown selection marks nothing and an empty page gives an empty flow', () => {
  assert.ok(buildPageFlow(segments, [], '9z:9').every((item) => !item.selected));
  assert.deepEqual(buildPageFlow([], [], '2a:1'), []);
  assert.deepEqual(flowProgress([]), { done: 0, total: 0 });
});
