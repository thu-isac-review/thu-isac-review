export let state = {
    db: null,
    isReadOnly: false,
    allRecords: [],
    allStudents: [],
    allInsts: [],
    allCourses: [],
    filteredRecords: [],
    selectedIds: [],
    selectedCourseIds: [],
    currentPage: 1,
    itemsPerPage: 15,
    sortCol: 'created_at',
    sortDir: 'desc',
    editingId: null,
    globalDepts: [],
    orderedColleges: [],
    globalImportReportData: [],
    searchDebounceTimer: null,
    isGlobalListenerBound: false,
    isKeyboardShortcutBound: false,
    tableColumns: [
        { index: 1, label: '學年度', visible: true, disableToggle: true },
        { index: 2, label: '學期', visible: true, disableToggle: true },
        { index: 3, label: '學號', visible: true, disableToggle: true },
        { index: 4, label: '姓名', visible: true, disableToggle: true },
        { index: 5, label: '學系', visible: true, disableToggle: true },
        { index: 6, label: '年級', visible: true },
        { index: 7, label: '機構名稱', visible: true },
        { index: 8, label: '修習課程', visible: true },
        { index: 9, label: '總學分', visible: true },
        { index: 10, label: '實習起訖時間', visible: true },
        { index: 11, label: '總時數', visible: true },
        { index: 12, label: '實習時間', visible: true },
        { index: 13, label: '證明文件', visible: true },
        { index: 14, label: '投保情形', visible: true },
        { index: 15, label: '勞雇關係', visible: true },
        { index: 16, label: '填報系所', visible: true },
        // 🌟 新增欄位 (預設隱藏，可在顯示設定中開啟)
        { index: 17, label: '實習待遇', visible: false },
        { index: 18, label: '給付類型', visible: false },
        { index: 19, label: '其他給付說明', visible: false },
        { index: 20, label: '補助經費來源', visible: false },
        { index: 21, label: '實習機會來源', visible: false },
        { index: 22, label: '實習職缺類型', visible: false }
    ],
    filterSelections: {
        academic_year: new Set(), term: new Set(), dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), 
        resp_dept: new Set(), period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set(),
        allowance: new Set(), payment_type: new Set(), funding: new Set(), opp_source: new Set(), job_type: new Set()
    },
    filterDefinitions: [
        { key: 'academic_year', label: '學年度', searchable: true },
        { key: 'term', label: '學期', searchable: false },
        { key: 'dept', label: '學系', searchable: true }, { key: 'grade', label: '年級', searchable: false },
        { key: 'inst_raw', label: '機構名稱', searchable: true }, { key: 'course', label: '修習課程', searchable: true },
        { key: 'allowance', label: '實習待遇', searchable: false }, { key: 'payment_type', label: '給付類型', searchable: false },
        { key: 'funding', label: '補助經費來源', searchable: true }, { key: 'opp_source', label: '實習機會來源', searchable: false },
        { key: 'job_type', label: '實習職缺類型', searchable: false },
        { key: 'resp_dept', label: '填報系所', searchable: true }, { key: 'period', label: '實習時間', searchable: false },
        { key: 'proof', label: '證明文件', searchable: false }, { key: 'insurance', label: '投保情形', searchable: false },
        { key: 'employment', label: '勞雇關係', searchable: false }
    ]
};

export function resetInternRecordState() {
    const preserveDb = state.db;
    const preserveGlobalListener = state.isGlobalListenerBound;
    const preserveKeyboardShortcut = state.isKeyboardShortcutBound;
    state = {
        db: preserveDb,
        isReadOnly: false, allRecords: [], allStudents: [], allInsts: [], allCourses: [], filteredRecords: [],
        selectedIds: [], selectedCourseIds: [], currentPage: 1, itemsPerPage: 15, sortCol: 'created_at', sortDir: 'desc',
        editingId: null, globalDepts: [], orderedColleges: [], globalImportReportData: [],
        searchDebounceTimer: null,
        isGlobalListenerBound: preserveGlobalListener,
        isKeyboardShortcutBound: preserveKeyboardShortcut,
        tableColumns: [...state.tableColumns],
        filterSelections: { academic_year: new Set(), term: new Set(), dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), resp_dept: new Set(), period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set(), allowance: new Set(), payment_type: new Set(), funding: new Set(), opp_source: new Set(), job_type: new Set() },
        filterDefinitions: [...state.filterDefinitions]
    };
}

export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};

export function getColShort(collegeName) { const col = state.orderedColleges.find(x => x.name === collegeName); return col && col.shortName ? col.shortName : (collegeName || '未知學院'); }
export function getDeptShort(deptName) { const dept = state.globalDepts.find(x => x.name === deptName); return dept && dept.shortName ? dept.shortName : (deptName || '未知學系'); }
export function getTime(timestamp) { if (!timestamp) return 0; if (timestamp.toMillis) return timestamp.toMillis(); if (timestamp.seconds) return timestamp.seconds * 1000; return new Date(timestamp).getTime() || 0; }
export function formatCourseForTable(c) { return c ? `${c.course_code}_${c.course_name}` : ''; }
export function formatCourseForExport(c) { return c ? `${c.academic_year}-${c.term}_${c.course_code}：${c.course_name}` : ''; }

export function getRecordTerm(d) {
    if (!d.courses || d.courses.length === 0) return '-';
    const courseObjs = d.courses.map(cid => state.allCourses.find(x => x.id === cid)).filter(Boolean);
    if (courseObjs.length === 0) return '-';
    const terms = [...new Set(courseObjs.map(c => c.term))].filter(Boolean).sort();
    return terms.join('、') || '-';
}
