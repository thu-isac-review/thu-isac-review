import { state } from './state.js';

export function showToast(msg, type = "info") {
    if (window.showToast) { window.showToast(msg, type); } 
    else { alert(`[${type.toUpperCase()}] ${msg}`); }
}

export function openFormModal(isEdit = false) {
    document.getElementById('data-modal').classList.add('open');
    document.getElementById('modal-title').innerHTML = `<i class="ti ti-briefcase text-brand" style="font-size: 20px;"></i> ${isEdit ? '編輯實習紀錄' : '新增實習紀錄'}`;
}

export function closeFormModal() {
    document.getElementById('data-modal').classList.remove('open');
    state.editingId = null;
}

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

// 🌟 動態判斷是否需要顯示左右滑動按鈕
export function updateFilterScrollButtons() {
    const scrollArea = document.getElementById('filter-container');
    const leftBtn = document.getElementById('btn-scroll-left');
    const rightBtn = document.getElementById('btn-scroll-right');
    if (scrollArea && leftBtn && rightBtn) {
        // 當內容寬度大於容器寬度時才顯示按鈕
        const isScrollable = scrollArea.scrollWidth > scrollArea.clientWidth;
        leftBtn.style.display = isScrollable ? 'flex' : 'none';
        rightBtn.style.display = isScrollable ? 'flex' : 'none';
    }
}

// 🌟 Notion 佈局核心邏輯 (加入終極防呆機制)
export function updateColumnVisibility() {
    let styleEl = document.getElementById('dynamic-col-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-col-styles';
        document.head.appendChild(styleEl);
    }
    
    // 🌟 終極防呆：確保 tableColumns 存在且有效，若無則立刻原地修復
    if (!state.tableColumns || state.tableColumns.length === 0 || !state.tableColumns[0].index) {
        state.tableColumns = [
            { index: 1, label: '學期', width: 100, visible: true },
            { index: 2, label: '學號', width: 130, visible: true },
            { index: 3, label: '姓名', width: 110, visible: true },
            { index: 4, label: '學系', width: 140, visible: true },
            { index: 5, label: '年級', width: 90, visible: true },
            { index: 6, label: '機構名稱', width: 240, visible: true },
            { index: 7, label: '修習課程', width: 280, visible: true },
            { index: 8, label: '總學分', width: 90, visible: true },
            { index: 9, label: '實習時間', width: 120, visible: true },
            { index: 10, label: '實習起訖時間', width: 200, visible: true },
            { index: 11, label: '總時數', width: 100, visible: true },
            { index: 12, label: '證明文件', width: 110, visible: true },
            { index: 13, label: '勞雇關係', width: 100, visible: true },
            { index: 14, label: '投保情形', width: 140, visible: true },
            { index: 15, label: '實習待遇', width: 120, visible: true },
            { index: 16, label: '給付類型', width: 120, visible: true },
            { index: 17, label: '其他給付說明', width: 180, visible: true },
            { index: 18, label: '給付金額', width: 120, visible: true },
            { index: 19, label: '補助經費來源', width: 210, visible: true },
            { index: 20, label: '實習機會來源', width: 160, visible: true },
            { index: 21, label: '實習職缺類型', width: 150, visible: true },
            { index: 22, label: '符合校庫填報', width: 140, visible: true },
            { index: 23, label: '不符合校庫填報原因', width: 210, visible: true },
            { index: 24, label: '填報系所', width: 140, visible: true }
        ];
    }
    
    let css = '';
    let totalDataWidth = 0;
    const fixedWidth = 48 + 90; // 左側凍結 Checkbox + 右側凍結 Actions

    state.tableColumns.forEach(c => {
        // 預設可見，除非明確設為 false
        const isVisible = c.visible !== false;
        // 預設寬度 120 防擠壓
        const colWidth = c.width || 120; 

        if (isVisible) {
            css += `#intern-record-table th[data-col="${c.index}"], 
                    #intern-record-table td[data-col="${c.index}"] { 
                        width: ${colWidth}px !important; 
                        min-width: ${colWidth}px !important; 
                        max-width: ${colWidth}px !important; 
                        display: table-cell !important; 
                    }\n`;
            totalDataWidth += colWidth;
        } else {
            css += `#intern-record-table th[data-col="${c.index}"], 
                    #intern-record-table td[data-col="${c.index}"] { 
                        display: none !important; 
                    }\n`;
        }
    });

    const totalRequiredWidth = fixedWidth + totalDataWidth;
    css += `#intern-record-table { min-width: ${totalRequiredWidth}px; }\n`;

    styleEl.innerHTML = css;
}
