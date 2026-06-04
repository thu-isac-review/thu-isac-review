import { state } from './state.js';
import { fetchCourses } from './data.js';
import { updateTableUI } from './ui.js';
import { bindEvents } from './events.js';

// 初始化課程表格組件
export async function initCourseTable() {
    try {
        bindEvents();
        
        // 初始載入資料
        state.courses = await fetchCourses();
        updateTableUI();
        
        console.log("CourseTable 模組初始化成功");
    } catch (error) {
        console.error("CourseTable 初始化失敗:", error);
    }
}
