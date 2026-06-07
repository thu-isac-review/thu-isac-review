import { render as renderStudentTable } from '../../../components/StudentTable/main.js';
import { resetStudentState } from '../../../components/StudentTable/state.js';

export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 1. 徹底洗淨狀態與舊元件連線
    resetStudentState();

    if (window.studentUnsubscribe) {
        try { window.studentUnsubscribe(); } catch(e) {}
        window.studentUnsubscribe = null;
    }

    // 2. 啟動元件管理員模式
    await renderStudentTable(containerId, context, { isReadOnly: false });
}
