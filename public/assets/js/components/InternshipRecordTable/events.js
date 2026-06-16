import { state, filterDefinitions } from "./state.js";
import { renderTable } from "./render.js";
import { deleteRecord } from "./data.js";

export function updateBatchActionBar() { 
    const bar = document.getElementById('batch-bar'); 
    const count = document.getElementById('selected-count'); 
    const btn = document.getElementById('btn-select-all-filtered'); 
    if (!bar) return;
    if (state.selectedIds.length > 0) { 
        bar.classList.add('visible'); count.innerText = state.selectedIds.length; 
        if (state.selectedIds.length < state.filteredRecords.length) { 
            btn.style.display = 'inline-flex'; btn.innerText = `選取全部符合條件 (${state.filteredRecords.length})`; 
        } else btn.style.display = 'none'; 
    } else bar.classList.remove('visible'); 
}

export async function handleBatchDelete() {
    if (!confirm(`確定刪除 ${state.selectedIds.length} 筆紀錄？`)) return;
    try {
        for (let id of state.selectedIds) {
            await deleteRecord(id);
        }
        state.selectedIds = [];
        updateBatchActionBar();
    } catch (e) {
        alert(e.message);
    }
}

export function updateFilterVisibility() {
    const searchInputGlobal = document.getElementById('search-input');
    const globalSearchTerm = searchInputGlobal ? searchInputGlobal.value.toLowerCase().trim() : '';

    filterDefinitions.forEach(def => {
        const key = def.key;
        const availableValues = new Set();
        
        state.allRecords.forEach(d => {
            const matchSearch = (d.student_raw || '').toLowerCase().includes(globalSearchTerm) || (d.inst_raw || '').toLowerCase().includes(globalSearchTerm);
            let ok = matchSearch;

            if (key !== 'dept' && ok && state.filterSelections.dept.size > 0) {
                const stuId = (d.student_raw || '').split(' - ')[0];
                const stu = state.allStudents.find(s => s.student_id === stuId);
                ok = stu && state.filterSelections.dept.has(stu.department);
            }
            if (key !== 'grade' && ok && state.filterSelections.grade.size > 0) ok = state.filterSelections.grade.has(d.grade);
            if (key !== 'inst_raw' && ok && state.filterSelections.inst_raw.size > 0) ok = state.filterSelections.inst_raw.has(d.inst_raw);
            if (key !== 'course' && ok && state.filterSelections.course.size > 0) {
                ok = d.courses && d.courses.some(cid => state.filterSelections.course.has(cid));
            }
            if (key !== 'resp_dept' && ok && state.filterSelections.resp_dept.size > 0) ok = state.filterSelections.resp_dept.has(d.resp_dept);
            if (key !== 'period' && ok && state.filterSelections.period.size > 0) ok = state.filterSelections.period.has(d.period_type);
            if (key !== 'proof' && ok && state.filterSelections.proof.size > 0) ok = state.filterSelections.proof.has(d.proof_type);
            if (key !== 'insurance' && ok && state.filterSelections.insurance.size > 0) ok = state.filterSelections.insurance.has(d.insurance);
            if (key !== 'employment' && ok && state.filterSelections.employment.size > 0) ok = state.filterSelections.employment.has(d.employment);

            if (ok) {
                if (key === 'dept') {
                    const stuId = (d.student_raw || '').split(' - ')[0];
                    const stu = state.allStudents.find(s => s.student_id === stuId);
                    if (stu && stu.department) availableValues.add(stu.department);
                } else if (key === 'grade') {
                    if (d.grade) availableValues.add(d.grade);
                } else if (key === 'inst_raw') {
                    if (d.inst_raw) availableValues.add(d.inst_raw);
                } else if (key === 'course') {
                    if (d.courses) d.courses.forEach(cid => availableValues.add(cid));
                } else if (key === 'resp_dept') {
                    if (d.resp_dept) availableValues.add(d.resp_dept);
                } else if (key === 'period') {
                    if (d.period_type) availableValues.add(d.period_type);
                } else if (key === 'proof') {
                    if (d.proof_type) availableValues.add(d.proof_type);
                } else if (key === 'insurance') {
                    if (d.insurance) availableValues.add(d.insurance);
                } else if (key === 'employment') {
                    if (d.employment) availableValues.add(d.employment);
                }
            }
        });

        const container = document.getElementById(`${key}-options-container`);
        if (container) {
            const searchInputLocal = document.getElementById(`search-${key}-input`);
            const localSearchTerm = searchInputLocal ? searchInputLocal.value.toLowerCase().trim() : '';

            container.querySelectorAll('.filter-option').forEach(lbl => {
                const checkbox = lbl.querySelector('input[type="checkbox"]');
                const val = checkbox.value;
                const text = lbl.querySelector('span').textContent.toLowerCase();
                
                const isAvailable = availableValues.has(val) || checkbox.checked;
                const matchesLocalSearch = text.includes(localSearchTerm);

                if (isAvailable && matchesLocalSearch) {
                    lbl.style.display = 'flex';
                } else {
                    lbl.style.display = 'none';
                }
            });
        }
    });
}
