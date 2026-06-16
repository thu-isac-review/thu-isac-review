import { state, getDeptShort, getTime } from './state.js';
import * as UI from './ui.js';

export function renderTable() {
    const tbody = document.getElementById('intern-record-table-body'); 
    const emptyState = document.getElementById('empty-state-container');
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    // 1. 執行過濾 (與原邏輯相同)
    state.filteredRecords = state.allRecords.filter(d => {
        let ok = (d.student_raw || '').toLowerCase().includes(searchTerm) || (d.inst_raw || '').toLowerCase().includes(searchTerm);
        if (ok && state.filterSelections.dept.size > 0) {
            const stuId = (d.student_raw || '').split(' - ')[0];
            const stu = state.allStudents.find(s => s.student_id === stuId);
            ok = stu && state.filterSelections.dept.has(stu.department);
        }
        if (ok && state.filterSelections.grade.size > 0) ok = state.filterSelections.grade.has(d.grade);
        if (ok && state.filterSelections.inst_raw.size > 0) ok = state.filterSelections.inst_raw.has(d.inst_raw);
        if (ok && state.filterSelections.course.size > 0) ok = d.courses && d.courses.some(cid => state.filterSelections.course.has(cid));
        if (ok && state.filterSelections.resp_dept.size > 0) ok = state.filterSelections.resp_dept.has(d.resp_dept);
        if (ok && state.filterSelections.period.size > 0) ok = state.filterSelections.period.has(d.period_type);
        if (ok && state.filterSelections.proof.size > 0) ok = state.filterSelections.proof.has(d.proof_type);
        if (ok && state.filterSelections.insurance.size > 0) ok = state.filterSelections.insurance.has(d.insurance);
        if (ok && state.filterSelections.employment.size > 0) ok = state.filterSelections.employment.has(d.employment);
        return ok;
    });

    // 2. 排序
    state.filteredRecords.sort((a, b) => {
        let valA = '', valB = '';
        if (state.sortCol === 'created_at') { valA = getTime(a.created_at); valB = getTime(b.created_at); }
        else if (state.sortCol === 'student_id') { valA = (a.student_raw || '').split(' - ')[0]; valB = (b.student_raw || '').split(' - ')[0]; }
        else { valA = (a[state.sortCol] || '').toString().toLowerCase(); valB = (b[state.sortCol] || '').toString().toLowerCase(); }
        if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    // 3. 分頁
    const total = state.filteredRecords.length;
    const tPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > tPages) state.currentPage = tPages;
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const items = state.filteredRecords.slice(start, start + state.itemsPerPage);

    // 更新分頁資訊 UI
    if (total > 0) {
        document.getElementById('pagination-info').innerHTML = `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆`;
        emptyState.style.display = 'none';
        tbody.style.display = 'table-row-group';
    } else {
        document.getElementById('pagination-info').innerHTML = `共 <strong>0</strong> 筆`;
        emptyState.style.display = 'flex';
        emptyState.innerHTML = `<i class="ti ti-inbox empty-icon"></i><div class="empty-text">找不到符合條件的紀錄。</div>`;
        tbody.style.display = 'none';
    }

    // 產生分頁按鈕
    let pHtml = `<button class="page-btn" data-page="${state.currentPage-1}" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    for (let p=1; p<=tPages; p++) {
        if (p===1 || p===tPages || Math.abs(p-state.currentPage)<=1) {
            pHtml += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        } else if (p === 2 || p === tPages - 1) {
            pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        }
    }
    pHtml += `<button class="page-btn" data-page="${state.currentPage+1}" ${state.currentPage>=tPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById('pagination-controls').innerHTML = pHtml;

    document.getElementById('selectAll').checked = items.length > 0 && items.every(i => state.selectedIds.includes(i.id));

    if (total === 0) return;

    // 4. 產生表格內容 (確保按鈕加上 btn-row-edit, btn-row-delete 類別與 data-id)
    let tHtml = '';
    items.forEach(data => {
        const stuParts = (data.student_raw || '').split(' - ');
        const stuId = stuParts[0] || ''; const stuName = stuParts[1] || '';
        const stu = state.allStudents.find(s => s.student_id === stuId);
        const stuDept = stu ? getDeptShort(stu.department) : '未綁定學系';

        // ...課程展開 HTML 邏輯保持不變 (但將 onclick="window..." 改為 class="btn-course-expand" data-id="...")
        let coursesHtml = '-'; let courseAlign = 'center';
        if (data.courses && data.courses.length > 0) {
            const courseObjs = data.courses.map(cid => state.allCourses.find(x => x.id === cid)).filter(Boolean);
            if (courseObjs.length > 0) {
                const firstLabel = `${courseObjs[0].academic_year}-${courseObjs[0].term}_${courseObjs[0].course_code}`;
                const firstCourseTag = `<span class="badge badge-outline-blue" style="max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${firstLabel}">${firstLabel}</span>`;
                if (courseObjs.length > 1) {
                    coursesHtml = `
                        <div style="display:flex; flex-direction:column; width:100%;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                                <div style="flex: 1; text-align: left; display: flex;">${firstCourseTag}</div>
                                <button type="button" class="more-badge btn-course-expand" data-id="${data.id}">+${courseObjs.length - 1} <i class="ti ti-chevron-down" id="icon-course-${data.id}" style="margin-left:4px; font-size:12px; transition:0.2s;"></i></button>
                            </div>
                            <div id="expand-course-${data.id}" style="display:none; margin-top:4px; text-align: left;">
                                ${courseObjs.slice(1).map(c => `<div style="margin-top:4px;"><span class="badge badge-outline-blue" title="${c.academic_year}-${c.term}_${c.course_code}">${c.academic_year}-${c.term}_${c.course_code}</span></div>`).join('')}
                            </div>
                        </div>`;
                } else {
                    coursesHtml = `<div style="display:flex; align-items:center;"><div style="flex: 1; text-align: left; display: flex;">${firstCourseTag}</div></div>`;
                }
                courseAlign = 'left';
            }
        }

        // Action 按鈕 (修正事件委派 class)
        const actionHtml = state.isReadOnly ? '-' : `
            <div class="row-actions">
                <button class="btn btn-secondary btn-icon sm btn-row-edit" data-id="${data.id}" title="編輯"><i class="ti ti-edit"></i></button>
                <button class="btn btn-icon sm btn-row-delete" data-id="${data.id}" style="color:var(--danger); border-color:var(--danger-border);" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        tHtml += `
        <tr class="${state.selectedIds.includes(data.id)?'selected':''}">
            <td class="col-checkbox" style="text-align: center;">
                <input type="checkbox" class="row-select-chk" value="${data.id}" ${state.selectedIds.includes(data.id)?'checked':''} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px;">
            </td>
            <td data-col="1" style="text-align: center;"><div class="cell-primary bold">${stuId}</div></td>
            <td data-col="2" style="text-align: center;"><div class="cell-primary bold">${stuName}</div></td>
            <td data-col="3" style="text-align: center;"><div class="cell-primary">${stuDept}</div></td>
            <td data-col="4" style="text-align: center;"><div class="cell-primary">${data.grade || '-'}</div></td>
            <td data-col="5" style="text-align: left;"><div class="cell-primary bold">${data.inst_raw}</div></td>
            <td data-col="6" style="text-align: ${courseAlign};">${coursesHtml}</td>
            <td data-col="7" style="text-align: center;"><div class="cell-primary">-</div></td>
            <td data-col="8" style="text-align: center;"><div class="cell-primary bold">${data.duration || '-'}</div></td>
            <td data-col="9" style="text-align: center;"><div class="cell-primary">${data.hours !== undefined ? data.hours : '-'}</div></td>
            <td data-col="10" style="text-align: center;"><div class="cell-primary">${data.period_type || '-'}</div></td>
            <td data-col="11" style="text-align: center;"><div class="badge badge-outline-gray">${data.proof_type || '-'}</div></td>
            <td data-col="12" style="text-align: center;"><div class="badge badge-outline-gray">${data.insurance || '-'}</div></td>
            <td data-col="13" style="text-align: center;"><div class="cell-primary">${data.employment || '-'}</div></td>
            <td data-col="14" style="text-align: center;"><div class="cell-primary">${data.resp_dept ? getDeptShort(data.resp_dept) : '-'}</div></td>
            <td class="col-actions">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = tHtml;
    UI.updateColumnVisibility();
}

// ---------------- 以下保留原有的 Dropdown 與 Chips 渲染邏輯 ----------------
export function renderStudentDropdown(list, term) { ... }
export function renderInstDropdown(list, term) { ... }
export function renderCourseDropdown(list, term) { ... }
export function renderSelectedCourseChips(skipRespUpdate = false) { ... }
export function renderFilterDropdowns() {
    // 這裡的邏輯與原本資料收集完全相同，只須確認匯出的 HTML 包含 class="filter-chk-${def.key}" 等，以便 events.js 綁定。
}
