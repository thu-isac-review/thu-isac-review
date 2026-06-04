import { state } from './state.js';
import { renderTableRow, renderEmptyState } from './render.js';

export function updatePillActive(type) {
    const setMap = {
        'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet,
        'college': state.filterCollegeSet, 'dept': state.filterDeptSet, 'code': state.filterCodeSet,
        'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet
    };
    const nameMap = {
        'year': '學年度', 'term': '學期', 'edu': '學制',
        'college': '學院', 'dept': '學系', 'code': '代號',
        'name': '名稱', 'type': '屬性', 'credit': '學分'
    };
    
    const set = setMap[type];
    const typeName = nameMap[type];
    const pill = document.getElementById(`pill-${type}`);
    
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeName} <i class="ti ti-chevron-down"></i>`;
    }
}

export function populateDeptFilterUI() {
    let deptsToShow = state.globalDepts;
    if (state.filterCollegeSet.size > 0) deptsToShow = state.globalDepts.filter(d => state.filterCollegeSet.has(d.college));
    
    const validDeptNames = new Set(deptsToShow.map(d => d.name));
    for (let dept of state.filterDeptSet) { if (!validDeptNames.has(dept)) state.filterDeptSet.delete(dept); }
    
    document.getElementById('dept-options-container').innerHTML = deptsToShow.map(d => `
        <label class="filter-option">
            <input type="checkbox" class="filter-chk-dept" value="${d.name}" onchange="toggleFilterCheck('dept', '${d.name}')"> 
            <span>${d.shortName || d.name}</span>
        </label>`).join('');
    
    document.querySelectorAll(`.filter-chk-dept`).forEach(c => c.checked = state.filterDeptSet.has(c.value));
    updatePillActive('dept');

    const searchInput = document.getElementById('search-dept-input');
    if (searchInput && searchInput.value) window.filterDropdownItems(searchInput, 'dept-options-container');
}

export function populateAllFiltersUI() {
    const getUnique = (key) => [...new Set(state.allData.map(d => d[key]))].filter(Boolean).sort();
    
    const years = getUnique('academic_year').reverse();
    const terms = getUnique('term');
    const edus = getUnique('edu_system');
    const codes = getUnique('course_code');
    const names = getUnique('course_name');
    const types = getUnique('course_type');
    const credits = getUnique('credits').sort((a,b) => a-b);

    const generateHtml = (arr, type) => arr.map(v => `
        <label class="filter-option">
            <input type="checkbox" class="filter-chk-${type}" value="${v}" onchange="toggleFilterCheck('${type}', '${v}')"> 
            <span>${v}</span>
        </label>`).join('');

    document.getElementById('year-options-container').innerHTML = generateHtml(years, 'year');
    document.getElementById('term-options-container').innerHTML = generateHtml(terms, 'term');
    document.getElementById('edu-options-container').innerHTML = generateHtml(edus, 'edu');
    document.getElementById('code-options-container').innerHTML = generateHtml(codes, 'code');
    document.getElementById('name-options-container').innerHTML = generateHtml(names, 'name');
    document.getElementById('type-options-container').innerHTML = generateHtml(types, 'type');
    document.getElementById('credit-options-container').innerHTML = generateHtml(credits, 'credit');

    const colleges = state.orderedColleges.length > 0 
        ? state.orderedColleges 
        : [...new Set(state.globalDepts.map(d => d.college))].filter(Boolean).map(c => ({name: c, shortName: c}));
    
    document.getElementById('college-options-container').innerHTML = colleges.map(c => `
        <label class="filter-option">
            <input type="checkbox" class="filter-chk-college" value="${c.name}" onchange="toggleFilterCheck('college', '${c.name}')"> 
            <span>${c.shortName || c.name}</span>
        </label>`).join('');
    document.getElementById('input-college').innerHTML = `<option value="">請選擇學院...</option>` + colleges.map(c => `<option value="${c.name}">${c.shortName || c.name}</option>`).join('');

    populateDeptFilterUI();
    
    // Maintain checks state
    ['year', 'term', 'edu', 'code', 'name', 'type', 'credit'].forEach(type => {
        const setMap = { 'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet, 'code': state.filterCodeSet, 'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet };
        document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = setMap[type].has(c.value));
        updatePillActive(type);
    });
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    
    if (state.selectedIds.length > 0) {
        bar.classList.add('visible');
        count.innerText = state.selectedIds.length;
        if (state.selectedIds.length < state.filteredData.length) {
            btnSelectAll.style.display = 'inline-flex';
            btnSelectAll.innerText = `選取全部符合條件 (${state.filteredData.length})`;
        } else { btnSelectAll.style.display = 'none'; }
    } else { bar.classList.remove('visible'); }
}

export function updateFormDepts(preselectedValue = '') {
    const selectedCol = document.getElementById('input-college').value;
    const inputDept = document.getElementById('input-department');
    let html = '<option value="">請選擇學系...</option>';
    
    if (selectedCol) {
        const depts = state.globalDepts.filter(d => d.college === selectedCol);
        depts.forEach(d => html += `<option value="${d.name}">${d.shortName || d.name}</option>`);
    } else { html = '<option value="">請先選擇學院...</option>'; }
    
    inputDept.innerHTML = html;
    if (preselectedValue) inputDept.value = preselectedValue;
}

export function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

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

    // 排序處理
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

    // 更新分頁資訊與按鈕
    if (total > 0) {
        document.getElementById('pagination-info').innerHTML = `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆`;
    } else {
        document.getElementById('pagination-info').innerHTML = `共 <strong>0</strong> 筆`;
    }
    
    let pHtml = `<button class="page-btn" onclick="window.changePage(${state.currentPage-1})" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=totalPages; p++) {
        if (p===1 || p===totalPages || Math.abs(p-state.currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="window.changePage(${p})">${p}</button>`;
    });
    pHtml += `<button class="page-btn" onclick="window.changePage(${state.currentPage+1})" ${state.currentPage>=totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById('pagination-controls').innerHTML = pHtml;

    const currentPaginatedIds = paginatedItems.map(d => d.id);
    const isAllVisibleSelected = currentPaginatedIds.length > 0 && currentPaginatedIds.every(id => state.selectedIds.includes(id));
    document.getElementById('selectAll').checked = isAllVisibleSelected;

    // 輸出 HTML
    if (total === 0) {
        tbody.innerHTML = renderEmptyState('empty');
        return;
    }

    let html = '';
    paginatedItems.forEach((data) => {
        const colObj = state.orderedColleges.find(c => c.name === data.college);
        const colDispName = colObj && colObj.shortName ? colObj.shortName : data.college;
        const deptObj = state.globalDepts.find(d => d.name === data.department);
        const deptDispName = deptObj && deptObj.shortName ? deptObj.shortName : data.department;
        const isChecked = state.selectedIds.includes(data.id);

        html += renderTableRow(data, isChecked, colDispName, deptDispName);
    });
    tbody.innerHTML = html;
}
