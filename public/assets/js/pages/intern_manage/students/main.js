import { initStudentTable } from '../../../components/StudentTable/main.js';

// 改為匯出 render 方法供 index.html 的 SPA 路由器呼叫
export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        // 動態載入 Template
        const response = await fetch('./assets/templates/student.html');
        const html = await response.text();
        container.innerHTML = html;

        // 初始化學生表格元件，設定為管理模式 (並可以把 context.db 傳進去給後續 Firebase 使用)
        await initStudentTable({ isManageMode: true, db: context.db });
    } catch (error) {
        console.error('載入學生模組失敗:', error);
        container.innerHTML = '<div class="text-red-500 p-4">模組載入失敗</div>';
    }
}
