import { state, Utils } from './state.js';

function getCollegeSortValue(collegeName) {
    const idx = state.orderedColleges.findIndex(c => c.name === collegeName);
    return idx !== -1 ? idx : 999;
}

function getDeptSortValue(deptName) {
    const dept = state.globalDepts.find(d => d.name === deptName);
    return dept ? (dept.sortOrder || 999) : 999;
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
        let valA = a[state.sortCol] || ''; 
        let valB = b[state.sortCol] || '';
        
        if (state.sortCol === 'college' || state.sortCol === 'department') {
            if (state.sortCol === 'college') {
                valA = getCollegeSortValue(a.college);
                valB = getCollegeSortValue(b.college);
            } else {
                valA = getDeptSortValue(a.department);
                valB = getDeptSortValue(b.department);
            }
            if (valA !== valB) return state.sortDir === 'asc' ? valA - valB : valB - valA;
            return 0;
        }
        
        valA = valA.toString().toLowerCase(); 
        valB = valB.toString().toLowerCase();
        let cmp = valA.localeCompare(valB, 'zh-TW');
        return state.sortDir === 'asc' ? cmp : -cmp;
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

        const actionHtml = state.isReadOnly ? '' : `
            <div class="row-actions">
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
            <td class="col-name" style="text-align: left;"><div class="cell-primary bold">${highlightedName}</div></td>
            <td class="col-gender" style="text-align: center;"><div class="cell-primary">${data.gender || '男'}</div></td>
            <td class="col-nationality" style="text-align: center;"><div class="cell-primary">${data.nationality || '本國籍'}</div></td>
            <td class="col-actions" style="text-align: center;">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
