import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';

export async function render(containerId, context) {
    // 1. 取得並設定 Firestore 資料庫實例
    state.db = context.db;
    const container = document.getElementById(containerId);
    
    // 2. 注入外部 HTML 模板
    await UI.loadTemplate(containerId);
    
    // 3. 狀態重置 (確保切換頁面時狀態是乾淨的)
    state.selectedIds = []; 
    state.currentPage = 1; 
    state.expandedParents.clear(); 
    state.isAllExpanded = false;
    
    // 4. UI 初始化與事件綁定
    UI.initSelectOptions(); 
    Events.bindEvents(container); 
    UI.updateColStyles(); 
    
    // 5. 非同步取得資料，並進行第一次的表格渲染
    await Data.fetchInitialDataOnce();
    UI.updateBatchActionBar();
    UI.buildBaseTree();
    Render.renderTable();
    
    // 背景預載歷史名單 (不會卡住主畫面)
    Data.handleInitialLoadEngine();
}
