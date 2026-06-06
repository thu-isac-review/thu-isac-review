import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 本地快取
let localCache = {
    courses: [],
    records: [],
    institutions: []
};

// 全局過濾狀態
let currentFilters = {
    year: 'all'
};

// ==========================================
// 1. 初始化入口
// ==========================================
export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);
    
    injectSkeleton(container);
    await fetchAnalyticsData(db);
    renderAnalyticsUI(container);
}

// ==========================================
// 2. 骨架屏載入畫面
// ==========================================
function injectSkeleton(container) {
    container.innerHTML = `
    <div class="p-6 space-y-6 animate-pulse">
        <div class="h-16 bg-gray-200 rounded-xl"></div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="h-24 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-24 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-24 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-24 bg-white border border-gray-200 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="h-80 bg-white border border-gray-200 rounded-xl"></div>
            <div class="h-80 bg-white border border-gray-200 rounded-xl"></div>
        </div>
    </div>
    `;
}

// ==========================================
// 3. 資料獲取與正規化
// ==========================================
async function fetchAnalyticsData(db) {
    try {
        const [courseSnap, recordSnap, instSnap] = await Promise.all([
            getDocs(collection(db, "internship_courses")),
            getDocs(collection(db, "internship_records")),
            getDocs(collection(db, "internship_institutions"))
        ]);

        localCache.courses = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.records = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.institutions = instSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Analytics fetch failed:", e);
    }
}

// 輔助函數：取得學年學期
function resolvePeriod(record) {
    let yr = record.academic_year || record.year || '';
    let tm = record.term || '';
    if ((!yr || !tm) && record.courses && record.courses.length > 0) {
        const linkedCourse = localCache.courses.find(c => record.courses.includes(c.id));
        if (linkedCourse) {
            yr = yr || linkedCourse.academic_year;
            tm = tm || linkedCourse.term;
        }
    }
    return { year: String(yr || '').trim(), term: String(tm || '').trim(), periodKey: `${yr}-${tm}` };
}

// 輔助函數：取得學生唯一識別碼
function getStudentId(record) {
    if (record.student_raw) {
        let sId = record.student_raw;
        if (typeof sId === 'object') {
            return String(sId.student_id || sId.id || sId.uid || sId.name || JSON.stringify(sId)).trim();
        }
        return String(sId).trim();
    }
    return String(record.student_id || record.student_num || record.uid || record.student_name || '').trim();
}

// ==========================================
// 4. 介面渲染與事件綁定
// ==========================================
function renderAnalyticsUI(container) {
    // 提取有紀錄的學年度
    const uniqueYears = [...new Set(
        localCache.records.map(r => resolvePeriod(r).year).filter(y => y !== '')
    )].sort((a, b) => Number(b) - Number(a));

    container.innerHTML = `
    <div class="p-6 space-y-6 custom-scroll overflow-y-auto h-full" style="background: var(--bg);">
        
        <!-- 頂部篩選列 -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl">
                    <i class="ti ti-chart-pie"></i>
                </div>
                <div>
                    <h1 class="text-sm font-bold text-gray-900">進階成效分析</h1>
                    <p class="text-[11px] text-gray-400 mt-0.5">多維度數據交叉比對與趨勢探索</p>
                </div>
            </div>
            
            <div class="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <span class="text-xs font-bold text-gray-500">分析範圍</span>
                <select id="analytics-filter-year" class="bg-transparent text-gray-800 text-xs font-bold focus:outline-none cursor-pointer">
                    <option value="all">歷年總計 (All Time)</option>
                    ${uniqueYears.map(y => `<option value="${y}" ${currentFilters.year === y ? 'selected' : ''}>${y} 學年度</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- 核心 KPI 區塊 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="analytics-kpi-container"></div>

        <!-- 圖表分析區 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 歷年人數趨勢圖 -->
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <i class="ti ti-chart-line text-blue-600"></i> 歷年實習參與人數趨勢
                    </h3>
                </div>
                <div id="trend-chart-container" class="flex items-end gap-2 h-48 mt-4">
                    <!-- 動態長條圖 -->
                </div>
            </div>

            <!-- 系所參與度分析 -->
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <i class="ti ti-school text-emerald-500"></i> 系所實習深度指標
                    </h3>
                    <span class="text-[10px] text-gray-400">多次實習佔比</span>
                </div>
                <div id="dept-analytics-list" class="flex-1 space-y-4 max-h-[220px] overflow-y-auto custom-scroll pr-2">
                    <!-- 系所清單 -->
                </div>
            </div>

            <!-- 機構留才/穩定度分析 -->
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm col-span-1 lg:col-span-2">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <i class="ti ti-building-carousel text-amber-500"></i> 高黏著度合作機構 (機構回訪率)
                    </h3>
                    <span class="text-[11px] bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-bold">跨學期持續收容機構</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="retention-inst-list">
                    <!-- 機構卡片 -->
                </div>
            </div>
        </div>
    </div>
    `;

    document.getElementById('analytics-filter-year').addEventListener('change', (e) => {
        currentFilters.year = e.target.value;
        computeAndRenderAnalytics();
    });

    computeAndRenderAnalytics();
}

// ==========================================
// 5. 核心計算與渲染邏輯
// ==========================================
function computeAndRenderAnalytics() {
    const isAllTime = currentFilters.year === 'all';
    
    // 1. 過濾區間內的紀錄
    const filteredRecords = localCache.records.filter(r => {
        if (isAllTime) return true;
        return resolvePeriod(r).year === currentFilters.year;
    });

    // ─── 數據指標計算 ───
    
    // A. 學生參與度計算 (Student Engagement)
    const studentRecordCount = {}; // { studentId: count }
    filteredRecords.forEach(r => {
        const sid = getStudentId(r);
        if (sid) {
            studentRecordCount[sid] = (studentRecordCount[sid] || 0) + 1;
        }
    });
    
    const uniqueStudents = Object.keys(studentRecordCount).length;
    const totalRecords = filteredRecords.length;
    const multiInternshipStudents = Object.values(studentRecordCount).filter(count => count > 1).length;
    const multiInternRate = uniqueStudents > 0 ? Math.round((multiInternshipStudents / uniqueStudents) * 100) : 0;
    const avgRecordsPerStudent = uniqueStudents > 0 ? (totalRecords / uniqueStudents).toFixed(1) : 0;

    // B. 機構黏著度計算 (Institution Retention)
    // 統計每個機構出現過「幾個不同的學期」
    const instPeriodMap = {}; // { instName: Set(periodKeys) }
    localCache.records.forEach(r => {
        // 機構留才率我們一律看歷年總計，這樣才有「跨學期」的概念
        let name = String(r.institution_name || r.inst_name || '').trim();
        if (!name && (r.institution_id || r.inst_id)) {
            const matchObj = localCache.institutions.find(i => i.id === (r.institution_id || r.inst_id));
            if (matchObj) name = matchObj.name;
        }
        if (name && name !== '其他實習機構' && name !== 'undefined') {
            if (!instPeriodMap[name]) instPeriodMap[name] = new Set();
            const p = resolvePeriod(r);
            if(p.periodKey !== '-') instPeriodMap[name].add(p.periodKey);
        }
    });

    let retentionInstCount = 0;
    const highlyRetainedInsts = [];
    Object.entries(instPeriodMap).forEach(([name, periods]) => {
        if (periods.size > 1) {
            retentionInstCount++;
            highlyRetainedInsts.push({ name, semesters: periods.size });
        }
    });
    highlyRetainedInsts.sort((a, b) => b.semesters - a.semesters);
    
    const totalActiveInsts = Object.keys(instPeriodMap).length;
    const retentionRate = totalActiveInsts > 0 ? Math.round((retentionInstCount / totalActiveInsts) * 100) : 0;

    // ─── 渲染 KPI ───
    document.getElementById('analytics-kpi-container').innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div class="text-[11px] text-gray-400 font-bold mb-1">不重複參與人數</div>
            <div class="text-2xl font-black text-gray-800">${uniqueStudents} <span class="text-xs font-normal text-gray-400">人</span></div>
            <div class="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <i class="ti ti-user-check text-blue-500"></i> 實際參與實習學生總計
            </div>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div class="text-[11px] text-gray-400 font-bold mb-1">多重實習比例</div>
            <div class="text-2xl font-black text-gray-800">${multiInternRate}%</div>
            <div class="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <i class="ti ti-repeat text-indigo-500"></i> ${multiInternshipStudents} 人擁有 2 筆以上紀錄
            </div>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div class="text-[11px] text-gray-400 font-bold mb-1">平均實習次數</div>
            <div class="text-2xl font-black text-gray-800">${avgRecordsPerStudent} <span class="text-xs font-normal text-gray-400">次/人</span></div>
            <div class="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <i class="ti ti-math-avg text-emerald-500"></i> 總紀錄數 / 總參與人數
            </div>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div class="text-[11px] text-gray-400 font-bold mb-1">機構留才/回流率</div>
            <div class="text-2xl font-black text-gray-800">${retentionRate}%</div>
            <div class="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <i class="ti ti-building-carousel text-amber-500"></i> ${retentionInstCount} 家機構跨學期持續合作
            </div>
        </div>
    `;

    // ─── 渲染歷年人數趨勢圖 (僅在 All Time 顯示跨年，否則顯示學期) ───
    const trendContainer = document.getElementById('trend-chart-container');
    const timeGroups = {}; 
    
    // 聚合趨勢資料
    localCache.records.forEach(r => {
        const sid = getStudentId(r);
        const p = resolvePeriod(r);
        if (!sid) return;
        
        let timeKey = isAllTime ? p.year : `第 ${p.term} 學期`;
        if (!timeKey || timeKey.includes('undefined')) timeKey = '未指定';
        
        // 篩選模式下，只統計該學年度的學期數據
        if (!isAllTime && p.year !== currentFilters.year) return;

        if (!timeGroups[timeKey]) timeGroups[timeKey] = new Set();
        timeGroups[timeKey].add(sid);
    });

    const trendData = Object.entries(timeGroups)
        .map(([time, sids]) => ({ time, count: sids.size }))
        .sort((a, b) => a.time.localeCompare(b.time)); // 簡單排序
        
    const maxTrendCount = Math.max(...trendData.map(d => d.count), 1);

    if (trendData.length === 0) {
        trendContainer.innerHTML = `<div class="w-full text-center text-xs text-gray-400 my-auto">尚無足夠數據繪製趨勢圖</div>`;
    } else {
        trendContainer.innerHTML = trendData.map(d => {
            const heightPercent = Math.max((d.count / maxTrendCount) * 100, 5); // 最少 5% 高度
            return `
            <div class="flex-1 flex flex-col items-center justify-end h-full group relative">
                <!-- Tooltip -->
                <div class="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    ${d.count} 人
                </div>
                <div class="w-full max-w-[40px] bg-blue-100 rounded-t-md relative flex items-end justify-center transition-all duration-500 hover:bg-blue-200" style="height: ${heightPercent}%;">
                    <div class="w-full bg-blue-500 rounded-t-md opacity-80" style="height: 100%;"></div>
                </div>
                <div class="text-[10px] text-gray-500 font-bold mt-2 truncate w-full text-center" title="${d.time}">
                    ${d.time}${isAllTime && d.time !== '未指定' ? '學年' : ''}
                </div>
            </div>`;
        }).join('');
    }

    // ─── 渲染系所深度指標 ───
    const deptContainer = document.getElementById('dept-analytics-list');
    const deptStats = {};
    
    filteredRecords.forEach(r => {
        let deptName = r.department || r.student_dept;
        if (!deptName && r.student_raw && typeof r.student_raw === 'object') deptName = r.student_raw.department || r.student_raw.dept;
        if (!deptName && r.courses && r.courses.length > 0) {
            const courseObj = localCache.courses.find(c => r.courses.includes(c.id));
            if (courseObj) deptName = courseObj.department;
        }
        deptName = deptName || '未歸類系所';
        
        if (!deptStats[deptName]) deptStats[deptName] = { totalRecords: 0, students: new Set(), multiStudents: {} };
        
        deptStats[deptName].totalRecords++;
        const sid = getStudentId(r);
        if (sid) {
            deptStats[deptName].students.add(sid);
            deptStats[deptName].multiStudents[sid] = (deptStats[deptName].multiStudents[sid] || 0) + 1;
        }
    });

    const sortedDeptStats = Object.entries(deptStats)
        .map(([dept, data]) => {
            const unique = data.students.size;
            const multiCount = Object.values(data.multiStudents).filter(c => c > 1).length;
            const rate = unique > 0 ? Math.round((multiCount / unique) * 100) : 0;
            return { dept, unique, multiCount, rate };
        })
        .sort((a, b) => b.unique - a.unique);

    if (sortedDeptStats.length === 0) {
        deptContainer.innerHTML = `<div class="text-xs text-gray-400 text-center py-6">尚無系所數據</div>`;
    } else {
        deptContainer.innerHTML = sortedDeptStats.map(d => `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="text-xs font-bold text-gray-800">${d.dept}</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">總參與 ${d.unique} 人</div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <div class="text-xs font-bold text-emerald-600">${d.rate}%</div>
                        <div class="text-[9px] text-gray-400">多次實習率</div>
                    </div>
                    <!-- 圓形進度指示 (簡單視覺化) -->
                    <div class="w-8 h-8 rounded-full border-2 border-emerald-100 flex items-center justify-center relative overflow-hidden bg-gray-50">
                        <div class="absolute bottom-0 w-full bg-emerald-500 opacity-20" style="height: ${d.rate}%"></div>
                        <span class="text-[9px] font-bold text-emerald-700 relative z-10">${d.multiCount}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ─── 渲染高黏著度機構 ───
    const instContainer = document.getElementById('retention-inst-list');
    if (highlyRetainedInsts.length === 0) {
        instContainer.innerHTML = `<div class="col-span-3 text-xs text-gray-400 text-center py-6">尚無跨學期合作的機構數據</div>`;
    } else {
        // 只取前 6 名顯示
        instContainer.innerHTML = highlyRetainedInsts.slice(0, 6).map((inst, idx) => `
            <div class="p-3 border border-amber-100 bg-amber-50/30 rounded-lg flex items-start gap-3 hover:bg-amber-50 transition">
                <div class="w-8 h-8 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                    ${idx + 1}
                </div>
                <div class="min-w-0">
                    <div class="text-xs font-bold text-gray-800 truncate" title="${inst.name}">${inst.name}</div>
                    <div class="text-[10px] text-amber-700 font-medium mt-1">持續合作 <span class="font-black text-amber-600 text-sm">${inst.semesters}</span> 個學期</div>
                </div>
            </div>
        `).join('');
    }
}
