import { render as renderCourseTable } from '../../../components/CourseTable/main.js';

export async function render(containerId, context) {
    // 開啟「前台瀏覽模式」：isReadOnly 為 true，隱藏所有編輯按鈕與 Checkbox
    await renderCourseTable(containerId, context, { isReadOnly: true });
}
