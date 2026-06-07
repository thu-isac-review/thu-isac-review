import { state } from './state.js';
import { renderTable, updateFormDepts } from './render.js';
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function bindEvents() {
    const container = document.getElementById('student-table-body');
    if (!container || state.isGlobalListenerBound) return;

    // 1. 搜尋輸入框事件 (加 Debounce 降低效能開銷)
    document.getElementById('search-input')?.addEventListener('input', () => {
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1;
            renderTable();
        }, 150);
    });

    // 2. 下拉選單開關
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const drop = document.getElementById(`drop-${type}`);
            const wrap = document.getElementById(`pill-wrap-${type}`);
            const isOpen = drop.classList.contains('show');
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
        };
    });

    // 全域點擊關閉下拉選單
    document.addEventListener('click', e => {
        if (!e.target.closest('.filter-pill-wrap')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
        }
    });

    // 3. 欄位點擊排序
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.onclick = () => {
            const col = th.dataset.sort;
            state.sortDir = (state.sortCol === col && state.sortDir === 'asc') ? 'desc' : 'asc';
            state.sortCol = col;
            
            document.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                t.querySelector('.sort-icon').className = 'ti ti-arrows-sort sort-icon';
            });
            th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            th.querySelector('.sort-icon').className = `ti ti-sort-${state.sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            renderTable();
        };
    });

    // 4. 下拉選單內的子條件勾選事件 (事件代理)
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
        dropdown.onchange = (e) => {
            const chk = e.target;
            if (chk.type !== 'checkbox') return;
            
            const pillWrap = dropdown.closest('.filter-pill-wrap');
            const type = pillWrap.querySelector('.filter-pill').dataset.type;
            const set = type === 'college' ? state.filterCollegeSet : (type === 'dept' ? state.filterDeptSet : (type === 'nationality' ? state.filterNatSet : state.filterGenderSet));
            
            if (chk.checked) set.add(chk.value); else set.delete(chk.value);
            
            state.currentPage = 1;
            updatePillActiveUI(type, set);
            if (type === 'college') {
                // 連動學系
                let deptsToShow = state.globalDepts;
                if (state.filterCollegeSet.size > 0) deptsToShow = state.globalDepts.filter(d => state.filterCollegeSet.has(d.college));
                const validDepts = new Set(deptsToShow.map(d => d.name));
                for (let oldDept of state.filterDeptSet) { if(!validDepts.has(oldDept)) state.filterDeptSet.delete(oldDept); }
                
                const deptContainer = document.getElementById('dept-options-container');
                if(deptContainer) {
                    deptContainer.innerHTML = deptsToShow.map(d => `
                        <label class="filter-option">
                            <input type="checkbox" class="filter-chk-dept" value="${d.name}"> <span>${d.shortName || d.name}</span>
                        </label>
                    `).join('');
                }
                document.querySelectorAll('.filter-chk-dept').forEach(c => c.checked = state.filterDeptSet.has(c.value));
                updatePillActiveUI('dept', state.filterDeptSet);
            }
            renderTable();
        };
    });

    // 5. 清除特定篩選按鈕
    document.querySelectorAll('.btn-clear-filter').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const set = type === 'college' ? state.filterCollegeSet : (type === 'dept' ? state.filterDeptSet : (type === 'nationality' ? state.filterNatSet : state.filterGenderSet));
            set.clear();
            document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = false);
            state.currentPage = 1;
            updatePillActiveUI(type, set);
            if (type === 'college') {
                let deptsToShow = state.globalDepts;
                const deptContainer = document.getElementById('dept-options-container');
                if (deptContainer) {
                    deptContainer.innerHTML = deptsToShow.map(d => `
                        <label class="filter-option">
                            <input type="checkbox" class="filter-chk-dept" value="${d.name}"> <span>${d.shortName || d.name}</span>
                        </label>
                    `).join('');
                }
                state.filterDeptSet.clear();
                updatePillActiveUI('dept', state.filterDeptSet);
            }
            renderTable();
        };
    });

    // 6. 表格單列 Checkbox 與操作按鈕事件 (事件代理)
    document.getElementById('student-table-body').onclick = (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;

        // 勾選框
        if (e.target.classList.contains('row-select-chk')) {
            const idx = state.selectedIds.indexOf(id);
            if (idx === -1) state.selectedIds.push(id); else state.selectedIds.splice(idx, 1);
            updateBatchBarUI();
            renderTable();
            return;
        }

        // 編輯按鈕
        if (e.target.closest('.btn-row-edit')) {
            const data = state.allData.find(d => d.id === id);
            if (!data) return;
            state.editingId = id;
            document.getElementById('input-college').value = data.college || '';
            updateFormDepts(data.department);
            document.getElementById('input-student-id').value = data.student_id || '';
            document.getElementById('input-name').value = data.name || '';
            document.getElementById('input-gender').value = data.gender || '男';
            document.getElementById('input-nationality').value = data.nationality || '本國籍';
            document.getElementById('modal-title').innerHTML = '<i class="ti ti-edit"></i> 編輯學生資料';
            document.getElementById('data-modal').classList.add('open');
            return;
        }

        // 刪除按鈕
        if (e.target.closest('.btn-row-delete')) {
            const btn = e.target.closest('.btn-row-delete');
            const name = btn.dataset.name;
            if (confirm(`警告：確定要刪除學生「${name}」嗎？\n(注意：若有對應之實習紀錄，刪除後將無法追溯該生身分)`)) {
                deleteDoc(doc(state.db, "internship_students", id));
            }
        }
    };

    // 7. 分頁控制按鈕點擊 (事件代理)
    document.getElementById('pagination-controls').onclick = (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled) return;
        state.currentPage = Number(btn.dataset.page);
        renderTable();
    };

    // 每頁顯示筆數切換
    document.getElementById('per-page-select').onchange = (e) => {
        state.itemsPerPage = Number(e.target.value);
        state.currentPage = 1;
        renderTable();
    };

    // 全選當頁
    document.getElementById('selectAll').onchange = (e) => {
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const currentPaginatedIds = state.filteredData.slice(startIndex, startIndex + state.itemsPerPage).map(d => d.id);
        if (e.target.checked) {
            currentPaginatedIds.forEach(id => { if (!state.selectedIds.includes(id)) state.selectedIds.push(id); });
        } else {
            state.selectedIds = state.selectedIds.filter(id => !currentPaginatedIds.includes(id));
        }
        updateBatchBarUI();
        renderTable();
    };

    // 8. 批次操作列功能事件
    document.getElementById('btn-select-all-filtered').onclick = () => {
        state.selectedIds = state.filteredData.map(d => d.id);
        updateBatchBarUI(); renderTable();
    };
    document.getElementById('btn-clear-selection').onclick = () => {
        state.selectedIds = []; updateBatchBarUI(); renderTable();
    };
    document.getElementById('btn-batch-delete').onclick = async () => {
        if (!confirm(`警告：確定要刪除選取的 ${state.selectedIds.length} 名學生嗎？\n(注意：若有對應之實習紀錄，刪除後將無法追溯該生身分)`)) return;
        try {
            for (let id of state.selectedIds) await deleteDoc(doc(state.db, "internship_students", id));
            state.selectedIds = []; updateBatchBarUI();
        } catch (e) { alert("批次刪除失敗: " + e.message); }
    };

    // 9. Modal 表單互動事件
    document.getElementById('btn-add-student').onclick = () => {
        state.editingId = null;
        document.getElementById('data-form').reset();
        document.getElementById('input-department').innerHTML = '<option value="">請先選擇學院...</option>';
        document.getElementById('modal-title').innerHTML = '<i class="ti ti-user-plus"></i> 新增學生資料';
        document.getElementById('data-modal').classList.add('open');
    };
    const closeModal = () => { document.getElementById('data-modal').classList.remove('open'); state.editingId = null; };
    document.getElementById('btn-close-modal').onclick = closeModal;
    document.getElementById('btn-cancel-modal').onclick = closeModal;
    document.getElementById('input-college').onchange = () => updateFormDepts();

    // 表單送出儲存
    document.getElementById('btn-submit').onclick = async () => {
        const btn = document.getElementById('btn-submit');
        const payload = {
            college: document.getElementById('input-college').value,
            department: document.getElementById('input-department').value,
            student_id: document.getElementById('input-student-id').value.toUpperCase().trim(),
            name: document.getElementById('input-name').value.trim(),
            gender: document.getElementById('input-gender').value,
            nationality: document.getElementById('input-nationality').value
        };

        if(!payload.college || !payload.department || !payload.student_id || !payload.name) { alert("請填寫所有必填欄位！"); return; }
        btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...';
        
        try {
            if (state.editingId) {
                await updateDoc(doc(state.db, "internship_students", state.editingId), { ...payload, updated_at: serverTimestamp() });
            } else {
                if (state.allData.some(d => d.student_id === payload.student_id)) {
                    alert(`學號 ${payload.student_id} 已存在，無法重複新增！`);
                    return;
                }
                await addDoc(collection(state.db, "internship_students"), { ...payload, created_at: serverTimestamp() });
            }
            closeModal();
        } catch (err) { alert("儲存失敗: " + err.message); } 
        finally { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存'; }
    };

    // 10. 匯出 CSV 邏輯
    document.getElementById('btn-export').onclick = () => {
        if (state.filteredData.length === 0) { alert("沒有資料可供匯出！"); return; }
        let csv = '\uFEFF學院,學系,學號,姓名,性別,國籍\n';
        state.filteredData.forEach(d => {
            csv += [d.college, d.department, d.student_id, d.name, d.gender, d.nationality || '本國籍'].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習學生清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    };

    // 11. 批次 CSV 匯入邏輯
    document.getElementById('btn-import-trigger').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const triggerBtn = document.getElementById('btn-import-trigger');
        const origHtml = triggerBtn.innerHTML;
        triggerBtn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 匯入中...'; triggerBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const rows = evt.target.result.split('\n').map(r => r.trim()).filter(r => r);
                let added = 0; let skipped = 0;
                for (let i = 1; i < rows.length; i++) {
                    let cols = []; let inQuotes = false; let cur = '';
                    for (let char of rows[i]) {
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
                        else cur += char;
                    }
                    cols.push(cur.trim());
                    if (cols.length >= 5) {
                        const sId = (cols[2] || '').toUpperCase().trim();
                        if (state.allData.some(d => d.student_id === sId)) { skipped++; continue; }
                        const payload = { college: cols[0], department: cols[1], student_id: sId, name: cols[3], gender: cols[4] || '男', nationality: cols[5] || '本國籍', created_at: serverTimestamp() };
                        if (!payload.college || !payload.department || !payload.student_id || !payload.name) continue;
                        await addDoc(collection(state.db, "internship_students"), payload); added++;
                    }
                }
                alert(`✅ 成功匯入 ${added} 筆資料！` + (skipped > 0 ? `\n⚠️ 另有 ${skipped} 筆重複學號已跳過。` : ''));
            } catch (err) { alert("匯入失敗: " + err.message); } 
            finally { triggerBtn.innerHTML = origHtml; triggerBtn.disabled = false; e.target.value = ''; }
        };
        reader.readAsText(file);
    };

    state.isGlobalListenerBound = true;
}

function updatePillActiveUI(type, set) {
    const pill = document.getElementById(`pill-${type}`);
    if (!pill) return;
    const typeLabel = type === 'college' ? '學院' : (type === 'dept' ? '學系' : (type === 'nationality' ? '國籍' : '性別'));
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeLabel} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeLabel} <i class="ti ti-chevron-down"></i>`;
    }
}

function updateBatchBarUI() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    if (!bar) return;
    if (state.selectedIds.length > 0) {
        bar.classList.add('visible');
        if (count) count.innerText = state.selectedIds.length;
        if (btnSelectAll) {
            btnSelectAll.style.display = state.selectedIds.length < state.filteredData.length ? 'inline-flex' : 'none';
            btnSelectAll.innerText = `選取全部符合條件 (${state.filteredData.length})`;
        }
    } else {
        bar.classList.remove('visible');
    }
}
