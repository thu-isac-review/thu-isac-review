import { render as renderStudentTable } from '../../../components/StudentTable/main.js';
import { resetStudentState } from '../../../components/StudentTable/state.js';

export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    resetStudentState();

    if (window.studentUnsubscribe) {
        try { window.studentUnsubscribe(); } catch(e) {}
        window.studentUnsubscribe = null;
    }

    // 開啟「前台瀏覽模式」：唯讀，隱藏編輯刪除功能
    await renderStudentTable(containerId, context, { isReadOnly: true });
}
