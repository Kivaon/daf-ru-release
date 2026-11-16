import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VIEW, VIEW_KEY, applyPreset, loadView, normalizeView, originalText, presetOf, saveView, stripNiqqud } from '../app/viewSettings.ts';

test('an empty, damaged or foreign setting set falls back to the defaults', () => {
  assert.deepEqual(normalizeView(null), DEFAULT_VIEW);
  assert.deepEqual(normalizeView('x'), DEFAULT_VIEW);
  assert.deepEqual(normalizeView([1, 2]), DEFAULT_VIEW);
  assert.deepEqual(normalizeView({ rashi: 'no', mode: 'wide', extra: true }), DEFAULT_VIEW);
});

test('only boolean flags and the two known modes are accepted', () => {
  const view = normalizeView({ rashi: false, tosafot: false, mode: 'page', title: 0, extra: 1 });
  assert.equal(view.rashi, false);
  assert.equal(view.tosafot, false);
  assert.equal(view.title, true);
  assert.equal(view.mode, 'page');
  assert.ok(!('extra' in view));
});

test('settings round-trip through storage and survive a broken storage', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  saveView(storage, { ...DEFAULT_VIEW, explanation: false, mode: 'page' });
  assert.ok(store.has(VIEW_KEY));
  const loaded = loadView(storage);
  assert.equal(loaded.explanation, false);
  assert.equal(loaded.mode, 'page');
  store.set(VIEW_KEY, '{broken');
  assert.deepEqual(loadView(storage), DEFAULT_VIEW);
  const failing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadView(failing), DEFAULT_VIEW);
  assert.doesNotThrow(() => saveView(failing, DEFAULT_VIEW));
  assert.deepEqual(loadView(undefined), DEFAULT_VIEW);
});

test('a preset changes blocks but keeps the mode and the niqqud choice', () => {
  const start = { ...DEFAULT_VIEW, mode: 'page' as const, niqqud: false };
  const only = applyPreset(start, 'translation');
  assert.equal(only.mode, 'page');
  assert.equal(only.niqqud, false);
  assert.equal(only.original, false);
  assert.equal(only.rashi, false);
  assert.equal(only.translation, true);
  assert.equal(presetOf(only), 'translation');
  assert.equal(applyPreset(start, 'unknown'), start);
  assert.equal(presetOf({ ...DEFAULT_VIEW, rashi: false, tosafot: false }), 'no-commentary');
  assert.equal(presetOf({ ...DEFAULT_VIEW, rashi: false }), null);
  assert.equal(presetOf({ ...DEFAULT_VIEW, title: false, rashi: false }), null);
});

test('niqqud is removed without touching the letters, and shown only when enabled', () => {
  const vocal = 'הֶקְטֵר חֲלָבִים';
  assert.equal(stripNiqqud(vocal), 'הקטר חלבים');
  assert.equal(originalText('הקטר חלבים', { niqqud: true }), 'הקטר חלבים');
  assert.equal(originalText('הקטר חלבים', { niqqud: true }, vocal), vocal);
  assert.equal(originalText('הקטר חלבים', { niqqud: false }, vocal), 'הקטר חלבים');
  assert.equal(originalText(vocal, { niqqud: false }), 'הקטר חלבים');
});

test('перевод нельзя отключить: ни настройками, ни старым сохранённым набором', () => {
  assert.equal(normalizeView({ translation: false }).translation, true);
  assert.equal(normalizeView({ translation: false, original: false }).original, false);
  const stored = { getItem: () => JSON.stringify({ translation: false, rashi: false }) };
  const loaded = loadView(stored);
  assert.equal(loaded.translation, true);
  assert.equal(loaded.rashi, false);
  assert.equal(normalizeView(applyPreset(DEFAULT_VIEW, 'no-commentary')).translation, true);
});
