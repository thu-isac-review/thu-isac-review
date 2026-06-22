import { state } from './state.js';

export function showToast(msg, type = "info") {
    if (window.showToast) { window.showToast(msg, type); } 
    else { alert(`[${type.toUpperCase()}] ${msg}`); }
}

export function openFormModal(isEdit = false) {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('data-modal').classList.add('open');
    document.getElementById('modal-title').innerText = isEdit ? '編輯實習紀錄' : '新增實習紀錄';
}

export function closeFormModal() {
    document.getElementById('data-modal').classList.remove('open');
    document.getElementById('main-view').style.display = 'flex';
    state.editingId = null;
}

export function showInfoPopup(type) {
    const container = document.getElementById('info-popup-body');
    const title = document.getElementById('info-popup-title');
    let html = '';

    if (type === 'student') {
        const stuId = document.getElementById('input-student').value.split(' - ')[0];
        const stu = state.allStudents.find(s => s.student_id === stuId);
        if (!stu) return;
        title.innerHTML = '<i class="ti ti-user" style="color:var(--brand); margin-right:4px;"></i> 學生詳細資訊';
        html = `
            <div class="info-item"><span class="info-item-label">學號</span><div class="info-item-value">${stu.student_id}</div></div>
            <div class="info-item"><span class="info-item-label">姓名</span><div class="info-item-value">${stu.name}</div></div>
            <div class="info-item"><span class="info-item-label">所屬系所</span><div class="info-item-value">${stu.department}</div></div>
            <div class="info-item"><span class="info-item-label">所屬學院</span><div class="info-item-value">${stu.college}</div></div>
        `;
    } else {
        const instId = document.getElementById('input-institution').dataset.id;
        let inst;
        if (instId) {
            inst = state.allInsts.find(i => i.id === instId);
        } else {
            const instName = document.getElementById('input-institution').value;
            inst = state.allInsts.find(i => i.name === instName);
        }
        if (!inst) return;
        title.innerHTML = '<i class="ti ti-building-skyscraper" style="color:var(--success); margin-right:4px;"></i> 機構詳細資訊';
        html = `
            <div class="info-item"><span class="info-item-label">機構名稱</span><div class="info-item-value">${inst.name}</div></div>
            <div class="info-item"><span class="info-item-label">統一編號</span><div class="info-item-value">${inst.tax_id || '無'}</div></div>
            <div class="info-item"><span class="info-item-label">通訊地址</span><div class="info-item-value">${inst.address || '無'}</div></div>
        `;
    }
    container.innerHTML = html;
    document.getElementById('info-popup').classList.add('open');
}

export function closeInfoPopup() { document.getElementById('info-popup').classList.remove('open'); }

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

// 🌟 Notion 佈局核心邏輯
export function updateColumnVisibility() {
    let styleEl = document.getElementById('dynamic-col-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-col-styles';
        document.head.appendChild(styleEl);
    }
    
    let css = '';
    let totalDataWidth = 0;
    const fixedWidth = 48 + 90; // col-checkbox + col-actions 的寬度

    if (!state.tableColumns || state.tableColumns.length === 0) {
        console.warn("tableColumns is empty. Defaulting to all visible.");
        return;
    }

    state.tableColumns.forEach(c => {
        // 防呆：確保 width 是一個數字
        const width = c.width || 120; 

        if (c.visible !== false) { // 預設為 true
            css += `#intern-record-table th[data-col="${c.index}"], 
                    #intern-record-table td[data-col="${c.index}"] { 
                        width: ${width}px !important; 
                        min-width: ${width}px !important; 
                        max-width: ${width}px !important; 
                        display: table-cell !important; 
                    }\n`;
            totalDataWidth += width;
        } else {
            css += `#intern-record-table th[data-col="${c.index}"], 
                    #intern-record-table td[data-col="${c.index}"] { 
                        display: none !important; 
                    }\n`;
        }
    });

    // 總必要寬度，確保如果螢幕過小能出現卷軸
    const totalRequiredWidth = fixedWidth + totalDataWidth;
    css += `#intern-record-table { min-width: ${totalRequiredWidth}px; }\n`;

    styleEl.innerHTML = css;
}
