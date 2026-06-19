import { state, getDeptShort, getTime, getColShort, formatCourseInfo } from './state.js';
import * as UI from './ui.js';

// 【反黃功能】：高亮符合搜尋字串的文字
const highlightMatch = (text, term) => {
    if (!term || text === null || text === undefined) return text || '';
    const str = text.toString();
    // 使用正則表達式進行全域且忽略大小寫的比對
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, '<mark class="search-highlight" style="background-color: #fef08a; color: #854d0e; padding: 0 2px; border-radius: 2px; font-weight: bold;">$1</mark>');
};

export function renderTable() {
    const tbody = document.getElementById('intern-record-table-body'); 
    if (!tbody) return;

    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

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

    state.filteredRecords.sort((a, b) => {
        let valA = '', valB = '';
        if (state.sortCol === 'created_at') { valA = getTime(a.created_at); valB = getTime(b.created_at); }
        else if (state.sortCol === 'student_id') { valA = (a.student_raw || '').split(' - ')[0] || ''; valB = (b.student_raw || '').split(' - ')[0] || ''; }
        else if (state.sortCol === 'student_name') { valA = (a.student_raw || '').split(' - ')[1] || ''; valB = (b.student_raw || '').split(' - ')[1] || ''; }
        else if (state.sortCol === 'dept') {
            const stuA = state.allStudents.find(s => s.student_id === (a.student_raw || '').split(' - ')[0]); valA = stuA ? getDeptShort(stuA.department) : '';
            const stuB = state.allStudents.find(s => s.student_id === (b.student_raw || '').split(' - ')[0]); valB = stuB ? getDeptShort(stuB.department) : '';
        }
        else if (state.sortCol === 'resp_dept') { valA = a.resp_dept ? getDeptShort(a.resp_dept) : ''; valB = b.resp_dept ? getDeptShort(b.resp_dept) : ''; }
        else { valA = (a[state.sortCol] || '').toString().toLowerCase(); valB = (b[state.sortCol] || '').toString().toLowerCase(); }
        
        if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const total = state.filteredRecords.length;
    const tPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > tPages) state.currentPage = tPages;
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const items = state.filteredRecords.slice(start, start + state.itemsPerPage);

    const pageInfo = document.getElementById('pagination-info');
    if (total > 0) {
        if(pageInfo) pageInfo.innerHTML = `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆`;
    } else {
        if(pageInfo) pageInfo.innerHTML = `共 <strong>0</strong> 筆`;
    }

    let pHtml = `<button class="page-btn" data-page="${state.currentPage-1}" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=tPages; p++) {
        if (p===1 || p===tPages || Math.abs(p-state.currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    pHtml += `<button class="page-btn" data-page="${state.currentPage+1}" ${state.currentPage>=tPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    const pageControls = document.getElementById('pagination-controls');
    if(pageControls) pageControls.innerHTML = pHtml;

    const selectAll = document.getElementById('selectAll');
    if(selectAll) selectAll.checked = items.length > 0 && items.every(i => state.selectedIds.includes(i.id));

    if (total === 0) { 
        tbody.innerHTML = `<tr><td colspan="16" class="empty-state"><i class="ti ti-inbox empty-icon" style="opacity: 0.4;"></i><div class="empty-text">找不到符合條件的紀錄。</div></td></tr>`; 
        return; 
    }

    let tHtml = '';
    items.forEach(data => {
        const stuParts = (data.student_raw || '').split(' - ');
        const stuId = stuParts[0] || ''; const stuName = stuParts[1] || '';
        const stu = state.allStudents.find(s => s.student_id === stuId);
        const stuDept = stu ? getDeptShort(stu.department) : '未綁定學系';

        // 【套用反黃】對有支援搜尋的欄位進行高亮包裹
        const displayStuId = highlightMatch(stuId, searchTerm);
        const displayStuName = highlightMatch(stuName, searchTerm);
        const displayInstRaw = highlightMatch(data.inst_raw, searchTerm);

        let totalCredits = 0;
        let coursesHtml = '-'; let courseAlign = 'center';
        if (data.courses && data.courses.length > 0) {
            const courseObjs = data.courses.map(cid => {
                const c = state.allCourses.find(x => x.id === cid);
                if (c && c.credits) totalCredits += Number(c.credits);
                return c;
            }).filter(Boolean);

            if (courseObjs.length > 0) {
                const badgeStyle = 'max-width: 100%; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;';
                const firstCourseTag = `<span class="badge badge-outline-blue" style="${badgeStyle}" title="${formatCourseInfo(courseObjs[0])}">${formatCourseInfo(courseObjs[0])}</span>`;
                if (courseObjs.length > 1) {
                    coursesHtml = `
                        <div style="display:flex; flex-direction:column; width:100%;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; width:100%;">
                                <div style="flex: 1; min-width: 0; text-align: left; display: flex;">${firstCourseTag}</div>
                                <button type="button" class="more-badge btn-course-expand" data-id="${data.id}">+${courseObjs.length - 1} <i class="ti ti-chevron-down" id="icon-course-${data.id}" style="margin-left:4px; font-size:12px; transition:0.2s;"></i></button>
                            </div>
                            <div id="expand-course-${data.id}" style="display:none; margin-top:4px; text-align: left;">
                                ${courseObjs.slice(1).map(c => `<div style="margin-top:4px;"><span class="badge badge-outline-blue" style="${badgeStyle}" title="${formatCourseInfo(c)}">${formatCourseInfo(c)}</span></div>`).join('')}
                            </div>
                        </div>`;
                } else {
                    coursesHtml = `<div style="display:flex; align-items:center; width:100%;"><div style="flex: 1; min-width: 0; text-align: left; display: flex;">${firstCourseTag}</div></div>`;
                }
                courseAlign = 'left';
            }
        }

        let proofBadge = 'badge-outline-gray';
        if (data.proof_type === '合約') proofBadge = 'badge-outline-green';
        else if (data.proof_type === '公函') proofBadge = 'badge-outline-blue';
        else if (data.proof_type === '其他證明文件') proofBadge = 'badge-outline-amber';

        let insBadge = 'badge-outline-gray';
        if (data.insurance === '兩者皆有') insBadge = 'badge-outline-green';
        else if (data.insurance === '僅校外實習保險') insBadge = 'badge-outline-indigo';
        else if (data.insurance === '僅勞保') insBadge = 'badge-outline-blue';
        else if (data.insurance === '兩者皆無') insBadge = 'badge-outline-red';

        const actionHtml = state.isReadOnly ? '-' : `
            <div class="row-actions">
                <button class="btn btn-secondary btn-icon sm btn-row-edit" data-id="${data.id}" title="編輯"><i class="ti ti-edit"></i></button>
                <button class="btn btn-icon sm btn-row-delete" data-id="${data.id}" data-name="${stuName}" style="color:var(--danger); border-color:var(--danger-border);" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        tHtml += `
        <tr class="${state.selectedIds.includes(data.id)?'selected':''}">
            <td class="col-checkbox" style="text-align: center;">
                <input type="checkbox" class="row-select-chk" value="${data.id}" ${state.selectedIds.includes(data.id)?'checked':''} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
            </td>
            <td data-col="1" style="text-align: center;"><div class="cell-primary bold">${displayStuId}</div></td>
            <td data-col="2" style="text-align: center;"><div class="cell-primary bold">${displayStuName}</div></td>
            <td data-col="3" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${stuDept}</div></td>
            <td data-col="4" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.grade || '-'}</div></td>
            <td data-col="5" style="text-align: left;"><div class="cell-primary bold">${displayInstRaw}</div></td>
            <td data-col="6" style="text-align: ${courseAlign};">${coursesHtml}</td>
            <td data-col="7" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${totalCredits}</div></td>
            <td data-col="8" style="text-align: center;"><div class="cell-primary bold">${data.duration || '-'}</div></td>
            <td data-col="9" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.hours !== undefined && data.hours !== '' ? data.hours : '-'}</div></td>
            <td data-col="10" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.period_type || '-'}</div></td>
            <td data-col="11" style="text-align: center;"><div class="badge ${proofBadge}">${data.proof_type || '-'}</div></td>
            <td data-col="12" style="text-align: center;"><div class="badge ${insBadge}">${data.insurance || '-'}</div></td>
            <td data-col="13" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.employment || '-'}</div></td>
            <td data-col="14" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.resp_dept ? getDeptShort(data.resp_dept) : '-'}</div></td>
            <td class="col-actions">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = tHtml;
    if (UI.updateColumnVisibility) UI.updateColumnVisibility();
}

// ... 下方的 renderStudentDropdown 等函式維持原樣不動即可 ...
// 為了精簡版面，這裡省略下半段完全不需要修改的 Dropdown 渲染代碼
