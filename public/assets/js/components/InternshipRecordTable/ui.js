import { state } from "./state.js";
import { getDeptShort, getColShort } from "./data.js";

export function updateRespDeptOptions(preselectedValue = '') {
    const selectEl = document.getElementById('input-resp-dept');
    if (!selectEl) return;

    const stuMatch = document.getElementById('input-student').value.split(' - ')[0];
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

export function renderStudentDropdown(list, term) {
    const dropdown = document.getElementById('student-dropdown'); 
    if (!dropdown) return;
    const val = term.split(' - ')[0].trim().toLowerCase(); 
    const filtered = list.filter(s => s.student_id.toLowerCase().includes(val) || s.name.toLowerCase().includes(val));
    if (filtered.length === 0) { dropdown.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:var(--text-muted);">查無相符學生</div>'; return; }
    
    let html = '';
    filtered.slice(0, 30).forEach(s => {
        html += `
        <div class="search-item" onclick="window.selectStudent('${s.student_id}', '${s.name}')">
            <div class="search-item-title">${s.student_id} - ${s.name}</div>
            <div class="search-item-desc">${getColShort(s.college)} / ${getDeptShort(s.department)}</div>
        </div>`;
    });
    dropdown.innerHTML = html;
}
