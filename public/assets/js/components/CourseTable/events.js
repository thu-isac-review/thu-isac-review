import { state } from './state.js';
import { populateAllFiltersUI, populateDeptFilterUI, updateFormDepts, updatePillActive, updateBatchActionBar, renderTable } from './ui.js';
import { saveCourse, deleteCourse, db, dataCollection } from './data.js';
import { addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

export function bindEvents() {
    // 綁定 Dropdown 篩選器事件到 window，確保 HTML inline onclick 依然有效
    window.toggleDropdown = (type) => {
        const drop = document.getElementById(`drop-${type}`);
        const wrap = document.getElementById(`pill-wrap-${type}`);
        const isOpen = drop.classList.contains('show');
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
        if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
    };

    window.filterDropdownItems = (input, containerId) => {
        const term = input.value.toLowerCase();
        const labels = document.getElementById(containerId).querySelectorAll('.filter-option');
        labels.forEach(lbl => {
            const text = lbl.textContent.toLowerCase();
            lbl.style.display = text.includes(term) ? 'flex' : 'none';
        });
    };

    window.toggleFilterCheck = (type, val) => {
        const chk = document.querySelector(`.filter-chk-${type}[value="${val}"]`);
        if(chk) chk.checked = !chk.checked;
        
        const setMap = {
            'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet,
            'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'code': state.filterCodeSet,
            'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet
        };
        const set = setMap[type];

        if (set.has(val)) set.delete(val); else set.add(val);
        document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
        
        if(type === 'college') { populateDeptFilterUI(); }
        state.currentPage = 1; updatePillActive(type); renderTable();
    };

    window.clearFilter = (type) => {
        const setMap = {
            'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet,
            'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'code': state.filterCodeSet,
            'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet
        };
        setMap[type].clear();
        
        document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = false);
        const searchInput = document.getElementById(`search-${type}-input`);
        if (searchInput) {
            searchInput.value = '';
            window.filterDropdownItems(searchInput, `${type}-options-container`);
        }

        if(type === 'college') { populateDeptFilterUI(); }
        state.currentPage = 1; updatePillActive(type); renderTable();
    };

    document.addEventListener('click', e => {
        if (!e.target.closest('.filter-pill-wrap')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
        }
    });

    // 批次與選取事件
    window.toggleSelectPage = (e) => {
        const isChecked = e.target.checked;
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const currentPaginatedIds = state.filteredData.slice(startIndex, startIndex + state.itemsPerPage).map(d => d.id);
        
        if (isChecked) { currentPaginatedIds.forEach(id => { if (!state.selectedIds.includes(id)) state.selectedIds.push(id); }); } 
        else { state.selectedIds = state.selectedIds.filter(id => !currentPaginatedIds.includes(id)); }
        updateBatchActionBar(); renderTable();
    };

    window.toggleSelect = (id) => {
        const index = state.selectedIds.indexOf(id);
        if (index === -1) state.selectedIds.push(id); else state.selectedIds.splice(index, 1);
        updateBatchActionBar(); renderTable();
    };

    window.selectAllFiltered = () => { state.selectedIds = state.filteredData.map(d => d.id); updateBatchActionBar(); renderTable(); };
    window.clearSelection = () => { state.selectedIds = []; updateBatchActionBar(); renderTable(); };

    window.batchDelete = async () => {
        if (!confirm(`警告：確定要刪除選取的 ${state.selectedIds.length} 筆課程嗎？\n此操作無法復原！`)) return;
        try {
            for (let id of state.selectedIds) await deleteCourse(id);
            window.clearSelection();
        } catch (e) { alert("批次刪除發生錯誤: " + e.message); }
    };

    // 表單與 Modal 事件
    window.openModal = () => {
        if (!state.editingId) { 
            document.getElementById('data-form').reset();
            document.getElementById('input-department').innerHTML = '<option value="">請先選擇學院...</option>';
            document.getElementById('modal-title').innerHTML = '<i class="ti ti-book"></i> 新增實習課程';
        }
        document.getElementById('data-modal').classList.add('open');
    };

    window.closeModal = () => { document.getElementById('data-modal').classList.remove('open'); state.editingId = null; };

    window.submitForm = async () => {
        const btn = document.getElementById('btn-submit');
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

        btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...';
        try {
            await saveCourse(payload, state.editingId);
            window.closeModal();
        } catch (err) { alert("儲存發生錯誤：" + err.message); } 
        finally { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存'; }
    };

    window.editData = (id) => {
        const docData = state.allData.find(d => d.id === id);
        if (!docData) return;
        
        state.editingId = id;
        document.getElementById('input-academic-year').value = docData.academic_year || '';
        document.getElementById('input-term').value = docData.term || '';
        document.getElementById('input-college').value = docData.college || '';
        window.updateFormDepts(docData.department); 
        
        document.getElementById('input-course-code').value = docData.course_code || '';
        document.getElementById('input-course-name').value = docData.course_name || ''; 
        document.getElementById('input-edu-system').value = docData.edu_system || '日間學士班'; 
        document.getElementById('input-course-type').value = docData.course_type || '必修'; 
        document.getElementById('input-credits').value = docData.credits || 0; 

        document.getElementById('modal-title').innerHTML = '<i class="ti ti-edit"></i> 編輯實習課程';
        document.getElementById('data-modal').classList.add('open');
    };

    window.deleteData = async (id, name) => {
        if (confirm(`警告：確定要刪除課程「${name}」嗎？\n此操作無法復原！`)) {
            await deleteCourse(id);
        }
    };

    // 其他 UI 事件曝露至 Global
    window.changePage = (page) => { state.currentPage = page; renderTable(); };
    window.changePerPage = (val) => { state.itemsPerPage = Number(val); state.currentPage = 1; renderTable(); };
    window.renderTable = renderTable;
    window.updateFormDepts = updateFormDepts;

    // 綁定排序事件
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.onclick = () => {
            const col = th.dataset.sort;
            if (state.sortCol === col) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; } 
            else { state.sortCol = col; state.sortDir = 'asc'; }
            
            document.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                t.querySelector('.sort-icon').className = 'ti ti-arrows-sort sort-icon';
            });
            
            th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            th.querySelector('.sort-icon').className = `ti ti-sort-${state.sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            renderTable();
        };
    });

    // 搜尋輸入事件
    document.getElementById('search-input')?.addEventListener('input', () => { state.currentPage = 1; renderTable(); });

    // 匯出 / 匯入 CSV
    window.exportToCSV = () => {
        if (state.filteredData.length === 0) { alert("沒有資料可供匯出！"); return; }
        let csv = '\uFEFF學年度,學期,開課學制,開課學院,開課學系,選課代號,課程名稱,實習課程屬性,實習學分數\n';
        state.filteredData.forEach(d => {
            csv += [d.academic_year, d.term, d.edu_system, d.college, d.department, d.course_code, d.course_name, d.course_type, d.credits].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習課程清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    };

    window.handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const btn = document.getElementById('btn-import');
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
                        if (char === '"') { inQuotes = !inQuotes; }
                        else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                        else { currentVal += char; }
                    }
                    cols.push(currentVal.trim());

                    if (cols.length >= 9) {
                        const payload = {
                            academic_year: cols[0], term: cols[1], semester: `${cols[0]}-${cols[1]}`,
                            edu_system: cols[2] === '學士班' ? '日間學士班' : cols[2], 
                            college: cols[3], department: cols[4], course_code: cols[5],
                            course_name: cols[6], course_type: cols[7], credits: Number(cols[8]) || 0,
                            created_at: serverTimestamp()
                        };
                        if (!payload.academic_year || !payload.term || !payload.course_code || !payload.course_name) continue;
                        parsedRows.push(payload);
                    }
                }
                
                let addedCount = 0;
                for (let payload of parsedRows) { 
                    await addDoc(dataCollection, payload); 
                    addedCount++; 
                }
                alert(`✅ 成功匯入 ${addedCount} 筆課程資料！`);
            } catch (error) { alert("匯入失敗，請確認 CSV 檔案格式是否正確。\n" + error.message); } 
            finally { btn.innerHTML = originalHtml; btn.disabled = false; e.target.value = ''; }
        };
        reader.readAsText(file);
    };
}
