/**
 * 實習紀錄 - 檢視模式頁面入口 (View Mode Entry)
 * 對應 Hash: intern_view/record_view
 */
import { InternRecordTable } from '../../components/InternRecordTable/main.js';

export async function render(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. 自動動態加載實習紀錄專用的 CSS 樣式表，確保在 SPA 路由切換時樣式不跑版
    if (!document.querySelector('link[href*="intern_record.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './assets/css/intern_record.css';
        document.head.appendChild(link);
    }

    try {
        // 2. 載入實習紀錄的 HTML 骨架模板 (修正為專案中實際存在的範本名稱)
        const res = await fetch('./assets/templates/intern_record.html');
        if (!res.ok) throw new Error('無法載入實習紀錄 HTML 模板');
        const templateHtml = await res.text();
        
        // 3. 注入至 SPA 主要內容容器
        container.innerHTML = templateHtml;

        // 4. 啟動實習紀錄模組，傳入 isViewOnly: true 來開啟唯讀檢視模式
        InternRecordTable.init({ isViewOnly: true });
    } catch (err) {
        console.error('實習紀錄檢視頁面載入異常:', err);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-6 text-red-500">
                <i class="ti ti-alert-triangle text-5xl mb-2"></i>
                <p class="text-sm">頁面載入失敗: ${err.message}</p>
            </div>
        `;
    }
}
