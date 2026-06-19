import { state, formatCourseInfo } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    if (!state.isKeyboardShortcutBound) {
        document.addEventListener('keydown', (e) => {
            const targetTag = e.target.tagName.toLowerCase();
            const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.dialog-overlay.open, .info-modal-overlay.open, .fs-modal.open');
                const openDropdowns = document.querySelectorAll('.filter-dropdown.show');
                const displayMenu = document.getElementById('display-settings-menu');
                
                if (openModals.length > 0) {
                    const topModal = openModals[openModals.length - 1];
                    if (topModal.id === 'data-modal') UI.closeFormModal();
                    else topModal.classList.remove('open');
                } else if (openDropdowns.length > 0) {
                    openDropdowns.forEach(d => d.classList.remove('show'));
                    document.querySelectorAll('.filter-pill-wrap.open').forEach(w => w.classList.remove('open'));
                } else if (displayMenu && displayMenu.style.display === 'block') {
                    displayMenu.style.display = 'none';
                } else if (isInput) {
                    e.target.blur();
                    if (e.target.id === 'search-input' && e.target.value !== '') {
                        e.target.value = '';
                        e.target.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) { searchInput.focus(); searchInput.select(); }
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                if (state.isReadOnly) return;
                e.preventDefault();
                if (document.getElementById('data-modal')?.classList.contains('open')) {
                    document.getElementById('btn-submit')?.click();
                }
            }
        });
        state.isKeyboardShortcutBound = true;
    }

    container.querySelector('#search-input')?.addEventListener('input', () => { 
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1; 
            Render.renderTable(); 
        }, 250);
    });

    // 🌟 [修改] CSV 匯出，加入學年度在最前面
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        if (state.filteredRecords.length === 0) { UI.showToast("沒有資料可供匯出！", "error"); return; }
        let csv = '\uFEFF學年度,學號,姓名,學系,年級,機構名稱,修習課程(學年-學期_代號：課程名稱),總學分,實習起訖時間,總時數,實習時間,證明文件,投保情形,勞雇關係,填報系所,備註\n';
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
                d.academic_year || '', stuId, stuName, stuDept, d.grade, d.inst_raw, courseNames, totalCredits, 
                d.duration, d.hours !== undefined && d.hours !== '' ? d.hours : '', 
                d.period_type, d.proof_type, d.insurance, d.employment, d.resp_dept || '', d.notes || ''
            ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習紀錄總表_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    });

    container.querySelector('#btn-import-trigger')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        container.querySelector('#import-file').click();
    });

    // 🌟 [修改] CSV 匯入，將欄位順序對齊最新結構 (cols[0] 變為學年度)
    container.querySelector('#import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const btn = document.getElementById('btn-import-trigger');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> <span class="btn-text">匯入中...</span>';
        btn.disabled = true;

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

                    if (cols.length >= 15) {
                        const academic_year = (cols[0] || '').trim();
                        const stuId = (cols[1] || '').trim().toUpperCase();
                        const stuName = (cols[2] || '').trim();
                        const grade = cols[4];
                        const inst_raw = cols[5];
                        const coursesRaw = cols[6];
                        const duration = cols[8];        
                        const hours = cols[9] ? Number(cols[9]) : ''; 
                        const period_type = cols[10];     
                        const proof_type = cols[11];      
                        const insurance = cols[12];      
                        const employment = cols[13];     
                        const resp_dept = cols[14] || ''; 
                        const notes = cols[15] || '';   

                        if (!academic_year || !stuId || !inst_raw || !duration || !period_type || !proof_type || !insurance || !employment || !grade) {
                            errorCount++;
                            state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: stuName || '未知', message: '缺少必填欄位 (學年度、學號、機構、時間、保險等)' });
                            continue;
                        }

                        const key = `${academic_year}|${stuId}|${inst_raw}|${duration}|${grade}|${period_type}|${proof_type}|${insurance}|${employment}`;

                        if (!recordsMap.has(key)) {
                            recordsMap.set(key, {
                                academic_year: academic_year, student_raw: `${stuId} - ${stuName}`, stuId: stuId, stuName: stuName, grade, inst_raw, duration, hours: hours !== '' ? hours : 0, 
                                period_type, proof_type, insurance, employment, notes, resp_dept, coursesRawList: [], courseIds: [], sourceRows: [] 
                            });
                        } else if (hours !== '') {
                            const groupRecord = recordsMap.get(key);
                            groupRecord.hours += hours; 
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
                        state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: '-', message: '欄位數量不足，可能格式跑掉' });
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
                            const match = state.allCourses.find(c => (c.semester === sem || `${c.academic_year}-${c.term}` === sem) && c.course_code === code && c.academic_year === record.academic_year);
                            if (match) { if (!record.courseIds.includes(match.id)) record.courseIds.push(match.id); } 
                            else rowWarnings.push(`找不到符合學年度的課程「${token}」`);
                        } else {
                            const match = state.allCourses.find(c => (`${c.academic_year}-${c.term}_${c.course_code}` === token || `${c.academic_year}-${c.term}：${c.course_code}` === token) && c.academic_year === record.academic_year);
                            if (match) { if (!record.courseIds.includes(match.id)) record.courseIds.push(match.id); } 
                            else rowWarnings.push(`無法識別符合學年度的課程「${token}」`);
                        }
                    });

                    if (record.courseIds.length === 0) rowWarnings.push("無法綁定任何實習課程");

                    const payload = {
                        academic_year: record.academic_year,
                        student_raw: record.student_raw, grade: record.grade, inst_raw: record.inst_raw, 
                        inst_id: instMatch ? instMatch.id : '', 
                        courses: record.courseIds, duration: record.duration,
                        hours: record.hours, period_type: record.period_type, proof_type: record.proof_type, insurance: record.insurance,
                        employment: record.employment, notes: record.notes, 
                        resp_dept: record.resp_dept || (studentMatch ? studentMatch.department : '')
                    };

                    if (rowWarnings.length > 0) {
                        warningCount++;
                        state.globalImportReportData.push({ status: '警告', rows: `合併列 [${record.sourceRows.join(',')}]`, student: `${record.stuId} - ${record.stuName}`, message: rowWarnings.join('、') });
                    } else {
                        successCount++;
                        state.globalImportReportData.push({ status: '成功', rows: `合併列 [${record.sourceRows.join(',')}]`, student: `${record.stuId} - ${record.stuName}`, message: '完美匯入並綁定' });
                    }
                    parsedRows.push(payload);
                }

                for (let payload of parsedRows) { await Data.addRecord(payload); }

                document.getElementById('report-success-count').innerText = successCount;
                document.getElementById('report-warning-count').innerText = warningCount;
                document.getElementById('report-error-count').innerText = errorCount;

                const detailsContainer = document.getElementById('report-details-container');
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
                        </div>
                    `;
                });
                detailsContainer.innerHTML = detailsHtml;
                document.getElementById('import-report-modal').classList.add('open');

            } catch (error) { 
                UI.showToast("解析匯入檔時發生錯誤：" + error.message, "error"); 
            } finally { 
                btn.innerHTML = originalHtml; btn.disabled = false; e.target.value = ''; 
            }
        };
        reader.readAsText(file);
    });

    container.querySelector('#btn-download-report')?.addEventListener('click', () => {
        if (!state.globalImportReportData || state.globalImportReportData.length === 0) return;
        let csv = '\uFEFF狀態,Excel來源列,學號姓名,詳細說明\n';
        state.globalImportReportData.forEach(r => csv += `"${r.status}","${r.rows}","${r.student}","${r.message}"\n`);
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `批次匯入結果報告_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    });

    container.querySelectorAll('.btn-close-report').forEach(btn => {
        btn.addEventListener('click', () => { document.getElementById('import-report-modal').classList.remove('open'); });
    });
    
    // 🌟 [新增] 新增時自動載入可用的學年度
    container.querySelector('#btn-create-record')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        state.editingId = null; state.selectedCourseIds = [];
        
        Render.populateAcademicYearDropdown();
        document.getElementById('input-academic-year').value = '';
        document.getElementById('input-student').value = '';
        document.getElementById('input-grade').value = '';
        const instInput = document.getElementById('input-institution');
        instInput.value = ''; instInput.dataset.id = '';
        document.getElementById('input-duration').value = '';
        document.getElementById('input-hours').value = '';
        document.getElementById('input-period-type').value = '';
        document.getElementById('input-proof-type').value = '';
        document.getElementById('input-insurance').value = '';
        document.getElementById('input-employment').value = '';
        document.getElementById('input-notes').value = '';
        
        document.getElementById('btn-info-student').disabled = true;
        document.getElementById('btn-info-inst').disabled = true;

        Render.renderSelectedCourseChips();
        document.getElementById('input-resp-dept').innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        UI.openFormModal(false);
    });

    // 🌟 [新增] 監聽學年度變化，若變更則自動清理無效課程
    container.querySelector('#input-academic-year')?.addEventListener('change', (e) => {
        const newYear = e.target.value;
        if (state.selectedCourseIds.length > 0) {
            const prevLen = state.selectedCourseIds.length;
            state.selectedCourseIds = state.selectedCourseIds.filter(cid => {
                const c = state.allCourses.find(x => x.id === cid);
                return c && c.academic_year === newYear;
            });
            if (state.selectedCourseIds.length !== prevLen) {
                UI.showToast("已移除與所選學年度不符的課程", "info");
            }
            Render.renderSelectedCourseChips();
        }
        
        const dropdown = document.getElementById('course-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            Render.renderCourseDropdown(state.allCourses, document.getElementById('input-course-search').value);
        }
    });

    container.querySelector('#btn-display-settings')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('display-settings-menu');
        if (menu) menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none';
        
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
    });

    if (!state.isGlobalListenerBound) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#display-settings-wrap')) {
                const menu = document.getElementById('display-settings-menu');
                if (menu) menu.style.display = 'none';
            }

            if (!e.target.closest('.filter-pill-wrap')) {
                document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
                document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
            }
            if (!e.target.closest('#input-student') && !e.target.closest('#student-dropdown')) document.getElementById('student-dropdown')?.classList.remove('show');
            if (!e.target.closest('#input-institution') && !e.target.closest('#institution-dropdown')) document.getElementById('institution-dropdown')?.classList.remove('show');
            if (!e.target.closest('#input-course-search') && !e.target.closest('#course-dropdown')) document.getElementById('course-dropdown')?.classList.remove('show');
        });
        state.isGlobalListenerBound = true;
    }

    container.querySelector('#selectAll')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const currentPaginatedIds = state.filteredRecords.slice(startIndex, startIndex + state.itemsPerPage).map(d => d.id);
        
        if (isChecked) { currentPaginatedIds.forEach(id => { if (!state.selectedIds.includes(id)) state.selectedIds.push(id); }); } 
        else { state.selectedIds = state.selectedIds.filter(id => !currentPaginatedIds.includes(id)); }
        updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-select-all-filtered')?.addEventListener('click', () => { state.selectedIds = state.filteredRecords.map(d => d.id); updateBatchActionBar(); Render.renderTable(); });
    container.querySelector('#btn-clear-selection')?.addEventListener('click', () => { state.selectedIds = []; updateBatchActionBar(); Render.renderTable(); });
    container.querySelector('#btn-batch-delete')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        if (!confirm(`確定刪除選取的 ${state.selectedIds.length} 筆紀錄嗎？`)) return;
        try {
            await Data.batchDeleteRecords(state.selectedIds);
            state.selectedIds = []; updateBatchActionBar(); UI.showToast("批次刪除成功", "success");
        } catch(e) { UI.showToast("刪除失敗", "error"); }
    });

    container.querySelector('#btn-close-modal-x')?.addEventListener('click', UI.closeFormModal);
    container.querySelector('#btn-info-student')?.addEventListener('click', () => UI.showInfoPopup('student'));
    container.querySelector('#btn-info-inst')?.addEventListener('click', () => UI.showInfoPopup('inst'));
    container.querySelector('#btn-info-close')?.addEventListener('click', UI.closeInfoPopup);
    container.querySelector('#btn-info-footer-close')?.addEventListener('click', UI.closeInfoPopup);

    // 🌟 [新增] 寫入資料庫時攜帶學年度參數
    container.querySelector('#btn-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        
        const durationInput = document.getElementById('input-duration').value.trim();
        const regex = /^\d{2,3}\/\d{2}\/\d{2}-\d{2,3}\/\d{2}\/\d{2}$/;
        if (!regex.test(durationInput)) { 
            UI.showToast("時間格式錯誤！格式應為：YYY/MM/DD-YYY/MM/DD (例如：114/07/01-114/08/31)", "warning"); 
            return; 
        }
        if (state.selectedCourseIds.length === 0) { 
            UI.showToast("請至少選擇一門關聯實習課程！", "warning"); 
            return; 
        }

        const payload = {
            academic_year: document.getElementById('input-academic-year').value,
            student_raw: document.getElementById('input-student').value.trim(),
            grade: document.getElementById('input-grade').value,
            inst_raw: document.getElementById('input-institution').value.trim(),
            inst_id: document.getElementById('input-institution').dataset.id || '',
            period_type: document.getElementById('input-period-type').value,
            duration: durationInput,
            insurance: document.getElementById('input-insurance').value,
            employment: document.getElementById('input-employment').value,
            proof_type: document.getElementById('input-proof-type').value,
            hours: document.getElementById('input-hours').value ? Number(document.getElementById('input-hours').value) : '',
            resp_dept: document.getElementById('input-resp-dept').value,
            notes: document.getElementById('input-notes').value.trim(),
            courses: state.selectedCourseIds
        };
        
        if(!payload.academic_year || !payload.student_raw || !payload.inst_raw || !payload.duration || !payload.grade || !payload.period_type || !payload.proof_type || !payload.insurance || !payload.employment || !payload.resp_dept) { 
            UI.showToast("請完成所有包含 * 號之必填選單與欄位設定！", "warning"); return; 
        }

        const btn = document.getElementById('btn-submit');
        if(btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...'; }
        try {
            if (state.editingId) { await Data.updateRecord(state.editingId, payload); UI.showToast("紀錄更新成功！", "success"); } 
            else { await Data.addRecord(payload); UI.showToast("新紀錄新增成功！", "success"); }
            UI.closeFormModal();
        } catch (err) { UI.showToast("儲存失敗：" + err.message, "error"); }
        finally { if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 儲存紀錄'; } }
    });

    container.querySelector('#per-page-select')?.addEventListener('change', (e) => { state.itemsPerPage = Number(e.target.value); state.currentPage = 1; Render.renderTable(); });
    
    container.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('.page-btn');
        if (pageBtn && !pageBtn.disabled && !pageBtn.classList.contains('active')) {
            const p = Number(pageBtn.dataset.page);
            if (p) { state.currentPage = p; Render.renderTable(); }
        }
        
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const col = th.dataset.sort;
            if (state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            else { state.sortCol = col; state.sortDir = 'asc'; }
            container.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                const icon = t.querySelector('.sort-icon');
                if(icon) icon.className = 'ti ti-arrows-sort sort-icon';
            });
            th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            const targetIcon = th.querySelector('.sort-icon');
            if(targetIcon) targetIcon.className = `ti ti-sort-${state.sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            Render.renderTable();
        }

        const rowChk = e.target.closest('.row-select-chk');
        if (rowChk) {
            const id = rowChk.value;
            const index = state.selectedIds.indexOf(id);
            if (index === -1) state.selectedIds.push(id); else state.selectedIds.splice(index, 1);
            updateBatchActionBar(); Render.renderTable();
        }

        const btnEdit = e.target.closest('.btn-row-edit');
        if (btnEdit && !state.isReadOnly) {
            const id = btnEdit.dataset.id;
            const data = state.allRecords.find(d => d.id === id); if (!data) return;
            state.editingId = id;

            // 🌟 [新增] 編輯時載入該紀錄的學年度
            Render.populateAcademicYearDropdown();
            document.getElementById('input-academic-year').value = data.academic_year || '';

            document.getElementById('input-student').value = data.student_raw || '';
            const instInput = document.getElementById('input-institution');
            instInput.value = data.inst_raw || ''; 
            instInput.dataset.id = data.inst_id || '';
            
            document.getElementById('input-duration').value = data.duration || '';
            document.getElementById('input-hours').value = data.hours !== undefined && data.hours !== '' ? data.hours : '';
            document.getElementById('input-notes').value = data.notes || '';
            document.getElementById('input-grade').value = data.grade || '';
            document.getElementById('input-period-type').value = data.period_type || '';
            document.getElementById('input-proof-type').value = data.proof_type || '';
            document.getElementById('input-insurance').value = data.insurance || '';
            document.getElementById('input-employment').value = data.employment || '';
            
            document.getElementById('btn-info-student').disabled = false;
            if (data.inst_id) {
                document.getElementById('btn-info-inst').disabled = false;
            } else {
                const exists = state.allInsts.some(i => i.name === data.inst_raw);
                document.getElementById('btn-info-inst').disabled = !exists;
            }

            state.selectedCourseIds = Array.isArray(data.courses) ? [...data.courses] : [];
            Render.renderSelectedCourseChips(true);
            UI.updateRespDeptOptions(data.resp_dept);
            UI.openFormModal(true);
        }

        const btnDel = e.target.closest('.btn-row-delete');
        if (btnDel && !state.isReadOnly) {
            const id = btnDel.dataset.id;
            const name = btnDel.dataset.name;
            if (confirm(`警告：確定要刪除「${name}」的這筆實習紀錄嗎？\n此操作無法復原。`)) {
                Data.deleteRecord(id).then(() => UI.showToast("刪除成功", "success")).catch(() => UI.showToast("刪除失敗", "error"));
            }
        }
        
        const btnExpand = e.target.closest('.btn-course-expand');
        if (btnExpand) {
            const id = btnExpand.dataset.id;
            const el = document.getElementById(`expand-course-${id}`);
            const icon = document.getElementById(`icon-course-${id}`);
            if (el && icon) {
                const isHidden = el.style.display === 'none';
                el.style.display = isHidden ? 'block' : 'none';
                icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        }
    });

    container.querySelector('#input-student')?.addEventListener('input', (e) => { 
        document.getElementById('student-dropdown').classList.add('show'); 
        Render.renderStudentDropdown(state.allStudents, e.target.value); 
        document.getElementById('btn-info-student').disabled = !state.allStudents.find(x => x.student_id === e.target.value || e.target.value.startsWith(x.student_id));
        UI.updateRespDeptOptions();
    });
    container.querySelector('#input-institution')?.addEventListener('input', (e) => { 
        e.target.dataset.id = ''; 
        document.getElementById('btn-info-inst').disabled = true;
        document.getElementById('institution-dropdown').classList.add('show'); 
        Render.renderInstDropdown(state.allInsts, e.target.value); 
    });
    container.querySelector('#input-course-search')?.addEventListener('input', (e) => { 
        document.getElementById('course-dropdown').classList.add('show'); 
        Render.renderCourseDropdown(state.allCourses, e.target.value); 
    });
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar'); const count = document.getElementById('selected-count'); const btn = document.getElementById('btn-select-all-filtered'); 
    if (!bar) return;
    if (state.selectedIds.length > 0) { 
        bar.classList.add('visible'); 
        if (count) count.innerText = state.selectedIds.length; 
        if (btn) {
            if (state.selectedIds.length < state.filteredRecords.length) {
                btn.style.display = 'inline-flex'; btn.innerText = `選取全部符合條件 (${state.filteredRecords.length})`;
            } else {
                btn.style.display = 'none';
            }
        }
    } else { 
        bar.classList.remove('visible'); 
    }
}
