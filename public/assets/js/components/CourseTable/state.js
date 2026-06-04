export const state = {
    db: null,
    isReadOnly: false,
    allData: [],
    filteredData: [],
    globalDepts: [],
    orderedColleges: [],
    editingId: null,
    currentPage: 1,
    itemsPerPage: 15,
    selectedIds: [],
    
    filterYearSet: new Set(),
    filterTermSet: new Set(),
    filterEduSet: new Set(),
    filterCollegeSet: new Set(),
    filterDeptSet: new Set(),
    filterCodeSet: new Set(),
    filterNameSet: new Set(),
    filterTypeSet: new Set(),
    filterCreditSet: new Set(),
    
    sortCol: 'academic_year',
    sortDir: 'desc',
    searchDebounceTimer: null,
    isGlobalListenerBound: false,
    isKeyboardShortcutBound: false
};
