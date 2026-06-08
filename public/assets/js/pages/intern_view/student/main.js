// 學生/一般使用者視角的入口檔案
import { initStudentTable } from '../../../components/StudentTable/main.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('template-container');
    
    try {
        // 動態載入 Template
        const response = await fetch('/assets/templates/student.html');
        const html = await response.text();
        if (container) {
            container.innerHTML = html;
        }

        // 初始化學生表格元件，設定為一般檢視模式
        await initStudentTable({ isManageMode: false });
    } catch (error) {
        console.error('載入學生模組失敗:', error);
    }
});
