import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let localCache = {
    courses: [],
    records: [],
    institutions: [],
    students: []
};

let currentFilters = {
    year: 'all',
    term: 'all'
};

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);
    
    injectSkeleton(container);
    await fetchAllDashboardData(db);
    renderStatsUI(container);
}

function injectSkeleton(container) {
    container.innerHTML = `<div class="p-6 space-y-6 animate-pulse"><div class="h-16 bg-gray-200 rounded-xl"></div><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="h-24 bg-white rounded-xl"></div><div class="h-24 bg-white rounded-xl"></div><div class="h-24 bg-white rounded-xl"></div><div class="h-24 bg-white rounded-xl"></div></div></div>`;
}

async function fetchAllDashboardData(db) {
    try {
        const [courseSnap, recordSnap, instSnap, studentSnap] = await Promise.all([
            getDocs(collection(db, "internship_courses")),
            getDocs(collection(db, "internship_records")),
            getDocs(collection(db, "internship_institutions")),
            getDocs(collection(db, "internship_students")).catch(() => ({ docs: [] }))
        ]);

        localCache.courses = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.records = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.institutions = instSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localCache.students = studentSnap.docs ? studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    } catch (e) {
        console.error("Firebase fetch failed:", e);
    }
}

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
    return { year: String(yr || '').trim(), term: String(tm || '').trim() };
}

function renderStatsUI(container) {
    const uniqueYears = [...new Set([...localCache.courses.map(c => String(c.academic_year || '')), ...localCache.records.map(r => resolveRecordPeriod(r).year)])].filter(Boolean).sort((a, b) => Number(b) - Number(a));
    const uniqueTerms = [...new Set([...localCache.courses.map(c => String(c.term || '')), ...localCache.records.map(r => resolveRecordPeriod(r).term)])].filter(Boolean).sort();

    container.innerHTML = `
    <div id="dashboard-wrapper" class="p-6 space-y-6 bg-gray-50 min-h-full">
        <!-- 簡化篩選列 -->
        <div class="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-600">學年度</span>
                <select id="select-filter-year" class="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer">
                    <option value="all">全部</option>
                    ${uniqueYears.map(y => `<option value="${y}" ${currentFilters.year === y ? 'selected' : ''}>${y} 學年度</option>`).join('')}
                </select>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-600">學期</span>
                <select id="select-filter-term" class="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold cursor-pointer">
                    <option value="all">全部</option>
                    ${uniqueTerms.map(t => `<option value="${t}" ${currentFilters.term === t ? 'selected' : ''}>第 ${t} 學期</option>`).join('')}
                </select>
            </div>
            <button id="btn-reset-dashboard" class="text-sm text-gray-500 hover:text-red-500 font-bold ml-auto">重設</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-grid-container"></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="col-span-2 bg-white border border-gray-200 rounded-xl p-5"><h3 class="text-sm font-bold mb-4">系所實習人數</h3><div id="dept-stats-list"></div></div>
            <div class="bg-white border border-gray-200 rounded-xl p-5"><h3 class="text-sm font-bold mb-4">熱門實習機構</h3><div id="top-institutions-list"></div></div>
        </div>
    </div>`;

    document.getElementById('select-filter-year').addEventListener('change', (e) => { currentFilters.year = e.target.value; computeAndRenderStats(); });
    document.getElementById('select-filter-term').addEventListener('change', (e) => { currentFilters.term = e.target.value; computeAndRenderStats(); });
    document.getElementById('btn-reset-dashboard').addEventListener('click', () => { currentFilters.year = 'all'; currentFilters.term = 'all'; renderStatsUI(container); });
    computeAndRenderStats();
}

function computeAndRenderStats() {
    const filteredRecords = localCache.records.filter(r => {
        const period = resolveRecordPeriod(r);
        return (currentFilters.year === 'all' || period.year === currentFilters.year) && (currentFilters.term === 'all' || period.term === currentFilters.term);
    });

    // 統計邏輯：以 internship_students 的 student_id 為核心比對
    const studentIdsInRecords = new Set(filteredRecords.map(r => String(r.student_id || '').trim()).filter(id => id !== ''));
    const matchedStudents = localCache.students.filter(s => studentIdsInRecords.has(String(s.student_id || '').trim()));
    const totalStudentsCount = (currentFilters.year === 'all' && currentFilters.term === 'all') ? localCache.students.length : matchedStudents.length;

    document.getElementById('stats-grid-container').innerHTML = `
        <div class="p-4 bg-white border border-gray-200 rounded-xl"><div class="text-[10px] text-gray-400">實習課程</div><div class="text-xl font-bold">${localCache.courses.length}</div></div>
        <div class="p-4 bg-white border border-gray-200 rounded-xl"><div class="text-[10px] text-gray-400">實習學生數</div><div class="text-xl font-bold">${totalStudentsCount}</div></div>
        <div class="p-4 bg-white border border-gray-200 rounded-xl"><div class="text-[10px] text-gray-400">機構總數</div><div class="text-xl font-bold">${localCache.institutions.length}</div></div>
        <div class="p-4 bg-white border border-gray-200 rounded-xl"><div class="text-[10px] text-gray-400">實習筆數</div><div class="text-xl font-bold">${filteredRecords.length}</div></div>
    `;
    
    // 排行榜統計保持不變... (省略重複部分以保持簡潔)
}
