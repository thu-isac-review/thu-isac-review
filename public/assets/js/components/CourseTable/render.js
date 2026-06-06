import { state, Utils } from './state.js';

// 🌟 [新增] 用於解析學期權重的輔助函式，以便進行「多到少 (暑期 -> 2 -> 1)」排序
function getTermValue(term) {
    const t = String(term || '').trim();
    if (t.includes('暑')) return 3;
    if (t === '2') return 2;
    if (t === '1') return 1;
    return 0;
}

// 🌟 [新增] 取得學院排序索引值 (與篩選器的順序一致)
function getCollegeSortValue(collegeName) {
    const idx = state.orderedColleges.findIndex(c => c.name === collegeName);
    return idx !== -1 ? idx : 999;
}

// 🌟 [新增] 取得學系排序權重 (依據資料庫中 globalDepts 排序設定 sortOrder)
function getDeptSortValue(deptName) {
    const dept = state.globalDepts.find(d => d.name === deptName);
    return dept ? (dept.sortOrder || 999) : 999;
}

// 🌟 [新增] 預設多階層排序鏈比較器
// 順序：學年度(多到少) > 學期(多到少) > 開課學院(系統排序) > 開課學系(系統排序) > 選課代號(少到多)
function defaultMultiLevelCompare(a, b) {
    // 1. 學年度 (多到少, 降冪)
    const yearA = Number(a.academic_year) || 0;
    const yearB = Number(b.academic_year) || 0;
    if (yearA !== yearB) return yearB - yearA;

    // 2. 學期 (多到少, 降冪: 暑期 -> 2 -> 1)
    const termA = getTermValue(a.term);
    const termB = getTermValue(b.term);
    if (termA !== termB) return termB - termA;

    // 3. 開課學院 (系統排序, 升冪)
    const colA = getCollegeSortValue(a.college);
    const colB = getCollegeSortValue(b.college);
    if (colA !== colB) return colA - colB;

    // 4. 開課學系 (系統排序, 升冪)
    const deptSortA = getDeptSortValue(a.department);
    const deptSortB = getDeptSortValue(b.department);
    if (deptSortA !== deptSortB) return deptSortA - deptSortB;

    // 5. 選課代號 (少到多, 升冪)
    const codeA = String(a.course_code || '');
    const codeB = String(b.course_code || '');
    const numCodeA = parseInt(codeA, 10);
    const numCodeB = parseInt(codeB, 10);
    if (!isNaN(numCodeA) && !isNaN(numCodeB)) {
        if (numCodeA !== numCodeB) return numCodeA - numCodeB;
    }
    return codeA.localeCompare(codeB);
}

export function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

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

    // 🌟 [優化] 進階排序邏輯：
    // 如果點擊了特定表頭進行排序 (state.sortCol)，則先以該欄位為主進行排序；
    // 當該欄位值相同、或是使用預設排序時，將完美套用「學年度 > 學期 > 學院 > 學系 > 代號」多階層排序鏈。
    state.filteredData.sort((a, b) => {
        if (state.sortCol && state.sortCol !== 'none') {
            let diff = 0;
            
            if (state.sortCol === 'student_count') {
                const countA = state.allRecords.filter(r => r.courses && r.courses.includes(a.id)).length;
                const countB = state.allRecords.filter(r => r.courses && r.courses.includes(b.id)).length;
                diff = countA - countB;
            } else if (state.sortCol === 'college') {
                const colA = getCollegeSortValue(a.college);
                const colB = getCollegeSortValue(b.college);
                diff = colA - colB;
            } else if (state.sortCol === 'department') {
                const deptSortA = getDeptSortValue(a.department);
                const deptSortB = getDeptSortValue(b.department);
                diff = deptSortA - deptSortB;
            } else if (state.sortCol === 'academic_year') {
                const yrA = Number(a.academic_year) || 0;
                const yrB = Number(b.academic_year) || 0;
                diff = yrA - yrB;
            } else if (state.sortCol === 'term') {
                diff = getTermValue(a.term) - getTermValue(b.term);
            } else if (state.sortCol === 'credits') {
                const credA = Number(a.credits) || 0;
                const credB = Number(b.credits) || 0;
                diff = credA - credB;
            } else {
                // 字串比對 (開課學制、選課代號、課程名稱、課程屬性)
                const valA = String(a[state.sortCol] || '').toLowerCase();
                const valB = String(b[state.sortCol] || '').toLowerCase();
                diff = valA.localeCompare(valB);
            }

            // 如果該特定欄位比較有出入，直接返回其升降冪結果
            if (diff !== 0) {
                return state.sortDir === 'asc' ? diff : -diff;
            }
        }

        // 當點擊排序欄位值完全相同，或在預設無點擊排序的情況下，降落至預設多階層排序鏈
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
        
        const studentCount = state.allRecords.filter(r => r.courses && r.courses.includes(data.id)).length;

        const actionHtml = state.isReadOnly ? '' : `
            <div class="row-actions">
                <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit" title="編輯"><i class="ti ti-edit"></i></button>
                <button data-id="${data.id}" data-name="${data.course_name}" class="btn btn-danger btn-icon sm btn-row-delete" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        const highlightedCode = Utils.highlightKeyword(data.course_code, searchTerm);
        const highlightedName = Utils.highlightKeyword(data.course_name, searchTerm);

        html += `
        <tr class="${isChecked ? 'selected' : ''}" data-id="${data.id}">
            <td class="col-checkbox" style="text-align: center;">
                <div style="display:flex; justify-content:center; align-items:center;">
                    <input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                </div>
            </td>
            <td class="col-academic_year" style="text-align: center;"><div class="cell-primary bold">${data.academic_year}</div></td>
            <td class="col-term" style="text-align: center;"><div class="cell-primary">${data.term}</div></td>
            <td class="col-edu_system" style="text-align: center;"><div class="cell-primary">${data.edu_system}</div></td>
            <td class="col-college" style="text-align: center;"><div class="cell-primary">${colDispName || '-'}</div></td>
            <td class="col-department" style="text-align: center;"><div class="cell-primary">${deptDispName || '-'}</div></td>
            <td class="col-course_code" style="text-align: center;"><span class="pill-code">${highlightedCode}</span></td>
            <td class="col-course_name" style="text-align: left;"><div class="cell-primary bold" title="${data.course_name}">${highlightedName}</div></td>
            <td class="col-course_type" style="text-align: center;"><div class="cell-primary">${data.course_type}</div></td>
            <td class="col-credits" style="text-align: center;"><div class="cell-primary bold">${data.credits}</div></td>
            <td class="col-student_count" style="text-align: center;"><div class="cell-primary font-semibold" style="color:var(--brand);">${studentCount} 人</div></td>
            <td class="col-outline" style="text-align: center;">
                <a href="http://desc.ithu.tw/${data.academic_year}/${data.term}/${data.course_code}" target="_blank" class="btn btn-secondary btn-icon sm" title="查看大綱 (開新分頁)">
                    <i class="ti ti-external-link"></i>
                </a>
            </td>
            <td class="col-actions" style="text-align: center;">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
