export let state = {
    db: null,
    isReadOnly: false,
    allData: [],
    allRecords: [], // 🌟 [新增] 用於統計修課人數的實習紀錄
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

// 🌟 [新增] 用於切換 SPA 頁面時重置狀態，防止資料污染
export function resetCourseState() {
    state = {
        db: null,
        isReadOnly: false,
        allData: [],
        allRecords: [],
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
}

// 🌟 [新增] 用於反黃高亮的關鍵字 Utils，與機構模組一致化
export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
}; 