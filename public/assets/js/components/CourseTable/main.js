// 在 CourseTable 負責將 HTML 塞入表格的 render 函式中加入：
const tableBody = document.getElementById('course-table-body'); // 確保用專屬 ID
if (!tableBody) {
    // 說明當前 DOM 容器已經被切換成「機構」或其他頁面了，立即中斷舊的非同步回呼
    return; 
}

import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';

/**
 * 實習課程元件總初始化入口
 * @param {string} containerId 渲染容器的 ID
 * @param {object} context 包含 db 等全域注入的物件
 * @param {object} options 元件選項 (例如 isReadOnly 權限控制)
 */
export async function render(containerId, context, options = { isReadOnly: false }) {
    // 1. 寫入狀態與權限
    state.db = context.db;
    state.isReadOnly = options.isReadOnly;
    
    // 2. 注入外部 HTML 模板
    const container = document.getElementById(containerId);
    await UI.loadTemplate(containerId);
    
    // 3. 狀態重置 (確保頁面切換時狀態乾淨)
    state.selectedIds = []; 
    state.currentPage = 1; 
    
    // 4. UI 權限限制與事件綁定
    UI.applyReadOnlyMode(); // 如果是唯讀，直接把不需要的按鈕 CSS 設為隱藏
    Events.bindEvents(container); 
    
    // 5. 抓取資料並渲染
    await Data.fetchSettingsOnce();
    await Data.fetchInitialDataOnce();
    
    UI.populateAllFiltersUI();
    UI.updateBatchActionBar();
    Render.renderTable();
}
