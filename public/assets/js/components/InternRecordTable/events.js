import { state, getDeptShort, getColShort } from './state.js';
import * as db from './data.js';
import * as ui from './ui.js';
import * as render from './render.js';

export function bindEvents(container) {
    if (!container) return;

    // 防止切換頁面時重複綁定全域事件
    if (!state.isGlobalListenerBound) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-pill-wrap')) {
                document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
                document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            }
            if (!e.target.closest('#input-student') && !e.target.closest('#student-dropdown')) document.getElementById('student-dropdown')?.classList.remove('show');
            if (!e.target.closest('#input-institution') && !e.target.closest('#institution-dropdown')) document.getElementById('institution-dropdown')?.classList.remove('show');
            if (!e.target.closest('#input-course-search') && !e.target.closest('#course-dropdown')) document.getElementById('course-dropdown')?.classList.remove('show');
        });
        state.isGlobalListenerBound = true;
    }

    // 1. 頂部與表格操作
    container.querySelector('#search-input')?.addEventListener('input', () => { state.currentPage = 1; render.renderTable(); });
    
    // 利用事件委派 (Event Delegation) 綁定 Container 內的各種 Click
    container.addEventListener('click', async (e) => {
        // 分頁
        const pageNumBtn = e.target.closest('.page-num-btn');
        if (pageNumBtn) { state.currentPage = Number(pageNumBtn.dataset.page); render.renderTable(); return; }
        if (e.target.closest('#btn-page-prev')) { if (state.currentPage > 1) { state.currentPage--; render.renderTable(); } return; }
        if (e.target.closest('#btn-page-next')) { state.currentPage++; render.renderTable(); return; }

        // 表格編輯與刪除
        const rowEditBtn = e.target.closest('.btn-row-edit');
        if (rowEditBtn) { triggerEdit(rowEditBtn.dataset.id); return; }
        const rowDeleteBtn = e.target.closest('.btn-row-delete');
        if (rowDeleteBtn) {
            ui.showConfirm(`確定要刪除「${rowDeleteBtn.dataset.name}」的這筆實習紀錄嗎？\n此操作無法復原。`, async () => {
                await db.deleteRecord(rowDeleteBtn.dataset.id); ui.showToast("已成功刪除紀錄！");
            });
        }
        
        // 課程展開等 UI 操作
        const courseExpandBtn = e.target.closest('.btn-course-expand');
        if (courseExpandBtn) {
            const el = container.querySelector(`#expand-course-${courseExpandBtn.dataset.id}`);
            const icon = container.querySelector(`#icon-course-${courseExpandBtn.dataset.id}`);
            if (el && icon) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; icon.style.transform = el.style.display === 'none' ? 'rotate(0deg)' : 'rotate(180deg)'; }
        }
    });

    // 表單按鈕綁定
    container.querySelector('#btn-add-record')?.addEventListener('click', () => {
        state.editingId = null; state.selectedCourseIds = [];
        const setVal = id => { const el = document.getElementById(id); if (el) el.value = ''; };
        ['input-student', 'input-institution', 'input-duration', 'input-hours', 'input-period-type', 'input-proof-type', 'input-insurance', 'input-employment', 'input-notes'].forEach(setVal);
        document.getElementById('input-institution').dataset.id = '';
        render.renderSelectedCourseChips();
        const respDept = document.getElementById('input-resp-dept'); if(respDept) respDept.innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        ui.openFormModal(false);
    });

    container.querySelector('#btn-submit')?.addEventListener('click', async () => {
        const payload = {
            student_raw: document.getElementById('input-student')?.value.trim(),
            grade: document.getElementById('input-grade')?.value,
            inst_raw: document.getElementById('input-institution')?.value.trim(),
            inst_id: document.getElementById('input-institution')?.dataset?.id || '',
            period_type: document.getElementById('input-period-type')?.value,
            duration: document.getElementById('input-duration')?.value.trim(),
            insurance: document.getElementById('input-insurance')?.value,
            employment: document.getElementById('input-employment')?.value,
            proof_type: document.getElementById('input-proof-type')?.value,
            hours: document.getElementById('input-hours')?.value ? Number(document.getElementById('input-hours').value) : '',
            resp_dept: document.getElementById('input-resp-dept')?.value,
            notes: document.getElementById('input-notes')?.value.trim(),
            courses: state.selectedCourseIds
        };
        try {
            if (state.editingId) { await db.updateRecord(state.editingId, payload); ui.showToast("已成功更新實習紀錄！"); } 
            else { await db.addRecord(payload); ui.showToast("已成功新增實習紀錄！"); }
            ui.closeFormModal();
        } catch (err) { ui.showToast("儲存失敗：" + err.message, "error"); }
    });

    // ... 其他與之前一模一樣的選單與 Export 邏輯 (不變) ...
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar'); const count = document.getElementById('selected-count'); const btn = document.getElementById('btn-select-all-filtered'); 
    if (!bar) return;
    if (state.selectedIds.length > 0) { bar.classList.add('visible'); if (count) count.innerText = state.selectedIds.length; if (btn) { btn.style.display = state.selectedIds.length < state.filteredRecords.length ? 'inline-flex' : 'none'; } } else { bar.classList.remove('visible'); }
}
function triggerEdit(id) { /* 原有的 Edit 邏輯 */ }
// ... (保留原本的 renderStudentDropdown, checkBtnActive 等 Helper)
