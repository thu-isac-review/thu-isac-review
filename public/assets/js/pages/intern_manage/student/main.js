// 這是供「管理員(Manage)」使用的頁面入口檔
import { initStudentTable } from '../../../components/StudentTable/main.js';

// 配合 index.html SPA 路由，匯出 render 函式
export const render = async (containerId, { db }) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // 動態載入 Template (路徑相對於 index.html)
        const response = await fetch('./assets/templates/student.html');
        if (!response.ok) throw new Error('找不到 Template');
        const html = await response.text();
        
        container.innerHTML = html;

        // 將 Router 傳遞過來的 db 實體掛載到 window，供 data.js 使用
        if (db && !window.db) {
            window.db = db;
        }

        // 初始化為管理員模式 (具備新增/編輯/刪除/匯入匯出等功能)
        await initStudentTable('manage');
        
    } catch (error) {
        console.error('載入頁面失敗:', error);
        container.innerHTML = '<div class="alert alert-danger" style="padding:20px; text-align:center; color:red;">頁面載入失敗</div>';
    }
};
