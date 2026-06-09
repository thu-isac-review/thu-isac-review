import { render as renderStudentTable } from '../../../components/StudentTable/main.js';
import { resetStudentState } from '../../../components/StudentTable/state.js';

export async function render(containerId, context) {
    // 1. 清空舊容器
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 2. 重置狀態
    resetStudentState();

    // 3. 釋放舊監聽器
    if (window.studentUnsubscribe) {
        try { window.studentUnsubscribe(); } catch(e) {}
        window.studentUnsubscribe = null;
    }

    // 4. 開啟「管理員模式」：允許新增、編輯、刪除
    await renderStudentTable(containerId, context, { isReadOnly: false });
}
