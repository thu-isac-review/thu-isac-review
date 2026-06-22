export let state = {
    db: null,
    isReadOnly: false,
    allRecords: [], allStudents: [], allInsts: [], allCourses: [],
    filteredRecords: [], selectedIds: [], selectedCourseIds: [],
    currentPage: 1, itemsPerPage: 15,
    sortCol: 'created_at', sortDir: 'desc',
    editingId: null, globalDepts: [], orderedColleges: [], globalImportReportData: [],
    searchDebounceTimer: null, isGlobalListenerBound: false, isKeyboardShortcutBound: false,
    currentAcademicYear: '',
    tableColumns: [
        { index: 1, label: '學期', visible: true, disableToggle: true, width: 90 },
        { index: 2, label: '學號', visible: true, disableToggle: true, width: 110 },
        { index: 3, label: '姓名', visible: true, disableToggle: true, width: 100 },
        { index: 4, label: '學系', visible: true, disableToggle: true, width: 110 },
        { index: 5, label: '年級', visible: true, width: 80 },
        { index: 6, label: '機構名稱', visible: true, width: 220 },
        { index: 7, label: '修習課程', visible: true, width: 260 },
        { index: 8, label: '總學分', visible: true, width: 80 },
        { index: 9, label: '實習時間', visible: true, width: 110 },
        { index: 10, label: '實習起訖時間', visible: true, width: 170 },
        { index: 11, label: '總時數', visible: true, width: 80 },
        { index: 12, label: '證明文件', visible: true, width: 110 },
        { index: 13, label: '勞雇關係', visible: true, width: 90 },
        { index: 14, label: '投保情形', visible: true, width: 130 },
        { index: 15, label: '實習待遇', visible: true, width: 100 },
        { index: 16, label: '給付類型', visible: true, width: 100 },
        { index: 17, label: '其他給付說明', visible: true, width: 150 },
        { index: 18, label: '給付金額', visible: true, width: 100 },
        { index: 19, label: '補助經費來源', visible: false, width: 180 },
        { index: 20, label: '實習機會來源', visible: false, width: 130 },
        { index: 21, label: '實習職缺類型', visible: false, width: 120 },
        { index: 22, label: '符合校庫填報', visible: true, width: 120 },
        { index: 23, label: '不符合校庫填報原因', visible: true, width: 180 },
        { index: 24, label: '填報系所', visible: true, width: 120 }
    ],
    filterSelections: {
        term: new Set(), dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), 
        resp_dept: new Set(), period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set(),
        allowance: new Set(), payment_type: new Set(), is_moe_compliant: new Set()
    },
    filterDefinitions: [
        { key: 'term', label: '學期', searchable: false }, { key: 'dept', label: '學系', searchable: true }, 
        { key: 'grade', label: '年級', searchable: false }, { key: 'inst_raw', label: '機構名稱', searchable: true }, 
        { key: 'course', label: '修習課程', searchable: true }, { key: 'allowance', label: '實習待遇', searchable: false }, 
        { key: 'payment_type', label: '給付類型', searchable: false }, { key: 'is_moe_compliant', label: '符合校庫填報', searchable: false },
        { key: 'resp_dept', label: '填報系所', searchable: true }, { key: 'period', label: '實習時間', searchable: false },
        { key: 'proof', label: '證明文件', searchable: false }, { key: 'insurance', label: '投保情形', searchable: false },
        { key: 'employment', label: '勞雇關係', searchable: false }
    ]
};

export function resetInternRecordState() {
    const { db, isGlobalListenerBound, isKeyboardShortcutBound, tableColumns, filterDefinitions } = state;
    state = {
        db, isReadOnly: false, allRecords: [], allStudents: [], allInsts: [], allCourses: [], filteredRecords: [],
        selectedIds: [], selectedCourseIds: [], currentPage: 1, itemsPerPage: 15, sortCol: 'created_at', sortDir: 'desc',
        editingId: null, globalDepts: [], orderedColleges: [], globalImportReportData: [], searchDebounceTimer: null, currentAcademicYear: '',
        isGlobalListenerBound, isKeyboardShortcutBound,
        tableColumns: JSON.parse(JSON.stringify(tableColumns)),
        filterSelections: { term: new Set(), dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), resp_dept: new Set(), period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set(), allowance: new Set(), payment_type: new Set(), is_moe_compliant: new Set() },
        filterDefinitions: JSON.parse(JSON.stringify(filterDefinitions))
    };
}

export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.toString().replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};

export function getColShort(collegeName) { const col = state.orderedColleges.find(x => x.name === collegeName); return col?.shortName || collegeName || '未知學院'; }
export function getDeptShort(deptName) { const dept = state.globalDepts.find(x => x.name === deptName); return dept?.shortName || deptName || '未知學系'; }
export function getTime(ts) { if (!ts) return 0; return ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime() || 0); }
export function formatCourseForTable(c) { return c ? `${c.course_code}_${c.course_name}` : ''; }
export function formatCourseForExport(c) { return c ? `${c.academic_year}-${c.term}_${c.course_code}：${c.course_name}` : ''; }
export function getRecordTerm(d) {
    if (!d.courses?.length) return '-';
    const terms = [...new Set(d.courses.map(cid => state.allCourses.find(x => x.id === cid)?.term).filter(Boolean))].sort();
    return terms.join('、') || '-';
}
