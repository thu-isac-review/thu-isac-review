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
    
    // 篩選集合
    filterYearSet: new Set(),
    filterTermSet: new Set(),
    filterEduSet: new Set(),
    filterCollegeSet: new Set(),
    filterDeptSet: new Set(),
    filterCodeSet: new Set(),
    filterNameSet: new Set(),
    filterTypeSet: new Set(),
    filterCreditSet: new Set(),
    
    // 顯示欄位設定
    colVis: { 
        academic_year: true, 
        term: true, 
        edu_system: true, 
        college: true, 
        department: true, 
        course_code: true, 
        course_name: true, 
        course_type: true, 
        credits: true 
    },
    
    sortCol: 'academic_year',
    sortDir: 'desc',
    searchDebounceTimer: null,
    isGlobalListenerBound: false,
    isKeyboardShortcutBound: false
};

// 統一的輔助函式
export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        // 統一採用此樣式：黃底棕字 Highlight
        return text.toString().replace(regex, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px; color: #854d0e; font-weight: bold;">$1</mark>');
    }
};
