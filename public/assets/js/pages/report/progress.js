import { doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);

    // 1. 初始渲染基礎外框與讀取動畫 (維持原樣)
    container.innerHTML = `
    <div class="p-6 space-y-6 h-full custom-scroll overflow-y-auto" style="background: var(--bg);">
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                    <i class="ti ti-activity"></i>
                </div>
                <div>
                    <h1 class="text-sm font-bold text-gray-900">填報進度追蹤</h1>
                    <p class="text-[11px] text-gray-400 mt-0.5" id="progress-subtitle">正在讀取預設學年度參數...</p>
                </div>
            </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fade">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <i class="ti ti-list-check text-blue-600"></i> 各系所填報進度概況
                </h3>
                <span id="global-save-status" class="text-xs font-bold text-emerald-600 opacity-0 transition-opacity duration-300">設定已自動儲存</span>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <th class="py-3 px-6">開課系所</th>
                            <th class="py-3 px-6 w-48">應填報人次 (目標)</th>
                            <th class="py-3 px-6 w-48">已上傳人次 (實績)</th>
                            <th class="py-3 px-6 w-40">填報率</th>
                        </tr>
                    </thead>
                    <tbody id="progress-table-body" class="divide-y divide-gray-100 text-sm">
                        <tr>
                            <td colspan="4" class="py-8 text-center text-gray-400">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <i class="ti ti-loader-2 ti-spin text-xl text-blue-600"></i>
                                    <span class="text-xs">正在彙整填報人次與進度資料...</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    const subtitleEl = document.getElementById('progress-subtitle');
    const tbodyEl = document.getElementById('progress-table-body');
    const globalStatusEl = document.getElementById('global-save-status');

    try {
        // 2. 獲取預設學年度
        const reportSettingsSnap = await getDoc(doc(db, "settings", "report"));
        if (!reportSettingsSnap.exists() || !reportSettingsSnap.data().default_academic_year) {
            tbodyEl.innerHTML = `
                <tr>
                    <td colspan="4" class="py-8 text-center text-red-500 font-medium">
                        <i class="ti ti-alert-triangle mr-1"></i> 請先至「填報格式設定」設定預設學年度。
                    </td>
                </tr>
            `;
            subtitleEl.textContent = "尚未設定預設學年度";
            return;
        }

        const defaultYear = reportSettingsSnap.data().default_academic_year.toString().trim();
        subtitleEl.textContent = `當前統計學年度：${defaultYear} 學年度`;

        // 🌟【修正一】：改抓 internship_courses
        const coursesQuery = query(
            collection(db, "internship_courses"), 
            where("academic_year", "==", defaultYear)
        );
        const coursesSnap = await getDocs(coursesQuery);
        
        const targetCourseMap = {};
        const departmentSet = new Set();

        coursesSnap.forEach(d => {
            const cData = d.data();
            const code = cData.course_code ? cData.course_code.trim() : '';
            const dept = cData.department ? cData.department.trim() : (cData.dept ? cData.dept.trim() : '');
            
            if (code && dept) {
                targetCourseMap[code] = dept;
                departmentSet.add(dept);
            }
        });

        if (departmentSet.size === 0) {
            tbodyEl.innerHTML = `
                <tr>
                    <td colspan="4" class="py-8 text-center text-gray-400">
                        <i class="ti ti-info-circle mr-1"></i> ${defaultYear} 學年度查無任何開課明細資料。
                    </td>
                </tr>
            `;
            return;
        }

        // 4. 計算已上傳人次
        const uploadedCountMap = {};
        departmentSet.forEach(dept => uploadedCountMap[dept] = 0);

        // 🌟【修正二】：改抓 internship_records
        const recordsSnap = await getDocs(collection(db, "internship_records"));
        
        recordsSnap.forEach(d => {
            const rData = d.data();
            
            // 由於您的 records 中紀錄課程的欄位可能是 courses (陣列, 裝著 course id 或 object)
            // 我們這裡擴充相容性，以防 records 裡面存的是 course_code 或 courses
            let assignedCodes = [];
            
            if (Array.isArray(rData.course_codes)) {
                assignedCodes = rData.course_codes.map(c => typeof c === 'object' ? c.course_code : c);
            } else if (Array.isArray(rData.courses)) {
                // 如果存的是字串陣列，假設裡面有包含代碼或是ID
                assignedCodes = rData.courses.map(c => typeof c === 'object' ? c.course_code : c);
            } else if (rData.course_code) {
                assignedCodes = [rData.course_code];
            }

            assignedCodes.forEach(code => {
                const cleanedCode = code ? code.toString().trim() : '';
                if (targetCourseMap[cleanedCode]) {
                    const deptOfCourse = targetCourseMap[cleanedCode];
                    if (uploadedCountMap[deptOfCourse] !== undefined) {
                        uploadedCountMap[deptOfCourse]++;
                    }
                }
            });
        });

        // 5. 撈取應填報人次
        const progressTargetSnap = await getDoc(doc(db, "report_progress", defaultYear));
        const savedTargets = progressTargetSnap.exists() ? (progressTargetSnap.data().targets || {}) : {};

        // 6. 排序並渲染表格
        const sortedDepts = Array.from(departmentSet).sort();
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
                progressBarColor = percentVal >= 100 ? 'bg-emerald-500' : 'bg-blue-600';
            }

            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50/50 transition-colors";
            tr.innerHTML = `
                <td class="py-3.5 px-6 font-medium text-gray-900">${dept}</td>
                <td class="py-3.5 px-6">
                    <div class="relative max-w-[140px]">
                        <input type="number" data-dept="${dept}" value="${target}" placeholder="請輸入" min="0"
                            class="target-input w-full h-9 border border-gray-200 rounded-lg px-3 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white font-semibold text-gray-700" />
                    </div>
                </td>
                <td class="py-3.5 px-6 font-bold text-gray-600">${uploaded} 人次</td>
                <td class="py-3.5 px-6">
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-xs min-w-[36px] text-right ${percentVal >= 100 ? 'text-emerald-600' : 'text-gray-700'}">${percentText}</span>
                        ${target ? `
                        <div class="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div class="${progressBarColor} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(percentVal, 100)}%"></div>
                        </div>` : ''}
                    </div>
                </td>
            `;
            tbodyEl.appendChild(tr);
        });

        // 7. 綁定輸入儲存事件
        const inputs = tbodyEl.querySelectorAll('.target-input');
        inputs.forEach(input => {
            input.addEventListener('change', async (e) => {
                const currentDept = e.target.getAttribute('data-dept');
                let inputVal = e.target.value.trim();
                
                if (inputVal !== '') {
                    inputVal = Math.max(0, parseInt(inputVal, 10));
                    e.target.value = inputVal;
                }

                updateRowUi(trOfInput(e.target), inputVal, uploadedCountMap[currentDept]);

                const newTargets = {};
                inputs.forEach(inp => {
                    const d = inp.getAttribute('data-dept');
                    const v = inp.value.trim();
                    if (v !== '') newTargets[d] = parseInt(v, 10);
                });

                try {
                    showGlobalStatus("儲存中...", "loading");
                    await setDoc(doc(db, "report_progress", defaultYear), {
                        targets: newTargets,
                        updated_at: new Date()
                    }, { merge: true });
                    showGlobalStatus("變更已自動儲存", "success");
                } catch (err) {
                    console.error("更新應填報人次失敗:", err);
                    showGlobalStatus("自動儲存失敗", "error");
                }
            });
        });

    } catch (error) {
        console.error("彙整填報進度時發生異常:", error);
        tbodyEl.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-red-500 font-medium">
                    <i class="ti ti-alert-triangle mr-1"></i> 資料整合載入異常：${error.message}
                </td>
            </tr>
        `;
    }

    function trOfInput(inputEl) { return inputEl.closest('tr'); }

    function updateRowUi(trEl, targetVal, uploadedVal) {
        const rateCell = trEl.cells[3];
        if (targetVal === '' || parseInt(targetVal, 10) <= 0) {
            rateCell.innerHTML = `<div class="flex items-center gap-3"><span class="font-bold text-xs min-w-[36px] text-right text-gray-700">-</span></div>`;
            return;
        }
        const percentVal = Math.round((uploadedVal / parseInt(targetVal, 10)) * 100);
        const barColor = percentVal >= 100 ? 'bg-emerald-500' : 'bg-blue-600';
        
        rateCell.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-xs min-w-[36px] text-right ${percentVal >= 100 ? 'text-emerald-600' : 'text-gray-700'}">${percentVal}%</span>
                <div class="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                    <div class="${barColor} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(percentVal, 100)}%"></div>
                </div>
            </div>
        `;
    }

    let statusTimeout = null;
    function showGlobalStatus(text, type) {
        clearTimeout(statusTimeout);
        globalStatusEl.textContent = text;
        if (type === 'success') globalStatusEl.className = "text-xs font-bold text-emerald-600 opacity-100 transition-opacity";
        else if (type === 'error') globalStatusEl.className = "text-xs font-bold text-red-600 opacity-100 transition-opacity";
        else globalStatusEl.className = "text-xs font-bold text-gray-400 opacity-100 transition-opacity";

        if (type !== 'loading') {
            statusTimeout = setTimeout(() => {
                globalStatusEl.classList.replace('opacity-100', 'opacity-0');
            }, 2500);
        }
    }
}
