import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    // 🌟 全域鍵盤快捷鍵綁定
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
        // Task 2B: 匯出功能加入統計修課人數
        let csv = '\uFEFF學年度,學期,開課學制,開課學院,開課學系,選課代號,課程名稱,實習課程屬性,實習學分數,統計修課人數\n';
        state.filteredData.forEach(d => {
            csv += [d.academic_year, d.term, d.edu_system, d.college, d.department, d.course_code, d.course_name, d.course_type, d.credits, d.student_count || 0].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習課程清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
        UI.showNotification("課程清單匯出成功！", "success");
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
                for (let i = 1; i < rows.length; i++) {
                    let cols = []; let inQuotes = false; let currentVal = '';
                    for (let char of rows[i]) {
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                        else currentVal += char;
                    }
                    cols.push(currentVal.trim());

                    if (cols.length >= 9) {
                        const payload = {
                            academic_year: cols[0], term: cols[1], semester: `${cols[0]}-${cols[1]}`,
                            edu_system: cols[2] === '學士班' ? '日間學士班' : cols[2], 
                            college: cols[3], department: cols[4], course_code: cols[5],
                            course_name: cols[6], course_type: cols[7], credits: Number(cols[8]) || 0
                        };
                        if (!payload.academic_year || !payload.term || !payload.course_code || !payload.course_name) continue;
                        parsedRows.push(payload);
                    }
                }
                
                const addedCount = await Data.batchImport(parsedRows);
                UI.showNotification(`✅ 成功匯入 ${addedCount} 筆課程資料！`, "success");
                
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

    container.querySelector('#btn-create-course')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        state.editingId = null;
        document.getElementById('data-form')?.reset();
        document.getElementById('input-department').innerHTML = '<option value="">請先選擇學院...</option>';
        const mt = document.getElementById('modal-title');
        if(mt) mt.innerHTML = '<i class="ti ti-book text-brand" style="font-size: 20px;"></i> 新增實習課程';
        document.getElementById('data-modal')?.classList.add('open');
    });
    
    container.querySelector('#search-input')?.addEventListener('input', () => { 
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1; Render.renderTable(); 
        }, 250);
    });

    // ---------------- 2. 篩選器與顯示設定事件 ----------------
    const filterTypes = ['year', 'term', 'edu', 'college', 'dept', 'code', 'name', 'type', 'credit'];
    
    filterTypes.forEach(type => {
        container.querySelector(`#pill-${type}`)?.addEventListener('click', (e) => { e.stopPropagation(); UI.toggleDropdown(type); });
        container.querySelector(`#search-${type}-input`)?.addEventListener('keyup', (e) => UI.filterDropdownItems(e.target, `${type}-options-container`));
        
        container.querySelector(`#drop-${type}`)?.addEventListener('change', (e) => {
            if(e.target.classList.contains(`filter-chk-${type}`)) {
                const val = e.target.value;
                const setMap = { 'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet, 'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'code': state.filterCodeSet, 'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet };
                const set = setMap[type];

                if (set.has(val)) set.delete(val); else set.add(val);
                document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
                
                // 檢查是否所有選項都被勾選或取消，藉此連動「全選」按鈕的狀態
                const containerEl = document.getElementById(`${type}-options-container`);
                const allCheckboxes = containerEl ? Array.from(containerEl.querySelectorAll(`.filter-chk-${type}`)) : [];
                const visibleCheckboxes = allCheckboxes.filter(c => c.closest('.filter-option').style.display !== 'none');
                
                const btnToggle = document.querySelector(`.btn-filter-toggle[data-type="${type}"]`);
                if (btnToggle && visibleCheckboxes.length > 0) {
                    const allChecked = visibleCheckboxes.every(c => c.checked);
                    btnToggle.dataset.state = allChecked ? 'all' : 'none';
                    btnToggle.innerText = allChecked ? '取消選取' : '全選';
                }

                if(type === 'college') { UI.populateDeptFilterUI(); }
                state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
            }
        });
    });

    // 綁定全選/取消全選按鈕
    container.querySelectorAll('.btn-filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡關閉下拉選單
            const type = btn.dataset.type;
            const isSelectAll = btn.dataset.state !== 'all';
            btn.dataset.state = isSelectAll ? 'all' : 'none';
            btn.innerText = isSelectAll ? '取消選取' : '全選';
            
            const setMap = { 'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet, 'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'code': state.filterCodeSet, 'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet };
            const set = setMap[type];

            // 抓出容器中「目前沒有被隱藏 (display:none)」的 checkbox 進行全選/取消操作
            const containerEl = document.getElementById(`${type}-options-container`);
            if (containerEl) {
                containerEl.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                    if (c.closest('.filter-option').style.display !== 'none') { 
                        c.checked = isSelectAll; 
                        if (isSelectAll) {
                            set.add(c.value); 
                        } else {
                            set.delete(c.value); 
                        }
                    }
                });
            }
            
            // 同步外層的全域 checkbox 狀態 (如果有其他地方綁定同一個值)
            document.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                 c.checked = set.has(c.value);
            });

            if(type === 'college') { UI.populateDeptFilterUI(); }
            state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
        });
    });

    // 顯示設定選單
    const btnDisplaySettings = container.querySelector('#btn-display-settings');
    const displayMenu = container.querySelector('#display-settings-menu');
    btnDisplaySettings?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(displayMenu) {
             // 將所有其他的選單關閉
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            // 切換顯示
            displayMenu.style.display = displayMenu.style.display === 'block' ? 'none' : 'block';
        }
    });
    
    // 防止點擊選單內部時關閉選單
    displayMenu?.addEventListener('click', (e) => { e.stopPropagation(); });

    // 讓 Checkbox 狀態更動後觸發 UI.updateColStyles();
    container.querySelectorAll('.col-toggle-chk').forEach(chk => {
        // 設定初始狀態
        chk.checked = state.colVis[chk.value] !== false; 
        
        chk.addEventListener('change', (e) => {
            state.colVis[e.target.value] = e.target.checked;
            UI.updateColStyles();
        });
    });

    if (!state.isGlobalListenerBound) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-pill-wrap')) {
                document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
                document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            }
            const dm = document.getElementById('display-settings-menu');
            if (dm && !e.target.closest('#display-settings-wrap')) {
                dm.style.display = 'none';
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
        if (!confirm(`確定刪除選取的 ${state.selectedIds.length} 筆課程嗎？`)) return;
        
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
            UI.showNotification("已成功批次刪除所選課程！", "success");
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
    
    container.querySelector('#course-table-head')?.addEventListener('click', (e) => {
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
        const year = document.getElementById('input-academic-year').value.trim();
        const term = document.getElementById('input-term').value.trim();
        const payload = { 
            academic_year: year, term: term, semester: `${year}-${term}`,
            college: document.getElementById('input-college').value,
            department: document.getElementById('input-department').value,
            course_code: document.getElementById('input-course-code').value.trim(),
            course_name: document.getElementById('input-course-name').value.trim(),
            edu_system: document.getElementById('input-edu-system').value,
            course_type: document.getElementById('input-course-type').value,
            credits: Number(document.getElementById('input-credits').value)
        };

        if(!payload.academic_year || !payload.term || !payload.college || !payload.department || !payload.course_code || !payload.course_name) { 
            alert("請填寫所有必填欄位！"); return; 
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
            UI.showNotification(isEdit ? "課程資料更新成功！" : "新課程建立成功！", "success");
        } catch (err) {
            UI.showNotification("儲存失敗，請重試", "error");
            console.error(err);
        } finally {
            if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存'; }
        }
    });

    // ---------------- 7. 表格內行操作 ----------------
    container.querySelector('#table-body')?.addEventListener('click', async (e) => {
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
            
            document.getElementById('input-academic-year').value = docData.academic_year || '';
            document.getElementById('input-term').value = docData.term || '';
            document.getElementById('input-college').value = docData.college || '';
            UI.updateFormDepts(docData.department); 
            
            document.getElementById('input-course-code').value = docData.course_code || '';
            document.getElementById('input-course-name').value = docData.course_name || ''; 
            document.getElementById('input-edu-system').value = docData.edu_system || '日間學士班'; 
            document.getElementById('input-course-type').value = docData.course_type || '必修'; 
            document.getElementById('input-credits').value = docData.credits || 0; 

            const mt = document.getElementById('modal-title');
            if(mt) mt.innerHTML = '<i class="ti ti-edit text-brand" style="font-size: 20px;"></i> 編輯課程資料';
            document.getElementById('data-modal')?.classList.add('open');
        }
        else if (btnDel) { 
            if(state.isReadOnly) return;
            const id = btnDel.dataset.id;
            const name = btnDel.dataset.name;
            
            if (confirm(`確定要刪除課程「${name}」嗎？`)) {
                const originalHtml = btnDel.innerHTML;
                btnDel.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i>';
                try {
                    await Data.deleteData(id);
                    await Data.fetchInitialDataOnce(); 
                    UI.populateAllFiltersUI();
                    UI.updateBatchActionBar(); Render.renderTable();
                    UI.showNotification(`課程「${name}」已刪除成功！`, "success");
                } catch(e) {
                    UI.showNotification("刪除失敗", "error");
                    btnDel.innerHTML = originalHtml;
                }
            }
        }
    });
}
