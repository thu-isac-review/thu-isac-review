import { state } from './state.js';

export function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    state.filteredData = state.allData.filter(d => {
        const matchSearch = (d.course_name || '').toLowerCase().includes(searchTerm) || (d.course_code || '').toLowerCase().includes(searchTerm);
        const matchYear = state.filterYearSet.size === 0 || state.filterYearSet.has(d.academic_year);
        const matchTerm = state.filterTermSet.size === 0 || state.filterTermSet.has(d.term);
        const matchEdu = state.filterEduSet.size === 0 || state.filterEduSet.has(d.edu_system);
        const matchCol = state.filterCollegeSet.size === 0 || state.filterCollegeSet.has(d.college);
        const matchDept = state.filterDeptSet.size === 0 || state.filterDeptSet.has(d.department);
        const matchCode = state.filterCodeSet.size === 0 || state.filterCodeSet.has(d.course_code);
        const matchName = state.filterNameSet.size === 0 || state.filterNameSet.has(d.course_name);
        const matchType = state.filterTypeSet.size === 0 || state.filterTypeSet.has(d.course_type);
        const matchCredit = state.filterCreditSet.size === 0 || state.filterCreditSet.has(String(d.credits));
        
        return matchSearch && matchYear && matchTerm && matchEdu && matchCol && matchDept && matchCode && matchName && matchType && matchCredit;
    });

    // Sorting
    state.filteredData.sort((a, b) => {
        let valA = a[state.sortCol] || ''; let valB = b[state.sortCol] || '';
        
        if (state.sortCol === 'college' || state.sortCol === 'department') {
            if (state.sortCol === 'college') {
                const colIdxA = state.orderedColleges.findIndex(c => c.name === valA);
                const colIdxB = state.orderedColleges.findIndex(c => c.name === valB);
                valA = colIdxA !== -1 ? colIdxA : 999;
                valB = colIdxB !== -1 ? colIdxB : 999;
            } else {
                const deptA = state.globalDepts.find(d => d.name === valA);
                const deptB = state.globalDepts.find(d => d.name === valB);
                valA = deptA ? (deptA.sortOrder || 999) : 999;
                valB = deptB ? (deptB.sortOrder || 999) : 999;
            }
            if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
            return 0;
        }

        if (state.sortCol === 'credits' || state.sortCol === 'academic_year' || state.sortCol === 'term') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
            return 0;
        }
        
        valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase();
        if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
        return 0;
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
            emptyStateContainer.innerHTML = `<i class="ti ti-inbox empty-icon"></i><div class="empty-text">找不到符合條件的課程。</div>`;
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
                <button data-id="${data.id}" data-name="${data.course_name}" class="btn btn-icon sm btn-row-delete" style="color:var(--danger); border-color:var(--danger-border); background:var(--surface);" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        html += `
        <tr class="${isChecked ? 'selected' : ''}" data-id="${data.id}">
            <td class="col-checkbox" style="text-align: center;">
                <div style="display:flex; justify-content:center; align-items:center;">
                    <input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                </div>
            </td>
            <td style="text-align: center;"><div class="cell-primary bold">${data.academic_year}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${data.term}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${data.edu_system}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${colDispName || '-'}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${deptDispName || '-'}</div></td>
            <td style="text-align: center;"><span class="pill-code">${data.course_code}</span></td>
            <td style="text-align: left;"><div class="cell-primary bold" title="${data.course_name}">${data.course_name}</div></td>
            <td style="text-align: center;"><div class="cell-primary">${data.course_type}</div></td>
            <td style="text-align: center;"><div class="cell-primary bold">${data.credits}</div></td>
            <td class="col-actions" style="text-align: center;">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
