import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beginningPlace,sheetLabel} from '../app/pdfJump.ts';

test('the neighbouring sheets are the previous and the next one, across sides and dafim',()=>{
 assert.equal(beginningPlace('45b','46a'),'на предыдущем листе');
 assert.equal(beginningPlace('46b','46a'),'на следующем листе');
 assert.equal(beginningPlace('46a','45b'),'на следующем листе');
 assert.equal(beginningPlace('45b','46b'),'на листе 45б');
});

test('any other sheet is named',()=>{
 assert.equal(beginningPlace('78b','80a'),'на листе 78б');
 assert.equal(beginningPlace('12a','12a'),'на листе 12а');
});

test('sheets are written with Cyrillic a and b',()=>{
 assert.equal(sheetLabel('46a'),'46а');assert.equal(sheetLabel('46b'),'46б');
});
