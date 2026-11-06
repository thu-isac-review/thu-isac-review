/**
 * Shared table interaction primitives.
 * No Firestore dependency, no global element-ID lookups across table panels.
 */
export function tableRoot(element) {
  return element?.closest?.(
    '#institution-page-wrapper, #course-page-wrapper, #student-page-wrapper, .intern-record-container'
  ) || document;
}
export function closeDropdowns(root, except = null) {
  root.querySelectorAll('.filter-dropdown.show').forEach(drop => {
    if (drop === except) return;
    drop.classList.remove('show');
    drop.style.top = '';
    drop.style.left = '';
  });
  root.querySelectorAll('.filter-pill-wrap.open').forEach(wrap => {
    if (except && wrap.contains(except)) return;
    wrap.classList.remove('open');
  });
  root.querySelectorAll('.filter-pill[aria-expanded="true"]').forEach(button => {
    if (except && button.closest('.filter-pill-wrap')?.contains(except)) return;
    button.setAttribute('aria-expanded', 'false');
  });
}
export function toggleDropdown(root, type) {
  const drop = root.querySelector('#drop-' + CSS.escape(type));
  const wrap = root.querySelector('#pill-wrap-' + CSS.escape(type));
  const pill = root.querySelector('#pill-' + CSS.escape(type));
  if (!drop || !wrap || !pill) return;
  const wasOpen = drop.classList.contains('show');
  closeDropdowns(root);
  if (!wasOpen) {
    drop.classList.add('show');
    wrap.classList.add('open');
    pill.setAttribute('aria-expanded', 'true');
    pill.setAttribute('aria-controls', drop.id);
  }
}
export function filterDropdownItems(input, containerId) {
  const root = tableRoot(input);
  const container = root.querySelector('#' + CSS.escape(containerId));
  if (!container) return;
  const term = String(input.value || '').trim().toLocaleLowerCase('zh-Hant');
  const labels = Array.from(container.querySelectorAll('.filter-option'));
  let visible = 0;
  for (const label of labels) {
    const matches = String(label.textContent || '').toLocaleLowerCase('zh-Hant').includes(term);
    label.style.display = matches ? 'flex' : 'none';
    if (matches) visible++;
  }
  let empty = container.querySelector('.empty-filter-msg');
  if (!visible && labels.length) {
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'empty-filter-msg';
      empty.textContent = '找不到符合的選項';
      empty.setAttribute('role', 'status');
      container.appendChild(empty);
    }
  } else {
    empty?.remove();
  }
  const type = containerId.replace(/-options-container$/, '');
  updateVisibleSelectAll(root, type);
}
export function updateVisibleSelectAll(root, type) {
  const btn = root.querySelector('.btn-filter-toggle[data-type="' + CSS.escape(type) + '"]');
  if (!btn) return;
  const visible = Array.from(root.querySelectorAll('.filter-chk-' + CSS.escape(type)))
    .filter(box => box.closest('.filter-option')?.style.display !== 'none');
  const allChecked = visible.length > 0 && visible.every(box => box.checked);
  btn.dataset.state = allChecked ? 'all' : 'none';
  btn.textContent = allChecked ? '取消選取' : '全選';
  btn.disabled = visible.length === 0;
}
export function toggleVisibleSelection(root, type, selection) {
  if (!selection) return;
  const visible = Array.from(root.querySelectorAll('.filter-chk-' + CSS.escape(type)))
    .filter(box => box.closest('.filter-option')?.style.display !== 'none');
  if (!visible.length) return;
  // The actual checkbox state is authoritative; never trust an old data-state flag.
  const shouldSelect = !visible.every(box => selection.has(box.value));
  for (const box of visible) {
    box.checked = shouldSelect;
    if (shouldSelect) selection.add(box.value);
    else selection.delete(box.value);
  }
  updateVisibleSelectAll(root, type);
}
export function matchesSelection(value, selected) {
  if (!selected || selected.size === 0) return true;
  if (Array.isArray(value)) return value.some(v => selected.has(String(v)));
  return selected.has(String(value ?? ''));
}
export function pageSlice(records, page, pageSize) {
  const size = Math.max(1, Number(pageSize) || 15);
  const totalPages = Math.max(1, Math.ceil(records.length / size));
  const currentPage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const start = (currentPage - 1) * size;
  return { currentPage, totalPages, start, items: records.slice(start, start + size) };
}

/** Shared compact paginator markup, with explicit aria labels. */
export function paginationMarkup(page, totalPages) {
  const max = Math.max(1, Number(totalPages) || 1);
  const current = Math.min(max, Math.max(1, Number(page) || 1));
  const parts = [];
  let previous = 0;
  for (let p = 1; p <= max; p++) {
    if (p !== 1 && p !== max && Math.abs(p - current) > 1) continue;
    if (previous && p - previous > 1) {
      parts.push('<span class="page-btn page-gap" aria-hidden="true">…</span>');
    }
    parts.push('<button type="button" class="page-btn page-num-btn' +
      (p === current ? ' active' : '') + '" data-page="' + p +
      '" aria-label="第 ' + p + ' 頁"' + (p === current ? ' aria-current="page"' : '') +
      '>' + p + '</button>');
    previous = p;
  }
  const back = '<button type="button" class="page-btn page-step-btn" data-page="' + (current - 1) +
    '" aria-label="上一頁"' + (current <= 1 ? ' disabled' : '') +
    '><i class="ti ti-chevron-left" aria-hidden="true"></i></button>';
  const next = '<button type="button" class="page-btn page-step-btn" data-page="' + (current + 1) +
    '" aria-label="下一頁"' + (current >= max ? ' disabled' : '') +
    '><i class="ti ti-chevron-right" aria-hidden="true"></i></button>';
  return back + parts.join('') + next;
}
