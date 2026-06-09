import { state, Utils } from './state.js';

function getCollegeSortValue(collegeName) {
    const idx = state.orderedColleges.findIndex(c => c.name === collegeName);
    return idx !== -1 ? idx : 999;
}

function getDeptSortValue(deptName) {
    const dept = state.globalDepts.find(d => d.name === deptName);
    return dept ? (dept.sortOrder || 999) : 999;
}

function getStudentIdPrefixWeight(id) {
    const prefix = (id || '').charAt(0).toUpperCase();
    if (prefix === 'S') return 1; 
    if (prefix === 'G') return 2; 
    if (prefix === 'F') return 3; 
    return 4; 
}

function compareStudentId(aId, bId) {
    const prefA = getStudentIdPrefixWeight(aId);
    const prefB = getStudentIdPrefixWeight(bId);
    if (prefA !== prefB) return prefA - prefB;
    return String(aId || '').localeCompare(String(bId || ''), 'en', { numeric: true });
}

function defaultMultiLevelCompare(a, b) {
    const colA = getCollegeSortValue(a.college);
    const colB = getCollegeSortValue(b.college);
    if (colA !== colB) return colA - colB;

    const deptA = getDeptSortValue(a.department);
    const deptB = getDeptSortValue(b.department);
    if (deptA !== deptB) return deptA - deptB;

    return compareStudentId(a.student_id, b.student_id);
}

export function renderTable() {
    const tbody = document.getElementById('student-table-body');
    if (!tbody) return; 

    const searchInput = document.getElementById('search-input');
    const rawSearchTerm = searchInput ? searchInput.value.trim() : ''; 
    const searchTerm = rawSearchTerm.toLowerCase();

    state.filteredData = state.allData.filter(d => {
        const matchSearch = (d.name || '').toLowerCase().includes(searchTerm) || (d.student_id || '').toLowerCase().includes(searchTerm);
        const matchCol = state.filterCollegeSet.size === 0 || state.filterCollegeSet.has(d.college);
        const matchDept = state.filterDeptSet.size === 0 || state.filterDeptSet.has(d.department);
        const matchGender = state.filterGenderSet.size === 0 || state.filterGenderSet.has(d.gender || '男');
        const matchNat = state.filterNatSet.size === 0 || state.filterNatSet.has(d.nationality || '本國籍');
        
        return matchSearch && matchCol && matchDept && matchGender && matchNat;
    });

    state.filteredData.sort((a, b) => {
        if (state.sortCol && state.sortCol !== 'default') {
            let diff = 0;
            if (state.sortCol === 'record_count') {
                const getCount = (d) => {
                    const tSid = String(d.student_id).toUpperCase().trim();
                    return state.allRecords.filter(r => {
                        if (!r.student_raw) return false;
                        const rSid = String(r.student_raw).split('-')[0].trim().toUpperCase();
                        return rSid === tSid;
                    }).length;
                };
                diff = getCount(a) - getCount(b);
            } else if (state.sortCol === 'student_id') {
                diff = compareStudentId(a.student_id, b.student_id);
            } else if (state.sortCol === 'college' || state.sortCol === 'department') {
                let valA = state.sortCol === 'college' ? getCollegeSortValue(a.college) : getDeptSortValue(a.department);
                let valB = state.sortCol === 'college' ? getCollegeSortValue(b.college) : getDeptSortValue(b.department);
                diff = valA - valB;
            } else {
                let valA = String(a[state.sortCol] || '').toLowerCase();
                let valB = String(b[state.sortCol] || '').toLowerCase();
                diff = valA.localeCompare(valB, 'zh-TW');
            }
            if (diff !== 0) return state.sortDir === 'asc' ? diff : -diff;
        }
        
        return defaultMultiLevelCompare(a, b);
    });

    const total = state.filteredData.length;
    const totalPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = state.filteredData.slice(start, start + state.itemsPerPage);

    const infoEl = document.getElementById('pagination-info');
    if(infoEl) {
        if (total > 0) {
            infoEl.innerHTML = `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆`;
        } else {
            infoEl.innerHTML = `共 <strong>0</strong> 筆`;
        }
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
    if(controls) controls.innerHTML = pHtml;

    const currentPaginatedIds = paginatedItems.map(d => d.id);
    const isAllVisibleSelected = currentPaginatedIds.length > 0 && currentPaginatedIds.every(id => state.selectedIds.includes(id));
    const selectAllChk = document.getElementById('selectAll');
    if(selectAllChk) selectAllChk.checked = isAllVisibleSelected;

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

    let html = '';
    paginatedItems.forEach((data) => {
        const colObj = state.orderedColleges.find(c => c.name === data.college);
        const colDispName = colObj && colObj.shortName ? colObj.shortName : data.college;
        const deptObj = state.globalDepts.find(d => d.name === data.department);
        const deptDispName = deptObj && deptObj.shortName ? deptObj.shortName : data.department;
        const isChecked = state.selectedIds.includes(data.id) ? 'checked' : '';
        
        const targetStudentId = String(data.student_id).toUpperCase().trim();
        
        const recordCount = state.allRecords.filter(r => {
            if (!r.student_raw) return false;
            const recordStudentId = String(r.student_raw).split('-')[0].trim().toUpperCase();
            return recordStudentId === targetStudentId;
        }).length;

        // 🌟 [新增] 獨立的「查看紀錄」按鈕
        const btnViewRecordsHtml = `<button data-studentid="${data.student_id}" class="btn btn-icon sm btn-row-view-records" style="color: var(--brand); border-color: var(--brand-border); background: var(--brand-light);" title="查看實習紀錄"><i class="ti ti-file-description"></i></button>`;

        // 🌟 [修改] 不管是不是 isReadOnly 都要顯示「查看」按鈕
        const actionHtml = state.isReadOnly ? `
            <div class="row-actions">
                ${btnViewRecordsHtml}
            </div>
        ` : `
            <div class="row-actions">
                ${btnViewRecordsHtml}
                <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit" title="編輯"><i class="ti ti-edit"></i></button>
                <button data-id="${data.id}" data-name="${data.name}" class="btn btn-danger btn-icon sm btn-row-delete" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        const highlightedID = Utils.highlightKeyword(data.student_id, rawSearchTerm);
        const highlightedName = Utils.highlightKeyword(data.name, rawSearchTerm);
        
        html += `
        <tr class="${isChecked ? 'selected' : ''}" data-id="${data.id}">
            <td class="col-checkbox" style="text-align: center;">
                <div style="display:flex; justify-content:center; align-items:center;">
                    <input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                </div>
            </td>
            <td class="col-college" style="text-align: center;"><div class="cell-primary">${colDispName || '-'}</div></td>
            <td class="col-department" style="text-align: center;"><div class="cell-primary">${deptDispName || '-'}</div></td>
            <td class="col-student_id" style="text-align: center;"><div class="cell-primary bold uppercase" style="letter-spacing:0.02em;">${highlightedID}</div></td>
            <td class="col-name" style="text-align: center;"><div class="cell-primary bold">${highlightedName}</div></td>
            <td class="col-gender" style="text-align: center;"><div class="cell-primary">${data.gender || '男'}</div></td>
            <td class="col-nationality" style="text-align: center;"><div class="cell-primary">${data.nationality || '本國籍'}</div></td>
            <td class="col-record_count" style="text-align: center;"><div class="cell-primary font-semibold" style="color:var(--brand);">${recordCount} 筆</div></td>
            <td class="col-actions" style="text-align: center;">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}