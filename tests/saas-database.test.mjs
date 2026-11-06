import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesFilter,slicePage,pageControlsMarkup} from '../public/assets/js/components/saas-database-core.js';

test('empty facet selection shows all records',()=>{
 assert.equal(matchesFilter(undefined,new Set()),true);
 assert.equal(matchesFilter('臺中市',new Set()),true);
});
test('facets accept multiple values of same field',()=>{
 const choices=new Set(['臺中市','新北市']);
 assert.equal(matchesFilter('臺中市',choices),true);
 assert.equal(matchesFilter('新北市',choices),true);
 assert.equal(matchesFilter('高雄市',choices),false);
});
test('normalize numeric checkbox values and array membership',()=>{
 assert.equal(matchesFilter(3,new Set(['3'])),true);
 assert.equal(matchesFilter(['A','B'],new Set(['B'])),true);
 assert.equal(matchesFilter(['A'],new Set(['B'])),false);
});
test('pagination repositions after filter changes',()=>{
 assert.deepEqual(slicePage([1,2,3],9,2),{current:2,pages:2,first:2,rows:[3]});
 assert.deepEqual(slicePage([],12,15),{current:1,pages:1,first:0,rows:[]});
});
test('page controls are labeled for keyboard and screen reader users',()=>{
 const html=pageControlsMarkup(2,4);
 assert.match(html,/aria-current="page"/);
 assert.match(html,/aria-label="上一頁"/);
 assert.match(html,/aria-label="下一頁"/);
 assert.match(html,/data-page="3"/);
});
