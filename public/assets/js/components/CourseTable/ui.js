import { state } from './state.js';
import * as Render from './render.js';

export async function loadTemplate(containerId) {
    // 確保路徑與機構一致，避免快取問題，我們可以在 URL 後面加上時間戳記
    const response = await fetch(`./assets/templates/course.html?v=${new Date().getTime()}`);
    const htmlString = await response.text();
    document.getElementById(containerId).innerHTML = htmlString;
}

export function applyReadOnlyMode() {
    if (state.isReadOnly) {
        const style = document.createElement('style');
        style.textContent = `
            #btn-import-trigger, 
            #btn-create-course, 
            .v-divider,
            #batch-bar,
            .col-checkbox, 
            .col-actions {
                display: none !important;
            }
        `;
        document.getElementById('course-page-wrapper').appendChild(style);
    }
}

// 更新欄位顯示 CSS 的生成邏輯，加入 .cell-primary 的覆蓋
export function updateColStyles() {
    let css = '';
    const cols = ['academic_year', 'term', 'edu_system', 'college', 'department', 'course_code', 'course_name', 'course_type', 'credits'];
    
    cols.forEach(col => {
        if (!state.colVis[col]) {
            // 強制隱藏整欄的 <th> 和 <td>，並覆寫所有子元素的 display 避免破版
            css += `.col-${col} { display: none !important; }\n`;
            css += `td.col-${col} * { display: none !important; }\n`; 
        }
    });
    
    const styleEl = document.getElementById('dynamic-col-styles');
    if (styleEl) styleEl.textContent = css;
}

export function toggleDropdown(type) {
    const drop = document.getElementById(`drop-${type}`);
    const wrap = document.getElementById(`pill-wrap-${type}`);
    const isOpen = drop.classList.contains('show');
    document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
    if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
}

// 下拉選單的搜尋文字反黃功能
export function filterDropdownItems(inputElement, containerId) {
    const term = inputElement.value.toLowerCase().trim();
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const labels = container.querySelectorAll('.filter-option');
    let hasVisible = false;

    labels.forEach(lbl => {
        const span = lbl.querySelector('span:not(.pill-count)'); // 避免選到數量標籤
        if (!span) return;
        
        // 取得最原始的文字 (去除之前加上的 highlight span)
        const originalText = span.textContent || span.innerText;
        const textLower = originalText.toLowerCase();
        
        if (term === '') {
            lbl.style.display = 'flex';
            span.innerHTML = originalText; // 恢復原狀
            hasVisible = true;
        } else if (textLower.includes(term)) {
            lbl.style.display = 'flex';
            hasVisible = true;
            
            // 實作反黃標示 (黃底棕字 Highlight)
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            span.innerHTML = originalText.replace(regex, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px; color: #854d0e; font-weight: bold;">$1</mark>');
        } else {
            lbl.style.display = 'none';
        }
    });

    // 處理找不到選項時的空狀態
    let emptyOpt = container.querySelector('.empty-opt');
    if (!hasVisible) {
        if (!emptyOpt) {
            emptyOpt = document.createElement('label');
            emptyOpt.className = 'searchable-option empty-opt';
            emptyOpt.textContent = '找不到符合的選項';
            container.appendChild(emptyOpt);
        } else {
            emptyOpt.style.display = 'flex';
        }
    } else if (emptyOpt) {
        emptyOpt.style.display = 'none';
    }
}

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
    
    if (!pill) return;

    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeName} <i class="ti ti-chevron-down"></i>`;
    }
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
            <input type="checkbox" class="filter-chk-${type}" value="${v}"> 
            <span>${v}</span>
        </label>`).join('');

    if(document.getElementById('year-options-container')) document.getElementById('year-options-container').innerHTML = generateHtml(years, 'year');
    if(document.getElementById('term-options-container')) document.getElementById('term-options-container').innerHTML = generateHtml(terms, 'term');
    if(document.getElementById('edu-options-container')) document.getElementById('edu-options-container').innerHTML = generateHtml(edus, 'edu');
    if(document.getElementById('code-options-container')) document.getElementById('code-options-container').innerHTML = generateHtml(codes, 'code');
    if(document.getElementById('name-options-container')) document.getElementById('name-options-container').innerHTML = generateHtml(names, 'name');
    if(document.getElementById('type-options-container')) document.getElementById('type-options-container').innerHTML = generateHtml(types, 'type');
    if(document.getElementById('credit-options-container')) document.getElementById('credit-options-container').innerHTML = generateHtml(credits, 'credit');

    const colleges = state.orderedColleges.length > 0 
        ? state.orderedColleges 
        : [...new Set(state.globalDepts.map(d => d.college))].filter(Boolean).map(c => ({name: c, shortName: c}));
    
    if(document.getElementById('college-options-container')) {
        document.getElementById('college-options-container').innerHTML = colleges.map(c => `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-college" value="${c.name}"> 
                <span>${c.shortName || c.name}</span>
            </label>`).join('');
    }
    
    if(document.getElementById('input-college')) {
        document.getElementById('input-college').innerHTML = `<option value="">請選擇學院...</option>` + colleges.map(c => `<option value="${c.name}">${c.shortName || c.name}</option>`).join('');
    }

    populateDeptFilterUI();
    
    // 保持勾選狀態
    ['year', 'term', 'edu', 'code', 'name', 'type', 'credit'].forEach(type => {
        const setMap = { 'year': state.filterYearSet, 'term': state.filterTermSet, 'edu': state.filterEduSet, 'code': state.filterCodeSet, 'name': state.filterNameSet, 'type': state.filterTypeSet, 'credit': state.filterCreditSet };
        document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = setMap[type].has(c.value));
        updatePillActive(type);
    });
}

export function populateDeptFilterUI() {
    let deptsToShow = state.globalDepts;
    if (state.filterCollegeSet.size > 0) deptsToShow = state.globalDepts.filter(d => state.filterCollegeSet.has(d.college));
    
    const validDeptNames = new Set(deptsToShow.map(d => d.name));
    for (let dept of state.filterDeptSet) { if (!validDeptNames.has(dept)) state.filterDeptSet.delete(dept); }
    
    if(document.getElementById('dept-options-container')) {
        document.getElementById('dept-options-container').innerHTML = deptsToShow.map(d => `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-dept" value="${d.name}"> 
                <span>${d.shortName || d.name}</span>
            </label>`).join('');
    }
    
    document.querySelectorAll(`.filter-chk-dept`).forEach(c => c.checked = state.filterDeptSet.has(c.value));
    updatePillActive('dept');

    const searchInput = document.getElementById('search-dept-input');
    if (searchInput && searchInput.value) filterDropdownItems(searchInput, 'dept-options-container');
}

export function updateFormDepts(preselectedValue = '') {
    const selectedCol = document.getElementById('input-college')?.value;
    const inputDept = document.getElementById('input-department');
    if(!inputDept) return;
    
    let html = '<option value="">請選擇學系...</option>';
    
    if (selectedCol) {
        const depts = state.globalDepts.filter(d => d.college === selectedCol);
        depts.forEach(d => html += `<option value="${d.name}">${d.shortName || d.name}</option>`);
    } else { 
        html = '<option value="">請先選擇學院...</option>'; 
    }
    
    inputDept.innerHTML = html;
    if (preselectedValue) inputDept.value = preselectedValue;
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    
    if (state.isReadOnly) {
        if(bar) bar.classList.remove('visible');
        return;
    }
    
    if (state.selectedIds.length > 0) {
        if(bar) bar.classList.add('visible');
        if(count) count.innerText = state.selectedIds.length;
        if(btnSelectAll) {
            if (state.selectedIds.length < state.filteredData.length) {
                btnSelectAll.style.display = 'inline-flex';
                btnSelectAll.innerText = `選取全部符合條件 (${state.filteredData.length})`;
            } else { 
                btnSelectAll.style.display = 'none'; 
            }
        }
    } else { 
        if(bar) bar.classList.remove('visible'); 
    }
}

export function closeModal() { 
    document.getElementById('data-modal')?.classList.remove('open'); 
    state.editingId = null; 
}

export function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl shadow-xl border transition-all duration-300 transform translate-y-5 opacity-0`;
    
    if (type === 'success') {
        toast.className += ' bg-emerald-50 text-emerald-800 border-emerald-200';
        toast.innerHTML = `<i class="ti ti-circle-check text-emerald-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    } else if (type === 'error') {
        toast.className += ' bg-rose-50 text-rose-800 border-rose-200';
        toast.innerHTML = `<i class="ti ti-alert-circle text-rose-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    } else {
        toast.className += ' bg-blue-50 text-blue-800 border-blue-200';
        toast.innerHTML = `<i class="ti ti-info-circle text-blue-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 50);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-5', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
