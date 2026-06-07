import { render as renderStudentTable } from '../../../components/StudentTable/main.js';
import { resetStudentState } from '../../../components/StudentTable/state.js';

export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 1. 徹底洗淨狀態與舊元件連線，防止前一頁的非同步回呼蓋檔
    resetStudentState();

    if (window.studentUnsubscribe) {
        try { window.studentUnsubscribe(); } catch(e) {}
        window.studentUnsubscribe = null;
    }

    // 2. 啟動元件管理員模式並渲染
    await renderStudentTable(containerId, context, { isReadOnly: false });
}
