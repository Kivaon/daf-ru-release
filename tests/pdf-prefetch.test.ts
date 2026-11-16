import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neighbourPdfs } from '../app/pdfNeighbours.ts';

test('neighbouring sheets of an a-side are the b-side of the same leaf and the b-side of the previous one', () => {
  assert.deepEqual(neighbourPdfs('/api/daf-pdf?masechta=bechoros&daf=5&amud=a'), ['/api/daf-pdf?masechta=bechoros&daf=5&amud=b', '/api/daf-pdf?masechta=bechoros&daf=4&amud=b']);
});

test('neighbouring sheets of a b-side are the next leaf and the a-side of the same leaf', () => {
  assert.deepEqual(neighbourPdfs('/api/daf-pdf?masechta=pesachim&daf=3&amud=b'), ['/api/daf-pdf?masechta=pesachim&daf=4&amud=a', '/api/daf-pdf?masechta=pesachim&daf=3&amud=a']);
});

test('the first sheet has no previous one and a damaged address gives nothing', () => {
  assert.deepEqual(neighbourPdfs('/api/daf-pdf?masechta=berakhot&daf=2&amud=a'), ['/api/daf-pdf?masechta=berakhot&daf=2&amud=b']);
  assert.deepEqual(neighbourPdfs('/api/daf-pdf?masechta=berakhot&daf=1&amud=a'), []);
  assert.deepEqual(neighbourPdfs('/api/daf-pdf?daf=3&amud=a'), []);
  assert.deepEqual(neighbourPdfs('/api/daf-pdf?masechta=x&daf=3&amud=c'), []);
  assert.deepEqual(neighbourPdfs('/bekhorot-2a.pdf'), []);
});
