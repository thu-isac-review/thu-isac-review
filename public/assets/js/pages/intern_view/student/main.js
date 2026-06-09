// 這是供「實習生/一般使用者(View)」使用的唯讀頁面入口檔
import { initStudentTable } from '../../../../components/StudentTable/main.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 假設您的框架中有一個 id 為 main-content 的容器來裝載內容
    const mainContent = document.getElementById('main-content');
    
    try {
        // 動態載入 Template
        const response = await fetch('/assets/templates/student.html');
        if (!response.ok) throw new Error('找不到 Template');
        const html = await response.text();
        
        mainContent.innerHTML = html;

        // 初始化為唯讀模式 (會隱藏新增/編輯按鈕及勾選框)
        await initStudentTable('view');
        
    } catch (error) {
        console.error('載入頁面失敗:', error);
        if(mainContent) mainContent.innerHTML = '<div class="alert alert-danger">頁面載入失敗</div>';
    }
});
