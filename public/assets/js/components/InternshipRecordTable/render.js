import { state, filterDefinitions, tableColumns } from "./state.js";
import { getDeptShort, getColShort, formatCourseInfo, getTime } from "./data.js";

export function updateColumnVisibility() {
    let styleEl = document.getElementById('col-vis-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'col-vis-style';
        document.head.appendChild(styleEl);
    }
    let css = '';
    tableColumns.forEach(c => {
        if (!c.visible) {
            css += `th[data-col="${c.index}"], td[data-col="${c.index}"] { display: none !important; }\n`;
        }
    });
    styleEl.innerHTML = css;
}

export function renderFilterDropdowns() {
    const container = document.getElementById('filter-container');
    if (!container) return;
    
    const uniqueSortedDepts = [...new Set(state.globalDepts.map(d=>d.name))];
    const uniqueUsedCourses = [...new Set(state.allRecords.flatMap(r => r.courses || []))];
    const courseOptions = uniqueUsedCourses.map(cid => {
        const c = state.allCourses.find(x => x.id === cid);
        return { value: cid, label: c ? formatCourseInfo(c) : cid };
    }).filter(opt => opt.label !== opt.value);
    courseOptions.sort((a,b) => a.label.localeCompare(b.label));

    const filterOptions = {
        dept: uniqueSortedDepts.map(v=>({value:v, label: getDeptShort(v)})),
        grade: ['1', '2', '3', '4', '5'].map(v=>({value:v, label: `${v} 年級${v==='5'?'以上':''}`})),
        inst_raw: [...new Set(state.allRecords.map(r=>r.inst_raw))].filter(Boolean).sort().map(v=>({value:v, label:v})),
        course: courseOptions,
        resp_dept: uniqueSortedDepts.map(v=>({value:v, label: getDeptShort(v)})),
        period: ['寒假實習', '暑假實習', '學期期間實習', '單一學期實習', '全學年'].map(v=>({value:v, label:v})),
        proof: ['合約', '公函', '其他證明文件'].map(v=>({value:v, label:v})),
        insurance: ['僅校外實習保險', '僅勞保', '兩者皆有', '兩者皆無'].map(v=>({value:v, label:v})),
        employment: ['是', '否'].map(v=>({value:v, label:v}))
    };

    let html = '';
    filterDefinitions.forEach(def => {
        const opts = filterOptions[def.key] || [];
        let optionsHtml = '';
        opts.forEach(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            const isChecked = state.filterSelections[def.key].has(val) ? 'checked' : '';
            optionsHtml += `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-${def.key}" value="${val}" onchange="window.toggleFilterCheck('${def.key}', '${val}')" ${isChecked}> 
                <span>${lbl}</span>
            </label>`;
        });

        let searchHtml = '';
        if (def.searchable) {
            searchHtml = `
            <div class="filter-dropdown-search">
                <input type="text" id="search-${def.key}-input" placeholder="搜尋${def.label}..." onkeyup="window.filterDropdownItems(this, '${def.key}-options-container')">
            </div>`;
        }

        const isActive = state.filterSelections[def.key].size > 0 ? 'active' : '';
        const btnContent = state.filterSelections[def.key].size > 0 ? `${def.label} <span class="pill-count">${state.filterSelections[def.key].size}</span>` : def.label;

        html += `
        <div class="filter-pill-wrap" id="pill-wrap-${def.key}">
            <button class="filter-pill ${isActive}" id="pill-${def.key}" onclick="window.toggleDropdown('${def.key}')">
                ${btnContent} <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-${def.key}">
                ${searchHtml}
                <div class="filter-dropdown-list" id="${def.key}-options-container">${optionsHtml}</div>
                <div class="filter-dropdown-footer">
                    <button onclick="window.clearFilter('${def.key}')">清除此篩選</button>
                </div>
            </div>
        </div>`;
    });

    html += `
    <div class="flex-spacer"></div>
    <div class="filter-pill-wrap" id="pill-wrap-col-toggle">
        <button class="filter-pill" id="pill-col-toggle" onclick="window.toggleDropdown('col-toggle')" style="font-weight: 700; color: var(--text-primary);">
            <i class="ti ti-adjustments-horizontal" style="font-size: 16px;"></i> 顯示欄位 <i class="ti ti-chevron-down"></i>
        </button>
        <div class="filter-dropdown" id="drop-col-toggle" style="right: 0; left: auto; min-width: 160px;">
            <div class="filter-dropdown-list custom-scroll" style="max-height: 250px; padding: 8px;">
                ${tableColumns.map(c => `
                    <label class="filter-option" style="padding: 4px 8px;">
                        <input type="checkbox" ${c.visible ? 'checked' : ''} onchange="window.toggleColumn(${c.index}, this.checked)">
                        <span>${c.label}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    </div>`;
    
    container.querySelectorAll('.filter-pill-wrap, .flex-spacer').forEach(el => el.remove());
    container.insertAdjacentHTML('afterbegin', html);
    window.updateFilterVisibility();
}

export function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    state.filteredRecords = state.allRecords.filter(d => {
        const matchSearch = (d.student_raw || '').toLowerCase().includes(searchTerm) || (d.inst_raw || '').toLowerCase().includes(searchTerm);
        let ok = matchSearch;
        
        if (ok && state.filterSelections.dept.size > 0) {
            const stuId = (d.student_raw || '').split(' - ')[0];
            const stu = state.allStudents.find(s => s.student_id === stuId);
            ok = stu && state.filterSelections.dept.has(stu.department);
        }
        if (ok && state.filterSelections.grade.size > 0) ok = state.filterSelections.grade.has(d.grade);
        if (ok && state.filterSelections.inst_raw.size > 0) ok = state.filterSelections.inst_raw.has(d.inst_raw);
        if (ok && state.filterSelections.course.size > 0) {
            ok = d.courses && d.courses.some(cid => state.filterSelections.course.has(cid));
        }
        if (ok && state.filterSelections.resp_dept.size > 0) ok = state.filterSelections.resp_dept.has(d.resp_dept);
        if (ok && state.filterSelections.period.size > 0) ok = state.filterSelections.period.has(d.period_type);
        if (ok && state.filterSelections.proof.size > 0) ok = state.filterSelections.proof.has(d.proof_type);
        if (ok && state.filterSelections.insurance.size > 0) ok = state.filterSelections.insurance.has(d.insurance);
        if (ok && state.filterSelections.employment.size > 0) ok = state.filterSelections.employment.has(d.employment);
        
        return ok;
    });

    // 排序排序
    state.filteredRecords.sort((a, b) => {
        let valA = ''; let valB = '';
        if (state.sortCol === 'created_at') { valA = getTime(a.created_at); valB = getTime(b.created_at); }
        else if (state.sortCol === 'student_id') {
            valA = (a.student_raw || '').split(' - ')[0] || '';
            valB = (b.student_raw || '').split(' - ')[0] || '';
        }
        else if (state.sortCol === 'student_name') {
            valA = (a.student_raw || '').split(' - ')[1] || '';
            valB = (b.student_raw || '').split(' - ')[1] || '';
        }
        else if (state.sortCol === 'dept') {
            const stuA = state.allStudents.find(s => s.student_id === (a.student_raw || '').split(' - ')[0]);
            valA = stuA ? getDeptShort(stuA.department) : '';
            const stuB = state.allStudents.find(s => s.student_id === (b.student_raw || '').split(' - ')[0]);
            valB = stuB ? getDeptShort(stuB.department) : '';
        }
        else if (state.sortCol === 'resp_dept') {
            valA = a.resp_dept ? getDeptShort(a.resp_dept) : '';
            valB = b.resp_dept ? getDeptShort(b.resp_dept) : '';
        }
        else { 
            valA = (a[state.sortCol] || '').toString().toLowerCase(); 
            valB = (b[state.sortCol] || '').toString().toLowerCase(); 
        }

        if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const total = state.filteredRecords.length; 
    const tPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > tPages) state.currentPage = tPages;
    const start = (state.currentPage - 1) * state.itemsPerPage; 
    const items = state.filteredRecords.slice(start, start + state.itemsPerPage);

    if (total > 0) {
        document.getElementById('pagination-info').innerHTML = `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, total)} 筆`;
    } else {
        document.getElementById('pagination-info').innerHTML = `共 <strong>0</strong> 筆`;
    }
    
    let pHtml = `<button class="page-btn" onclick="window.changePage(${state.currentPage-1})" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=tPages; p++) {
        if (p===1 || p===tPages || Math.abs(p-state.currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="window.changePage(${p})">${p}</button>`;
    });
    pHtml += `<button class="page-btn" onclick="window.changePage(${state.currentPage+1})" ${state.currentPage>=tPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById('pagination-controls').innerHTML = pHtml;
    
    document.getElementById('selectAll').checked = items.length > 0 && items.every(i => state.selectedIds.includes(i.id));

    if (total === 0) { 
        tbody.innerHTML = `<tr><td colspan="16" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的紀錄。</div></td></tr>`; 
        return; 
    }

    let tHtml = '';
    items.forEach(data => {
        const stuParts = (data.student_raw || '').split(' - ');
        const stuId = stuParts[0] || '';
        const stuName = stuParts[1] || '';
        
        const stu = state.allStudents.find(s => s.student_id === stuId);
        const stuDept = stu ? getDeptShort(stu.department) : '未綁定學系';

        const courseCount = Array.isArray(data.courses) ? data.courses.length : 0;
        let totalCredits = 0;
        if (courseCount > 0) {
            data.courses.forEach(cid => {
                const c = state.allCourses.find(x => x.id === cid);
                if (c && c.credits) totalCredits += Number(c.credits);
            });
        }

        let coursesHtml = '-';
        let courseAlign = 'center';
        if (data.courses && data.courses.length > 0) {
            const courseObjs = data.courses.map(cid => state.allCourses.find(x => x.id === cid)).filter(Boolean);
            if (courseObjs.length > 0) {
                const badgeStyle = 'max-width: 100%; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;';
                const firstCourseTag = `<span class="badge badge-outline-blue" style="${badgeStyle}" title="${formatCourseInfo(courseObjs[0])}">${formatCourseInfo(courseObjs[0])}</span>`;
                
                if (courseObjs.length > 1) {
                    const otherCoursesHtml = courseObjs.slice(1).map(c => `
                        <div style="margin-top: 4px;">
                            <span class="badge badge-outline-blue" style="${badgeStyle}" title="${formatCourseInfo(c)}">${formatCourseInfo(c)}</span>
                        </div>
                    `).join('');

                    coursesHtml = `
                        <div style="display:flex; flex-direction:column; width:100%;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; width:100%;">
                                <div style="flex: 1; min-width: 0; text-align: left; display: flex;">${firstCourseTag}</div>
                                <button type="button" class="more-badge" onclick="window.toggleCourseExpand('${data.id}')">
                                    +${courseObjs.length - 1} <i class="ti ti-chevron-down" id="icon-course-${data.id}" style="margin-left:4px; font-size:12px; transition:0.2s;"></i>
                                </button>
                            </div>
                            <div id="expand-course-${data.id}" style="display:none; margin-top:4px; text-align: left;">
                                ${otherCoursesHtml}
                            </div>
                        </div>
                    `;
                } else {
                    coursesHtml = `
                        <div style="display:flex; align-items:center; width:100%;">
                            <div style="flex: 1; min-width: 0; text-align: left; display: flex;">${firstCourseTag}</div>
                        </div>
                    `;
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

        tHtml += `
        <tr class="${state.selectedIds.includes(data.id)?'selected':''}">
            <td class="col-checkbox" style="text-align: center;">
                <input type="checkbox" value="${data.id}" onchange="window.toggleSelect('${data.id}')" ${state.selectedIds.includes(data.id)?'checked':''} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
            </td>
            <td data-col="1" style="text-align: center;"><div class="cell-primary bold">${stuId}</div></td>
            <td data-col="2" style="text-align: center;"><div class="cell-primary bold">${stuName}</div></td>
            <td data-col="3" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${stuDept}</div></td>
            <td data-col="4" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.grade || '-'}</div></td>
            <td data-col="5" style="text-align: left;"><div class="cell-primary bold">${data.inst_raw}</div></td>
            <td data-col="6" style="text-align: ${courseAlign};">${coursesHtml}</td>
            <td data-col="7" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${totalCredits}</div></td>
            <td data-col="8" style="text-align: center;"><div class="cell-primary bold">${data.duration || '-'}</div></td>
            <td data-col="9" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.hours !== undefined && data.hours !== '' ? data.hours : '-'}</div></td>
            <td data-col="10" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.period_type || '-'}</div></td>
            <td data-col="11" style="text-align: center;"><div class="badge ${proofBadge}">${data.proof_type || '-'}</div></td>
            <td data-col="12" style="text-align: center;"><div class="badge ${insBadge}">${data.insurance || '-'}</div></td>
            <td data-col="13" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.employment || '-'}</div></td>
            <td data-col="14" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.resp_dept ? getDeptShort(data.resp_dept) : '-'}</div></td>
            <td class="col-actions">
                <div class="row-actions">
                    <button onclick="window.editData('${data.id}')" class="btn btn-secondary btn-icon sm" title="編輯"><i class="ti ti-edit"></i></button>
                    <button onclick="window.deleteData('${data.id}', '${stuName}')" class="btn btn-icon sm" style="color:var(--danger); border-color:var(--danger-border);" title="刪除"><i class="ti ti-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });
    tbody.innerHTML = tHtml;
    window.updateFilterVisibility();
}
