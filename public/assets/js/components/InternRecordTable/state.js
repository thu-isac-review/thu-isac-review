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
        { index: 2, label: '學號', visible: true, disableToggle: true },
        { index: 3, label: '姓名', visible: true, disableToggle: true },
        { index: 4, label: '學系', visible: true, disableToggle: true },
        { index: 5, label: '年級', visible: true },
        { index: 6, label: '機構名稱', visible: true },
        { index: 7, label: '修習課程', visible: true },
        { index: 8, label: '總學分', visible: true },
        { index: 9, label: '實習起訖時間', visible: true },
        { index: 10, label: '總時數', visible: true },
        { index: 11, label: '實習時間', visible: true },
        { index: 12, label: '證明文件', visible: true },
        { index: 13, label: '投保情形', visible: true },
        { index: 14, label: '勞雇關係', visible: true },
        { index: 15, label: '填報系所', visible: true }
    ],
    filterSelections: {
        academic_year: new Set(), dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), 
        resp_dept: new Set(), period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set()
    },
    filterDefinitions: [
        { key: 'academic_year', label: '學年度', searchable: true },
        { key: 'dept', label: '學系', searchable: true }, { key: 'grade', label: '年級', searchable: false },
        { key: 'inst_raw', label: '機構名稱', searchable: true }, { key: 'course', label: '修習課程', searchable: true },
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
        filterSelections: { academic_year: new Set(), dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), resp_dept: new Set(), period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set() },
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
export function formatCourseInfo(c) { return c ? `${c.academic_year}-${c.term}_${c.course_code}：${c.course_name}` : ''; }
