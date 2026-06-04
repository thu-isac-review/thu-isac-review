// 存放所有的靜態與對應選單選項
export const CONSTANTS = {
    EDU_SYSTEMS: ["日間學士班", "進修學士班", "碩士班", "碩士在職專班", "博士班"],
    COURSE_TYPES: ["必修", "選修", "群修"]
};

// 存放跨檔案共用的狀態變數
export const state = {
    db: null,
    isReadOnly: false, // 核心：決定元件為「唯讀前台」還是「可編輯後台」
    allData: [],
    selectedIds: [],
    filteredCourses: [],
    currentPage: 1,
    itemsPerPage: 15,
    sortCol: '',
    sortDir: '',
    colVis: { semester: true, edu_system: true, college: true, department: true, course_type: true, credits: true },
    
    // 動態生成的過濾屬性
    filterSemesterSet: new Set(),
    filterEduSystemSet: new Set(),
    filterCollegeSet: new Set(),
    filterDepartmentSet: new Set(),
    filterCourseTypeSet: new Set(),
    
    searchDebounceTimer: null,
    isGlobalListenerBound: false,
    isKeyboardShortcutBound: false
};

// 共用的輔助函式
export const Utils = {
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return text || '';
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    }
};
