export let state = {
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

// 🌟 [補上] 提供給課程 render.js 使用的反黃高亮輔助工具，與機構模組邏輯完全對齊
export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};