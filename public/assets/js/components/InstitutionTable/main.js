import { state, setReadOnly } from './state.js';
import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { fetchInstitutions } from './data.js';

/**
 * 實習機構模組 - 總進入點
 * @param {string} containerId - 要掛載的 HTML 容器 ID
 * @param {object} context - 從路由傳遞過來的上下文 (包含 db 與 isReadOnly)
 */
export async function render(containerId, context) {
    // 1. 儲存 Firebase 資料庫實例到全域 state
    state.db = context.db;
    
    // 2. 🌟 關鍵：設定當前是否為唯讀模式 (前台瀏覽 = true, 後台管理 = false)
    setReadOnly(context.isReadOnly === true);

    // 3. 取得要渲染的目標容器
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`找不到指定的容器 ID: ${containerId}`);
        return;
    }
    
    // 4. 重設狀態 (避免 SPA 切換頁面時，殘留了上一次的操作紀錄)
    state.selectedIds = [];
    state.currentPage = 1;
    state.expandedParents.clear();
    state.isAllExpanded = false;

    // 5. 執行核心初始化流程
    try {
        // 第一步：去抓取 institution.html 模板並注入畫面 (會自動判斷唯讀並隱藏按鈕)
        await injectUI(container);
        
        // 第二步：綁定所有的點擊、輸入、分頁等事件
        bindEvents(container);
        
        // 第三步：向 Firestore 獲取真實資料並渲染表格
        await fetchInstitutions();
        
    } catch (error) {
        console.error("實習機構模組載入失敗:", error);
        container.innerHTML = `
            <div style="padding: 40px; color: var(--danger); text-align: center; background: var(--surface);">
                <i class="ti ti-alert-triangle" style="font-size: 32px; margin-bottom: 12px;"></i>
                <div>模組載入發生錯誤，請重新整理頁面或聯繫管理員。</div>
            </div>
        `;
    }
}
