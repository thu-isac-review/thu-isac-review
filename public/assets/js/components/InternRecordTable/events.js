import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    // 快捷鍵綁定
    if (!state.isKeyboardShortcutBound) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.dialog-overlay.open, .info-modal-overlay.open');
                if (openModals.length > 0) openModals[openModals.length - 1].classList.remove('open');
            }
        });
        state.isKeyboardShortcutBound = true;
    }

    // 1. 頂部工具列事件
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        if (state.filteredRecords.length === 0) { UI.showToast("沒有資料可供匯出！", "error"); return; }
        // 匯出邏輯不變
        let csv = '\uFEFF學號,姓名,學系,年級,機構名稱,實習起訖時間,總時數,實習時間,證明文件,投保情形,勞雇關係,填報系所,備註\n';
        state.filteredRecords.forEach(d => {
            csv += [d.student_raw?.split(' - ')[0], d.student_raw?.split(' - ')[1], d.dept, d.grade, d.inst_raw, d.duration, d.hours, d.period_type, d.proof_type, d.insurance, d.employment, d.resp_dept, d.notes].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習紀錄清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    });
    
    container.querySelector('#btn-create-record')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        state.editingId = null; state.selectedCourseIds = [];
        document.getElementById('data-form')?.reset();
        document.getElementById('input-institution').dataset.id = '';
        Render.renderSelectedCourseChips();
        document.getElementById('input-resp-dept').innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        UI.openFormModal(false);
    });

    container.querySelector('#search-input')?.addEventListener('input', () => { 
        state.currentPage = 1; Render.renderTable(); 
    });

    // 2. 篩選器事件 (完全對齊 CourseTable 邏輯)
    const filterTypes = ['dept', 'grade', 'inst_raw', 'course', 'resp_dept', 'period', 'proof', 'insurance', 'employment'];
    filterTypes.forEach(type => {
        container.querySelector(`#pill-${type}`)?.addEventListener('click', (e) => { e.stopPropagation(); UI.toggleDropdown(type); });
        container.querySelector(`#search-${type}-input`)?.addEventListener('keyup', (e) => UI.filterDropdownItems(e.target, `${type}-options-container`));
        
        container.querySelector(`#drop-${type}`)?.addEventListener('change', (e) => {
            if(e.target.classList.contains(`filter-chk-${type}`)) {
                const val = e.target.value;
                const set = state.filterSelections[type];
                if (set.has(val)) set.delete(val); else set.add(val);
                document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
                state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
            }
        });
    });

    // 「全選/取消選取」按鈕 (btn-filter-toggle)
    container.querySelectorAll('.btn-filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const isSelectAll = btn.dataset.state !== 'all';
            btn.dataset.state = isSelectAll ? 'all' : 'none';
            btn.innerText = isSelectAll ? '取消選取' : '全選';
            
            const set = state.filterSelections[type];
            container.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                if(c.closest('.filter-option').style.display !== 'none') { 
                    c.checked = isSelectAll; 
                    if(isSelectAll) set.add(c.value); else set.delete(c.value); 
                }
            });
            state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
        });
    });

    // 點擊外部關閉選單
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

    // 3. 批次操作列事件
    container.querySelector('#selectAll')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const currentPaginatedIds = state.filteredRecords.slice(startIndex, startIndex + state.itemsPerPage).map(d => d.id);
        
        if (isChecked) { currentPaginatedIds.forEach(id => { if (!state.selectedIds.includes(id)) state.selectedIds.push(id); }); } 
        else { state.selectedIds = state.selectedIds.filter(id => !currentPaginatedIds.includes(id)); }
        UI.updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-select-all-filtered')?.addEventListener('click', () => { state.selectedIds = state.filteredRecords.map(d => d.id); UI.updateBatchActionBar(); Render.renderTable(); });
    container.querySelector('#btn-clear-selection')?.addEventListener('click', () => { state.selectedIds = []; UI.updateBatchActionBar(); Render.renderTable(); });
    container.querySelector('#btn-batch-delete')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        if (!confirm(`確定刪除選取的 ${state.selectedIds.length} 筆紀錄嗎？`)) return;
        try {
            await Data.batchDeleteRecords(state.selectedIds);
            state.selectedIds = []; UI.updateBatchActionBar(); UI.showToast("批次刪除成功", "success");
        } catch(e) { UI.showToast("刪除失敗", "error"); }
    });

    // 4. 表單儲存與關閉
    container.querySelector('#btn-close-modal-x')?.addEventListener('click', UI.closeFormModal);
    container.querySelector('#btn-cancel-modal')?.addEventListener('click', UI.closeFormModal);
    container.querySelector('#btn-info-close')?.addEventListener('click', UI.closeInfoPopup);
    container.querySelector('#btn-info-footer-close')?.addEventListener('click', UI.closeInfoPopup);

    container.querySelector('#btn-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        const payload = {
            student_raw: document.getElementById('input-student').value.trim(),
            grade: document.getElementById('input-grade').value,
            inst_raw: document.getElementById('input-institution').value.trim(),
            inst_id: document.getElementById('input-institution').dataset.id || '',
            period_type: document.getElementById('input-period-type').value,
            duration: document.getElementById('input-duration').value.trim(),
            insurance: document.getElementById('input-insurance').value,
            employment: document.getElementById('input-employment').value,
            proof_type: document.getElementById('input-proof-type').value,
            hours: document.getElementById('input-hours').value ? Number(document.getElementById('input-hours').value) : '',
            resp_dept: document.getElementById('input-resp-dept').value,
            notes: document.getElementById('input-notes').value.trim(),
            courses: state.selectedCourseIds
        };
        
        if(!payload.student_raw || !payload.inst_raw || !payload.duration || !payload.grade || !payload.period_type || !payload.proof_type || !payload.insurance || !payload.employment || !payload.resp_dept) { 
            UI.showToast("請填寫所有必填欄位！", "warning"); return; 
        }

        const btn = document.getElementById('btn-submit');
        if(btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...'; }
        try {
            if (state.editingId) { await Data.updateRecord(state.editingId, payload); UI.showToast("紀錄更新成功！", "success"); } 
            else { await Data.addRecord(payload); UI.showToast("新紀錄新增成功！", "success"); }
            UI.closeFormModal();
        } catch (err) { UI.showToast("儲存失敗：" + err.message, "error"); }
        finally { if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存'; } }
    });

    // 5. 分頁與表格內操作 (Event Delegation)
    container.querySelector('#per-page-select')?.addEventListener('change', (e) => { state.itemsPerPage = Number(e.target.value); state.currentPage = 1; Render.renderTable(); });
    
    container.addEventListener('click', (e) => {
        // 分頁按鈕
        const pageBtn = e.target.closest('.page-btn');
        if (pageBtn && !pageBtn.disabled && !pageBtn.classList.contains('active')) {
            const p = Number(pageBtn.dataset.page);
            if (p) { state.currentPage = p; Render.renderTable(); }
        }
        
        // 排序
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const col = th.dataset.sort;
            if (state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            else { state.sortCol = col; state.sortDir = 'asc'; }
            Render.renderTable();
        }

        // 行 Checkbox
        const rowChk = e.target.closest('.row-select-chk');
        if (rowChk) {
            const id = rowChk.value;
            const index = state.selectedIds.indexOf(id);
            if (index === -1) state.selectedIds.push(id); else state.selectedIds.splice(index, 1);
            UI.updateBatchActionBar(); Render.renderTable();
        }

        // 編輯按鈕
        const btnEdit = e.target.closest('.btn-row-edit');
        if (btnEdit && !state.isReadOnly) {
            const id = btnEdit.dataset.id;
            const data = state.allRecords.find(d => d.id === id); if (!data) return;
            state.editingId = id;
            document.getElementById('input-student').value = data.student_raw || '';
            const instInput = document.getElementById('input-institution');
            instInput.value = data.inst_raw || ''; instInput.dataset.id = data.inst_id || '';
            document.getElementById('input-duration').value = data.duration || '';
            document.getElementById('input-hours').value = data.hours !== undefined ? data.hours : '';
            document.getElementById('input-notes').value = data.notes || '';
            document.getElementById('input-grade').value = data.grade || '';
            document.getElementById('input-period-type').value = data.period_type || '';
            document.getElementById('input-proof-type').value = data.proof_type || '';
            document.getElementById('input-insurance').value = data.insurance || '';
            document.getElementById('input-employment').value = data.employment || '';
            
            state.selectedCourseIds = Array.isArray(data.courses) ? [...data.courses] : [];
            Render.renderSelectedCourseChips(true);
            UI.updateRespDeptOptions(data.resp_dept);
            UI.openFormModal(true);
        }

        // 刪除按鈕
        const btnDel = e.target.closest('.btn-row-delete');
        if (btnDel && !state.isReadOnly) {
            const id = btnDel.dataset.id;
            if (confirm("確定要刪除這筆實習紀錄嗎？\n此操作無法復原。")) {
                Data.deleteRecord(id).then(() => UI.showToast("刪除成功", "success")).catch(() => UI.showToast("刪除失敗", "error"));
            }
        }
        
        // 展開課程按鈕
        const btnExpand = e.target.closest('.btn-course-expand');
        if (btnExpand) {
            const id = btnExpand.dataset.id;
            const el = document.getElementById(`expand-course-${id}`);
            const icon = document.getElementById(`icon-course-${id}`);
            if (el && icon) {
                const isHidden = el.style.display === 'none';
                el.style.display = isHidden ? 'block' : 'none';
                icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        }
    });

    // 綁定輸入框搜尋即時顯示 Dropdown
    container.querySelector('#input-student')?.addEventListener('input', (e) => { document.getElementById('student-dropdown').classList.add('show'); Render.renderStudentDropdown(state.allStudents, e.target.value); });
    container.querySelector('#input-institution')?.addEventListener('input', (e) => { e.target.dataset.id = ''; document.getElementById('institution-dropdown').classList.add('show'); Render.renderInstDropdown(state.allInsts, e.target.value); });
    container.querySelector('#input-course-search')?.addEventListener('input', (e) => { document.getElementById('course-dropdown').classList.add('show'); Render.renderCourseDropdown(state.allCourses, e.target.value); });
}
