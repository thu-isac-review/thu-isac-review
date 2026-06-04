import { state, setReadOnly } from './state.js';
import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { fetchInstitutions } from './data.js';

export async function render(containerId, context) {
    state.db = context.db;
    setReadOnly(context.isReadOnly === true);

    state.viewContainer = document.getElementById(containerId);
    
    // 狀態重設 (防呆機制，避免切換路由殘留上一頁狀態)
    state.selectedIds = [];
    state.currentPage = 1;
    state.expandedParents.clear();
    state.isAllExpanded = false;
    
    // 1. 載入共用 HTML 並根據模式修剪 UI
    await injectUI(state.viewContainer);
    
    // 2. 綁定共用事件
    bindEvents(state.viewContainer);
    
    // 3. 獲取並渲染資料
    await fetchInstitutions();
}
