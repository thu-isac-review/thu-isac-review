import { state, resetStudentState } from './state.js';
import { setupDataListener } from './data.js';
import { bindEvents } from './events.js';

export async function render(containerId, context, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. 異步載入獨立對齊格式的 HTML 樣板骨架
    const response = await fetch('/assets/templates/student.html');
    const templateHtml = await response.text();
    container.innerHTML = templateHtml;

    // 2. 將全域參數綁入此元件 State 中
    state.db = context.db;
    state.isReadOnly = options.isReadOnly || false;

    // 3. 綁定按鈕與過濾篩選器事件
    bindEvents();

    // 4. 開啟即時監聽並儲存連線
    const unsubscribe = setupDataListener(containerId);
    window.studentUnsubscribe = unsubscribe;
}
