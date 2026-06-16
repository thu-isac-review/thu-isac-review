// 在 ui.js 原本的匯出項目下面，加入這些函式
import { state } from './state.js';

export function updateRespDeptOptions(preselectedValue = '') {
    const selectEl = document.getElementById('input-resp-dept');
    if (!selectEl) return;

    const stuIn = document.getElementById('input-student');
    const stuMatch = stuIn ? stuIn.value.split(' - ')[0] : '';
    const stu = state.allStudents.find(s => s.student_id === stuMatch);
    const stuDept = stu ? stu.department : null;

    const courseDepts = state.selectedCourseIds.map(cid => {
        const c = state.allCourses.find(x => x.id === cid);
        return c ? c.department : null;
    }).filter(Boolean);

    const deptsSet = new Set();
    if (stuDept) deptsSet.add(stuDept);
    courseDepts.forEach(d => deptsSet.add(d));

    const uniqueDepts = Array.from(deptsSet);

    if (uniqueDepts.length === 0) {
        selectEl.innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        return;
    }

    const currentVal = preselectedValue || selectEl.value;
    let html = '<option value="">請選擇負責填報系所...</option>';
    uniqueDepts.forEach(d => {
        const deptObj = state.globalDepts.find(x => x.name === d);
        const dispName = deptObj && deptObj.shortName ? deptObj.shortName : d;
        html += `<option value="${d}">${dispName}</option>`;
    });

    selectEl.innerHTML = html;
    
    if (uniqueDepts.includes(currentVal)) selectEl.value = currentVal;
    else if (uniqueDepts.length === 1) selectEl.value = uniqueDepts[0]; 
    else if (stuDept && uniqueDepts.includes(stuDept)) selectEl.value = stuDept; 
}

export function filterDropdownItems(input, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const term = input.value.toLowerCase().trim();
    container.querySelectorAll('.filter-option').forEach(lbl => {
        const text = lbl.querySelector('span').textContent.toLowerCase();
        if (text.includes(term)) { lbl.style.display = 'flex'; } 
        else { lbl.style.display = 'none'; }
    });
}

export function toggleDropdown(type) {
    const drop = document.getElementById(`drop-${type}`);
    const wrap = document.getElementById(`pill-wrap-${type}`);
    if (!drop || !wrap) return;
    const isOpen = drop.classList.contains('show');
    document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
    if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
}

export function updatePillActive(type) {
    const set = state.filterSelections[type];
    const def = state.filterDefinitions.find(d => d.key === type);
    if(!def) return;
    const pill = document.getElementById(`pill-${type}`);
    if(!pill) return;
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${def.label} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `${def.label} <i class="ti ti-chevron-down"></i>`;
    }
}

export function updateColumnVisibility() {
    let styleEl = document.getElementById('dynamic-col-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-col-styles';
        document.head.appendChild(styleEl);
    }
    let css = '';
    state.tableColumns.forEach(c => {
        if (!c.visible) { css += `th[data-col="${c.index}"], td[data-col="${c.index}"] { display: none !important; }\n`; }
    });
    styleEl.innerHTML = css;
}
