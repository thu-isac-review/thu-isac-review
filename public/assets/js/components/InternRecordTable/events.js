import { state, formatCourseForExport, getRecordTerm } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    // 🌟 [新增] 左右滾動按鈕事件
    const filterScrollArea = document.getElementById('filter-container');
    document.getElementById('btn-scroll-left')?.addEventListener('click', () => {
        filterScrollArea?.scrollBy({ left: -200, behavior: 'smooth' });
    });
    document.getElementById('btn-scroll-right')?.addEventListener('click', () => {
        filterScrollArea?.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // 🌟 [新增] 控制待遇與經費邏輯
    function handlePaymentFieldsCascade() {
        const yearSelect = document.getElementById('input-academic-year');
        const allowanceSelect = document.getElementById('input-allowance');
        const paymentTypeSelect = document.getElementById('input-payment-type');
        const paymentDescInput = document.getElementById('input-payment-desc');
        const reqType = document.getElementById('req-payment-type');
        const reqDesc = document.getElementById('req-payment-desc');

        const year = parseInt(yearSelect.value, 10) || 0;
        const allowance = allowanceSelect.value;
        const currentPaymentType = paymentTypeSelect.value;

        let options = '<option value="">請選擇</option>';
        if (allowance === '工資') {
            options += '<option value="月薪">月薪</option><option value="時薪">時薪</option><option value="其他">其他</option>';
        } else if (allowance === '獎學金' || allowance === '津貼') {
            options += '<option value="月給">月給</option><option value="一次性">一次性</option><option value="其他">其他</option>';
        }
        paymentTypeSelect.innerHTML = options;
        
        if (Array.from(paymentTypeSelect.options).some(o => o.value === currentPaymentType)) {
            paymentTypeSelect.value = currentPaymentType;
        }

        const is113OrAbove = year >= 113;

        if (allowance === '無' || !allowance) {
            paymentTypeSelect.disabled = true;
            paymentTypeSelect.value = '';
            paymentTypeSelect.required = false;
            if(reqType) reqType.style.display = 'none';
        } else {
            paymentTypeSelect.disabled = false;
            paymentTypeSelect.required = is113OrAbove;
            if(reqType) reqType.style.display = is113OrAbove ? 'inline' : 'none';
        }

        if (paymentTypeSelect.value === '其他') {
            paymentDescInput.disabled = false;
            paymentDescInput.required = is113OrAbove;
            if(reqDesc) reqDesc.style.display = is113OrAbove ? 'inline' : 'none';
        } else {
            paymentDescInput.disabled = true;
            paymentDescInput.value = '';
            paymentDescInput.required = false;
            if(reqDesc) reqDesc.style.display = 'none';
        }
    }

    // 🌟 [新增] 控制校庫填報不符合原因邏輯
    function handleMoeCascade() {
        const moeSelect = document.getElementById('input-is-moe-compliant');
        const moeReasonInput = document.getElementById('input-moe-reason');
        const reqMoeReason = document.getElementById('req-moe-reason');

        if (moeSelect.value === '不符合') {
            moeReasonInput.disabled = false;
            moeReasonInput.required = true;
            if(reqMoeReason) reqMoeReason.style.display = 'inline';
        } else {
            moeReasonInput.disabled = true;
            moeReasonInput.value = '';
            moeReasonInput.required = false;
            if(reqMoeReason) reqMoeReason.style.display = 'none';
        }
    }

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

    container.querySelector('#global-academic-year')?.addEventListener('change', (e) => {
        state.currentAcademicYear = e.target.value;
        state.currentPage = 1;
        Render.renderTable();
    });

    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        if (state.filteredRecords.length === 0) { UI.showToast("沒有資料可供匯出！", "error"); return; }
        
        let csv = '\uFEFF學年度,學期,學號,姓名,學系,年級,機構名稱,修習課程(學年-學期_代號：課程名稱),總學分,實習時間,實習起訖時間,總時數,證明文件,勞雇關係,投保情形,實習待遇,給付類型,其他給付說明,給付金額,補助經費來源,實習機會來源,實習職缺類型,符合校庫填報,不符合校庫填報原因,填報系所,系所備註說明,備註\n';
        state.filteredRecords.forEach(d => {
            let totalCredits = 0;
            const courseObjs = (Array.isArray(d.courses) ? d.courses : []).map(cid => state.allCourses.find(x => x.id === cid)).filter(Boolean);
            
            const termDisplay = [...new Set(courseObjs.map(c => c.term))].filter(Boolean).sort().join('、') || '';
            const courseNames = courseObjs.map(c => { 
                if (c.credits) totalCredits += Number(c.credits);
                return formatCourseForExport(c); 
            }).join('、');
            
            const stu = state.allStudents.find(s => s.id === d.student_doc_id) || {};
            const inst = state.allInsts.find(i => i.id === d.inst_id) || {};

            csv += [
                d.academic_year || '', termDisplay, stu.student_id || '', stu.name || '', stu.department || '', d.grade, inst.name || d.inst_raw || '', courseNames, totalCredits, 
                d.period_type, d.duration, d.hours !== undefined && d.hours !== '' ? d.hours : '', 
                d.proof_type, d.employment, d.insurance,
                d.allowance || '', d.payment_type || '', d.payment_desc || '', d.payment_amount || '', d.funding || '', d.opp_source || '', d.job_type || '', 
                d.is_moe_compliant || '', d.moe_reason || '', d.resp_dept || '', d.dept_notes || '', d.notes || ''
            ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習紀錄總表_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    });

    container.querySelector('#btn-import-trigger')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        container.querySelector('#import-file').click();
    });

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
                if (rows.length < 2) throw new Error("檔案中沒有足夠的資料列");

                let headers = [];
                let headerVal = '';
                let hQuotes = false;
                for (let char of rows[0]) {
                    if (char === '"') hQuotes = !hQuotes;
                    else if (char === ',' && !hQuotes) { headers.push(headerVal.replace(/^\uFEFF/, '').trim()); headerVal = ''; }
                    else headerVal += char;
                }
                headers.push(headerVal.replace(/^\uFEFF/, '').trim());

                // 彈性匹配 CSV 標題列
                const idxYear = headers.indexOf('學年度');
                const idxStuId = headers.indexOf('學號');
                const idxGrade = headers.indexOf('年級');
                const idxInst = headers.indexOf('機構名稱');
                const idxCourses = headers.findIndex(h => h.includes('修習課程'));
                const idxPeriod = headers.indexOf('實習時間');
                const idxDuration = headers.indexOf('實習起訖時間');
                const idxHours = headers.indexOf('總時數');
                const idxProof = headers.indexOf('證明文件');
                const idxEmp = headers.indexOf('勞雇關係');
                const idxIns = headers.indexOf('投保情形');
                const idxAllowance = headers.indexOf('實習待遇');
                const idxPaymentType = headers.indexOf('給付類型');
                const idxPaymentDesc = headers.findIndex(h => h.includes('其他給付說明'));
                const idxPaymentAmt = headers.indexOf('給付金額');
                const idxFunding = headers.indexOf('補助經費來源');
                const idxOppSource = headers.indexOf('實習機會來源');
                const idxJobType = headers.findIndex(h => h.includes('實習職缺'));
                const idxMoe = headers.indexOf('符合校庫填報');
                const idxMoeReason = headers.findIndex(h => h.includes('不符合校庫填報原因'));
                const idxResp = headers.indexOf('填報系所');
                const idxDeptNotes = headers.indexOf('系所備註說明');
                const idxNotes = headers.indexOf('備註');

                if (idxYear === -1 || idxStuId === -1 || idxInst === -1 || idxCourses === -1) {
                    UI.showToast("CSV 標題列格式不符，請確認是否包含「學年度、學號、機構名稱、修習課程」等必要欄位", "error");
                    return;
                }

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

                    const academic_year = (cols[idxYear] || '').trim();
                    const stuId = (cols[idxStuId] || '').trim().toUpperCase();
                    const inst_raw = cols[idxInst] || '';
                    const coursesRaw = cols[idxCourses] || '';
                    const duration = idxDuration !== -1 ? cols[idxDuration] : '';
                    const grade = idxGrade !== -1 ? cols[idxGrade] : '';
                    const hours = (idxHours !== -1 && cols[idxHours]) ? Number(cols[idxHours]) : ''; 
                    const period_type = idxPeriod !== -1 ? cols[idxPeriod] : '';
                    const proof_type = idxProof !== -1 ? cols[idxProof] : '';
                    const insurance = idxIns !== -1 ? cols[idxIns] : '';
                    const employment = idxEmp !== -1 ? cols[idxEmp] : '';
                    
                    const allowance = idxAllowance !== -1 ? cols[idxAllowance] : '';
                    const payment_type = idxPaymentType !== -1 ? cols[idxPaymentType] : '';
                    const payment_desc = idxPaymentDesc !== -1 ? cols[idxPaymentDesc] : '';
                    const payment_amount = idxPaymentAmt !== -1 ? cols[idxPaymentAmt] : '';
                    const funding = idxFunding !== -1 ? cols[idxFunding] : '';
                    const opp_source = idxOppSource !== -1 ? cols[idxOppSource] : '';
                    const job_type = idxJobType !== -1 ? cols[idxJobType] : '';
                    const is_moe_compliant = idxMoe !== -1 ? cols[idxMoe] : '';
                    const moe_reason = idxMoeReason !== -1 ? cols[idxMoeReason] : '';

                    const resp_dept = idxResp !== -1 ? cols[idxResp] : '';
                    const dept_notes = idxDeptNotes !== -1 ? cols[idxDeptNotes] : '';
                    const notes = idxNotes !== -1 ? cols[idxNotes] : '';

                    if (!academic_year || !stuId || !inst_raw || !duration || !period_type || !proof_type || !insurance || !employment || !grade || !allowance || !funding || !opp_source || !job_type || !is_moe_compliant) {
                        errorCount++;
                        state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: stuId || '未知', message: '缺少必填欄位 (包含待遇與經費等新欄位)' });
                        continue;
                    }

                    if (parseInt(academic_year, 10) >= 113) {
                        if (allowance !== '無' && !payment_type) {
                            errorCount++;
                            state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: stuId, message: '113學年度起，實習待遇非「無」者必須填寫「給付類型」' });
                            continue;
                        }
                        if (payment_type === '其他' && !payment_desc) {
                            errorCount++;
                            state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: stuId, message: '給付類型為「其他」時，必須填寫「其他給付說明」' });
                            continue;
                        }
                    }
                    if (is_moe_compliant === '不符合' && !moe_reason) {
                        errorCount++;
                        state.globalImportReportData.push({ status: '錯誤', rows: `第 ${i+1} 列`, student: stuId, message: '不符合校庫填報時，必須填寫「不符合校庫填報原因」' });
                        continue;
                    }

                    const key = `${academic_year}|${stuId}|${inst_raw}|${duration}|${grade}|${period_type}|${proof_type}|${insurance}|${employment}|${allowance}|${payment_type}|${payment_desc}|${payment_amount}|${funding}|${opp_source}|${job_type}|${is_moe_compliant}|${moe_reason}`;

                    if (!recordsMap.has(key)) {
                        recordsMap.set(key, {
                            academic_year, student_id: stuId, grade, inst_raw, duration, hours: hours !== '' ? hours : 0, 
                            period_type, proof_type, insurance, employment,
                            allowance, payment_type, payment_desc, payment_amount, funding, opp_source, job_type, is_moe_compliant, moe_reason,
                            dept_notes, notes, resp_dept, coursesRawList: [], courseIds: [], sourceRows: [] 
                        });
                    } else if (hours !== '') {
                        const groupRecord = recordsMap.get(key);
                        groupRecord.hours += hours; 
                        groupRecord.sourceRows.push(i+1);
                    }

                    const groupRecord = recordsMap.get(key);
                    if (notes && !groupRecord.notes.includes(notes)) groupRecord.notes = groupRecord.notes ? `${groupRecord.notes}；${notes}` : notes;
                    if (dept_notes && !groupRecord.dept_notes.includes(dept_notes)) groupRecord.dept_notes = groupRecord.dept_notes ? `${groupRecord.dept_notes}；${dept_notes}` : dept_notes;

                    if (coursesRaw) {
                        const cTokens = coursesRaw.split(/[、,]/).map(s => s.trim()).filter(Boolean);
                        groupRecord.coursesRawList.push(...cTokens);
                    }
                }

                let parsedRows = [];
                for (const [key, record] of recordsMap.entries()) {
                    let rowWarnings = [];
                    
                    const studentMatch = state.allStudents.find(s => s.student_id.toUpperCase() === record.student_id);
                    if (!studentMatch) rowWarnings.push("系統無此學生主檔");
                    
                    const instMatch = state.allInsts.find(inst => inst.name === record.inst_raw);
                    if (!instMatch) rowWarnings.push("系統無此機構主檔");

                    let uniqueCourses = [...new Set(record.coursesRawList)];
                    uniqueCourses.forEach(token => {
                        const cMatch = token.match(/^(\d+)-(\d+)_([^：:]+)[：:](.+)$/);
                        if (cMatch) {
                            const year = cMatch[1]; 
                            const term = cMatch[2]; 
                            const code = cMatch[3];
                            const match = state.allCourses.find(c => c.academic_year == year && c.term == term && c.course_code == code);
                            if (match) { 
                                if (!record.courseIds.includes(match.id)) record.courseIds.push(match.id); 
                            } else {
                                rowWarnings.push(`系統無此課程「${token}」`);
                            }
                        } else {
                            rowWarnings.push(`課程格式不符「${token}」，應為: 學年-學期_代號：名稱`);
                        }
                    });

                    if (record.courseIds.length === 0) rowWarnings.push("無法綁定任何實習課程");

                    if (!studentMatch || !instMatch) {
                        errorCount++;
                        state.globalImportReportData.push({ status: '錯誤', rows: `合併列 [${record.sourceRows.join(',')}]`, student: record.student_id, message: '機構或學生不存在系統中，拒絕寫入。' });
                        continue;
                    }

                    const payload = {
                        academic_year: record.academic_year,
                        student_doc_id: studentMatch.id,
                        grade: record.grade,
                        inst_id: instMatch.id, 
                        courses: record.courseIds, duration: record.duration,
                        hours: record.hours, period_type: record.period_type, proof_type: record.proof_type, insurance: record.insurance,
                        employment: record.employment, 
                        allowance: record.allowance, payment_type: record.payment_type, payment_desc: record.payment_desc, payment_amount: record.payment_amount,
                        funding: record.funding, opp_source: record.opp_source, job_type: record.job_type,
                        is_moe_compliant: record.is_moe_compliant, moe_reason: record.moe_reason,
                        notes: record.notes, dept_notes: record.dept_notes,
                        resp_dept: record.resp_dept || studentMatch.department
                    };

                    if (rowWarnings.length > 0) {
                        warningCount++;
                        state.globalImportReportData.push({ status: '警告', rows: `合併列 [${record.sourceRows.join(',')}]`, student: record.student_id, message: rowWarnings.join('、') });
                    } else {
                        successCount++;
                        state.globalImportReportData.push({ status: '成功', rows: `合併列 [${record.sourceRows.join(',')}]`, student: record.student_id, message: '完美匯入並綁定' });
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
        let csv = '\uFEFF狀態,Excel來源列,學號,詳細說明\n';
        state.globalImportReportData.forEach(r => csv += `"${r.status}","${r.rows}","${r.student}","${r.message}"\n`);
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `批次匯入結果報告_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    });

    container.querySelectorAll('.btn-close-report').forEach(btn => {
        btn.addEventListener('click', () => { document.getElementById('import-report-modal').classList.remove('open'); });
    });
    
    // 綁定連動機制
    container.querySelector('#input-allowance')?.addEventListener('change', handlePaymentFieldsCascade);
    container.querySelector('#input-payment-type')?.addEventListener('change', handlePaymentFieldsCascade);
    container.querySelector('#input-is-moe-compliant')?.addEventListener('change', handleMoeCascade);

    container.querySelector('#btn-create-record')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        state.editingId = null; state.selectedCourseIds = [];
        
        Render.populateAcademicYearDropdown();
        document.getElementById('input-academic-year').value = state.currentAcademicYear || '';
        
        const stuInput = document.getElementById('input-student');
        stuInput.value = ''; stuInput.dataset.docid = '';
        
        document.getElementById('input-grade').value = '';
        const instInput = document.getElementById('input-institution');
        instInput.value = ''; instInput.dataset.docid = '';
        document.getElementById('input-duration').value = '';
        document.getElementById('input-hours').value = '';
        document.getElementById('input-period-type').value = '';
        document.getElementById('input-proof-type').value = '';
        document.getElementById('input-insurance').value = '';
        document.getElementById('input-employment').value = '';
        
        document.getElementById('input-allowance').value = '';
        document.getElementById('input-payment-type').value = '';
        document.getElementById('input-payment-desc').value = '';
        document.getElementById('input-payment-amount').value = '';
        document.getElementById('input-funding').value = '';
        document.getElementById('input-opp-source').value = '';
        document.getElementById('input-job-type').value = '';

        document.getElementById('input-is-moe-compliant').value = '';
        document.getElementById('input-moe-reason').value = '';
        document.getElementById('input-dept-notes').value = '';
        document.getElementById('input-notes').value = '';
        
        document.getElementById('btn-info-student').disabled = true;
        document.getElementById('btn-info-inst').disabled = true;

        handlePaymentFieldsCascade();
        handleMoeCascade();

        Render.renderSelectedCourseChips();
        document.getElementById('input-resp-dept').innerHTML = '<option value="">請先選擇學生與關聯課程...</option>';
        UI.openFormModal(false);
    });

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
        
        handlePaymentFieldsCascade();
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

    container.querySelector('#btn-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        
        const durationInput = document.getElementById('input-duration').value.trim();
        const regex = /^\d{2,3}\/\d{2}\/\d{2}-\d{2,3}\/\d{2}\/\d{2}$/;
        if (!regex.test(durationInput)) { 
            UI.showToast("時間格式錯誤！格式應為：YYY/MM/DD-YYY/MM/DD", "warning"); 
            return; 
        }
        if (state.selectedCourseIds.length === 0) { 
            UI.showToast("請至少選擇一門關聯實習課程！", "warning"); 
            return; 
        }

        const stuInput = document.getElementById('input-student');
        const instInput = document.getElementById('input-institution');
        
        if (!stuInput.dataset.docid) { UI.showToast("請從下拉選單正確選擇學生", "warning"); return; }
        if (!instInput.dataset.docid) { UI.showToast("請從下拉選單正確選擇機構", "warning"); return; }

        const payload = {
            academic_year: document.getElementById('input-academic-year').value,
            student_doc_id: stuInput.dataset.docid,
            grade: document.getElementById('input-grade').value,
            inst_id: instInput.dataset.docid,
            period_type: document.getElementById('input-period-type').value,
            duration: durationInput,
            insurance: document.getElementById('input-insurance').value,
            employment: document.getElementById('input-employment').value,
            proof_type: document.getElementById('input-proof-type').value,
            hours: document.getElementById('input-hours').value ? Number(document.getElementById('input-hours').value) : '',
            allowance: document.getElementById('input-allowance').value,
            payment_type: document.getElementById('input-payment-type').value,
            payment_desc: document.getElementById('input-payment-desc').value.trim(),
            payment_amount: document.getElementById('input-payment-amount').value ? Number(document.getElementById('input-payment-amount').value) : '',
            funding: document.getElementById('input-funding').value,
            opp_source: document.getElementById('input-opp-source').value,
            job_type: document.getElementById('input-job-type').value,
            is_moe_compliant: document.getElementById('input-is-moe-compliant').value,
            moe_reason: document.getElementById('input-moe-reason').value.trim(),
            resp_dept: document.getElementById('input-resp-dept').value,
            dept_notes: document.getElementById('input-dept-notes').value.trim(),
            notes: document.getElementById('input-notes').value.trim(),
            courses: state.selectedCourseIds
        };
        
        const yearVal = parseInt(payload.academic_year, 10);
        if(!payload.academic_year || !payload.grade || !payload.period_type || !payload.proof_type || !payload.insurance || !payload.employment || !payload.resp_dept || !payload.allowance || !payload.funding || !payload.opp_source || !payload.job_type || !payload.is_moe_compliant) { 
            UI.showToast("請完成所有包含 * 號之必填選單與欄位設定！", "warning"); return; 
        }
        if (yearVal >= 113 && payload.allowance !== '無' && !payload.payment_type) {
            UI.showToast("113學年度起，若有實習待遇請務必填寫「給付類型」！", "warning"); return;
        }
        if (yearVal >= 113 && payload.payment_type === '其他' && !payload.payment_desc) {
            UI.showToast("選擇其他給付類型時，請填寫說明！", "warning"); return;
        }
        if (payload.is_moe_compliant === '不符合' && !payload.moe_reason) {
            UI.showToast("選擇不符合校庫填報時，必須填寫原因！", "warning"); return;
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

            Render.populateAcademicYearDropdown();
            document.getElementById('input-academic-year').value = data.academic_year || '';

            const stu = state.allStudents.find(s => s.id === data.student_doc_id);
            const stuInput = document.getElementById('input-student');
            stuInput.value = stu ? `${stu.student_id} - ${stu.name}` : '';
            stuInput.dataset.docid = data.student_doc_id || '';
            
            const inst = state.allInsts.find(i => i.id === data.inst_id);
            const instInput = document.getElementById('input-institution');
            instInput.value = inst ? inst.name : ''; 
            instInput.dataset.docid = data.inst_id || '';
            
            document.getElementById('input-duration').value = data.duration || '';
            document.getElementById('input-hours').value = data.hours !== undefined && data.hours !== '' ? data.hours : '';
            document.getElementById('input-grade').value = data.grade || '';
            document.getElementById('input-period-type').value = data.period_type || '';
            document.getElementById('input-proof-type').value = data.proof_type || '';
            document.getElementById('input-insurance').value = data.insurance || '';
            document.getElementById('input-employment').value = data.employment || '';

            document.getElementById('input-allowance').value = data.allowance || '';
            
            let options = '<option value="">請選擇</option>';
            if (data.allowance === '工資') options += '<option value="月薪">月薪</option><option value="時薪">時薪</option><option value="其他">其他</option>';
            else if (data.allowance === '獎學金' || data.allowance === '津貼') options += '<option value="月給">月給</option><option value="一次性">一次性</option><option value="其他">其他</option>';
            document.getElementById('input-payment-type').innerHTML = options;

            document.getElementById('input-payment-type').value = data.payment_type || '';
            document.getElementById('input-payment-desc').value = data.payment_desc || '';
            document.getElementById('input-payment-amount').value = data.payment_amount !== undefined && data.payment_amount !== '' ? data.payment_amount : '';
            document.getElementById('input-funding').value = data.funding || '';
            document.getElementById('input-opp-source').value = data.opp_source || '';
            document.getElementById('input-job-type').value = data.job_type || '';
            document.getElementById('input-is-moe-compliant').value = data.is_moe_compliant || '';
            document.getElementById('input-moe-reason').value = data.moe_reason || '';
            document.getElementById('input-dept-notes').value = data.dept_notes || '';
            document.getElementById('input-notes').value = data.notes || '';
            
            document.getElementById('btn-info-student').disabled = !stu;
            document.getElementById('btn-info-inst').disabled = !inst;

            handlePaymentFieldsCascade();
            handleMoeCascade();

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
        e.target.dataset.docid = ''; 
        document.getElementById('student-dropdown').classList.add('show'); 
        Render.renderStudentDropdown(state.allStudents, e.target.value); 
        document.getElementById('btn-info-student').disabled = true;
        UI.updateRespDeptOptions();
    });
    
    container.querySelector('#input-institution')?.addEventListener('input', (e) => { 
        e.target.dataset.docid = ''; 
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
