import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';

// 確保這裡是 export async function render
export async function render(containerId, context, options = { isReadOnly: false }) {
    state.db = context.db;
    state.isReadOnly = options.isReadOnly;
    
    // 初始化皆為顯示狀態 (勾選全開)
    state.colVis = { academic_year: true, term: true, edu_system: true, college: true, department: true, course_code: true, course_name: true, course_type: true, credits: true };
    
    const container = document.getElementById(containerId);
    await UI.loadTemplate(containerId);
    
    state.selectedIds = []; 
    state.currentPage = 1; 
    
    UI.applyReadOnlyMode(); 
    Events.bindEvents(container); 
    UI.updateColStyles(); // 初次載入就觸發同步顯示設定
    
    await Data.fetchSettingsOnce();
    await Data.fetchInitialDataOnce();
    
    UI.populateAllFiltersUI();
    UI.updateBatchActionBar();
    Render.renderTable();
}
