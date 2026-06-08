// 管理員視角的入口檔案
import { initStudentTable } from '../../../components/StudentTable/main.js';

// 必須匯出 render 函式供 index.html 的 SPA 路由器呼叫
export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        // 動態載入 Template
        const response = await fetch('./assets/templates/student.html');
        if (!response.ok) throw new Error('無法載入 Template');
        const html = await response.text();
        container.innerHTML = html;

        // 初始化學生表格元件，設定為管理模式 (isManageMode: true，開啟編輯/刪除等權限)
        await initStudentTable({ isManageMode: true, db: context.db });
    } catch (error) {
        console.error('載入學生模組失敗:', error);
        container.innerHTML = '<div class="p-6 text-red-500 font-bold">載入學生模組失敗，請檢查網路連線或系統設定。</div>';
    }
}
