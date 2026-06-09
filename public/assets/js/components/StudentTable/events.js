import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    if (!state.isKeyboardShortcutBound) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.dialog-overlay.open');
                if (openModals.length > 0) openModals[openModals.length - 1].classList.remove('open');
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) { searchInput.focus(); searchInput.select(); }
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                if (state.isReadOnly) return;
                e.preventDefault();
                if (document.getElementById('data-modal')?.classList.contains('open')) {
                    document.getElementById('btn-submit')?.click();
                }
            }
        });
        state.isKeyboardShortcutBound = true;
    }

    // ---------------- 1. 頂部工具列事件 ----------------
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        if (state.filteredData.length === 0) { UI.showNotification("沒有資料可供匯出！", "error"); return; }
        
        // 🌟 [修改] 匯出的報表也要加上「實習紀錄數」的計算邏輯，並強化防呆匹配
        let csv = '\uFEFF學院,學系,學號,姓名,性別,國籍,實習紀錄數\n';
        state.filteredData.forEach(d => {
            const recordCount = state.allRecords.filter(r => 
                r.student_id === d.id || r.student_id === d.student_id || r.studentId === d.id || r.studentId === d.student_id || r.student_doc_id === d.id
            ).length;
            csv += [d.college, d.department, d.student_id, d.name, d.gender, d.nationality || '本國籍', recordCount].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習學生清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
        UI.showNotification("學生清單匯出成功！", "success");
    });
    
    container.querySelector('#btn-import-trigger')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        container.querySelector('#import-file')?.click();
    });
    
    container.querySelector('#import-file')?.addEventListener('change', async (e) => {
        if(state.isReadOnly) return;
        const file = e.target.files[0]; if (!file) return;
        const btn = document.getElementById('btn-import-trigger');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> <span class="btn-text">匯入中...</span>';
        btn.disabled = true;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const rows = event.target.result.split('\n').map(row => row.trim()).filter(row => row);
                let parsedRows = [];
                let skippedCount = 0;
                
                for (let i = 1; i < rows.length; i++) {
                    let cols = []; let inQuotes = false; let currentVal = '';
                    for (let char of rows[i]) {
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                        else currentVal += char;
                    }
                    cols.push(currentVal.trim());

                    if (cols.length >= 5) {
                        const studentId = (cols[2] || '').toUpperCase().trim();
                        const isExist = state.allData.some(d => d.student_id === studentId);
                        if (isExist) { skippedCount++; continue; }

                        const payload = {
                            college: cols[0], department: cols[1], student_id: studentId,
                            name: cols[3], gender: cols[4] || '男', nationality: cols[5] || '本國籍'
                        };
                        if (!payload.college || !payload.department || !payload.student_id || !payload.name) continue;
                        parsedRows.push(payload);
                    }
                }
                
                const addedCount = await Data.batchImport(parsedRows);
                let finishMessage = `✅ 成功匯入 ${addedCount} 筆學生資料！`;
                if (skippedCount > 0) finishMessage += ` (另有 ${skippedCount} 筆因學號重複已自動略過)`;
                UI.showNotification(finishMessage, "success");
                
                await Data.fetchInitialDataOnce();
                UI.populateAllFiltersUI();
                UI.updateBatchActionBar();
                Render.renderTable();
            } catch (error) { 
                UI.showNotification("匯入失敗：" + error.message, "error"); 
            } 
            finally { btn.innerHTML = originalHtml; btn.disabled = false; e.target.value = ''; }
        };
        reader.readAsText(file);
    });

    container.querySelector('#btn-create-student')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        state.editingId = null;
        document.getElementById('data-form')?.reset();
        document.getElementById('input-department').innerHTML = '<option value="">請先選擇學院...</option>';
        const mt = document.getElementById('modal-title');
        if(mt) mt.innerHTML = '<i class="ti ti-user-plus text-brand" style="font-size: 20px;"></i> 新增學生資料';
        document.getElementById('data-modal')?.classList.add('open');
    });
    
    container.querySelector('#search-input')?.addEventListener('input', () => { 
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1; Render.renderTable(); 
        }, 250);
    });

    // ---------------- 2. 篩選器事件 ----------------
    const filterTypes = ['college', 'dept', 'gender', 'nationality'];
    
    filterTypes.forEach(type => {
        container.querySelector(`#pill-${type}`)?.addEventListener('click', (e) => { e.stopPropagation(); UI.toggleDropdown(type); });
        container.querySelector(`#search-${type}-input`)?.addEventListener('keyup', (e) => UI.filterDropdownItems(e.target, `${type}-options-container`));
        
        container.querySelector(`#drop-${type}`)?.addEventListener('change', (e) => {
            if(e.target.classList.contains(`filter-chk-${type}`)) {
                const val = e.target.value;
                const setMap = { 'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'gender': state.filterGenderSet, 'nationality': state.filterNatSet };
                const set = setMap[type];

                if (set.has(val)) set.delete(val); else set.add(val);
                document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
                
                if(type === 'college') { UI.populateDeptFilterUI(); }
                state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
            }
        });
        
        container.querySelector(`#drop-${type}`)?.addEventListener('click', (e) => {
            if(e.target.classList.contains('btn-clear-filter') && e.target.dataset.type === type) {
                const setMap = { 'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'gender': state.filterGenderSet, 'nationality': state.filterNatSet };
                setMap[type].clear();
                
                document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = false);
                const searchInput = document.getElementById(`search-${type}-input`);
                if (searchInput) {
                    searchInput.value = '';
                    UI.filterDropdownItems(searchInput, `${type}-options-container`);
                }

                if(type === 'college') { UI.populateDeptFilterUI(); }
                state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
            }
        });
    });

    container.querySelectorAll('.btn-filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const isSelectAll = btn.dataset.state !== 'all';
            btn.dataset.state = isSelectAll ? 'all' : 'none';
            btn.innerText = isSelectAll ? '取消選取' : '全選';
            
            const setMap = { 'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'gender': state.filterGenderSet, 'nationality': state.filterNatSet };
            const set = setMap[type];
            container.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                if(c.closest('.filter-option').style.display !== 'none') { 
                    c.checked = isSelectAll; 
                    if(isSelectAll) set.add(c.value); else set.delete(c.value); 
                }
            });
            
            if(type === 'college') { UI.populateDeptFilterUI(); }
            state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
        });
    });

    if (!state.isGlobalListenerBound) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-pill-wrap')) {
                document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
                document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            }
        });
        state.isGlobalListenerBound = true;
    }

    // ---------------- 3. 批次操作列事件 ----------------
    container.querySelector('#selectAll')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const currentPaginatedIds = state.filteredData.slice(startIndex, startIndex + state.itemsPerPage).map(d => d.id);
        
        if (isChecked) { currentPaginatedIds.forEach(id => { if (!state.selectedIds.includes(id)) state.selectedIds.push(id); }); } 
        else { state.selectedIds = state.selectedIds.filter(id => !currentPaginatedIds.includes(id)); }
        UI.updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-select-all-filtered')?.addEventListener('click', () => {
        state.selectedIds = state.filteredData.map(d => d.id);
        UI.updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-clear-selection')?.addEventListener('click', () => {
        state.selectedIds = []; UI.updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-batch-delete')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        if (!confirm(`確定刪除選取的 ${state.selectedIds.length} 名學生嗎？\n(注意：若有對應之實習紀錄，刪除後將無法追溯該生身分)`)) return;
        
        const btn = document.getElementById('btn-batch-delete');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 刪除中...';
        btn.disabled = true;

        try {
            await Data.batchDelete();
            state.selectedIds = [];
            await Data.fetchInitialDataOnce(); 
            UI.populateAllFiltersUI();
            UI.updateBatchActionBar(); Render.renderTable(); 
            UI.showNotification("已成功批次刪除所選學生！", "success");
        } catch (e) {
            UI.showNotification("刪除失敗，請檢查資料庫連線", "error");
        } finally {
            if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        }
    });

    // ---------------- 4. 分頁與排序 ----------------
    container.querySelector('#per-page-select')?.addEventListener('change', (e) => { 
        state.itemsPerPage = Number(e.target.value); state.currentPage = 1; Render.renderTable(); 
    });
    
    container.querySelector('#pagination-controls')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled || btn.classList.contains('active')) return;
        const p = Number(btn.dataset.page);
        if (p) { state.currentPage = p; Render.renderTable(); }
    });
    
    container.querySelector('#student-table-head')?.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const col = th.dataset.sort;
            if (state.sortCol === col) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; } 
            else { state.sortCol = col; state.sortDir = 'asc'; }
            
            document.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                const icon = t.querySelector('.sort-icon');
                if(icon) icon.className = 'ti ti-arrows-sort sort-icon';
            });
            
            th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            const thIcon = th.querySelector('.sort-icon');
            if(thIcon) thIcon.className = `ti ti-sort-${state.sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            Render.renderTable();
        }
    });

    // ---------------- 5. 表單交互 ----------------
    container.querySelector('#input-college')?.addEventListener('change', () => UI.updateFormDepts());
    container.querySelector('#btn-close-modal-x')?.addEventListener('click', UI.closeModal);
    container.querySelector('#btn-cancel-modal')?.addEventListener('click', UI.closeModal);

    // ---------------- 6. 表單送出與儲存判斷 ----------------
    container.querySelector('#btn-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        
        const payload = { 
            college: document.getElementById('input-college').value,
            department: document.getElementById('input-department').value,
            student_id: document.getElementById('input-student-id').value.toUpperCase().trim(),
            name: document.getElementById('input-name').value.trim(),
            gender: document.getElementById('input-gender').value,
            nationality: document.getElementById('input-nationality').value
        };

        if(!payload.college || !payload.department || !payload.student_id || !payload.name) { 
            alert("請填寫所有必填欄位！"); return; 
        }

        // 新增時檢查學號是否重複
        if (!state.editingId) {
            const isExist = state.allData.some(d => d.student_id === payload.student_id);
            if (isExist) {
                alert(`學號 ${payload.student_id} 已存在，無法重複新增！`);
                return;
            }
        }

        const btn = document.getElementById('btn-submit');
        if(btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...'; }

        try {
            const isEdit = !!state.editingId;
            await Data.executeSave(payload);
            UI.closeModal(); 
            await Data.fetchInitialDataOnce(); 
            UI.populateAllFiltersUI();
            UI.updateBatchActionBar(); Render.renderTable(); 
            UI.showNotification(isEdit ? "學生資料更新成功！" : "新學生建立成功！", "success");
        } catch (err) {
            UI.showNotification("儲存失敗，請重試", "error");
            console.error(err);
        } finally {
            if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存'; }
        }
    });

    // ---------------- 7. 表格內行操作 ----------------
    container.querySelector('#student-table-body')?.addEventListener('click', async (e) => {
        const rowChk = e.target.closest('.row-select-chk');
        const btnEdit = e.target.closest('.btn-row-edit');
        const btnDel = e.target.closest('.btn-row-delete');
        
        if (rowChk) { 
            const id = rowChk.value;
            const index = state.selectedIds.indexOf(id);
            if (index === -1) state.selectedIds.push(id); else state.selectedIds.splice(index, 1);
            UI.updateBatchActionBar(); 
            const row = rowChk.closest('tr');
            if(index === -1) row.classList.add('selected'); else row.classList.remove('selected');
        }
        else if (btnEdit) { 
            if(state.isReadOnly) return;
            const id = btnEdit.dataset.id;
            const docData = state.allData.find(d => d.id === id); if (!docData) return;
            state.editingId = id; 
            
            document.getElementById('input-college').value = docData.college || '';
            UI.updateFormDepts(docData.department); 
            
            document.getElementById('input-student-id').value = docData.student_id || '';
            document.getElementById('input-name').value = docData.name || ''; 
            document.getElementById('input-gender').value = docData.gender || '男'; 
            document.getElementById('input-nationality').value = docData.nationality || '本國籍'; 

            const mt = document.getElementById('modal-title');
            if(mt) mt.innerHTML = '<i class="ti ti-edit text-brand" style="font-size: 20px;"></i> 編輯學生資料';
            document.getElementById('data-modal')?.classList.add('open');
        }
        else if (btnDel) { 
            if(state.isReadOnly) return;
            const id = btnDel.dataset.id;
            const name = btnDel.dataset.name;
            
            if (confirm(`確定要刪除學生「${name}」嗎？\n(注意：若有對應之實習紀錄，刪除後將無法追溯該生身分)`)) {
                const originalHtml = btnDel.innerHTML;
                btnDel.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i>';
                try {
                    await Data.deleteData(id);
                    await Data.fetchInitialDataOnce(); 
                    UI.populateAllFiltersUI();
                    UI.updateBatchActionBar(); Render.renderTable();
                    UI.showNotification(`學生「${name}」已刪除成功！`, "success");
                } catch(e) {
                    UI.showNotification("刪除失敗", "error");
                    btnDel.innerHTML = originalHtml;
                }
            }
        }
    });
}
