/**
 * 實習紀錄模組 - 事件偵聽器與動作綁定 (Events.js)
 */

import { state, getDeptShort, getColShort } from './state.js';
import * as db from './data.js';
import * as ui from './ui.js';
import * as render from './render.js';

const formatCourseInfo = (c) => c ? `${c.academic_year}-${c.term}_${c.course_code}：${c.course_name}` : '';

export function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('input', () => {
        state.currentPage = 1;
        render.renderTable();
    });

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (state.sortCol === col) {
                state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortCol = col;
                state.sortDir = 'asc';
            }
            
            document.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                const icon = t.querySelector('.sort-icon');
                if (icon) icon.className = 'ti ti-arrows-sort sort-icon';
            });
            
            th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            const thIcon = th.querySelector('.sort-icon');
            if (thIcon) thIcon.className = `ti ti-sort-${state.sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            render.renderTable();
        });
    });

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.btn-filter-toggle');
        if (toggleBtn) {
            e.stopPropagation();
            const type = toggleBtn.dataset.type;
            const drop = document.getElementById(`drop-${type}`);
            const wrap = document.getElementById(`pill-wrap-${type}`);
            if (!drop || !wrap) return;

            const isOpen = drop.classList.contains('show');
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            
            if (!isOpen) { 
                drop.classList.add('show'); 
                wrap.classList.add('open'); 
            }
            return;
        }

        if (!e.target.closest('.filter-pill-wrap')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
        }

        if (!e.target.closest('#input-student') && !e.target.closest('#student-dropdown')) {
            document.getElementById('student-dropdown')?.classList.remove('show');
        }
        if (!e.target.closest('#input-institution') && !e.target.closest('#institution-dropdown')) {
            document.getElementById('institution-dropdown')?.classList.remove('show');
        }
        if (!e.target.closest('#input-course-search') && !e.target.closest('#course-dropdown')) {
            document.getElementById('course-dropdown')?.classList.remove('show');
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('col-visibility-chk')) {
            const index = Number(e.target.dataset.index);
            const col = state.tableColumns.find(c => c.index === index);
            if (col) col.visible = e.target.checked;
            render.updateColumnVisibility();
            return;
        }

        if (e.target.className.startsWith('filter-chk-')) {
            const type = e.target.dataset.type;
            const val = e.target.value;
            const set = state.filterSelections[type];
            if (set && set.has(val)) set.delete(val); else if (set) set.add(val);
            
            state.currentPage = 1;
            updatePillActive(type);
            render.renderTable();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.target.classList.contains('local-filter-search')) {
            const targetId = e.target.dataset.target;
            const term = e.target.value.toLowerCase().trim();
            const container = document.getElementById(targetId);
            if (container) {
                container.querySelectorAll('.filter-option').forEach(lbl => {
                    const span = lbl.querySelector('span');
                    if (span) {
                        const text = span.textContent.toLowerCase();
                        lbl.style.display = text.includes(term) ? 'flex' : 'none';
                    }
                });
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-clear-filter-pills')) {
            const type = e.target.dataset.type;
            if (state.filterSelections[type]) state.filterSelections[type].clear();
            document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = false);
            
            const searchInputLocal = document.getElementById(`search-${type}-input`);
            if (searchInputLocal) searchInputLocal.value = '';
            
            state.currentPage = 1;
            updatePillActive(type);
            render.renderTable();
        }
    });

    document.addEventListener('click', (e) => {
        const pageNumBtn = e.target.closest('.page-num-btn');
        if (pageNumBtn) {
            state.currentPage = Number(pageNumBtn.dataset.page);
            render.renderTable();
            return;
        }
        if (e.target.closest('#btn-page-prev')) {
            if (state.currentPage > 1) { state.currentPage--; render.renderTable(); }
            return;
        }
        if (e.target.closest('#btn-page-next')) {
            state.currentPage++; render.renderTable();
        }
    });

    document.getElementById('per-page-select')?.addEventListener('change', (e) => {
        state.itemsPerPage = Number(e.target.value);
        state.currentPage = 1;
        render.renderTable();
    });

    document.getElementById('selectAll')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const paginatedIds = state.filteredRecords.slice(startIndex, startIndex + state.itemsPerPage).map(d => d.id);
        
        if (isChecked) {
            paginatedIds.forEach(id => { 
                if (!state.selectedIds.includes(id)) state.selectedIds.push(id); 
            });
        } else {
            state.selectedIds = state.selectedIds.filter(id => !paginatedIds.includes(id));
        }
        updateBatchActionBar();
        render.renderTable();
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('record-row-chk')) {
            const id = e.target.value;
            const idx = state.selectedIds.indexOf(id);
            if (idx === -1) state.selectedIds.push(id); else state.selectedIds.splice(idx, 1);
            updateBatchActionBar();
            render.renderTable();
        }
    });

    document.getElementById('btn-select-all-filtered')?.addEventListener('click', () => {
        state.selectedIds = state.filteredRecords.map(d => d.id);
        updateBatchActionBar();
        render.renderTable();
    });

    document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
        state.selectedIds = [];
        updateBatchActionBar();
        render.renderTable();
    });

    document.getElementById('btn-batch-delete')?.addEventListener('click', () => {
        if (state.selectedIds.length === 0) return;
        ui.showConfirm(`確定刪除選擇的 ${state.selectedIds.length} 筆實習紀錄？此動作將永久移除資料庫中的紀錄。`, async () => {
            try {
                await db.batchDeleteRecords(state.selectedIds);
                state.selectedIds = [];
                updateBatchActionBar();
                ui.showToast("已成功批次刪除紀錄！", "success");
            } catch (e) {
                ui.showToast("批次刪除失敗：" + e.message, "error");
            }
        });
    });

    const stuInput = document.getElementById('input-student');
    const stuDropdown = document.getElementById('student-dropdown');
    stuInput?.addEventListener('focus', () => {
        if(stuDropdown) stuDropdown.classList.add('show');
        renderStudentDropdown(stuInput.value);
    });
    stuInput?.addEventListener('input', () => {
        if(stuDropdown) stuDropdown.classList.add('show');
        renderStudentDropdown(stuInput.value);
        checkBtnActive(stuInput, 'btn-info-student', state.allStudents, 'student_id');
        render.updateRespDeptOptions();
    });

    const instInput = document.getElementById('input-institution');
    const instDropdown = document.getElementById('institution-dropdown');
    instInput?.addEventListener('focus', () => {
        if(instDropdown) instDropdown.classList.add('show');
        renderInstDropdown(instInput.value);
    });
    instInput?.addEventListener('input', (e) => {
        e.target.dataset.id = '';
        const btn = document.getElementById('btn-info-inst');
        if (btn) btn.disabled = true;
        if(instDropdown) instDropdown.classList.add('show');
        renderInstDropdown(instInput.value);
    });

    const courseInput = document.getElementById('input-course-search');
    const courseDropdown = document.getElementById('course-dropdown');
    courseInput?.addEventListener('focus', () => {
        if(courseDropdown) courseDropdown.classList.add('show');
        renderCourseDropdown(courseInput.value);
    });
    courseInput?.addEventListener('input', () => {
        if(courseDropdown) courseDropdown.classList.add('show');
        renderCourseDropdown(courseInput.value);
    });

    document.addEventListener('click', (e) => {
        const stuItem = e.target.closest('.student-select-item');
        if (stuItem && stuInput) {
            stuInput.value = `${stuItem.dataset.id} - ${stuItem.dataset.name}`;
            stuDropdown?.classList.remove('show');
            const btn = document.getElementById('btn-info-student');
            if (btn) btn.disabled = false;
            render.updateRespDeptOptions();
            return;
        }

        const instItem = e.target.closest('.inst-select-item');
        if (instItem && instInput) {
            instInput.value = instItem.dataset.name;
            instInput.dataset.id = instItem.dataset.id;
            instDropdown?.classList.remove('show');
            const btn = document.getElementById('btn-info-inst');
            if (btn) btn.disabled = false;
            return;
        }

        const courseItem = e.target.closest('.course-select-item');
        if (courseItem && courseInput) {
            const cid = courseItem.dataset.id;
            if (!state.selectedCourseIds.includes(cid)) state.selectedCourseIds.push(cid);
            courseInput.value = '';
            courseDropdown?.classList.remove('show');
            render.renderSelectedCourseChips();
            return;
        }

        const removeCourseBtn = e.target.closest('.btn-remove-course');
        if (removeCourseBtn) {
            const cid = removeCourseBtn.dataset.id;
            state.selectedCourseIds = state.selectedCourseIds.filter(id => id !== cid);
            render.renderSelectedCourseChips();
            return;
        }

        const courseExpandBtn = e.target.closest('.btn-course-expand');
        if (courseExpandBtn) {
            const id = courseExpandBtn.dataset.id;
            const el = document.getElementById(`expand-course-${id}`);
            const icon = document.getElementById(`icon-course-${id}`);
            if (el && icon) {
                if (el.style.display === 'none') {
                    el.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    el.style.display = 'none';
                    icon.style.transform = 'rotate(0deg)';
                }
            }
            return;
        }

        const rowEditBtn = e.target.closest('.btn-row-edit');
        if (rowEditBtn) {
            triggerEdit(rowEditBtn.dataset.id);
            return;
        }

        const rowDeleteBtn = e.target.closest('.btn-row-delete');
        if (rowDeleteBtn) {
            const id = rowDeleteBtn.dataset.id;
            const name = rowDeleteBtn.dataset.name;
            ui.showConfirm(`確定要刪除「${name}」的這筆實習紀錄嗎？\n此操作無法復原。`, async () => {
                try {
                    await db.deleteRecord(id);
                    ui.showToast("已成功刪除紀錄！", "success");
                } catch (err) {
                    ui.showToast("刪除失敗：" + err.message, "error");
                }
            });
        }
    });

    document.getElementById('btn-info-student')?.addEventListener('click', () => {
        if (!stuInput) return;
        const stuId = stuInput.value.split(' - ')[0];
        const stu = state.allStudents.find(s => s.student_id === stuId);
        if (!stu) return;
        const html = `
            <div class="info-item"><span class="info-item-label">學號</span><div class="info-item-value">${stu.student_id}</div></div>
            <div class="info-item"><span class="info-item-label">姓名</span><div class="info-item-value">${stu.name}</div></div>
            <div class="info-item"><span class="info-item-label">所屬系所</span><div class="info-item-value">${stu.department}</div></div>
            <div class="info-item"><span class="info-item-label">所屬學院</span><div class="info-item-value">${stu.college}</div></div>
        `;
        ui.openInfoPopup(html, '<i class="ti ti-user" style="color:var(--brand); margin-right:4px;"></i> 學生詳細資訊');
    });

    document.getElementById('btn-info-inst')?.addEventListener('click', () => {
        if (!instInput) return;
        const instId = instInput.dataset.id;
        let inst = instId ? state.allInsts.find(i => i.id === instId) : state.allInsts.find(i => i.name === instInput.value);
        if (!inst) return;
        const html = `
            <div class="info-item"><span class="info-item-label">機構名稱</span><div class="info-item-value">${inst.name}</div></div>
            <div class="info-item"><span class="info-item-label">統一編號</span><div class="info-item-value">${inst.tax_id || '無'}</div></div>
            <div class="info-item"><span class="info-item-label">通訊地址</span><div class="info-item-value">${inst.address || '無'}</div></div>
        `;
        ui.openInfoPopup(html, '<i class="ti ti-building-skyscraper" style="color:var(--success); margin-right:4px;"></i> 機構詳細資訊');
    });

    document.getElementById('btn-info-close')?.addEventListener('click', ui.closeInfoPopup);
    document.getElementById('btn-info-footer-close')?.addEventListener('click', ui.closeInfoPopup);
    document.getElementById('btn-modal-close')?.addEventListener('click', ui.closeFormModal);
    document.getElementById('btn-report-close')?.addEventListener('click', ui.closeImportReportModal);
    document.getElementById('btn-report-footer-close')?.addEventListener('click', ui.closeImportReportModal);

    document.getElementById('btn-add-record')?.addEventListener('click', () => {
        state.editingId = null;
        state.selectedCourseIds = [];
        if(stuInput) stuInput.value = '';
        if(instInput) { instInput.value = ''; instInput.dataset.id = ''; }
        
        ['input-grade', 'input-duration', 'input-hours', 'input-period-type', 'input-proof-type', 'input-insurance', 'input-employment', 'input-notes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const btnInfoStu = document.getElementById('btn-info-student');
        if (btnInfoStu) btnInfoStu.disabled = true;
        const btnInfoInst = document.getElementById('btn-info-inst');
        if (btnInfoInst) btnInfoInst.disabled = true;
        
        render.renderSelectedCourseChips();
        const respDept = document.getElementById('input-resp-dept');
        if(respDept) respDept.innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        ui.openFormModal(false);
    });

    document.getElementById('btn-submit')?.addEventListener('click', async () => {
        const durationInput = document.getElementById('input-duration')?.value.trim() || '';
        const respDeptInput = document.getElementById('input-resp-dept')?.value || '';
        const hoursVal = document.getElementById('input-hours')?.value.trim() || '';
        const btn = document.getElementById('btn-submit');

        const regex = /^\d{2,3}\/\d{2}\/\d{2}-\d{2,3}\/\d{2}\/\d{2}$/;
        if (!regex.test(durationInput)) { 
            ui.showToast("時間格式錯誤！格式應為：YYY/MM/DD-YYY/MM/DD (例如：114/07/01-114/08/31)", "error"); 
            return; 
        }
        if (state.selectedCourseIds.length === 0) { 
            ui.showToast("請至少選擇一門關聯實習課程！", "error"); 
            return; 
        }
        if (!respDeptInput) { 
            ui.showToast("請選擇負責填報系所！", "error"); 
            return; 
        }

        const payload = { 
            student_raw: stuInput?.value.trim() || '', 
            grade: document.getElementById('input-grade')?.value || '',
            inst_raw: instInput?.value.trim() || '', 
            inst_id: instInput?.dataset?.id || '', 
            period_type: document.getElementById('input-period-type')?.value || '',
            duration: durationInput, 
            insurance: document.getElementById('input-insurance')?.value || '', 
            employment: document.getElementById('input-employment')?.value || '', 
            proof_type: document.getElementById('input-proof-type')?.value || '', 
            hours: hoursVal === '' ? '' : Number(hoursVal), 
            resp_dept: respDeptInput, 
            notes: document.getElementById('input-notes')?.value.trim() || '', 
            courses: state.selectedCourseIds
        };

        if(!payload.student_raw || !payload.inst_raw || !payload.duration || !payload.grade || !payload.period_type || !payload.proof_type || !payload.insurance || !payload.employment || !payload.resp_dept) { 
            ui.showToast("請完成所有包含 * 號之必填欄位與選項設定！", "warning"); 
            return; 
        }

        if (btn) {
            btn.disabled = true; 
            btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...';
        }

        try {
            if (state.editingId) {
                await db.updateRecord(state.editingId, payload);
                ui.showToast("已成功更新實習紀錄！", "success");
            } else {
                await db.addRecord(payload);
                ui.showToast("已成功新增實習紀錄！", "success");
            }
            ui.closeFormModal();
        } catch (err) { 
            ui.showToast("儲存失敗：" + err.message, "error"); 
        } finally { 
            if (btn) {
                btn.disabled = false; 
                btn.innerHTML = '<i class="ti ti-check"></i> 儲存紀錄'; 
            }
        }
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
        if (state.filteredRecords.length === 0) { 
            ui.showToast("當前無符合條件之資料可供匯出！", "warning"); 
            return; 
        }
        let csv = '\uFEFF學號,姓名,學系,年級,機構名稱,修習課程(學年-學期_代號：課程名稱),總學分,實習起訖時間,總時數,實習時間,證明文件,投保情形,勞雇關係,填報系所,備註\n';
        state.filteredRecords.forEach(d => {
            let totalCredits = 0;
            let courseNames = (Array.isArray(d.courses) ? d.courses : []).map(cid => { 
                const c = state.allCourses.find(x => x.id === cid); 
                if (c && c.credits) totalCredits += Number(c.credits);
                return c ? formatCourseInfo(c) : ''; 
            }).filter(Boolean).join('、');
            
            const stuParts = (d.student_raw || '').split(' - ');
            const stuId = stuParts[0] || '';
            const stuName = stuParts[1] || '';
            const stu = state.allStudents.find(s => s.student_id === stuId);
            const stuDept = stu ? stu.department : '';

            csv += [
                stuId, stuName, stuDept, d.grade || '', d.inst_raw || '', courseNames, totalCredits, 
                d.duration || '', d.hours !== undefined && d.hours !== '' ? d.hours : '', 
                d.period_type || '', d.proof_type || '', d.insurance || '', d.employment || '', d.resp_dept || '', d.notes || ''
            ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); 
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習紀錄總表_${new Date().toISOString().split('T')[0]}.csv`; 
        link.click();
    });

    const importTrigger = document.getElementById('btn-import-trigger');
    const importFileInput = document.getElementById('import-file');
    importTrigger?.addEventListener('click', () => importFileInput?.click());

    importFileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (importTrigger) {
            importTrigger.dataset.originalHtml = importTrigger.innerHTML;
            importTrigger.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> <span class="btn-text">匯入中...</span>';
            importTrigger.disabled = true;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const rows = event.target.result.split('\n').map(row => row.trim()).filter(row => row);
                const recordsMap = new Map();
                state.globalImportReportData = []; 
                
                let successCount = 0; let warningCount = 0; let errorCount = 0;
                
                for (let i = 1; i < rows.length; i++) {
                    let cols = []; let inQuotes = false; let currentVal = '';
                    for (let char of rows[i]) {
                        if (char === '"') { inQuotes = !inQuotes; }
                        else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                        else { currentVal += char; }
                    }
                    cols.push(currentVal.trim());

                    if (cols.length >= 14) {
                        const stuId = (cols[0] || '').trim().toUpperCase();
                        const stuName = (cols[1] || '').trim();
                        const grade = cols[3];
                        const inst_raw = cols[4];
                        const coursesRaw = cols[5];
                        const duration = cols[7];        
                        const hours = cols[8] ? Number(cols[8]) : ''; 
                        const period_type = cols[9];     
                        const proof_type = cols[10];      
                        const insurance = cols[11];      
                        const employment = cols[12];     
                        const resp_dept = cols[13] || ''; 
                        const notes = cols[14] || '';   

                        if (!stuId || !inst_raw || !duration || !period_type || !proof_type || !insurance || !employment || !grade) {
                            errorCount++;
                            state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: stuName || '未知', message: '缺少必填欄位 (學號、機構、時間、保險、年級等)' });
                            continue;
                        }

                        const key = `${stuId}|${inst_raw}|${duration}|${grade}|${period_type}|${proof_type}|${insurance}|${employment}`;

                        if (!recordsMap.has(key)) {
                            recordsMap.set(key, {
                                student_raw: `${stuId} - ${stuName}`, stuId: stuId, stuName: stuName, grade, inst_raw, duration, hours: hours !== '' ? hours : 0, 
                                period_type, proof_type, insurance, employment, notes, resp_dept, coursesRawList: [], courseIds: [], sourceRows: [i+1] 
                            });
                        } else {
                            const groupRecord = recordsMap.get(key);
                            if (hours !== '') groupRecord.hours += hours; 
                            groupRecord.sourceRows.push(i+1);
                        }

                        const groupRecord = recordsMap.get(key);
                        if (notes && !groupRecord.notes.includes(notes)) {
                            groupRecord.notes = groupRecord.notes ? `${groupRecord.notes}；${notes}` : notes;
                        }
                        
                        if (coursesRaw) {
                            const cTokens = coursesRaw.split(/[、,]/).map(s => s.trim()).filter(Boolean);
                            groupRecord.coursesRawList.push(...cTokens);
                        }
                    } else {
                        errorCount++;
                        state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: '-', message: '欄位數量不足，可能格式錯誤' });
                    }
                }

                let parsedRows = [];
                for (const [key, record] of recordsMap.entries()) {
                    let rowWarnings = [];
                    
                    const studentMatch = state.allStudents.find(s => s.student_id.toUpperCase() === record.stuId);
                    if (!studentMatch) rowWarnings.push("未綁定系統學生主檔");
                    
                    const instMatch = state.allInsts.find(inst => inst.name === record.inst_raw);
                    if (!instMatch) rowWarnings.push("未綁定系統機構主檔");

                    let uniqueCourses = [...new Set(record.coursesRawList)];
                    uniqueCourses.forEach(token => {
                        const cMatch = token.match(/(\d+-\d+)[_：:](.+)/);
                        if (cMatch) {
                            const sem = cMatch[1]; const code = cMatch[2];
                            const match = state.allCourses.find(c => c.semester === sem && c.course_code === code);
                            if (match) { 
                                if (!record.courseIds.includes(match.id)) record.courseIds.push(match.id); 
                            } else {
                                rowWarnings.push(`找不到課程「${token}」`);
                            }
                        } else {
                            const match = state.allCourses.find(c => `${c.academic_year}-${c.term}_${c.course_code}` === token || `${c.academic_year}-${c.term}：${c.course_code}` === token);
                            if (match) { 
                                if (!record.courseIds.includes(match.id)) record.courseIds.push(match.id); 
                            } else {
                                rowWarnings.push(`無法識別課程「${token}」`);
                            }
                        }
                    });

                    if (record.courseIds.length === 0) rowWarnings.push("無法綁定任何實習課程");

                    const payload = {
                        student_raw: record.student_raw, grade: record.grade, inst_raw: record.inst_raw, 
                        inst_id: instMatch ? instMatch.id : '', 
                        courses: record.courseIds, duration: record.duration,
                        hours: record.hours, period_type: record.period_type, proof_type: record.proof_type, insurance: record.insurance,
                        employment: record.employment, notes: record.notes, 
                        resp_dept: record.resp_dept || (studentMatch ? studentMatch.department : ''), 
                        created_at: new Date()
                    };

                    if (rowWarnings.length > 0) {
                        warningCount++;
                        state.globalImportReportData.push({ status: '警告', rows: `合併列 [${record.sourceRows.join(',')}]`, student: `${record.stuId} - ${record.stuName}`, message: rowWarnings.join('、') });
                    } else {
                        successCount++;
                        state.globalImportReportData.push({ status: '成功', rows: `合併列 [${record.sourceRows.join(',')}]`, student: `${record.stuId} - ${record.stuName}`, message: '成功匯入並綁定' });
                    }
                    parsedRows.push(payload);
                }

                for (let payload of parsedRows) { 
                    await db.addRecord(payload); 
                }

                const rSuccess = document.getElementById('report-success-count');
                const rWarning = document.getElementById('report-warning-count');
                const rError = document.getElementById('report-error-count');
                if(rSuccess) rSuccess.innerText = successCount;
                if(rWarning) rWarning.innerText = warningCount;
                if(rError) rError.innerText = errorCount;

                const detailsContainer = document.getElementById('report-details-container');
                if (detailsContainer) {
                    let detailsHtml = '';
                    state.globalImportReportData.forEach(item => {
                        let statusColor = item.status === '成功' ? 'var(--success)' : (item.status === '警告' ? 'var(--warning)' : 'var(--danger)');
                        let statusBg = item.status === '成功' ? 'var(--success-bg)' : (item.status === '警告' ? 'var(--warning-bg)' : 'var(--danger-bg)');

                        detailsHtml += `
                            <div style="display: grid; grid-template-columns: 15% 15% 25% 45%; padding: 10px 12px; border-bottom: 1px solid var(--border); align-items: center;">
                                <div><span style="background:${statusBg}; color:${statusColor}; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">${item.status}</span></div>
                                <div style="font-family:monospace; color:var(--text-muted);">${item.rows}</div>
                                <div style="font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.student}</div>
                                <div style="color:var(--text-secondary);">${item.message}</div>
                            </div>`;
                    });
                    detailsContainer.innerHTML = detailsHtml;
                }

                ui.openImportReportModal();

            } catch (error) { 
                ui.showToast("解析匯入檔時發生預期外的錯誤：" + error.message, "error"); 
            } finally { 
                if (importTrigger) {
                    importTrigger.innerHTML = importTrigger.dataset.originalHtml || '上傳匯入'; 
                    importTrigger.disabled = false; 
                }
                e.target.value = ''; 
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-report-download')?.addEventListener('click', () => {
        if (!state.globalImportReportData || state.globalImportReportData.length === 0) return;
        let csv = '\uFEFF狀態,Excel來源列,學號姓名,詳細說明\n';
        state.globalImportReportData.forEach(r => {
            csv += `"${r.status}","${r.rows}","${r.student}","${r.message}"\n`;
        });
        const link = document.createElement('a'); 
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `批次匯入結果報告_${new Date().toISOString().split('T')[0]}.csv`; 
        link.click();
    });
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar'); 
    const count = document.getElementById('selected-count'); 
    const btn = document.getElementById('btn-select-all-filtered'); 
    if (!bar) return;
    
    if (state.selectedIds.length > 0) { 
        bar.classList.add('visible'); 
        if (count) count.innerText = state.selectedIds.length; 
        if (btn) {
            if (state.selectedIds.length < state.filteredRecords.length) { 
                btn.style.display = 'inline-flex'; 
                btn.innerText = `選取全部符合條件 (${state.filteredRecords.length})`; 
            } else {
                btn.style.display = 'none'; 
            }
        }
    } else {
        bar.classList.remove('visible'); 
    }
}

function updatePillActive(type) {
    const set = state.filterSelections[type];
    const def = state.filterDefinitions.find(d => d.key === type);
    if (!def) return;
    const pill = document.getElementById(`pill-${type}`);
    if (!pill) return;
    
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${def.label} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `${def.label} <i class="ti ti-chevron-down"></i>`;
    }
}

function renderStudentDropdown(term) {
    const dropdown = document.getElementById('student-dropdown'); 
    if (!dropdown) return;
    const val = term.split(' - ')[0].trim().toLowerCase(); 
    const filtered = state.allStudents.filter(s => s.student_id.toLowerCase().includes(val) || s.name.toLowerCase().includes(val));
    if (filtered.length === 0) { 
        dropdown.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:var(--text-muted);">查無相符學生</div>'; 
        return; 
    }
    
    dropdown.innerHTML = filtered.slice(0, 15).map(s => `
        <div class="search-item student-select-item" data-id="${s.student_id}" data-name="${s.name}">
            <div class="search-item-title">${s.student_id} - ${s.name}</div>
            <div class="search-item-desc">${getColShort(s.college)} / ${getDeptShort(s.department)}</div>
        </div>`).join('');
}

function renderInstDropdown(term) {
    const dropdown = document.getElementById('institution-dropdown'); 
    if (!dropdown) return;
    const val = term.trim().toLowerCase();
    const filtered = state.allInsts.filter(i => i.name.toLowerCase().includes(val) || (i.tax_id && i.tax_id.toLowerCase().includes(val)));
    if (filtered.length === 0) { 
        dropdown.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:var(--text-muted);">查無相符機構</div>'; 
        return; 
    }
    
    dropdown.innerHTML = filtered.slice(0, 15).map(i => `
        <div class="search-item inst-select-item" data-id="${i.id}" data-name="${i.name}">
            <div class="search-item-title">${i.name}</div>
            <div class="search-item-desc">${i.tax_id || '統編：無統一編號'} | ${i.address || ''}</div>
        </div>`).join('');
}

function renderCourseDropdown(term) {
    const dropdown = document.getElementById('course-dropdown'); 
    if (!dropdown) return;
    const val = term.trim().toLowerCase();
    const available = state.allCourses.filter(c => !state.selectedCourseIds.includes(c.id));
    
    const filtered = available.filter(c => {
        const deptShort = getDeptShort(c.department).toLowerCase();
        return c.course_name.toLowerCase().includes(val) || 
               c.course_code.toLowerCase().includes(val) || 
               c.department.toLowerCase().includes(val) ||
               deptShort.includes(val); 
    });
    
    if (filtered.length === 0) { 
        dropdown.innerHTML = '<div style="padding:12px; text-align:center; font-size:11px; color:var(--text-muted);">查無相符或可選擇之課程</div>'; 
        return; 
    }

    dropdown.innerHTML = filtered.slice(0, 15).map(c => `
        <div class="search-item course-select-item" data-id="${c.id}">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${c.academic_year}-${c.term}</span>
                <span style="font-size:10px; font-weight:700; background:var(--brand-light); color:var(--brand); padding:2px 4px; border-radius:4px;">${c.course_code}</span>
                <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${c.course_name}</span>
            </div>
            <div class="search-item-desc">開課院系：${getColShort(c.college)} / ${getDeptShort(c.department)} | ${c.credits}學分</div>
        </div>`).join('');
}

function checkBtnActive(inputEl, btnId, list, key) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const match = list.find(x => (x[key] === inputEl.value || (x.student_id && inputEl.value.startsWith(x.student_id))));
    btn.disabled = !match;
}

function triggerEdit(id) {
    const data = state.allRecords.find(d => d.id === id); 
    if (!data) return;
    
    state.editingId = id;
    const stuInput = document.getElementById('input-student');
    const instInput = document.getElementById('input-institution');
    
    if (stuInput) stuInput.value = data.student_raw || '';
    if (instInput) {
        instInput.value = data.inst_raw || '';
        instInput.dataset.id = data.inst_id || ''; 
    }
    
    const setVal = (eid, val) => { const el = document.getElementById(eid); if (el) el.value = val; };
    setVal('input-duration', data.duration || '');
    setVal('input-hours', data.hours !== undefined && data.hours !== '' ? data.hours : '');
    setVal('input-notes', data.notes || '');
    setVal('input-grade', data.grade || '');
    setVal('input-period-type', data.period_type || '');
    setVal('input-proof-type', data.proof_type || '');
    setVal('input-insurance', data.insurance || '');
    setVal('input-employment', data.employment || '');

    const btnInfoStu = document.getElementById('btn-info-student');
    if (btnInfoStu) btnInfoStu.disabled = false;
    
    const btnInfoInst = document.getElementById('btn-info-inst');
    if (btnInfoInst) {
        if (data.inst_id) {
            btnInfoInst.disabled = false;
        } else {
            const exists = state.allInsts.some(i => i.name === data.inst_raw);
            btnInfoInst.disabled = !exists;
        }
    }

    state.selectedCourseIds = Array.isArray(data.courses) ? [...data.courses] : [];
    render.renderSelectedCourseChips(true);
    render.updateRespDeptOptions(data.resp_dept);

    ui.openFormModal(true);
}
