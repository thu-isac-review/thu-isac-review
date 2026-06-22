import { state } from './state.js';

export function showToast(msg, type = "info") {
    if (window.showToast) window.showToast(msg, type); 
    else alert(`[${type.toUpperCase()}] ${msg}`);
}

export function openFormModal(isEdit = false) {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('data-modal').classList.add('open');
    document.getElementById('modal-title').innerHTML = `<i class="ti ti-briefcase text-brand" style="font-size: 20px;"></i> ${isEdit ? '編輯實習紀錄' : '新增實習紀錄'}`;
}

export function closeFormModal() {
    document.getElementById('data-modal').classList.remove('open');
    document.getElementById('main-view').style.display = 'flex';
    state.editingId = null;
}

export function updateRespDeptOptions(preselectedValue = '') {
    const selectEl = document.getElementById('input-resp-dept');
    if (!selectEl) return;

    const stuIdMatch = document.getElementById('input-student')?.value.split(' - ')[0];
    const stuDept = state.allStudents.find(s => s.student_id === stuIdMatch)?.department;
    const courseDepts = state.selectedCourseIds.map(cid => state.allCourses.find(x => x.id === cid)?.department).filter(Boolean);

    const deptsSet = new Set(courseDepts);
    if (stuDept) deptsSet.add(stuDept);
    const uniqueDepts = Array.from(deptsSet);

    if (uniqueDepts.length === 0) {
        selectEl.innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        return;
    }

    let html = '<option value="">請選擇負責填報系所...</option>';
    uniqueDepts.forEach(d => html += `<option value="${d}">${state.globalDepts.find(x => x.name === d)?.shortName || d}</option>`);
    selectEl.innerHTML = html;
    
    if (uniqueDepts.includes(preselectedValue)) selectEl.value = preselectedValue;
    else if (uniqueDepts.length === 1) selectEl.value = uniqueDepts[0]; 
    else if (stuDept && uniqueDepts.includes(stuDept)) selectEl.value = stuDept; 
}

export function showInfoPopup(type) {
    const container = document.getElementById('info-popup-body');
    const title = document.getElementById('info-popup-title');
    if (type === 'student') {
        const stuId = document.getElementById('input-student').value.split(' - ')[0];
        const stu = state.allStudents.find(s => s.student_id === stuId);
        if (!stu) return;
        title.innerHTML = '<i class="ti ti-user" style="color:var(--brand); margin-right:4px;"></i> 學生詳細資訊';
        container.innerHTML = `<div class="info-item"><span class="info-item-label">學號</span><div class="info-item-value">${stu.student_id}</div></div><div class="info-item"><span class="info-item-label">姓名</span><div class="info-item-value">${stu.name}</div></div><div class="info-item"><span class="info-item-label">系所</span><div class="info-item-value">${stu.department}</div></div>`;
    } else {
        const instId = document.getElementById('input-institution').dataset.id;
        const instName = document.getElementById('input-institution').value;
        const inst = state.allInsts.find(i => i.id === instId || i.name === instName);
        if (!inst) return;
        title.innerHTML = '<i class="ti ti-building-skyscraper" style="color:var(--success); margin-right:4px;"></i> 機構詳細資訊';
        container.innerHTML = `<div class="info-item"><span class="info-item-label">機構名稱</span><div class="info-item-value">${inst.name}</div></div><div class="info-item"><span class="info-item-label">統一編號</span><div class="info-item-value">${inst.tax_id || '無'}</div></div><div class="info-item"><span class="info-item-label">地址</span><div class="info-item-value">${inst.address || '無'}</div></div>`;
    }
    document.getElementById('info-popup').classList.add('open');
}

export function closeInfoPopup() { document.getElementById('info-popup').classList.remove('open'); }

// 🌟 強制且絕對安全的 Notion 欄寬鎖定機制
export function updateColumnVisibility() {
    let styleEl = document.getElementById('dynamic-col-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-col-styles';
        document.head.appendChild(styleEl);
    }
    
    // 防呆機制：若狀態尚未載入，拒絕產出破版 CSS
    if (!state.tableColumns || state.tableColumns.length === 0) return;

    let css = '';
    let totalDataWidth = 0;
    const fixedWidth = 48 + 90; // Checkbox + Actions 寬度

    state.tableColumns.forEach(c => {
        const isVisible = c.visible !== false;
        const colWidth = c.width || 120; // 預設 120 防擠壓
        
        if (isVisible) {
            css += `#intern-record-table th[data-col="${c.index}"], #intern-record-table td[data-col="${c.index}"] { 
                width: ${colWidth}px !important; min-width: ${colWidth}px !important; max-width: ${colWidth}px !important; display: table-cell !important; 
            }\n`;
            totalDataWidth += colWidth;
        } else {
            css += `#intern-record-table th[data-col="${c.index}"], #intern-record-table td[data-col="${c.index}"] { display: none !important; }\n`;
        }
    });

    css += `#intern-record-table { min-width: ${fixedWidth + totalDataWidth}px; }\n`;
    styleEl.innerHTML = css;
}

export function updatePillActive(type) {
    const set = state.filterSelections[type];
    const def = state.filterDefinitions.find(d => d.key === type);
    const pill = document.getElementById(`pill-${type}`);
    if (!def || !pill) return;
    
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${def.label} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `${def.label} <i class="ti ti-chevron-down"></i>`;
    }
}
