import { pageSlice, matchesSelection, paginationMarkup } from '../table-core.js';
import { state, Utils } from './state.js';

// 用於解析學期權重的輔助函式，以便進行「多到少 (暑期 -> 2 -> 1)」排序
function getTermValue(term) {
    const t = String(term || '').trim();
    if (t.includes('暑')) return 3;
    if (t === '2') return 2;
    if (t === '1') return 1;
    return 0;
}

// 取得學院排序索引值 (與篩選器的順序一致)
function getCollegeSortValue(collegeName) {
    const idx = state.orderedColleges.findIndex(c => c.name === collegeName);
    return idx !== -1 ? idx : 999;
}

// 取得學系排序權重 (依據資料庫中 globalDepts 排序設定 sortOrder)
function getDeptSortValue(deptName) {
    const dept = state.globalDepts.find(d => d.name === deptName);
    return dept ? (dept.sortOrder || 999) : 999;
}

// 預設多階層排序鏈比較器
function defaultMultiLevelCompare(a, b) {
    const yearA = Number(a.academic_year) || 0;
    const yearB = Number(b.academic_year) || 0;
    if (yearA !== yearB) return yearB - yearA;

    const termA = getTermValue(a.term);
    const termB = getTermValue(b.term);
    if (termA !== termB) return termB - termA;

    const colA = getCollegeSortValue(a.college);
    const colB = getCollegeSortValue(b.college);
    if (colA !== colB) return colA - colB;

    const deptSortA = getDeptSortValue(a.department);
    const deptSortB = getDeptSortValue(b.department);
    if (deptSortA !== deptSortB) return deptSortA - deptSortB;

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
    // 🌟 [修改] 改用專屬的 course-table-body ID，並加入防禦性攔截，防止非同步蓋到別頁的 HTML 容器
    const tbody = document.getElementById('course-table-body');
    if (!tbody) return; 

    const searchInput = document.getElementById('search-input');
    const rawSearchTerm = searchInput ? searchInput.value.trim() : ''; 
    const searchTerm = rawSearchTerm.toLowerCase();

    state.filteredData = state.allData.filter(d => {
        const matchSearch = (d.course_name || '').toLowerCase().includes(searchTerm) || (d.course_code || '').toLowerCase().includes(searchTerm);
        const matchYear = matchesSelection(d.academic_year, state.filterYearSet);
        const matchTerm = matchesSelection(d.term, state.filterTermSet);
        const matchEdu = matchesSelection(d.edu_system, state.filterEduSet);
        const matchCol = matchesSelection(d.college, state.filterCollegeSet);
        const matchDept = matchesSelection(d.department, state.filterDeptSet);
        const matchCode = matchesSelection(d.course_code, state.filterCodeSet);
        const matchName = matchesSelection(d.course_name, state.filterNameSet);
        const matchType = matchesSelection(d.course_type, state.filterTypeSet);
        const matchCredit = matchesSelection(String(d.credits), state.filterCreditSet);
        
        return matchSearch && matchYear && matchTerm && matchEdu && matchCol && matchDept && matchCode && matchName && matchType && matchCredit;
    });

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
                const valA = String(a[state.sortCol] || '').toLowerCase();
                const valB = String(b[state.sortCol] || '').toLowerCase();
                diff = valA.localeCompare(valB);
            }
            if (diff !== 0) return state.sortDir === 'asc' ? diff : -diff;
        }
        return defaultMultiLevelCompare(a, b);
    });

    const total = state.filteredData.length;
    const {currentPage, totalPages, start, items: paginatedItems} = pageSlice(state.filteredData, state.currentPage, state.itemsPerPage);
    state.currentPage = currentPage;

    const infoEl = document.getElementById('pagination-info');
    if(infoEl) {
        if (total > 0) {
            infoEl.innerHTML = `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆`;
        } else {
            infoEl.innerHTML = `共 <strong>0</strong> 筆`;
        }
    }
    
    const pHtml = paginationMarkup(state.currentPage, totalPages);
    pHtml;

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

        // 🌟 [優化] 藉由 Utils 物件調用高亮函式，確保搜尋關鍵字反黃
        const highlightedCode = Utils.highlightKeyword(data.course_code, rawSearchTerm);
        const highlightedName = Utils.highlightKeyword(data.course_name, rawSearchTerm);
        
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
