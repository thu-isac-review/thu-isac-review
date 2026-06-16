/**
 * 實習紀錄 - 管理模式頁面入口 (Manage Entry point)
 * 負責載入對應之網頁骨架 HTML 模板、元件專屬 CSS 樣式，並呼叫元件內核以「管理權限 (isViewOnly: false)」開啟。
 */

import { InternRecordTable } from '../../../components/InternRecordTable/main.js';

async function bootstrapManagePage() {
    // 1. 動態追加元件樣式表 (如果不存在)
    if (!document.querySelector('link[href*="intern_record.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/css/intern_record.css';
        document.head.appendChild(link);
    }

    try {
        // 2. 獲取 HTML 佈局骨架模板
        const res = await fetch('/assets/templates/intern_record.html');
        if (!res.ok) throw new Error('無法讀取實習紀錄 HTML 模板檔案');
        const templateHtml = await res.text();

        // 3. 將佈局注入至頁面主容器
        const pageContainer = document.getElementById('app') || document.body;
        pageContainer.innerHTML = templateHtml;

        // 4. 以管理模式啟動實習紀錄模組
        InternRecordTable.init({ isViewOnly: false });

    } catch (err) {
        console.error('初始化實習紀錄管理頁面發生異常:', err);
    }
}

// 監聽 DOM 載入完畢後進行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapManagePage);
} else {
    bootstrapManagePage();
}
