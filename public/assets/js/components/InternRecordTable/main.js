import { state, resetInternRecordState } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';

/**
 * 實習紀錄元件總初始化入口
 * @param {string} containerId 渲染容器的 ID
 * @param {object} context 包含 db 等全域注入的物件
 * @param {object} options 元件選項 (例如 isReadOnly 權限控制)
 */
export async function render(containerId, context, options = { isReadOnly: false }) {
    // 1. 狀態重置與寫入權限
    resetInternRecordState();
    state.db = context.db;
    state.isReadOnly = options.isReadOnly;
    
    // 2. 注入外部 HTML 模板
    const container = document.getElementById(containerId);
    await UI.loadTemplate(containerId);
    
    // 3. UI 權限限制與事件綁定
    UI.applyReadOnlyMode();
    Events.bindEvents(container);
    
    // 4. 初始化主檔與實習紀錄訂閱
    await Data.initDataSubscriptions(() => {
        if(document.getElementById('filter-container')) {
            Render.renderFilterDropdowns();
        }
        Render.renderTable();
    });

    Data.subscribeToRecords(() => {
        Events.updateBatchActionBar();
        if(document.getElementById('filter-container')) {
            Render.renderFilterDropdowns();
        }
        Render.renderTable();
    });
}
