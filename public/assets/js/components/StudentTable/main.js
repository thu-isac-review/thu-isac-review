import { state, resetStudentState } from './state.js';
import { setupDataListener } from './data.js';
import { bindEvents } from './events.js';

// 🌟 動態載入專屬 CSS 的輔助方法
function loadCSS(url) {
    if (document.querySelector(`link[href="${url}"]`)) return; // 防止重複載入
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
}

export async function render(containerId, context, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. 🌟 自動載入專屬的學生管理 CSS 樣式
    loadCSS('/assets/css/student.css');

    // 2. 異步載入獨立對齊格式的 HTML 樣板骨架
    const response = await fetch('/assets/templates/student.html');
    const templateHtml = await response.text();
    container.innerHTML = templateHtml;

    // 3. 將全域參數綁入此元件 State 中
    state.db = context.db;
    state.isReadOnly = options.isReadOnly || false;

    // 4. 綁定按鈕與過濾篩選器事件
    bindEvents();

    // 5. 開啟即時監聽並儲存連線
    const unsubscribe = setupDataListener(containerId);
    window.studentUnsubscribe = unsubscribe;
}
