import { state } from './state.js';
import { ui } from './ui.js';
import { bindEvents } from './events.js';
import { fetchData } from './data.js';
import { renderTable } from './render.js';

export const initStudentTable = async (viewMode = 'manage') => {
    state.viewMode = viewMode;
    ui.init();
    
    // 唯讀模式的視圖調整 (隱藏工具列按鈕與 checkbox、操作列)
    if (viewMode === 'view') {
        const actions = document.querySelector('.actions');
        if (actions) actions.style.display = 'none';
        
        const thead = document.querySelector('#data-table thead tr');
        if (thead) {
            thead.firstElementChild.remove(); // 移除 checkbox
            thead.lastElementChild.remove();  // 移除操作欄
        }
    }

    bindEvents();
    
    try {
        await fetchData();
        renderTable();
    } catch (error) {
        console.error("載入學生資料失敗", error);
    }
};
