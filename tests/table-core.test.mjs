import test from 'node:test';
// Node does not expose the browser CSS.escape API.
globalThis.CSS ??= {escape: value => String(value)};
import assert from 'node:assert/strict';
import {matchesSelection, pageSlice, toggleVisibleSelection} from '../public/assets/js/components/table-core.js';

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
  assert.equal(p.items.length,2);
});

test('select-all respects search visibility and toggles from actual state', async () => {
  const makeBox = (value, visible = true) => ({
    value, checked:false, closest:() => ({style:{display:visible ? 'flex' : 'none'}})
  });
  const boxes = [makeBox('台中'),makeBox('台北'),makeBox('高雄',false)];
  const button = {dataset:{state:'all'},textContent:'取消選取',disabled:false};
  const root = {
    querySelectorAll:()=>boxes,
    querySelector:()=>button
  };
  const selection = new Set();
  toggleVisibleSelection(root,'city',selection);
  assert.deepEqual([...selection],['台中','台北']);
  assert.equal(boxes[2].checked,false);
  assert.equal(button.textContent,'取消選取');
  toggleVisibleSelection(root,'city',selection);
  assert.equal(selection.size,0);
  assert.equal(button.textContent,'全選');
});
