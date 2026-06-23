import { state, getDeptShort, getTime, getColShort, formatCourseForTable, formatCourseForExport, Utils, getRecordTerm } from './state.js';
import * as UI from './ui.js';

export function populateAcademicYearDropdown() {
    const globalSelect = document.getElementById('global-academic-year');
    const modalSelect = document.getElementById('input-academic-year');
    
    const recordYears = [...new Set(state.allRecords.map(r => r.academic_year))].filter(Boolean).sort((a,b) => b.localeCompare(a));
    const courseYears = [...new Set(state.allCourses.map(c => c.academic_year))].filter(Boolean).sort((a,b) => b.localeCompare(a));
    
    if (globalSelect) {
        const currGlobal = globalSelect.value;
        let globalHtml = '<option value="">全學年度</option>';
        recordYears.forEach(y => globalHtml += `<option value="${y}">${y} 學年度</option>`);
        globalSelect.innerHTML = globalHtml;
        if (recordYears.includes(currGlobal)) globalSelect.value = currGlobal;
        else if (recordYears.length > 0 && !currGlobal) globalSelect.value = recordYears[0]; 
        state.currentAcademicYear = globalSelect.value;
    }

    if (modalSelect) {
        let modalHtml = '<option value="">請選擇</option>';
        courseYears.forEach(y => modalHtml += `<option value="${y}">${y} 學年度</option>`);
        const currModal = modalSelect.value;
        modalSelect.innerHTML = modalHtml;
        if (courseYears.includes(currModal)) modalSelect.value = currModal;
    }
}

export function renderTable() {
    const tbody = document.getElementById('intern-record-table-body'); 
    if (!tbody) return;

    const searchInput = document.getElementById('search-input');
    const rawSearchTerm = searchInput ? searchInput.value.trim() : ''; 
    const searchTerm = rawSearchTerm.toLowerCase();

    state.filteredRecords = state.allRecords.filter(d => {
        if (state.currentAcademicYear && d.academic_year !== state.currentAcademicYear) return false;

        const stu = state.allStudents.find(s => s.id === d.student_doc_id) || {};
        const inst = state.allInsts.find(i => i.id === d.inst_id) || {};
        const stuIdStr = stu.student_id || '';
        const stuNameStr = stu.name || '';
        const instNameStr = inst.name || '';
        
        let ok = (d.academic_year || '').toLowerCase().includes(searchTerm) || 
                 stuIdStr.toLowerCase().includes(searchTerm) || 
                 stuNameStr.toLowerCase().includes(searchTerm) || 
                 instNameStr.toLowerCase().includes(searchTerm);
                 
        if (ok && state.filterSelections.term.size > 0) ok = state.filterSelections.term.has(getRecordTerm(d));
        if (ok && state.filterSelections.dept.size > 0) ok = stu.department && state.filterSelections.dept.has(stu.department);
        if (ok && state.filterSelections.grade.size > 0) ok = state.filterSelections.grade.has(d.grade);
        if (ok && state.filterSelections.inst_raw.size > 0) ok = state.filterSelections.inst_raw.has(instNameStr);
        if (ok && state.filterSelections.course.size > 0) ok = d.courses && d.courses.some(cid => state.filterSelections.course.has(cid));
        if (ok && state.filterSelections.resp_dept.size > 0) ok = state.filterSelections.resp_dept.has(d.resp_dept);
        if (ok && state.filterSelections.period.size > 0) ok = state.filterSelections.period.has(d.period_type);
        if (ok && state.filterSelections.proof.size > 0) ok = state.filterSelections.proof.has(d.proof_type);
        if (ok && state.filterSelections.insurance.size > 0) ok = state.filterSelections.insurance.has(d.insurance);
        if (ok && state.filterSelections.employment.size > 0) ok = state.filterSelections.employment.has(d.employment);
        if (ok && state.filterSelections.allowance.size > 0) ok = state.filterSelections.allowance.has(d.allowance);
        if (ok && state.filterSelections.payment_type.size > 0) ok = state.filterSelections.payment_type.has(d.payment_type);
        if (ok && state.filterSelections.is_moe_compliant.size > 0) ok = state.filterSelections.is_moe_compliant.has(d.is_moe_compliant);
        return ok;
    });

    state.filteredRecords.sort((a, b) => {
        let valA = '', valB = '';
        const stuA = state.allStudents.find(s => s.id === a.student_doc_id) || {};
        const stuB = state.allStudents.find(s => s.id === b.student_doc_id) || {};
        const instA = state.allInsts.find(i => i.id === a.inst_id) || {};
        const instB = state.allInsts.find(i => i.id === b.inst_id) || {};

        if (state.sortCol === 'created_at') { valA = getTime(a.created_at); valB = getTime(b.created_at); }
        else if (state.sortCol === 'term') { valA = getRecordTerm(a); valB = getRecordTerm(b); }
        else if (state.sortCol === 'student_id') { valA = stuA.student_id || ''; valB = stuB.student_id || ''; }
        else if (state.sortCol === 'student_name') { valA = stuA.name || ''; valB = stuB.name || ''; }
        else if (state.sortCol === 'dept') { valA = stuA.department ? getDeptShort(stuA.department) : ''; valB = stuB.department ? getDeptShort(stuB.department) : ''; }
        else if (state.sortCol === 'inst_name') { valA = instA.name || ''; valB = instB.name || ''; }
        else if (state.sortCol === 'resp_dept') { valA = a.resp_dept ? getDeptShort(a.resp_dept) : ''; valB = b.resp_dept ? getDeptShort(b.resp_dept) : ''; }
        else if (state.sortCol === 'hours') { valA = a.hours || 0; valB = b.hours || 0; }
        else { valA = (a[state.sortCol] || '').toString().toLowerCase(); valB = (b[state.sortCol] || '').toString().toLowerCase(); }
        
        if (state.sortCol === 'created_at' || state.sortCol === 'hours') {
             if (valA < valB) return state.sortDir === 'asc' ? -1 : 1;
             if (valA > valB) return state.sortDir === 'asc' ? 1 : -1;
             return 0;
        }

        const diff = String(valA).localeCompare(String(valB), 'zh-TW-u-co-stroke');
        return state.sortDir === 'asc' ? diff : -diff;
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

    let pHtml = `<button class="page-btn page-step-btn" data-page="${state.currentPage-1}" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=tPages; p++) {
        if (p===1 || p===tPages || Math.abs(p-state.currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn page-num-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    pHtml += `<button class="page-btn page-step-btn" data-page="${state.currentPage+1}" ${state.currentPage>=tPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    
    const pageControls = document.getElementById('pagination-controls');
    if(pageControls) pageControls.innerHTML = pHtml;

    const selectAll = document.getElementById('selectAll');
    if(selectAll) selectAll.checked = items.length > 0 && items.every(i => state.selectedIds.includes(i.id));

    const emptyStateContainer = document.getElementById('empty-state-container');
    if (total === 0) {
        tbody.innerHTML = `<tr><td colspan="100" class="empty-state" style="padding: 60px 40px; text-align: center; border-bottom: none;"><div class="empty-icon"><i class="ti ti-inbox" style="font-size: 36px; opacity: 0.4; margin-bottom: 12px; display: block;"></i></div><div class="empty-text" style="font-size: 13px; font-weight: 600; color: var(--text-muted);">找不到符合條件的實習紀錄</div></td></tr>`;
        if (document.getElementById('empty-state-container')) {
            document.getElementById('empty-state-container').style.display = 'none';
        }
        UI.updateColumnVisibility();
        return;
    } else {
        if (document.getElementById('empty-state-container')) {
            document.getElementById('empty-state-container').style.display = 'none';
        }
    }

    let tHtml = '';
    items.forEach(data => {
        const stu = state.allStudents.find(s => s.id === data.student_doc_id) || {};
        const stuIdStr = stu.student_id || '';
        const stuNameStr = stu.name || '未知學生';
        const stuDeptStr = stu.department ? getDeptShort(stu.department) : '未綁定學系';
        
        const inst = state.allInsts.find(i => i.id === data.inst_id) || {};
        const instNameStr = inst.name || '未知機構';

        const displayStuId = Utils.highlightKeyword(stuIdStr, rawSearchTerm);
        const displayStuName = Utils.highlightKeyword(stuNameStr, rawSearchTerm);
        const displayInstRaw = Utils.highlightKeyword(instNameStr, rawSearchTerm);

        let totalCredits = 0;
        let coursesHtml = '-'; let courseAlign = 'center';
        let termDisplay = '-';

        if (data.courses && data.courses.length > 0) {
            const courseObjs = data.courses.map(cid => {
                const c = state.allCourses.find(x => x.id === cid);
                if (c && c.credits) totalCredits += Number(c.credits);
                return c;
            }).filter(Boolean);

            if (courseObjs.length > 0) {
                const terms = [...new Set(courseObjs.map(c => c.term))].filter(Boolean).sort();
                termDisplay = terms.join('、') || '-';

                const badgeStyle = 'max-width: 100%; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;';
                const firstCourseTag = `<span class="badge badge-outline-blue" style="${badgeStyle}" title="${formatCourseForExport(courseObjs[0])}">${formatCourseForTable(courseObjs[0])}</span>`;
                if (courseObjs.length > 1) {
                    coursesHtml = `
                        <div style="display:flex; flex-direction:column; width:100%;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; width:100%;">
                                <div style="flex: 1; min-width: 0; text-align: left; display: flex;">${firstCourseTag}</div>
                                <button type="button" class="more-badge btn-course-expand" data-id="${data.id}">+${courseObjs.length - 1} <i class="ti ti-chevron-down" id="icon-course-${data.id}" style="margin-left:4px; font-size:12px; transition:0.2s;"></i></button>
                            </div>
                            <div id="expand-course-${data.id}" style="display:none; margin-top:4px; text-align: left;">
                                ${courseObjs.slice(1).map(c => `<div style="margin-top:4px;"><span class="badge badge-outline-blue" style="${badgeStyle}" title="${formatCourseForExport(c)}">${formatCourseForTable(c)}</span></div>`).join('')}
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

        let allowanceBadge = 'badge-outline-gray';
        if (data.allowance === '工資') allowanceBadge = 'badge-outline-green';
        else if (data.allowance === '獎學金' || data.allowance === '津貼') allowanceBadge = 'badge-outline-blue';
        
        let moeBadge = 'badge-outline-gray';
        if (data.is_moe_compliant === '符合') moeBadge = 'badge-outline-green';
        else if (data.is_moe_compliant === '不符合') moeBadge = 'badge-outline-red';

        const actionHtml = state.isReadOnly ? '-' : `
            <div class="row-actions">
                <button class="btn btn-secondary btn-icon sm btn-row-edit" data-id="${data.id}" title="編輯"><i class="ti ti-edit"></i></button>
                <button class="btn btn-danger btn-icon sm btn-row-delete" data-id="${data.id}" data-name="${stuNameStr}" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        `;

        tHtml += `
        <tr class="${state.selectedIds.includes(data.id)?'selected':''}">
            <td class="col-checkbox">
                <input type="checkbox" class="row-select-chk" value="${data.id}" ${state.selectedIds.includes(data.id)?'checked':''} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
            </td>
            <td data-col="1" class="col-term" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${termDisplay}</div></td>
            <td data-col="2" class="col-student_id" style="text-align: center;"><div class="cell-primary bold">${displayStuId}</div></td>
            <td data-col="3" class="col-student_name" style="text-align: center;"><div class="cell-primary bold">${displayStuName}</div></td>
            <td data-col="4" class="col-dept" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${stuDeptStr}</div></td>
            <td data-col="5" class="col-grade" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.grade || '-'}</div></td>
            <td data-col="6" class="col-inst_name" style="text-align: left;"><div class="cell-primary bold">${displayInstRaw}</div></td>
            <td data-col="7" class="col-course" style="text-align: ${courseAlign};">${coursesHtml}</td>
            <td data-col="8" class="col-credits" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${totalCredits}</div></td>
            <td data-col="9" class="col-period" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.period_type || '-'}</div></td>
            <td data-col="10" class="col-duration" style="text-align: center;"><div class="cell-primary bold">${data.duration || '-'}</div></td>
            <td data-col="11" class="col-hours" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.hours !== undefined && data.hours !== '' ? data.hours : '-'}</div></td>
            <td data-col="12" class="col-proof" style="text-align: center;"><div class="badge ${proofBadge}">${data.proof_type || '-'}</div></td>
            <td data-col="13" class="col-employment" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.employment || '-'}</div></td>
            <td data-col="14" class="col-insurance" style="text-align: center;"><div class="badge ${insBadge}">${data.insurance || '-'}</div></td>
            <td data-col="15" class="col-allowance" style="text-align: center;"><div class="badge ${allowanceBadge}">${data.allowance || '-'}</div></td>
            <td data-col="16" class="col-payment_type" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.payment_type || '-'}</div></td>
            <td data-col="17" class="col-payment_desc" style="text-align: left;"><div class="cell-primary" style="font-weight: normal;">${data.payment_desc || '-'}</div></td>
            <td data-col="18" class="col-payment_amount" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.payment_amount !== undefined && data.payment_amount !== '' ? '$' + data.payment_amount : '-'}</div></td>
            <td data-col="19" class="col-funding" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.funding || '-'}</div></td>
            <td data-col="20" class="col-opp_source" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.opp_source || '-'}</div></td>
            <td data-col="21" class="col-job_type" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.job_type || '-'}</div></td>
            <td data-col="22" class="col-is_moe_compliant" style="text-align: center;"><div class="badge ${moeBadge}">${data.is_moe_compliant || '-'}</div></td>
            <td data-col="23" class="col-moe_reason" style="text-align: left;"><div class="cell-primary" style="font-weight: normal;">${data.moe_reason || '-'}</div></td>
            <td data-col="24" class="col-resp_dept" style="text-align: center;"><div class="cell-primary" style="font-weight: normal;">${data.resp_dept ? getDeptShort(data.resp_dept) : '-'}</div></td>
            <td class="col-spacer"></td>
            <td class="col-actions">${actionHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = tHtml;
    
    // 🌟 確保所有欄位生成後，強制鎖死寬度
    UI.updateColumnVisibility();
}

export function renderFilterDropdowns() {
    populateAcademicYearDropdown();
    UI.updateColumnVisibility(); // 確保 UI 初始化

    const container = document.getElementById('filter-container');
    if (!container) return;
    
    const uniqueTerms = [...new Set(state.allRecords.map(r=>getRecordTerm(r)))].filter(t => t !== '-').sort();
    const uniqueSortedDepts = [...new Set(state.globalDepts.map(d=>d.name))];
    const uniqueUsedCourses = [...new Set(state.allRecords.flatMap(r => r.courses || []))];
    const courseOptions = uniqueUsedCourses.map(cid => {
        const c = state.allCourses.find(x => x.id === cid);
        return { value: cid, label: c ? formatCourseForExport(c) : cid };
    }).filter(opt => opt.label !== opt.value);
    courseOptions.sort((a,b) => a.label.localeCompare(b.label));

    const instNames = state.allRecords.map(r => {
        const inst = state.allInsts.find(i => i.id === r.inst_id);
        return inst ? inst.name : '';
    }).filter(Boolean);

    const filterOptions = {
        term: uniqueTerms.map(v=>({value:v, label: `${v} 學期`})),
        dept: uniqueSortedDepts.map(v=>({value:v, label: getDeptShort(v)})),
        grade: ['1', '2', '3', '4', '5'].map(v=>({value:v, label: `${v} 年級${v==='5'?'以上':''}`})),
        inst_raw: [...new Set(instNames)].sort().map(v=>({value:v, label:v})),
        course: courseOptions,
        resp_dept: uniqueSortedDepts.map(v=>({value:v, label: getDeptShort(v)})),
        period: ['寒假實習', '暑假實習', '學期期間實習', '單一學期實習', '全學年'].map(v=>({value:v, label:v})),
        proof: ['合約', '公函', '其他證明文件'].map(v=>({value:v, label:v})),
        insurance: ['僅校外實習保險', '僅勞保', '兩者皆有', '兩者皆無'].map(v=>({value:v, label:v})),
        employment: ['是', '否'].map(v=>({value:v, label:v})),
        allowance: ['無', '工資', '獎學金', '津貼'].map(v=>({value:v, label:v})),
        payment_type: ['月薪', '時薪', '月給', '一次性', '其他'].map(v=>({value:v, label:v})),
        is_moe_compliant: ['符合', '不符合'].map(v=>({value:v, label:v}))
    };

    let html = '';
    state.filterDefinitions.forEach(def => {
        const opts = filterOptions[def.key] || [];
        let optionsHtml = '';
        opts.forEach(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            const isChecked = state.filterSelections[def.key].has(val) ? 'checked' : '';
            optionsHtml += `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-${def.key}" value="${val}" ${isChecked}> 
                <span>${lbl}</span>
            </label>`;
        });

        let searchAndToggleHtml = `
            <div class="filter-dropdown-search">
                ${def.searchable ? `<input type="text" id="search-${def.key}-input" placeholder="搜尋${def.label}...">` : ''}
                <div style="margin-top:8px; padding:0 4px; display: flex; justify-content: flex-end;">
                    <button type="button" class="btn-light-blue btn-filter-toggle" data-type="${def.key}" data-state="none">全選</button>
                </div>
            </div>`;

        const isActive = state.filterSelections[def.key].size > 0 ? 'active' : '';
        const btnContent = state.filterSelections[def.key].size > 0 ? `${def.label} <span class="pill-count">${state.filterSelections[def.key].size}</span>` : def.label;

        html += `
        <div class="filter-pill-wrap" id="pill-wrap-${def.key}">
            <button class="filter-pill ${isActive}" id="pill-${def.key}">
                ${btnContent} <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-${def.key}">
                ${searchAndToggleHtml}
                <div class="filter-dropdown-list custom-scroll" id="${def.key}-options-container">${optionsHtml}</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;

    const colContainer = document.getElementById('column-toggles-container');
    if (colContainer) {
        colContainer.innerHTML = state.tableColumns
            .filter(c => !c.disableToggle)
            .map(c => `
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;">
                    <input type="checkbox" class="col-toggle-chk" data-index="${c.index}" ${c.visible !== false ? 'checked' : ''}>
                    <span>${c.label}</span>
                </label>
            `).join('');
    }

    container.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetBtn = e.target.closest('.filter-pill');
            if (!targetBtn) return;
            
            const type = targetBtn.id.replace('pill-', '');
            const drop = document.getElementById(`drop-${type}`);
            const wrap = document.getElementById(`pill-wrap-${type}`);
            if (!drop || !wrap) return;
            
            const isOpen = drop.classList.contains('show');
            
            document.querySelectorAll('.filter-dropdown').forEach(d => {
                d.classList.remove('show');
                d.style.position = ''; d.style.top = ''; d.style.left = ''; d.style.width = '';
            });
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            
            if (!isOpen) { 
                drop.classList.add('show'); wrap.classList.add('open'); 
                const rect = targetBtn.getBoundingClientRect();
                drop.style.position = 'fixed'; drop.style.top = `${rect.bottom + 4}px`;
                let leftPos = rect.left;
                if (leftPos + 220 > window.innerWidth) leftPos = window.innerWidth - 230;
                drop.style.left = `${leftPos}px`; drop.style.width = '220px'; drop.style.zIndex = '99999';
            }
        });
    });

    const filterScrollArea = document.getElementById('filter-container');
    if (filterScrollArea && !filterScrollArea.dataset.scrollBound) {
        filterScrollArea.addEventListener('scroll', () => {
            document.querySelectorAll('.filter-dropdown.show').forEach(d => { d.classList.remove('show'); d.style.position = ''; });
            document.querySelectorAll('.filter-pill-wrap.open').forEach(w => w.classList.remove('open'));
        });
        filterScrollArea.dataset.scrollBound = 'true';
    }
    
    state.filterDefinitions.forEach(def => {
        if(def.searchable) {
            container.querySelector(`#search-${def.key}-input`)?.addEventListener('keyup', (e) => {
                if(UI.filterDropdownItems) UI.filterDropdownItems(e.target, `${def.key}-options-container`);
            });
        }
    });

    const wrapper = document.getElementById('intern-record-page-wrapper');
    if (wrapper && !wrapper.dataset.filterBound) {
        wrapper.addEventListener('change', (e) => {
            if (e.target.classList.contains('col-toggle-chk')) {
                const index = Number(e.target.dataset.index);
                const col = state.tableColumns.find(c => c.index === index);
                if (col && !col.disableToggle) {
                    col.visible = e.target.checked;
                    UI.updateColumnVisibility(); // 更新顯示寬度
                }
            } else if (Array.from(e.target.classList).some(c => c.startsWith('filter-chk-'))) {
                const classMatch = Array.from(e.target.classList).find(c => c.startsWith('filter-chk-'));
                const type = classMatch.replace('filter-chk-', '');
                const val = e.target.value;
                const set = state.filterSelections[type];
                if (set.has(val)) set.delete(val); else set.add(val);
                document.querySelectorAll(`.${classMatch}`).forEach(c => c.checked = set.has(c.value));
                state.currentPage = 1; 
                if(UI.updatePillActive) UI.updatePillActive(type); 
                renderTable();
            }
        });

        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-filter-toggle')) {
                e.stopPropagation();
                const btn = e.target;
                const type = btn.dataset.type;
                const isSelectAll = btn.dataset.state !== 'all';
                btn.dataset.state = isSelectAll ? 'all' : 'none';
                btn.innerText = isSelectAll ? '取消選取' : '全選';
                
                const set = state.filterSelections[type];
                document.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                    if(c.closest('.filter-option').style.display !== 'none') { 
                        c.checked = isSelectAll; 
                        if(isSelectAll) set.add(c.value); else set.delete(c.value); 
                    }
                });
                state.currentPage = 1; 
                if(UI.updatePillActive) UI.updatePillActive(type); 
                renderTable();
            }
        });
        wrapper.dataset.filterBound = "true";
    }
    
    UI.updateFilterScrollButtons();
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
        <div class="search-item student-item" data-stuid="${s.student_id}" data-name="${s.name}" data-docid="${s.id}">
            <div class="search-item-title">${s.student_id} - ${s.name}</div>
            <div class="search-item-desc">${getColShort(s.college)} / ${getDeptShort(s.department)}</div>
        </div>`;
    });
    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.student-item').forEach(item => {
        item.addEventListener('click', () => {
            const input = document.getElementById('input-student');
            input.value = `${item.dataset.stuid} - ${item.dataset.name}`;
            input.dataset.docid = item.dataset.docid;
            dropdown.classList.remove('show');
            document.getElementById('btn-info-student').disabled = false;
            if(UI.updateRespDeptOptions) UI.updateRespDeptOptions();
        });
    });
}

export function renderInstDropdown(list, term) {
    const dropdown = document.getElementById('institution-dropdown');
    if (!dropdown) return;
    const val = term.trim().toLowerCase();
    const filtered = list.filter(i => i.name.toLowerCase().includes(val) || (i.tax_id && i.tax_id.toLowerCase().includes(val)));
    if (filtered.length === 0) { dropdown.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:var(--text-muted);">查無相符機構</div>'; return; }
    
    let html = '';
    filtered.slice(0, 30).forEach(i => {
        html += `
        <div class="search-item inst-item" data-name="${i.name}" data-docid="${i.id}">
            <div class="search-item-title">${i.name}</div>
            <div class="search-item-desc">${i.tax_id || '統編：無統一編號'} | ${i.address || ''}</div>
        </div>`;
    });
    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.inst-item').forEach(item => {
        item.addEventListener('click', () => {
            const instIn = document.getElementById('input-institution');
            instIn.value = item.dataset.name;
            instIn.dataset.docid = item.dataset.docid;
            dropdown.classList.remove('show');
            document.getElementById('btn-info-inst').disabled = false;
        });
    });
}

export function renderCourseDropdown(list, term) {
    const dropdown = document.getElementById('course-dropdown');
    if (!dropdown) return;
    
    const selectedYear = document.getElementById('input-academic-year').value;
    if (!selectedYear) {
        dropdown.innerHTML = '<div style="padding:12px; text-align:center; font-size:12px; color:var(--danger); font-weight:bold;"><i class="ti ti-alert-triangle"></i> 請先於上方選擇「學年度」</div>';
        return;
    }

    const val = term.trim().toLowerCase();
    const available = list.filter(c => !state.selectedCourseIds.includes(c.id) && c.academic_year === selectedYear);
    
    const filtered = available.filter(c => {
        const deptShort = getDeptShort(c.department).toLowerCase();
        return c.course_name.toLowerCase().includes(val) || 
               c.course_code.toLowerCase().includes(val) || 
               c.department.toLowerCase().includes(val) ||
               deptShort.includes(val); 
    });
    
    if (filtered.length === 0) { dropdown.innerHTML = `<div style="padding:12px; text-align:center; font-size:11px; color:var(--text-muted);">查無符合 ${selectedYear} 學年度 的課程</div>`; return; }

    let html = '';
    filtered.slice(0, 30).forEach(c => {
        html += `
        <div class="search-item course-item" data-id="${c.id}">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${c.academic_year}-${c.term}</span>
                <span style="font-size:10px; font-weight:700; background:var(--brand-light); color:var(--brand); padding:2px 4px; border-radius:4px;">${c.course_code}</span>
                <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${c.course_name}</span>
            </div>
            <div class="search-item-desc">開課院系：${getColShort(c.college)} / ${getDeptShort(c.department)} | ${c.credits}學分</div>
        </div>`;
    });
    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.course-item').forEach(item => {
        item.addEventListener('click', () => {
            if (!state.selectedCourseIds.includes(item.dataset.id)) {
                state.selectedCourseIds.push(item.dataset.id);
            }
            document.getElementById('input-course-search').value = '';
            dropdown.classList.remove('show');
            renderSelectedCourseChips();
        });
    });
}

export function renderSelectedCourseChips(skipRespUpdate = false) {
    const container = document.getElementById('selected-courses-container');
    if (!container) return;
    
    // ⭐ 新增：強制設定最大高度與垂直捲軸，超過 3 門課自動出現拖曳桿
    container.style.maxHeight = '210px';
    container.style.overflowY = 'auto';
    container.style.gap = '8px'; // 讓課程之間有一點間距
    
    const countSpan = document.getElementById('selected-course-count');
    if (countSpan) countSpan.innerText = `已選 ${state.selectedCourseIds.length} 門`;

    if (state.selectedCourseIds.length === 0) { 
        container.innerHTML = `
            <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: 600; font-size: 13px;">
                <i class="ti ti-inbox" style="margin-right: 6px; font-size: 16px;"></i>尚未加入課程
            </div>`; 
        if (!skipRespUpdate && UI.updateRespDeptOptions) UI.updateRespDeptOptions(); 
        return; 
    }
    
    let html = '';
    state.selectedCourseIds.forEach(id => {
        const c = state.allCourses.find(x => x.id === id); if (!c) return;
        html += `
        <div class="selected-course-item">
            <div class="selected-course-info">
                <div class="selected-course-top">
                    <span class="selected-course-title">${c.academic_year}-${c.term}</span>
                    <span class="selected-course-code">${c.course_code}</span>
                    <span class="selected-course-title">${c.course_name}</span>
                </div>
                <div class="selected-course-desc">開課院系：${getColShort(c.college)} / ${getDeptShort(c.department)} | ${c.credits}學分</div>
            </div>
            <button type="button" class="btn-remove-course" data-id="${c.id}"><i class="ti ti-x"></i></button>
        </div>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('.btn-remove-course').forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedCourseIds = state.selectedCourseIds.filter(cid => cid !== btn.dataset.id);
            renderSelectedCourseChips();
        });
    });

    if (!skipRespUpdate && UI.updateRespDeptOptions) UI.updateRespDeptOptions();
}
