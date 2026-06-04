// 集中管理表格所有狀態
export const state = {
    allData: [],               // 原始所有課程資料
    globalDepts: [],           // 系統學系設定檔
    orderedColleges: [],       // 系統學院設定檔
    editingId: null,           // 目前正在編輯的資料 ID
    
    // 分頁與選取狀態
    currentPage: 1,
    itemsPerPage: 15,
    selectedIds: [],
    filteredData: [],          // 經過搜尋與篩選後的資料
    
    // 篩選器集合
    filterYearSet: new Set(),
    filterTermSet: new Set(),
    filterEduSet: new Set(),
    filterCollegeSet: new Set(),
    filterDeptSet: new Set(),
    filterCodeSet: new Set(),
    filterNameSet: new Set(),
    filterTypeSet: new Set(),
    filterCreditSet: new Set(),
    
    // 排序狀態
    sortCol: 'academic_year',
    sortDir: 'desc'
};
