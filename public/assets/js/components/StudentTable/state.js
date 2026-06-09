export let state = {
    db: null,
    isReadOnly: false,
    allData: [],
    allRecords: [], // 🌟 [新增] 用於統計學生的實習紀錄數
    filteredData: [],
    globalDepts: [],
    orderedColleges: [],
    editingId: null,
    currentPage: 1,
    itemsPerPage: 15,
    selectedIds: [],
    
    filterCollegeSet: new Set(),
    filterDeptSet: new Set(),
    filterGenderSet: new Set(),
    filterNatSet: new Set(),
    
    sortCol: 'default', // 🌟 [修改] 將預設排序改為多層次演算法（學院 -> 學系 -> 學號）
    sortDir: 'asc',
    searchDebounceTimer: null,
    isGlobalListenerBound: false,
    isKeyboardShortcutBound: false
};

// 用於切換 SPA 頁面時重置狀態，防止資料污染
export function resetStudentState() {
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
        
        filterCollegeSet: new Set(),
        filterDeptSet: new Set(),
        filterGenderSet: new Set(),
        filterNatSet: new Set(),
        
        sortCol: 'default',
        sortDir: 'asc',
        searchDebounceTimer: null,
        isGlobalListenerBound: false,
        isKeyboardShortcutBound: false
    };
}

export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        // 逃逸正則特殊字元
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};
