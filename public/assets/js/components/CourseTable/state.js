// public/assets/js/components/CourseTable/state.js
export const state = {
    allCourses: [],
    filteredCourses: [],
    academicYearFilter: 'all',
    departmentFilter: 'all',
    searchQuery: '',
    role: 'intern_view' // 預設為檢視模式，可在初始化時被覆蓋 (e.g., 'intern_manage')
};

export function updateState(newState) {
    Object.assign(state, newState);
}
