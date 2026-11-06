/**
 * SaaS Database v2 — reusable filter interaction controller.
 *
 * Each table owns only a selection map and an onChange callback.
 * Menus, keyboard navigation, search, select-all, clear and accessible
 * button state are managed here, without page-specific event duplication.
 */
const $ = (root, selector) => root?.querySelector(selector);
const $$ = (root, selector) => [...(root?.querySelectorAll(selector) ?? [])];
const clean = value => String(value ?? '').trim().toLocaleLowerCase('zh-Hant');
const visible = el => el?.closest('.filter-option')?.style.display !== 'none';
function filterBoxes(root, key) {
  return $$(root, '.filter-chk-' + CSS.escape(key));
}
function updateButton(root, key, selection) {
  const btn = $(root, '.btn-filter-toggle[data-type="' + CSS.escape(key) + '"]');
  const boxes = filterBoxes(root,key).filter(visible);
  if (!btn) return;
  const fullyChecked = boxes.length && boxes.every(c => selection.has(c.value));
  btn.textContent = fullyChecked ? '取消選取' : '全選';
  btn.dataset.state = fullyChecked ? 'all' : 'none';
  btn.disabled = boxes.length === 0;
}
function syncBoxes(root,key,selection) {
  filterBoxes(root,key).forEach(box => { box.checked = selection.has(box.value); });
  updateButton(root,key,selection);
}
function close(root) {
  $$(root,'.filter-dropdown.show').forEach(drop => {
    drop.classList.remove('show');
    Object.assign(drop.style,{position:'',top:'',left:'',width:'',maxHeight:'',zIndex:''});
  });
  $$(root,'.filter-pill-wrap.open').forEach(wrap=>wrap.classList.remove('open'));
  $$(root,'.filter-pill[aria-expanded]').forEach(btn=>btn.setAttribute('aria-expanded','false'));
}
function open(root,btn) {
  const key=btn.id.slice(5);
  const wrap=$(root,'#pill-wrap-'+CSS.escape(key));
  const drop=$(root,'#drop-'+CSS.escape(key));
  if (!wrap||!drop) return;
  const already=drop.classList.contains('show');
  close(root);
  if (already) return;
  wrap.classList.add('open');
  drop.classList.add('show');
  btn.setAttribute('aria-expanded','true');
  btn.setAttribute('aria-controls',drop.id);
  // Use viewport positioning so horizontal scrollers and sticky headers
  // cannot crop the options panel.
  const rect=btn.getBoundingClientRect();
  const width=Math.max(200,Math.min(288,window.innerWidth-24));
  let left=Math.min(Math.max(12,rect.left),window.innerWidth-width-12);
  const spaceBelow=window.innerHeight-rect.bottom-14;
  const height=Math.max(130,Math.min(330,window.innerHeight-44));
  const top=spaceBelow>=150 ? rect.bottom+6 : Math.max(12,rect.top-height-6);
  Object.assign(drop.style,{
    position:'fixed',left:left+'px',top:top+'px',width:width+'px',
    maxHeight:height+'px',zIndex:'9999'
  });
}
export function installDatabaseFilters({root,selections,onChange,onSelectionChange}) {
  if (!root || root.dataset.saasFiltersInstalled==='yes') return;
  root.dataset.saasFiltersInstalled='yes';
  const map=()=>typeof selections==='function'?selections():selections;
  const choice=key=>map()?.[key] instanceof Set ? map()[key] : null;
  const updated=key=>{
    root.querySelectorAll('.filter-chk-'+CSS.escape(key)).forEach(input=>{
      input.checked=choice(key)?.has(input.value)??false;
    });
    updateButton(root,key,choice(key)??new Set());
    onSelectionChange?.(key);
    onChange?.(key);
  };
  root.addEventListener('click',event=>{
    const pill=event.target.closest('.filter-pill[id^="pill-"]');
    if (pill && root.contains(pill)) {
      event.stopPropagation();open(root,pill);
      const key=pill.id.slice(5);updateButton(root,key,choice(key)??new Set());
      return;
    }
    const toggle=event.target.closest('.btn-filter-toggle[data-type]');
    if(toggle && root.contains(toggle)){
      event.stopPropagation();
      const key=toggle.dataset.type,selection=choice(key);
      if(!selection)return;
      const boxes=filterBoxes(root,key).filter(visible);
      if(!boxes.length)return;
      const shouldSelect=!boxes.every(box=>selection.has(box.value));
      boxes.forEach(box=>shouldSelect?selection.add(box.value):selection.delete(box.value));
      syncBoxes(root,key,selection);updated(key);
      return;
    }
    const clear=event.target.closest('.btn-clear-filter[data-type]');
    if(clear && root.contains(clear)){
      event.stopPropagation();
      const key=clear.dataset.type,selection=choice(key);
      if(!selection)return;
      selection.clear();
      const search=$(root,'#search-'+CSS.escape(key)+'-input');
      if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
      syncBoxes(root,key,selection);updated(key);
    }
  });
  root.addEventListener('change',event=>{
    const box=event.target;
    if(!(box instanceof HTMLInputElement)||box.type!=='checkbox')return;
    const css=[...box.classList].find(s=>s.startsWith('filter-chk-'));
    if(!css)return;
    const key=css.slice('filter-chk-'.length),selection=choice(key);
    if(!selection)return;
    box.checked?selection.add(box.value):selection.delete(box.value);
    syncBoxes(root,key,selection);updated(key);
  });
  root.addEventListener('input',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||!/^search-.*-input$/.test(input.id))return;
    const key=input.id.slice(7,-6),list=$(root,'#'+CSS.escape(key)+'-options-container');
    if(!list)return;
    const term=clean(input.value);
    let matched=0;
    $$(list,'.filter-option').forEach(label=>{
      const has=clean(label.textContent).includes(term);
      label.style.display=has?'flex':'none';
      if(has)matched++;
    });
    let empty=$(list,'.saas-filter-empty');
    if(!matched){
      if(!empty){empty=document.createElement('p');empty.className='saas-filter-empty';empty.setAttribute('role','status');list.appendChild(empty);}
      empty.textContent='沒有符合的選項';
    }else empty?.remove();
    updateButton(root,key,choice(key)??new Set());
  });
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape' && $$(root,'.filter-dropdown.show').length){
      const opened=$(root,'.filter-pill[aria-expanded="true"]');close(root);opened?.focus();
      event.stopPropagation();
    }
  });
  document.addEventListener('pointerdown',event=>{
    if (!root.isConnected) return;
    if(!root.contains(event.target))close(root);
    else if(!event.target.closest('.filter-pill-wrap')) close(root);
  });
  const filterScroll=$(root,'.filters-scroll-area');
  filterScroll?.addEventListener('scroll',()=>close(root),{passive:true});
}
export function matchesFilter(value,selected){
  if(!selected?.size)return true;
  if(Array.isArray(value))return value.some(v=>selected.has(String(v)));
  return selected.has(String(value??''));
}
export function slicePage(rows,page,size){
  const pageSize=Math.max(1,Number(size)||15);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));
  const current=Math.min(pages,Math.max(1,Number(page)||1));
  const first=(current-1)*pageSize;
  return {current,pages,first,rows:rows.slice(first,first+pageSize)};
}
