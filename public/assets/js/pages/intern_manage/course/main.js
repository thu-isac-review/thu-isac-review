import { render as renderCourseTable } from '../../../components/CourseTable/main.js';
import { resetCourseState } from '../../../components/CourseTable/state.js';

export async function render(containerId, context) {
    // 1. 確保清空原本舊容器的 HTML 內容，避免舊殘留元件干擾
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 2. 徹底重置課程模組的記憶體全域狀態
    resetCourseState();

    // 3. 如果之前有綁定過全域的 Firebase 監聽器或 Unsubscribe 函式，執行它以釋放記憶體
    if (window.courseUnsubscribe) {
        try { window.courseUnsubscribe(); } catch(e) {}
        window.courseUnsubscribe = null;
    }

    // 4. 開啟「管理員模式」：isReadOnly 為 false，可以新增、編輯、刪除
    await renderCourseTable(containerId, context, { isReadOnly: false });
}