// 一般使用者（學生）視角的入口檔案
import { initStudentTable } from '../../../components/StudentTable/main.js';

// 必須匯出 render 函式供 index.html 的 SPA 路由器呼叫
export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        // 動態載入 Template (注意：因為是在 index.html 執行，相對路徑要從根目錄算起)
        const response = await fetch('./assets/templates/student.html');
        if (!response.ok) throw new Error('無法載入 Template');
        const html = await response.text();
        container.innerHTML = html;

        // 初始化學生表格元件，設定為一般檢視模式 (isManageMode: false)
        // 並將資料庫實例傳入元件中
        await initStudentTable({ isManageMode: false, db: context.db });
    } catch (error) {
        console.error('載入學生模組失敗:', error);
        container.innerHTML = '<div class="p-6 text-red-500 font-bold">載入學生模組失敗，請檢查網路連線或系統設定。</div>';
    }
}
