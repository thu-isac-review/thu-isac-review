import { state } from './state.js';
import { populateCollegesUI, populateDeptFilterUI } from './render.js';

/**
 * 初始化學生模組的 UI 靜態下拉選單
 */
export function initUIControls() {
    // 呼叫渲染層，填入學校的學院與學系設定檔資料
    populateCollegesUI();
    populateDeptFilterUI();
}

/**
 * 處理學生基本資料 Modal 視窗開關
 * @param {boolean} isOpen 
 */
export function toggleDataModal(isOpen) {
    const modal = document.getElementById('data-modal');
    if (!modal) return;
    if (isOpen) {
        modal.classList.add('open');
    } else {
        modal.classList.remove('open');
        state.editingId = null;
    }
}
