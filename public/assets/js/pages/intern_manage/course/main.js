import { render as renderCourseTable } from '../../../components/CourseTable/main.js';

export async function render(containerId, context) {
    // 開啟「管理員模式」：isReadOnly 為 false，可以新增、編輯、刪除
    await renderCourseTable(containerId, context, { isReadOnly: false });
}
