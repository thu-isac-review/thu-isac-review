export let state = {
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
    
    filterCollegeSet: new Set(),
    filterDeptSet: new Set(),
    filterGenderSet: new Set(),
    filterNatSet: new Set(),
    
    sortCol: 'student_id',
    sortDir: 'asc',
    searchDebounceTimer: null,
    isGlobalListenerBound: false
};

// 🌟 元件卸載/加載時徹底清空記憶體
export function resetStudentState() {
    state = {
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
        
        filterCollegeSet: new Set(),
        filterDeptSet: new Set(),
        filterGenderSet: new Set(),
        filterNatSet: new Set(),
        
        sortCol: 'student_id',
        sortDir: 'asc',
        searchDebounceTimer: null,
        isGlobalListenerBound: false
    };
}

// 🌟 與課程、機構同步的高性能搜尋反黃函式
export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};
