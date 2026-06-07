export let state = {
    db: null,
    isReadOnly: false,
    allData: [],
    allRecords: [], // 用於統計修課人數的實習紀錄
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

// 用於切換 SPA 頁面時重置狀態，防止資料污染
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

// 🌟 [新增] 與機構模組演算法完全相同的關鍵字高亮工具
export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        // 逃逸正則特殊字元，避免字串內含特定符號導致正則噴錯
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};
