// public/assets/js/components/CourseTable/main.js
import { updateState } from './state.js';
import { fetchCourses } from './data.js';
import { initEvents } from './events.js';

export function initCourseTable(db, role = 'intern_view') {
    // 1. 設定角色 (intern_manage 或 intern_view)
    updateState({ role: role });

    // 2. 初始化事件綁定
    initEvents(db);

    // 3. 獲取初始資料並渲染
    fetchCourses(db);
}
