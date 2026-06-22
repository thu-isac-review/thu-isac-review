import { state, getDeptShort, getTime, getColShort, formatCourseForTable, formatCourseForExport, Utils, getRecordTerm } from './state.js';
import * as UI from './ui.js';

export function populateAcademicYearDropdown() {
    const globalSelect = document.getElementById('global-academic-year');
    const modalSelect = document.getElementById('input-academic-year');
    
    const recordYears = [...new Set(state.allRecords.map(r => r.academic_year))].filter(Boolean).sort((a,b) => b.localeCompare(a));
    const courseYears = [...new Set(state.allCourses.map(c => c.academic_year))].filter(Boolean).sort((a,b) => b.localeCompare(a));
    
    if (globalSelect) {
        const currGlobal = globalSelect.value;
        globalSelect.innerHTML = '<option value="">全學年度</option>' + recordYears.map(y => `<option value="${y}">${y} 學年度</option>`).join('');
        globalSelect.value = recordYears.includes(currGlobal) ? currGlobal : (recordYears[0] || '');
        state.currentAcademicYear = globalSelect.value;
    }
    if (modalSelect) {
        modalSelect.innerHTML = '<option value="">請選擇</option>' + courseYears.map(y => `<option value="${y}">${y} 學年度</option>`).join('');
        modalSelect.value = courseYears.includes(modalSelect.value) ? modalSelect.value : '';
    }
}

export function renderTable() {
    const tbody = document.getElementById('intern-record-table-body'); 
    if (!tbody) return;

    const searchTerm = (document.getElementById('search-input')?.value || '').trim().toLowerCase();

    // 1. 篩選邏輯
    state.filteredRecords = state.allRecords.filter(d => {
        if (state.currentAcademicYear && d.academic_year !== state.currentAcademicYear) return false;

        const stu = state.allStudents.find(s => s.id === d.student_doc_id) || {};
        const inst = state.allInsts.find(i => i.id === d.inst_id) || {};
        
        let matchSearch = (d.academic_year || '').includes(searchTerm) || (stu.student_id || '').toLowerCase().includes(searchTerm) || 
                          (stu.name || '').toLowerCase().includes(searchTerm) || (inst.name || '').toLowerCase().includes(searchTerm);
                 
        if (!matchSearch) return false;
        
        // 檢查 Pill 篩選器
        for (const [key, set] of Object.entries(state.filterSelections)) {
            if (set.size === 0) continue;
            let val;
            if (key === 'term') val = getRecordTerm(d);
            else if (key === 'dept') val = stu.department;
            else if (key === 'inst_raw') val = inst.name;
            else if (key === 'course') { if (!d.courses?.some(cid => set.has(cid))) return false; continue; }
            else val = d[key];
            if (!set.has(val)) return false;
        }
        return true;
    });

    // 2. 排序邏輯
    state.filteredRecords.sort((a, b) => {
        const stuA = state.allStudents.find(s => s.id === a.student_doc_id) || {};
        const stuB = state.allStudents.find(s => s.id === b.student_doc_id) || {};
        let vA = a[state.sortCol] || '', vB = b[state.sortCol] || '';

        if (state.sortCol === 'created_at') { vA = getTime(a.created_at); vB = getTime(b.created_at); }
        else if (state.sortCol === 'term') { vA = getRecordTerm(a); vB = getRecordTerm(b); }
        else if (state.sortCol === 'student_id') { vA = stuA.student_id || ''; vB = stuB.student_id || ''; }
        else if (state.sortCol === 'student_name') { vA = stuA.name || ''; vB = stuB.name || ''; }
        
        if (typeof vA === 'number') return state.sortDir === 'asc' ? vA - vB : vB - vA;
        return state.sortDir === 'asc' ? String(vA).localeCompare(String(vB), 'zh-TW') : String(vB).localeCompare(String(vA), 'zh-TW');
    });

    // 3. 分頁與渲染
    const total = state.filteredRecords.length;
    const tPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > tPages) state.currentPage = tPages;
    const items = state.filteredRecords.slice((state.currentPage - 1) * state.itemsPerPage, state.currentPage * state.itemsPerPage);

    document.getElementById('pagination-info').innerHTML = total ? `共 <strong>${total}</strong> 筆` : `共 <strong>0</strong> 筆`;

    if (total === 0) {
        tbody.innerHTML = ''; 
        document.getElementById('empty-state-container').style.display = 'flex';
        UI.updateColumnVisibility(); 
        return;
    }
    document.getElementById('empty-state-container').style.display = 'none';

    tbody.innerHTML = items.map(data => {
        const stu = state.allStudents.find(s => s.id === data.student_doc_id) || {};
        const inst = state.allInsts.find(i => i.id === data.inst_id) || {};
        const courseObjs = (data.courses || []).map(cid => state.allCourses.find(x => x.id === cid)).filter(Boolean);
        
        let coursesHtml = '-';
        if (courseObjs.length > 0) {
            const firstTag = `<span class="badge badge-outline-blue" title="${formatCourseForExport(courseObjs[0])}">${formatCourseForTable(courseObjs[0])}</span>`;
            coursesHtml = courseObjs.length === 1 
                ? firstTag 
                : `<div style="display:flex; justify-content:space-between;">${firstTag} <button class="more-badge btn-course-expand" data-id="${data.id}">+${courseObjs.length - 1} <i class="ti ti-chevron-down" id="icon-course-${data.id}"></i></button></div>
                   <div id="expand-course-${data.id}" style="display:none; margin-top:4px;">${courseObjs.slice(1).map(c => `<div><span class="badge badge-outline-blue">${formatCourseForTable(c)}</span></div>`).join('')}</div>`;
        }

        const actionHtml = state.isReadOnly ? '-' : `<div class="row-actions"><button class="btn btn-secondary btn-icon sm btn-row-edit" data-id="${data.id}"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-icon sm btn-row-delete" data-id="${data.id}"><i class="ti ti-trash"></i></button></div>`;

        return `
        <tr class="${state.selectedIds.includes(data.id) ? 'selected' : ''}">
            <td class="col-checkbox"><input type="checkbox" class="row-select-chk" value="${data.id}" ${state.selectedIds.includes(data.id) ? 'checked' : ''}></td>
            <td data-col="1">${getRecordTerm(data)}</td>
            <td data-col="2" class="bold">${stu.student_id || '-'}</td>
            <td data-col="3" class="bold">${stu.name || '-'}</td>
            <td data-col="4">${stu.department ? getDeptShort(stu.department) : '-'}</td>
            <td data-col="5">${data.grade || '-'}</td>
            <td data-col="6" class="bold text-left">${inst.name || '-'}</td>
            <td data-col="7" class="text-left">${coursesHtml}</td>
            <td data-col="8">${courseObjs.reduce((sum, c) => sum + (Number(c.credits) || 0), 0)}</td>
            <td data-col="9">${data.period_type || '-'}</td>
            <td data-col="10" class="bold">${data.duration || '-'}</td>
            <td data-col="11">${data.hours ?? '-'}</td>
            <td data-col="12"><div class="badge badge-outline-gray">${data.proof_type || '-'}</div></td>
            <td data-col="13">${data.employment || '-'}</td>
            <td data-col="14"><div class="badge badge-outline-gray">${data.insurance || '-'}</div></td>
            <td data-col="15"><div class="badge badge-outline-gray">${data.allowance || '-'}</div></td>
            <td data-col="16">${data.payment_type || '-'}</td>
            <td data-col="17" class="text-left">${data.payment_desc || '-'}</td>
            <td data-col="18">${data.payment_amount ? '$' + data.payment_amount : '-'}</td>
            <td data-col="19">${data.funding || '-'}</td>
            <td data-col="20">${data.opp_source || '-'}</td>
            <td data-col="21">${data.job_type || '-'}</td>
            <td data-col="22"><div class="badge ${data.is_moe_compliant === '符合' ? 'badge-outline-green' : 'badge-outline-red'}">${data.is_moe_compliant || '-'}</div></td>
            <td data-col="23" class="text-left">${data.moe_reason || '-'}</td>
            <td data-col="24">${data.resp_dept ? getDeptShort(data.resp_dept) : '-'}</td>
            <td class="col-spacer"></td>
            <td class="col-actions">${actionHtml}</td>
        </tr>`;
    }).join('');
    
    UI.updateColumnVisibility(); 
}

export function renderFilterDropdowns() {
    populateAcademicYearDropdown();
    UI.updateColumnVisibility();

    const colContainer = document.getElementById('column-toggles-container');
    if (colContainer) {
        colContainer.innerHTML = state.tableColumns.filter(c => !c.disableToggle).map(c => 
            `<label style="display:flex; align-items:center; gap:8px; padding:6px 8px; cursor:pointer;">
                <input type="checkbox" class="col-toggle-chk" data-index="${c.index}" ${c.visible !== false ? 'checked' : ''}> <span>${c.label}</span>
            </label>`
        ).join('');
    }
}

export function renderStudentDropdown(list, term) { /*...搜尋渲染邏輯保持原樣...*/ }
export function renderInstDropdown(list, term) { /*...搜尋渲染邏輯保持原樣...*/ }
export function renderCourseDropdown(list, term) { /*...搜尋渲染邏輯保持原樣...*/ }
export function renderSelectedCourseChips() { /*...Course 選擇清單渲染保持原樣...*/ }
