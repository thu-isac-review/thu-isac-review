export const state = {
    allRecords: [],
    allStudents: [],
    allInsts: [],
    allCourses: [],
    filteredRecords: [],
    selectedIds: [],
    selectedCourseIds: [],
    editingId: null,
    currentPage: 1,
    itemsPerPage: 15,
    sortCol: 'created_at',
    sortDir: 'desc',
    globalDepts: [],
    orderedColleges: [],
    filterSelections: {
        dept: new Set(), grade: new Set(), inst_raw: new Set(), course: new Set(), resp_dept: new Set(),
        period: new Set(), proof: new Set(), insurance: new Set(), employment: new Set()
    }
};

export const filterDefinitions = [
    { key: 'dept', label: '學系', searchable: true },
    { key: 'grade', label: '年級', searchable: false },
    { key: 'inst_raw', label: '機構名稱', searchable: true },
    { key: 'course', label: '修習課程', searchable: true },
    { key: 'resp_dept', label: '填報系所', searchable: true },
    { key: 'period', label: '實習時間', searchable: false },
    { key: 'proof', label: '證明文件', searchable: false },
    { key: 'insurance', label: '投保情形', searchable: false },
    { key: 'employment', label: '勞雇關係', searchable: false }
];

export const tableColumns = [
    { index: 1, label: '學號', visible: true },
    { index: 2, label: '姓名', visible: true },
    { index: 3, label: '學系', visible: true },
    { index: 4, label: '年級', visible: true },
    { index: 5, label: '機構名稱', visible: true },
    { index: 6, label: '修習課程', visible: true },
    { index: 7, label: '總學分', visible: true },
    { index: 8, label: '實習起訖時間', visible: true },
    { index: 9, label: '總時數', visible: true },
    { index: 10, label: '實習時間', visible: true },
    { index: 11, label: '證明文件', visible: true },
    { index: 12, label: '投保情形', visible: true },
    { index: 13, label: '勞雇關係', visible: true },
    { index: 14, label: '填報系所', visible: true }
];
