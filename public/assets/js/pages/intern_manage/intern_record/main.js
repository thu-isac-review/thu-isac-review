/**
 * 實習紀錄 - 管理模式頁面入口 (Manage Mode Entry)
 */
import { InternRecordTable } from '../../../components/InternRecordTable/main.js';

export async function render(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 動態載入專屬 CSS
    if (!document.querySelector('link[href*="intern_record.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './assets/css/intern_record.css';
        document.head.appendChild(link);
    }

    try {
        // 載入公用的 HTML 骨架
        const res = await fetch('./assets/templates/intern_record.html');
        if (!res.ok) throw new Error('無法載入實習紀錄 HTML 模板');
        container.innerHTML = await res.text();

        // 啟動模組：傳入 isViewOnly: false，開啟完整的 CRUD 權限
        InternRecordTable.init({ isViewOnly: false });
        
    } catch (err) {
        console.error('實習紀錄管理頁面載入異常:', err);
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--danger);">
                <i class="ti ti-alert-triangle" style="font-size:48px; margin-bottom:8px;"></i>
                <p>頁面載入失敗: ${err.message}</p>
            </div>
        `;
    }
}
