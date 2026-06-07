import { state, Utils } from './state.js';

function getCollegeSortValue(name) {
    const idx = state.orderedColleges.findIndex(c => c.name === name);
    return idx !== -1 ? idx : 999;
}

function getDeptSortValue(name) {
    const dept = state.globalDepts.find(d => d.name === name);
    return dept ? (dept.sortOrder || 999) : 999;
}

export function renderTable() {
    const tbody = document.getElementById('student-table-body');
    if (!tbody) return; // 🌟 專屬 ID 安全防禦閥門

    const searchInput = document.getElementById('search-input');
    const rawSearchTerm = searchInput ? searchInput.value.trim() : '';
    const searchTerm = rawSearchTerm.toLowerCase();

    // 1. 純前端高效過濾
    state.filteredData = state.allData.filter(d => {
        const matchSearch = (d.name || '').toLowerCase().includes(searchTerm) || (d.student_id || '').toLowerCase().includes(searchTerm);
        const matchCol = state.filterCollegeSet.size === 0 || state.filterCollegeSet.has(d.college);
        const matchDept = state.filterDeptSet.size === 0 || state.filterDeptSet.has(d.department);
        const matchGender = state.filterGenderSet.size === 0 || state.filterGenderSet.has(d.gender || '男');
        const matchNat = state.filterNatSet.size === 0 || state.filterNatSet.has(d.nationality || '本國籍');
        return matchSearch && matchCol && matchDept && matchGender && matchNat;
    });

    // 2. 前端多層級排序
    state.filteredData.sort((a, b) => {
        let valA = a[state.sortCol] || ''; let valB = b[state.sortCol] || '';
        
        if (state.sortCol === 'college' || state.sortCol === 'department') {
            valA = state.sortCol === 'college' ? getCollegeSortValue(valA) : getDeptSortValue(valA);
            valB = state.sortCol === 'college' ? getCollegeSortValue(valB) : getDeptSortValue(valB);
            return state.sortDir === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase();
        return state.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // 3. 分頁計算
    const total = state.filteredData.length;
    const totalPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = state.filteredData.slice(start, start + state.itemsPerPage);

    // 4. 更新分頁 DOM 資訊
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
        infoEl.innerHTML = total > 0 ? `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆` : `共 <strong>0</strong> 筆`;
    }
    
    let pHtml = `<button class="page-btn page-step-btn" data-page="${state.currentPage-1}" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=totalPages; p++) {
        if (p===1 || p===totalPages || Math.abs(p-state.currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn page-num-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    pHtml += `<button class="page-btn page-step-btn" data-page="${state.currentPage+1}" ${state.currentPage>=totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    
    const controls = document.getElementById('pagination-controls');
    if (controls) controls.innerHTML = pHtml;

    const currentPaginatedIds = paginatedItems.map(d => d.id);
    const isAllVisibleSelected = currentPaginatedIds.length > 0 && currentPaginatedIds.every(id => state.selectedIds.includes(id));
    const selectAllChk = document.getElementById('selectAll');
    if (selectAllChk) selectAllChk.checked = isAllVisibleSelected;

    const emptyStateContainer = document.getElementById('empty-state-container');
    if (total === 0) {
        tbody.innerHTML = '';
        if (emptyStateContainer) {
            emptyStateContainer.style.display = 'flex';
            emptyStateContainer.innerHTML = `<i class="ti ti-inbox empty-icon"></i><div class="empty-text">找不到符合條件的學生。</div>`;
        }
        return;
    } else {
        if (emptyStateContainer) emptyStateContainer.style.display = 'none';
    }

    // 5. 輸出 DOM 列 HTML
    let html = '';
    paginatedItems.forEach((data) => {
        const colObj = state.orderedColleges.find(c => c.name === data.college);
        const colDispName = colObj && colObj.shortName ? colObj.shortName : data.college;
        const deptObj = state.globalDepts.find(d => d.name === data.department);
        const deptDispName = deptObj && deptObj.shortName ? deptObj.shortName : data.department;
        const isChecked = state.selectedIds.includes(data.id) ? 'checked' : '';

        const actionHtml = state.isReadOnly ? '' : `
            <div class="row-actions">
                <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit" title="編輯"><i class="ti ti-edit"></i></button>
                <button data-id="${data.id}" data-name="${data.name}" class="btn btn-icon sm btn-row-delete" style="color:var(--danger); border-color:var(--danger-border);" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        // 🌟 反黃處理：保留最原始大小寫的輸入外觀
        const highlightedId = Utils.highlightKeyword(data.student_id, rawSearchTerm);
        const highlightedName = Utils.highlightKeyword(data.name, rawSearchTerm);

        html += `
        <tr class="${isChecked ? 'selected' : ''}" data-id="${data.id}">
            <td class="col-checkbox" style="text-align: center;">
                <div style="display:flex; justify-content:center; align-items:center;">
                    <input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                </div>
            </td>
            <td style="text-align: center;"><div class="cell-primary">${colDispName}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${deptDispName}</div></td>
            <td style="text-align: center;"><div class="cell-primary bold uppercase">${highlightedId}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${highlightedName}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${data.gender}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${data.nationality || '本國籍'}</div></td>
            <td style="text-align: center;">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

export function populateCollegesUI() {
    const colleges = state.orderedColleges.length > 0 ? state.orderedColleges : [...new Set(state.globalDepts.map(d => d.college))].filter(Boolean).map(c => ({name: c, shortName: c}));
    
    const container = document.getElementById('college-options-container');
    if (container) {
        container.innerHTML = colleges.map(c => `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-college" value="${c.name}"> <span>${c.shortName || c.name}</span>
            </label>
        `).join('');
    }

    const select = document.getElementById('input-college');
    if (select) {
        select.innerHTML = `<option value="">請選擇學院...</option>` + colleges.map(c => `<option value="${c.name}">${c.shortName || c.name}</option>`).join('');
    }
    populateDeptFilterUI();
}

export function populateDeptFilterUI() {
    let deptsToShow = state.globalDepts;
    if (state.filterCollegeSet.size > 0) deptsToShow = state.globalDepts.filter(d => state.filterCollegeSet.has(d.college));
    
    const container = document.getElementById('dept-options-container');
    if (container) {
        container.innerHTML = deptsToShow.map(d => `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-dept" value="${d.name}"> <span>${d.shortName || d.name}</span>
            </label>
        `).join('');
    }
}

export function updateFormDepts(preselectedValue = '') {
    const selectedCol = document.getElementById('input-college').value;
    const inputDept = document.getElementById('input-department');
    if (!inputDept) return;
    let html = '<option value="">請選擇學系...</option>';
    
    if (selectedCol) {
        const depts = state.globalDepts.filter(d => d.college === selectedCol);
        depts.forEach(d => { html += `<option value="${d.name}">${d.shortName || d.name}</option>`; });
    } else {
        html = '<option value="">請先選擇學院...</option>';
    }
    inputDept.innerHTML = html;
    if (preselectedValue) inputDept.value = preselectedValue;
}
