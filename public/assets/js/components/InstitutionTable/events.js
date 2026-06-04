import { state } from './state.js';
import { renderTable, buildBaseTree } from './render.js';
import { updateColStyles } from './ui.js';
import { deleteInstitution, batchDelete, executeBatchEdit, executeMerge, submitInstitutionForm } from './data.js';

export function bindEvents(container) {
    // 搜尋
    container.querySelector('#search-input')?.addEventListener('input', () => {
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1; state.isSearchAutoExpand = true; renderTable();
        }, 250);
    });

    // 點擊表格操作按鈕
    container.querySelector('#table-body')?.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.tree-toggle');
        const btnEdit = e.target.closest('.btn-row-edit');
        const btnView = e.target.closest('.btn-row-view-detail');
        const btnDel = e.target.closest('.btn-row-delete');
        const rowChk = e.target.closest('.row-select-chk');

        if (toggleBtn) {
            const tr = toggleBtn.closest('tr');
            const pId = tr.dataset.id;
            const isExpanded = toggleBtn.classList.toggle('expanded');
            if (isExpanded) state.expandedParents.add(pId); else state.expandedParents.delete(pId);
            container.querySelectorAll(`.child-of-${pId}`).forEach(row => row.style.display = isExpanded ? '' : 'none');
        }

        // 不論是管理端的「編輯」還是前台的「查看」，都呼叫 openEditModal
        if (btnEdit || btnView) {
            const id = (btnEdit || btnView).dataset.id;
            openEditModal(container, id);
        }

        if (btnDel) {
            const id = btnDel.dataset.id;
            const name = btnDel.dataset.name;
            if (confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) deleteInstitution(id);
        }

        if (rowChk && !state.isReadOnly) {
            const id = rowChk.value;
            const idx = state.selectedIds.indexOf(id);
            if (idx === -1) state.selectedIds.push(id); else state.selectedIds.splice(idx, 1);
            updateBatchActionBar(container);
        }
    });

    // 表頭全選
    container.querySelector('#selectAll')?.addEventListener('change', (e) => {
        if(state.isReadOnly) return;
        const isChecked = e.target.checked;
        const visibleRows = Array.from(container.querySelectorAll('#table-body tr')).filter(r => r.style.display !== 'none' && !r.querySelector('.empty-state'));
        visibleRows.forEach(row => {
            const id = row.dataset.id;
            if (isChecked && !state.selectedIds.includes(id)) state.selectedIds.push(id);
            else if (!isChecked) state.selectedIds = state.selectedIds.filter(x => x !== id);
        });
        updateBatchActionBar(container); renderTable();
    });

    // Modal 關閉與頁籤切換
    container.querySelector('#btn-close-modal-x')?.addEventListener('click', () => container.querySelector('#data-modal').classList.remove('open'));
    container.querySelector('#btn-cancel-modal')?.addEventListener('click', () => container.querySelector('#data-modal').classList.remove('open'));
    
    container.querySelector('#tab-btn-main')?.addEventListener('click', () => {
        container.querySelector('#tab-main-view').style.display = 'flex';
        container.querySelector('#tab-history-view').style.display = 'none';
        container.querySelector('#data-form').style.display = 'flex';
        container.querySelector('#tab-history').style.display = 'none';
    });

    container.querySelector('#tab-btn-history')?.addEventListener('click', () => {
        container.querySelector('#tab-main-view').style.display = 'none';
        container.querySelector('#tab-history-view').style.display = 'block';
        container.querySelector('#data-form').style.display = 'none';
        container.querySelector('#tab-history').style.display = 'block';
    });

    // 只有在管理模式下才綁定寫入事件
    if (!state.isReadOnly) {
        container.querySelector('#btn-create-inst')?.addEventListener('click', () => {
            state.editingId = null;
            container.querySelector('#data-form').reset();
            container.querySelector('#modal-title').innerHTML = '<i class="ti ti-building-skyscraper text-brand"></i> 新增實習機構';
            lockFormFields(container, false); // 解鎖
            container.querySelector('#data-modal').classList.add('open');
        });
        
        container.querySelector('#btn-submit')?.addEventListener('click', () => submitInstitutionForm(container));
        container.querySelector('#btn-batch-delete')?.addEventListener('click', () => batchDelete());
        container.querySelector('#btn-batch-edit-submit')?.addEventListener('click', () => executeBatchEdit(container));
    }

    // 分頁
    container.querySelector('#per-page-select')?.addEventListener('change', (e) => {
        state.itemsPerPage = Number(e.target.value); state.currentPage = 1; renderTable();
    });
    container.querySelector('#pagination-controls')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled || btn.classList.contains('active')) return;
        const p = Number(btn.dataset.page);
        if (p) { state.currentPage = p; renderTable(); }
    });
}

// 動態鎖定/解鎖表單，讓同一份 Modal 擁有編輯與唯讀兩種型態
function openEditModal(container, id) {
    const docData = state.allData.find(d => d.id === id);
    if (!docData) return;
    
    state.editingId = id;
    state.currentHistory = docData.history || [];

    // 填入資料 (此處依您的 HTML input id 對應填入)
    container.querySelector('#input-name').value = docData.name || '';
    container.querySelector('#input-country').value = docData.country || '中華民國';
    container.querySelector('#input-tax-id').value = docData.tax_id || '';
    container.querySelector('#input-city').value = docData.city || '';
    container.querySelector('#input-address').value = docData.address || '';
    container.querySelector('#input-industry').value = docData.industry || '';
    container.querySelector('#input-venue-type').value = docData.venue_type || '';
    container.querySelector('#input-remarks').value = docData.remarks || '';

    lockFormFields(container, state.isReadOnly);
    
    container.querySelector('#data-modal').classList.add('open');
}

function lockFormFields(container, isLocked) {
    const inputs = container.querySelectorAll('#data-form input, #data-form select, #data-form textarea');
    inputs.forEach(el => el.disabled = isLocked);
    
    if (isLocked) {
        container.querySelector('#btn-submit').style.display = 'none';
        const addHistBtn = container.querySelector('#btn-show-add-history');
        if(addHistBtn) addHistBtn.style.display = 'none';
        container.querySelector('#modal-title').innerHTML = '<i class="ti ti-building-community text-brand"></i> 機構詳細資料';
        container.querySelector('#btn-cancel-modal').innerText = '關閉視窗';
    } else {
        container.querySelector('#btn-submit').style.display = 'flex';
        const addHistBtn = container.querySelector('#btn-show-add-history');
        if(addHistBtn) addHistBtn.style.display = 'flex';
        container.querySelector('#modal-title').innerHTML = '<i class="ti ti-edit text-brand"></i> 編輯機構與歷史軌跡';
        container.querySelector('#btn-cancel-modal').innerText = '取消';
    }
}

function updateBatchActionBar(container) {
    const bar = container.querySelector('#batch-bar');
    const count = container.querySelector('#selected-count');
    if (!bar) return;
    if (state.selectedIds.length > 0) {
        bar.classList.add('visible');
        count.innerText = state.selectedIds.length;
    } else {
        bar.classList.remove('visible');
        container.querySelector('#selectAll').checked = false;
    }
}
