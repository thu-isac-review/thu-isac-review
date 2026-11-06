import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSelection, pageSlice} from '../public/assets/js/components/table-core.js';

test('empty selection leaves rows visible', () => {
  assert.equal(matchesSelection('臺中市', new Set()), true);
  assert.equal(matchesSelection(null, new Set()), true);
});
test('multiple categories use OR within one category', () => {
  assert.equal(matchesSelection('臺中市', new Set(['臺中市', '臺北市'])), true);
  assert.equal(matchesSelection('高雄市', new Set(['臺中市', '臺北市'])), false);
});
test('numeric and array values match checkbox strings', () => {
  assert.equal(matchesSelection(3, new Set(['3'])), true);
  assert.equal(matchesSelection(['c1', 'c2'], new Set(['c2'])), true);
  assert.equal(matchesSelection(['c1'], new Set(['c2'])), false);
});
test('page boundaries are clamped when filtering reduces result count', () => {
  const p = pageSlice([1,2,3], 99, 2);
  assert.deepEqual(p, {currentPage:2,totalPages:2,start:2,items:[3]});
});
test('empty result is always a valid first page', () => {
  const p = pageSlice([], 5, 15);
  assert.deepEqual(p, {currentPage:1,totalPages:1,start:0,items:[]});
});
test('invalid page and page size are normalized', () => {
  const p = pageSlice([1,2], -3, 0);
  assert.equal(p.currentPage,1);
  assert.equal(p.start,0);
  assert.equal(p.items.length,1);
});
