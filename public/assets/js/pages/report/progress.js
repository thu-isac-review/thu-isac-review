import { doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);

    // 1. 初始渲染：採用與「實習紀錄管理」相同的滿版 Flex 與表格滾動結構
    container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 16px; background: var(--bg); gap: 16px;">
        
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
                <table class="w-full text-left border-collapse" style="min-width: 700px;">
                    <thead class="sticky top-0 z-10 shadow-sm">
                        <tr class="bg-gray-50 border-b border-gray-200 text-[12px] font-bold text-gray-600 tracking-wider">
                            <th class="py-3.5 px-6 whitespace-nowrap">系所名稱</th>
                            <th class="py-3.5 px-6 w-48 whitespace-nowrap">應填報人次 (目標)</th>
                            <th class="py-3.5 px-6 w-48 whitespace-nowrap">已上傳人次 (實績)</th>
                            <th class="py-3.5 px-6 w-40 whitespace-nowrap">填報率</th>
                        </tr>
                    </thead>
                    <tbody id="progress-table-body" class="divide-y divide-gray-100 text-[13px]">
                        <tr>
                            <td colspan="4" class="py-12 text-center text-gray-400">
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
    </div>
    `;

    const subtitleEl = document.getElementById('progress-subtitle');
    const tbodyEl = document.getElementById('progress-table-body');
    const globalStatusEl = document.getElementById('global-save-status');

    async function loadAndCalculateProgress() {
        try {
            // 2. 獲取預設學年度
            const reportSettingsSnap = await getDoc(doc(db, "settings", "report"));
            if (!reportSettingsSnap.exists() || !reportSettingsSnap.data().default_academic_year) {
                tbodyEl.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-500 font-medium"><i class="ti ti-alert-triangle mr-1"></i> 請先至「填報格式設定」設定預設學年度。</td></tr>`;
                subtitleEl.textContent = "尚未設定預設學年度";
                return;
            }
            const defaultYear = reportSettingsSnap.data().default_academic_year.toString().trim();
            subtitleEl.textContent = `當前統計學年度：${defaultYear} 學年度`;

            // 3. 獲取系統全域系所排序設定 (解決排序問題)
            const deptSortMap = {};
            const deptsSnap = await getDocs(collection(db, "departments"));
            deptsSnap.forEach(doc => {
                const data = doc.data();
                if (data.name) deptSortMap[data.name.trim()] = data.sortOrder || 999;
            });

            // 4. 抓取本學年度的實習課程，建立 Document ID 對應表
            const coursesQuery = query(collection(db, "internship_courses"), where("academic_year", "==", defaultYear));
            const coursesSnap = await getDocs(coursesQuery);
            
            // 結構: { "course_doc_id": "開課系所名稱" }
            const targetCourseMap = {};
            const departmentSet = new Set();

            coursesSnap.forEach(d => {
                const cData = d.data();
                const dept = cData.department ? cData.department.trim() : (cData.dept ? cData.dept.trim() : '');
                if (dept) {
                    targetCourseMap[d.id] = dept; // 🌟 關鍵修正：記錄 Document ID
                    departmentSet.add(dept);
                }
            });

            if (departmentSet.size === 0) {
                tbodyEl.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-gray-400"><i class="ti ti-info-circle mr-1"></i> ${defaultYear} 學年度查無任何開課明細資料。</td></tr>`;
                return;
            }

            // 5. 掃描實習紀錄計算已上傳人次
            const uploadedCountMap = {};
            const recordsSnap = await getDocs(collection(db, "internship_records"));
            
            recordsSnap.forEach(d => {
                const rData = d.data();
                let courseIds = [];
                
                // 🌟 關鍵修正：從紀錄中取出關聯的 Course Document ID
                if (Array.isArray(rData.courses)) {
                    courseIds = rData.courses.map(c => typeof c === 'object' ? (c.id || c.course_id) : c);
                } else if (rData.course_id) {
                    courseIds = [rData.course_id];
                }

                courseIds.forEach(cId => {
                    const cleanedId = cId ? cId.toString().trim() : '';
                    
                    // 若這門課屬於目前統計的學年度
                    if (targetCourseMap[cleanedId]) {
                        const courseDept = targetCourseMap[cleanedId];
                        
                        // 🌟 關鍵修正：人次歸屬邏輯 (填報系所優先於開課系所)
                        let targetDept = courseDept;
                        if (rData.resp_dept && rData.resp_dept.trim()) {
                            targetDept = rData.resp_dept.trim();
                        }

                        // 確保該系所有被加入清單中
                        departmentSet.add(targetDept);

                        // 累加該系所的人次
                        if (uploadedCountMap[targetDept] === undefined) {
                            uploadedCountMap[targetDept] = 0;
                        }
                        uploadedCountMap[targetDept]++;
                    }
                });
            });

            // 6. 撈取應填報人次設定檔
            const progressTargetSnap = await getDoc(doc(db, "report_progress", defaultYear));
            const savedTargets = progressTargetSnap.exists() ? (progressTargetSnap.data().targets || {}) : {};

            // 7. 依照後台系所權重設定進行排序
            const sortedDepts = Array.from(departmentSet).sort((a, b) => {
                const orderA = deptSortMap[a] !== undefined ? deptSortMap[a] : 999;
                const orderB = deptSortMap[b] !== undefined ? deptSortMap[b] : 999;
                return orderA - orderB || a.localeCompare(b);
            });

            // 8. 渲染表格
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
                            <input type="number" data-dept="${dept}" value="${target}" placeholder="請輸入" min="0"
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
                `;
                tbodyEl.appendChild(tr);
            });

            // 9. 綁定輸入儲存事件 (自動儲存)
            const inputs = tbodyEl.querySelectorAll('.target-input');
            inputs.forEach(input => {
                input.addEventListener('change', async (e) => {
                    const currentDept = e.target.getAttribute('data-dept');
                    let inputVal = e.target.value.trim();
                    
                    if (inputVal !== '') {
                        inputVal = Math.max(0, parseInt(inputVal, 10));
                        e.target.value = inputVal;
                    }

                    updateRowUi(e.target.closest('tr'), inputVal, uploadedCountMap[currentDept]);

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
                        showGlobalStatus("進度目標已更新", "success");
                    } catch (err) {
                        console.error("更新失敗:", err);
                        showGlobalStatus("儲存失敗", "error");
                    }
                });
            });

        } catch (error) {
            console.error("彙整填報進度時發生異常:", error);
            tbodyEl.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-500 font-medium"><i class="ti ti-alert-triangle mr-1"></i> 資料整合異常：${error.message}</td></tr>`;
        }
    }

    // 觸發首次載入
    loadAndCalculateProgress();

    // 重新整理按鈕
    document.getElementById('btn-refresh-progress')?.addEventListener('click', () => {
        tbodyEl.innerHTML = `<tr><td colspan="4" class="py-12 text-center text-gray-400"><div class="flex flex-col items-center justify-center gap-2"><i class="ti ti-loader-2 ti-spin text-2xl text-brand"></i><span class="text-xs">重新計算中...</span></div></td></tr>`;
        loadAndCalculateProgress();
    });

    // --- 輔助函式區塊 ---
    function updateRowUi(trEl, targetVal, uploadedVal) {
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

    let statusTimeout = null;
    function showGlobalStatus(text, type) {
        clearTimeout(statusTimeout);
        globalStatusEl.innerHTML = type === 'loading' ? `<i class="ti ti-loader-2 ti-spin mr-1"></i>${text}` : `<i class="ti ti-check mr-1"></i>${text}`;
        
        if (type === 'success') globalStatusEl.className = "text-xs font-bold text-emerald-600 opacity-100 transition-opacity mr-2";
        else if (type === 'error') globalStatusEl.className = "text-xs font-bold text-red-600 opacity-100 transition-opacity mr-2";
        else globalStatusEl.className = "text-xs font-bold text-gray-400 opacity-100 transition-opacity mr-2";

        if (type !== 'loading') {
            statusTimeout = setTimeout(() => {
                globalStatusEl.classList.replace('opacity-100', 'opacity-0');
            }, 2500);
        }
    }
}
