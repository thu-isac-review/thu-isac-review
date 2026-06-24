import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);
 
    // 1. 初始渲染：加入名單管理的 Modal 結構
    container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 16px; background: var(--bg); gap: 16px; position: relative;">
        
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                    <i class="ti ti-activity"></i>
                </div>
                <div>
                    <h1 class="text-sm font-bold text-gray-900">填報進度追蹤</h1>
                    <p class="text-[11px] text-gray-400 mt-0.5" id="progress-subtitle">正在讀取預設學年度與系所參數...</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span id="global-save-status" class="text-xs font-bold text-emerald-600 opacity-0 transition-opacity duration-300 mr-2"></span>
                <button id="btn-refresh-progress" class="btn btn-secondary btn-sm" style="font-weight: 500;">
                    <i class="ti ti-refresh"></i> 重新計算
                </button>
            </div>
        </div>

        <div class="table-wrap flex-1 min-h-0 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col relative overflow-hidden animate-fade">
            <div class="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                <h3 class="text-[13px] font-bold text-gray-800 flex items-center gap-2">
                    <i class="ti ti-list-check text-blue-600"></i> 各系所填報進度概況
                </h3>
            </div>
            
            <div class="table-scroll custom-scroll flex-1 overflow-y-auto relative">
                <table class="w-full text-left border-collapse" style="min-width: 800px;">
                    <thead class="sticky top-0 z-10 shadow-sm">
                        <tr class="bg-gray-50 border-b border-gray-200 text-[12px] font-bold text-gray-600 tracking-wider">
                            <th class="py-3.5 px-6 whitespace-nowrap">系所名稱</th>
                            <th class="py-3.5 px-6 w-40 whitespace-nowrap">應填報 (目標)</th>
                            <th class="py-3.5 px-6 w-40 whitespace-nowrap">已上傳 (實績)</th>
                            <th class="py-3.5 px-6 w-40 whitespace-nowrap">填報率</th>
                            <th class="py-3.5 px-6 w-32 whitespace-nowrap text-center">名單管理</th>
                        </tr>
                    </thead>
                    <tbody id="progress-table-body" class="divide-y divide-gray-100 text-[13px]">
                        <tr>
                            <td colspan="5" class="py-12 text-center text-gray-400">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <i class="ti ti-loader-2 ti-spin text-2xl text-brand"></i>
                                    <span class="text-xs">正在深度彙整課程與填報人次...</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="roster-modal" class="fixed inset-0 bg-gray-900/60 z-[9999] hidden items-center justify-center opacity-0 transition-opacity duration-300">
            <div class="bg-white rounded-xl shadow-2xl w-[900px] max-w-[95vw] h-[80vh] max-h-[800px] flex flex-col transform scale-95 transition-transform duration-300 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
                    <h3 class="font-bold text-gray-800 text-[15px] flex items-center gap-2">
                        <i class="ti ti-users-group text-blue-600 text-lg"></i>
                        <span id="roster-modal-title">修課名單管理</span>
                    </h3>
                    <button id="btn-close-roster" class="text-gray-400 hover:text-red-500 transition bg-white border border-gray-200 rounded-md p-1 shadow-sm"><i class="ti ti-x text-lg"></i></button>
                </div>
                <div class="flex-1 flex overflow-hidden">
                    <div class="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/30">
                        <div class="px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 tracking-wider">選擇實習課程</div>
                        <div id="roster-course-list" class="flex-1 overflow-y-auto custom-scroll p-2 space-y-1"></div>
                    </div>
                    <div class="w-2/3 flex flex-col bg-white relative">
                        <div class="px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 flex justify-between items-center bg-gray-50/50">
                            <span id="roster-student-title" class="tracking-wider">請由左側選擇課程</span>
                            <span id="roster-student-count" class="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-bold hidden"></span>
                        </div>
                        <div id="roster-student-list" class="flex-1 overflow-y-auto custom-scroll p-4">
                            <div class="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                                <i class="ti ti-hand-click text-4xl text-gray-300"></i>
                                <span class="text-sm font-medium">點擊左側課程檢視修課名單</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    const subtitleEl = document.getElementById('progress-subtitle');
    const tbodyEl = document.getElementById('progress-table-body');
    const globalStatusEl = document.getElementById('global-save-status');

    // Modal 變數
    const rosterModal = document.getElementById('roster-modal');
    const rosterModalBox = rosterModal.querySelector('div');
    const rosterCourseList = document.getElementById('roster-course-list');
    const rosterStudentList = document.getElementById('roster-student-list');
    
    let currentDefaultYear = "";
    let systemDeptSortMap = {};

    async function loadAndCalculateProgress() {
        try {
            const reportSettingsSnap = await getDoc(doc(db, "settings", "report"));
            if (!reportSettingsSnap.exists() || !reportSettingsSnap.data().default_academic_year) {
                tbodyEl.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-500 font-medium"><i class="ti ti-alert-triangle mr-1"></i> 請先至「填報格式設定」設定預設學年度。</td></tr>`;
                subtitleEl.textContent = "尚未設定預設學年度";
                return;
            }
            currentDefaultYear = reportSettingsSnap.data().default_academic_year.toString().trim();
            subtitleEl.textContent = `當前統計學年度：${currentDefaultYear} 學年度`;

            const deptsSnap = await getDocs(collection(db, "departments"));
            deptsSnap.forEach(doc => {
                const data = doc.data();
                if (data.name) systemDeptSortMap[data.name.trim()] = data.sortOrder || 999;
            });

            const coursesQuery = query(collection(db, "internship_courses"), where("academic_year", "==", currentDefaultYear));
            const coursesSnap = await getDocs(coursesQuery);
            
            const targetCourseMap = {};
            const departmentSet = new Set();

            coursesSnap.forEach(d => {
                const cData = d.data();
                const dept = cData.department ? cData.department.trim() : (cData.dept ? cData.dept.trim() : '');
                if (dept) {
                    targetCourseMap[d.id] = dept;
                    departmentSet.add(dept);
                }
            });

            if (departmentSet.size === 0) {
                tbodyEl.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-400"><i class="ti ti-info-circle mr-1"></i> ${currentDefaultYear} 學年度查無任何開課明細資料。</td></tr>`;
                return;
            }

            const uploadedCountMap = {};
            const recordsSnap = await getDocs(collection(db, "internship_records"));
            
            recordsSnap.forEach(d => {
                const rData = d.data();
                let courseIds = [];
                
                if (Array.isArray(rData.courses)) {
                    courseIds = rData.courses.map(c => typeof c === 'object' ? (c.id || c.course_id) : c);
                } else if (rData.course_id) {
                    courseIds = [rData.course_id];
                }

                courseIds.forEach(cId => {
                    const cleanedId = cId ? cId.toString().trim() : '';
                    if (targetCourseMap[cleanedId]) {
                        const courseDept = targetCourseMap[cleanedId];
                        let targetDept = courseDept;
                        if (rData.resp_dept && rData.resp_dept.trim()) {
                            targetDept = rData.resp_dept.trim();
                        }
                        departmentSet.add(targetDept);
                        if (uploadedCountMap[targetDept] === undefined) uploadedCountMap[targetDept] = 0;
                        uploadedCountMap[targetDept]++;
                    }
                });
            });

            const progressTargetSnap = await getDoc(doc(db, "report_progress", currentDefaultYear));
            const savedTargets = progressTargetSnap.exists() ? (progressTargetSnap.data().targets || {}) : {};

            const sortedDepts = Array.from(departmentSet).sort((a, b) => {
                const orderA = systemDeptSortMap[a] !== undefined ? systemDeptSortMap[a] : 999;
                const orderB = systemDeptSortMap[b] !== undefined ? systemDeptSortMap[b] : 999;
                return orderA - orderB || a.localeCompare(b);
            });

            tbodyEl.innerHTML = '';
            sortedDepts.forEach(dept => {
                const uploaded = uploadedCountMap[dept] || 0;
                const target = savedTargets[dept] !== undefined ? savedTargets[dept] : '';
                
                let percentText = '-';
                let progressBarColor = 'bg-gray-200';
                let percentVal = 0;
                
                if (target && parseInt(target, 10) > 0) {
                    percentVal = Math.round((uploaded / parseInt(target, 10)) * 100);
                    percentText = `${percentVal}%`;
                    progressBarColor = percentVal >= 100 ? 'bg-emerald-500' : 'bg-brand';
                }

                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50/80 transition-colors";
                tr.innerHTML = `
                    <td class="py-3.5 px-6 font-semibold text-gray-800">${dept}</td>
                    <td class="py-3.5 px-6">
                        <div class="relative max-w-[140px]">
                            <input type="number" data-dept="${dept}" value="${target}" placeholder="手動輸入" min="0"
                                class="target-input w-full h-8 border border-gray-300 rounded px-2.5 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all bg-white font-bold text-gray-700" />
                        </div>
                    </td>
                    <td class="py-3.5 px-6 font-bold text-gray-600">${uploaded} <span class="text-xs font-normal text-gray-400">人次</span></td>
                    <td class="py-3.5 px-6">
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-xs min-w-[36px] text-right ${percentVal >= 100 ? 'text-emerald-600' : 'text-gray-700'}">${percentText}</span>
                            ${target ? `
                            <div class="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div class="${progressBarColor} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(percentVal, 100)}%"></div>
                            </div>` : ''}
                        </div>
                    </td>
                    <td class="py-3.5 px-6 text-center">
                        <button class="btn-manage-roster inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-[13px] font-bold transition-colors shadow-sm" data-dept="${dept}">
                            <i class="ti ti-list-details"></i> 名單
                        </button>
                    </td>
                `;
                tbodyEl.appendChild(tr);
            });

            // 綁定手動輸入變更事件
            const inputs = tbodyEl.querySelectorAll('.target-input');
            inputs.forEach(input => {
                input.addEventListener('change', async (e) => {
                    const currentDept = e.target.getAttribute('data-dept');
                    let inputVal = e.target.value.trim();
                    if (inputVal !== '') { inputVal = Math.max(0, parseInt(inputVal, 10)); e.target.value = inputVal; }
                    updateRowUi(e.target.closest('tr'), inputVal, uploadedCountMap[currentDept]);
                    syncTargetsToDB(inputs);
                });
            });

            // 🌟 綁定名單管理按鈕事件
            const btnManage = tbodyEl.querySelectorAll('.btn-manage-roster');
            btnManage.forEach(btn => {
                btn.addEventListener('click', () => openRosterModal(btn.getAttribute('data-dept')));
            });

        } catch (error) {
            console.error("彙整異常:", error);
            tbodyEl.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-500 font-medium"><i class="ti ti-alert-triangle mr-1"></i> 資料整合異常：${error.message}</td></tr>`;
        }
    }

    // ---------------- 名單管理 Modal 核心邏輯 ----------------
    
    async function openRosterModal(deptName) {
        document.getElementById('roster-modal-title').textContent = `${deptName} - 修課名單管理`;
        rosterCourseList.innerHTML = `<div class="flex items-center justify-center p-4 text-gray-400"><i class="ti ti-loader-2 ti-spin text-xl"></i></div>`;
        rosterStudentList.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400 gap-3"><i class="ti ti-hand-click text-4xl text-gray-300"></i><span class="text-sm font-medium">請點擊左側課程檢視名單</span></div>`;
        document.getElementById('roster-student-title').textContent = "請由左側選擇課程";
        document.getElementById('roster-student-count').classList.add('hidden');

        // 顯示動畫
        rosterModal.classList.remove('hidden');
        rosterModal.classList.add('flex');
        setTimeout(() => {
            rosterModal.classList.remove('opacity-0');
            rosterModalBox.classList.remove('scale-95');
        }, 10);

        try {
            // 從我們剛剛建立的匯入表 (course_rosters) 中，找出該系所在該學年度的所有名單
            const q = query(collection(db, "course_rosters"), where("academic_year", "==", currentDefaultYear), where("course_dept", "==", deptName));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                rosterCourseList.innerHTML = `<div class="p-4 text-center text-xs text-gray-500 leading-relaxed bg-white border border-dashed border-gray-200 rounded-lg m-2">尚未匯入本系所名單<br><span class="text-[10px] text-gray-400">請至「修課名單匯入」上傳</span></div>`;
                return;
            }

            rosterCourseList.innerHTML = '';
            snap.forEach(docSnap => {
                const course = docSnap.data();
                const btn = document.createElement('div');
                btn.className = "course-item p-3 mb-1 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group";
                btn.innerHTML = `
                    <div class="text-[13px] font-bold text-gray-800 group-hover:text-blue-700 line-clamp-1">${course.course_name}</div>
                    <div class="text-[11px] text-gray-500 mt-1 flex justify-between items-center">
                        <span>代碼: ${course.course_code}</span>
                        <span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold" id="badge-count-${docSnap.id}">${course.enroll_count} 人</span>
                    </div>
                `;
                btn.addEventListener('click', () => loadStudents(docSnap.id, course, btn, deptName));
                rosterCourseList.appendChild(btn);
            });
        } catch (error) {
            rosterCourseList.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">讀取失敗</div>`;
        }
    }

    async function loadStudents(docId, courseData, btnElement, deptName) {
        // 更新左側選取狀態
        document.querySelectorAll('.course-item').forEach(el => el.classList.remove('ring-2', 'ring-blue-500', 'border-transparent'));
        btnElement.classList.add('ring-2', 'ring-blue-500', 'border-transparent');

        document.getElementById('roster-student-title').textContent = `修課名單：${courseData.course_name} (${courseData.course_code})`;
        const countBadge = document.getElementById('roster-student-count');
        countBadge.textContent = `共 ${courseData.enroll_count} 人`;
        countBadge.classList.remove('hidden');

        if (!courseData.students || courseData.students.length === 0) {
            rosterStudentList.innerHTML = `<div class="text-center text-gray-400 py-10 text-sm">目前此課程無學生資料</div>`;
            return;
        }

        renderStudentTable(docId, courseData, deptName);
    }

    function renderStudentTable(docId, courseData, deptName) {
        let html = `
            <table class="w-full text-left border-collapse border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th class="py-2.5 px-4">學號</th>
                        <th class="py-2.5 px-4">姓名</th>
                        <th class="py-2.5 px-4">系級</th>
                        <th class="py-2.5 px-4 text-right">退選/刪除</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-[13px]">
        `;

        courseData.students.forEach(s => {
            html += `
                <tr class="hover:bg-red-50/30 transition-colors group">
                    <td class="py-2.5 px-4 font-medium text-gray-700">${s.student_id}</td>
                    <td class="py-2.5 px-4 font-bold text-gray-900">${s.student_name}</td>
                    <td class="py-2.5 px-4 text-gray-500">${s.student_dept} ${s.student_grade || ''}</td>
                    <td class="py-2.5 px-4 text-right">
                        <button class="btn-remove-student text-gray-400 hover:text-white hover:bg-red-500 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" data-id="${s.student_id}" data-name="${s.student_name}" title="刪除此學生">
                            <i class="ti ti-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        rosterStudentList.innerHTML = html;

        // 綁定精準刪除 (退選) 事件
        rosterStudentList.querySelectorAll('.btn-remove-student').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sId = btn.getAttribute('data-id');
                const sName = btn.getAttribute('data-name');
                if (confirm(`【退選確認】\n確定要將學生 ${sName} (${sId}) 從此課程名單中剔除嗎？\n⚠️ 此動作將同步下修「${deptName}」的應填報目標人次。`)) {
                    await removeStudentFromRoster(docId, courseData, sId, deptName);
                }
            });
        });
    }

    async function removeStudentFromRoster(docId, courseData, studentIdToRemove, deptName) {
        const originalHtml = rosterStudentList.innerHTML;
        rosterStudentList.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-blue-600 gap-2"><i class="ti ti-loader-2 ti-spin text-3xl"></i><span class="text-sm font-bold">正在安全剔除資料並校正人次...</span></div>`;

        try {
            // 1. 剔除學生，計算新陣列與人數
            const newStudents = courseData.students.filter(s => s.student_id !== studentIdToRemove);
            courseData.students = newStudents;
            courseData.enroll_count = newStudents.length;

            // 2. 寫入名單資料表
            await updateDoc(doc(db, "course_rosters", docId), {
                students: newStudents,
                enroll_count: newStudents.length,
                updated_at: new Date()
            });

            // 3. 自動扣除填報進度表的目標人次
            const pRef = doc(db, "report_progress", currentDefaultYear);
            const pSnap = await getDoc(pRef);
            if(pSnap.exists()) {
                let targets = pSnap.data().targets || {};
                if(targets[deptName] > 0) {
                    targets[deptName] = targets[deptName] - 1;
                    await setDoc(pRef, { targets }, { merge: true });
                }
            }

            // 4. 更新畫面 (左側徽章、右側表格、主表格背景 Input)
            document.getElementById(`badge-count-${docId}`).textContent = `${newStudents.length} 人`;
            document.getElementById('roster-student-count').textContent = `共 ${newStudents.length} 人`;
            renderStudentTable(docId, courseData, deptName);

            // 更新背後的進度追蹤 Table Input 數值
            const deptInput = document.querySelector(`input.target-input[data-dept="${deptName}"]`);
            if (deptInput) {
                const currentVal = parseInt(deptInput.value, 10) || 0;
                deptInput.value = Math.max(0, currentVal - 1);
                // 觸發重新計算填報率
                deptInput.dispatchEvent(new Event('change')); 
            }

        } catch (err) {
            console.error("刪除學生失敗:", err);
            alert("刪除失敗，請檢查網路狀態或權限");
            rosterStudentList.innerHTML = originalHtml; // 恢復
        }
    }

    // Modal 開關控制
    document.getElementById('btn-close-roster').addEventListener('click', closeRosterModal);
    
    function closeRosterModal() {
        rosterModal.classList.add('opacity-0');
        rosterModalBox.classList.add('scale-95');
        setTimeout(() => {
            rosterModal.classList.add('hidden');
            rosterModal.classList.remove('flex');
        }, 300);
    }


    // --- 輔助函式區塊 ---
    function updateRowUi(trEl, targetVal, uploadedVal) {
        if(!trEl) return;
        const rateCell = trEl.cells[3];
        if (targetVal === '' || parseInt(targetVal, 10) <= 0) {
            rateCell.innerHTML = `<div class="flex items-center gap-3"><span class="font-bold text-xs min-w-[36px] text-right text-gray-400">-</span></div>`;
            return;
        }
        const percentVal = Math.round((uploadedVal / parseInt(targetVal, 10)) * 100);
        const barColor = percentVal >= 100 ? 'bg-emerald-500' : 'bg-brand';
        
        rateCell.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-xs min-w-[36px] text-right ${percentVal >= 100 ? 'text-emerald-600' : 'text-gray-700'}">${percentVal}%</span>
                <div class="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                    <div class="${barColor} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(percentVal, 100)}%"></div>
                </div>
            </div>
        `;
    }

    async function syncTargetsToDB(inputs) {
        const newTargets = {};
        inputs.forEach(inp => {
            const d = inp.getAttribute('data-dept');
            const v = inp.value.trim();
            if (v !== '') newTargets[d] = parseInt(v, 10);
        });
        try {
            showGlobalStatus("儲存中...", "loading");
            await setDoc(doc(db, "report_progress", currentDefaultYear), { targets: newTargets, updated_at: new Date() }, { merge: true });
            showGlobalStatus("進度目標已更新", "success");
        } catch (err) {
            showGlobalStatus("儲存失敗", "error");
        }
    }

    let statusTimeout = null;
    function showGlobalStatus(text, type) {
        clearTimeout(statusTimeout);
        globalStatusEl.innerHTML = type === 'loading' ? `<i class="ti ti-loader-2 ti-spin mr-1"></i>${text}` : `<i class="ti ti-check mr-1"></i>${text}`;
        if (type === 'success') globalStatusEl.className = "text-xs font-bold text-emerald-600 opacity-100 transition-opacity mr-2";
        else if (type === 'error') globalStatusEl.className = "text-xs font-bold text-red-600 opacity-100 transition-opacity mr-2";
        else globalStatusEl.className = "text-xs font-bold text-gray-400 opacity-100 transition-opacity mr-2";
        if (type !== 'loading') { statusTimeout = setTimeout(() => { globalStatusEl.classList.replace('opacity-100', 'opacity-0'); }, 2500); }
    }

    // 觸發首次載入
    loadAndCalculateProgress();
    document.getElementById('btn-refresh-progress')?.addEventListener('click', () => {
        tbodyEl.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gray-400"><div class="flex flex-col items-center justify-center gap-2"><i class="ti ti-loader-2 ti-spin text-2xl text-brand"></i><span class="text-xs">重新計算中...</span></div></td></tr>`;
        loadAndCalculateProgress();
    });
}
