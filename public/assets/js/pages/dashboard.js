import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 本地數據快取，確保在切換篩選器時，能以毫秒級速度進行本地過濾與渲染，完全不需重新請求 Firestore
let localCache = {
    courses: [],
    records: [],
    institutions: [],
    students: []
};

// 目前選取的篩選器狀態
let currentFilters = {
    year: 'all',
    term: 'all'
};

// ==========================================
// 1. 初始化入口
// ==========================================
export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);
    
    // 先載入精美的骨架屏 (Skeleton Screen) 提升視覺載入質感
    injectSkeleton(container);
    
    // 獲取所有 Firestore 實習資料
    await fetchAllDashboardData(db);
    
    // 渲染正式儀表板 UI 與綁定篩選事件
    renderStatsUI(container);
}

// ==========================================
// 2. 骨架屏載入畫面
// ==========================================
function injectSkeleton(container) {
    container.innerHTML = `
    <div class="p-6 space-y-6 animate-pulse">
        <div class="h-14 bg-white rounded-xl border border-gray-200 flex items-center justify-between px-6">
            <div class="h-6 w-48 bg-gray-200 rounded-md"></div>
            <div class="h-8 w-64 bg-gray-200 rounded-md"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="h-28 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-28 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-28 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-28 bg-white border border-gray-200 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="col-span-2 h-96 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-96 bg-white border border-gray-200 rounded-xl"></div>
        </div>
    </div>
    `;
}

// ==========================================
// 3. 資料獲取與多重關聯分析邏輯
// ==========================================
async function fetchAllDashboardData(db) {
    try {
        const [courseSnap, recordSnap, instSnap, studentSnap] = await Promise.all([
            getDocs(collection(db, "internship_courses")),
            getDocs(collection(db, "internship_records")),
            getDocs(collection(db, "internship_institutions")),
            getDocs(collection(db, "students")).catch(() => ({ docs: [] })) // 容錯機制
        ]);

        localCache.courses = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.records = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.institutions = instSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.students = studentSnap.docs ? studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
        
    } catch (e) {
        console.error("Firebase Dashboard fetch failed:", e);
    }
}

// 🌟 解析實習紀錄中關聯的學年與學期 (若紀錄本身無此欄位，會自動去撈取關聯的課程資料)
function resolveRecordPeriod(record) {
    let yr = record.academic_year || record.year || '';
    let tm = record.term || '';

    if ((!yr || !tm) && record.courses && record.courses.length > 0) {
        const linkedCourse = localCache.courses.find(c => record.courses.includes(c.id));
        if (linkedCourse) {
            yr = yr || linkedCourse.academic_year;
            tm = tm || linkedCourse.term;
        }
    }
    return {
        year: String(yr || '').trim(),
        term: String(tm || '').trim()
    };
}

// ==========================================
// 4. 正式 📊 統計介面與篩選控制中心
// ==========================================
function renderStatsUI(container) {
    // 取得所有資料中不重複的學年度，用於動態生成篩選器下拉選項
    const uniqueYears = [...new Set([
        ...localCache.courses.map(c => String(c.academic_year || '')),
        ...localCache.records.map(r => {
            const period = resolveRecordPeriod(r);
            return period.year;
        })
    ])].filter(Boolean).sort((a, b) => Number(b) - Number(a)); // 由大到小

    // 取得所有資料中不重複的學期，用於動態生成篩選器下拉選項
    const uniqueTerms = [...new Set([
        ...localCache.courses.map(c => String(c.term || '')),
        ...localCache.records.map(r => {
            const period = resolveRecordPeriod(r);
            return period.term;
        })
    ])].filter(Boolean).sort();

    container.innerHTML = `
    <div id="dashboard-wrapper" class="p-6 space-y-6 custom-scroll overflow-y-auto h-full" style="background: var(--bg);">
        
        <!-- 頂部獨立雙維度篩選列 -->
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <div>
                    <h1 class="text-base font-bold text-gray-900 leading-tight">實習數據主儀表板</h1>
                    <p class="text-[11px] text-gray-400 mt-0.5">系統動態統計與系所成效交叉分析</p>
                </div>
            </div>
            
            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <!-- 學年度篩選 -->
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-gray-500">學年度:</span>
                    <select id="select-filter-year" class="bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg p-2 font-semibold focus:outline-none focus:border-blue-500 transition">
                        <option value="all">全部學年度</option>
                        ${uniqueYears.map(y => `<option value="${y}" ${currentFilters.year === y ? 'selected' : ''}>${y} 學年度</option>`).join('')}
                    </select>
                </div>
                
                <!-- 學期篩選 -->
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-gray-500">學期:</span>
                    <select id="select-filter-term" class="bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg p-2 font-semibold focus:outline-none focus:border-blue-500 transition">
                        <option value="all">全部學期</option>
                        ${uniqueTerms.map(t => `<option value="${t}" ${currentFilters.term === t ? 'selected' : ''}>第 ${t} 學期</option>`).join('')}
                    </select>
                </div>
                
                <!-- 重設按鈕 -->
                <button id="btn-reset-dashboard" class="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-white px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-600 border border-blue-100 hover:border-blue-600 transition duration-150">
                    <i class="ti ti-refresh"></i>重設
                </button>
            </div>
        </div>

        <!-- 🌟 [更新] 四大核心實習指標統計區塊 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid-container">
            <!-- 數據經由 computeAndRenderStats() 動態更新 -->
        </div>

        <!-- 深度分析與熱門排行圖表區 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 系所實習人數分佈 -->
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm col-span-1 lg:col-span-2 flex flex-col">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <i class="ti ti-chart-bar text-blue-600"></i> 各系所實習人數分佈狀況
                    </h3>
                    <span class="text-[11px] text-gray-400 font-semibold">依據篩選期間計算</span>
                </div>
                <div id="dept-stats-list" class="flex-1 space-y-4 max-h-[320px] overflow-y-auto custom-scroll pr-1">
                    <!-- 動態載入系所排行 -->
                </div>
            </div>

            <!-- 熱門實習機構 -->
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <i class="ti ti-crown text-amber-500"></i> 熱門合作機構排行
                    </h3>
                    <span class="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">Top 5</span>
                </div>
                <div id="top-institutions-list" class="flex-1 space-y-3.5 max-h-[320px] overflow-y-auto custom-scroll pr-1">
                    <!-- 動態載入熱門機構 -->
                </div>
            </div>
        </div>

        <!-- 系統快速連結 -->
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="ti ti-layout-grid text-blue-600"></i> 系統快速連結
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="#intern_view/institution/main" class="p-4 border border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition flex items-center gap-3.5 group shadow-sm">
                    <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition duration-150">
                        <i class="ti ti-building-community"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-gray-800">實習機構列表</div>
                        <div class="text-[11px] text-gray-400 mt-0.5">瀏覽所有已登錄之國內外合作機構</div>
                    </div>
                </a>
                <a href="#intern_view/course/main" class="p-4 border border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition flex items-center gap-3.5 group shadow-sm">
                    <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover:bg-emerald-600 group-hover:text-white transition duration-150">
                        <i class="ti ti-book-2"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-gray-800">實習課程列表</div>
                        <div class="text-[11px] text-gray-400 mt-0.5">查看學年與學期開設之實習課程</div>
                    </div>
                </a>
                <a href="#intern_view/record_view" class="p-4 border border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition flex items-center gap-3.5 group shadow-sm">
                    <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition duration-150">
                        <i class="ti ti-file-analytics"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-gray-800">實習記錄瀏覽</div>
                        <div class="text-[11px] text-gray-400 mt-0.5">追蹤與統計目前實習進度、審核狀態</div>
                    </div>
                </a>
            </div>
        </div>
    </div>
    `;

    // 綁定篩選器變更事件
    document.getElementById('select-filter-year').addEventListener('change', (e) => {
        currentFilters.year = e.target.value;
        computeAndRenderStats();
    });

    document.getElementById('select-filter-term').addEventListener('change', (e) => {
        currentFilters.term = e.target.value;
        computeAndRenderStats();
    });

    document.getElementById('btn-reset-dashboard').addEventListener('click', () => {
        currentFilters.year = 'all';
        currentFilters.term = 'all';
        document.getElementById('select-filter-year').value = 'all';
        document.getElementById('select-filter-term').value = 'all';
        computeAndRenderStats();
    });

    // 首次手動執行渲染
    computeAndRenderStats();
}

// ==========================================
// 5. 核心：數據交叉過濾與動態渲染
// ==========================================
function computeAndRenderStats() {
    // A. 篩選課程
    const filteredCourses = localCache.courses.filter(c => {
        const matchYear = currentFilters.year === 'all' || String(c.academic_year) === currentFilters.year;
        const matchTerm = currentFilters.term === 'all' || String(c.term) === currentFilters.term;
        return matchYear && matchTerm;
    });

    // B. 篩選實習紀錄
    const filteredRecords = localCache.records.filter(r => {
        const period = resolveRecordPeriod(r);
        const matchYear = currentFilters.year === 'all' || period.year === currentFilters.year;
        const matchTerm = currentFilters.term === 'all' || period.term === currentFilters.term;
        return matchYear && matchTerm;
    });

    // C. 統計不重複實習學生總數
    const activeStudentIds = new Set(filteredRecords.map(r => r.student_id || r.student_num || r.uid).filter(Boolean));
    const totalStudentsCount = activeStudentIds.size;

    // D. 統計實習機構數量
    // 當無任何學年學期篩選時，顯示「總登記機構數」；有篩選時，則呈現「該期間實際參與合作之機構數」，並在小字加註總量，更加專業
    let activeInstCount = 0;
    if (currentFilters.year === 'all' && currentFilters.term === 'all') {
        activeInstCount = localCache.institutions.length;
    } else {
        const activeInstIds = new Set(filteredRecords.map(r => r.institution_id || r.inst_id).filter(Boolean));
        activeInstCount = activeInstIds.size;
    }

    // ─── 渲染四大指標 Grid 卡片 ───
    const statsGrid = document.getElementById('stats-grid-container');
    statsGrid.innerHTML = `
        <!-- 實習課程總數 -->
        <div class="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow transition duration-150">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background: var(--brand-light); color: var(--brand);">
                <i class="ti ti-book-2"></i>
            </div>
            <div>
                <div class="text-[11px] font-bold text-gray-400 tracking-wider">實習課程總數</div>
                <div class="text-2xl font-bold text-gray-900 mt-0.5">${filteredCourses.length} <span class="text-xs font-semibold text-gray-400">門</span></div>
                <div class="text-[10px] text-gray-400 mt-1">開課清單內之實習課程</div>
            </div>
        </div>

        <!-- 實習學生總數 -->
        <div class="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow transition duration-150">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background: var(--indigo-bg); color: var(--indigo);">
                <i class="ti ti-users"></i>
            </div>
            <div>
                <div class="text-[11px] font-bold text-gray-400 tracking-wider">實習學生總數</div>
                <div class="text-2xl font-bold text-gray-900 mt-0.5">${totalStudentsCount} <span class="text-xs font-semibold text-gray-400">人</span></div>
                <div class="text-[10px] text-gray-400 mt-1">此期間實際參與實習之學生</div>
            </div>
        </div>

        <!-- 實習機構總數 -->
        <div class="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow transition duration-150">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background: #fffbeb; color: #d97706;">
                <i class="ti ti-building-community"></i>
            </div>
            <div>
                <div class="text-[11px] font-bold text-gray-400 tracking-wider">實習機構總數</div>
                <div class="text-2xl font-bold text-gray-900 mt-0.5">${activeInstCount} <span class="text-xs font-semibold text-gray-400">家</span></div>
                <div class="text-[10px] text-gray-400 mt-1">
                    ${(currentFilters.year === 'all' && currentFilters.term === 'all') ? '系統已登記之總機構數' : `合作中機構 (總登記 ${localCache.institutions.length} 家)`}
                </div>
            </div>
        </div>

        <!-- 實習記錄總數 -->
        <div class="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow transition duration-150">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background: #ecfdf5; color: #059669;">
                <i class="ti ti-file-text"></i>
            </div>
            <div>
                <div class="text-[11px] font-bold text-gray-400 tracking-wider">實習記錄總數</div>
                <div class="text-2xl font-bold text-gray-900 mt-0.5">${filteredRecords.length} <span class="text-xs font-semibold text-gray-400">筆</span></div>
                <div class="text-[10px] text-gray-400 mt-1">實習學生呈報之紀錄總量</div>
            </div>
        </div>
    `;

    // ─── 統計各系所的人數佔比與排名分佈 ───
    const deptMap = {};
    filteredRecords.forEach(r => {
        let deptName = r.department || r.student_dept || '';
        // 紀錄無系所時，嘗試對應課程系所
        if (!deptName && r.courses && r.courses.length > 0) {
            const courseObj = localCache.courses.find(c => r.courses.includes(c.id));
            if (courseObj) deptName = courseObj.department;
        }
        deptName = deptName || '其他/未歸類系所';
        deptMap[deptName] = (deptMap[deptName] || 0) + 1;
    });

    const sortedDepts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
    const maxDeptCount = sortedDepts[0] ? sortedDepts[0][1] : 1;
    const deptContainer = document.getElementById('dept-stats-list');

    if (sortedDepts.length === 0) {
        deptContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
            <i class="ti ti-inbox text-3xl mb-2"></i>
            <p class="text-xs font-bold text-red-500">此篩選區間內尚無任何實習記錄數據</p>
        </div>`;
    } else {
        deptContainer.innerHTML = sortedDepts.map(([dept, count], idx) => {
            const percent = Math.round((count / maxDeptCount) * 100);
            const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
            const rankBadge = idx < 3 
                ? `<i class="ti ti-medal text-lg ${medalColors[idx]}"></i>` 
                : `<span class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">${idx + 1}</span>`;

            return `
            <div class="space-y-1.5 animate-fade">
                <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1.5 font-bold text-gray-800">
                        ${rankBadge}
                        <span>${dept}</span>
                    </div>
                    <span class="font-bold text-gray-900">${count} 人</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: ${percent}%;"></div>
                </div>
            </div>`;
        }).join('');
    }

    // ─── 統計熱門實習機構排行榜 (Top 5) ───
    const instMap = {};
    filteredRecords.forEach(r => {
        let name = r.institution_name || r.inst_name || '';
        if (!name && (r.institution_id || r.inst_id)) {
            const matchObj = localCache.institutions.find(i => i.id === (r.institution_id || r.inst_id));
            if (matchObj) name = matchObj.name;
        }
        name = name || '其他實習機構';
        instMap[name] = (instMap[name] || 0) + 1;
    });

    const sortedInsts = Object.entries(instMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const instContainer = document.getElementById('top-institutions-list');

    if (sortedInsts.length === 0) {
        instContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
            <i class="ti ti-building text-3xl mb-2"></i>
            <p class="text-xs font-bold text-red-500">此篩選區間內尚無實習合作紀錄</p>
        </div>`;
    } else {
        instContainer.innerHTML = sortedInsts.map(([name, count], idx) => {
            const badges = [
                'bg-yellow-100 text-yellow-800',
                'bg-slate-100 text-slate-700',
                'bg-amber-100 text-amber-800'
            ];
            const badgeClass = idx < 3 ? badges[idx] : 'bg-gray-50 text-gray-500 border border-gray-100';

            return `
            <div class="flex items-center justify-between p-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-lg transition duration-150 animate-fade">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-5 h-5 rounded-full ${badgeClass} text-[10px] font-extrabold flex items-center justify-center shrink-0">
                        ${idx + 1}
                    </span>
                    <span class="text-xs font-bold text-gray-700 truncate" title="${name}">${name}</span>
                </div>
                <div class="text-xs font-bold text-gray-900 shrink-0 pl-2">
                    ${count} 筆記錄
                </div>
            </div>`;
        }).join('');
    }
}
