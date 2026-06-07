import { state, resetStudentState } from './state.js';
import { setupDataListener } from './data.js';
import { bindEvents } from './events.js';
import { initUIControls } from './ui.js'; // 🌟 引入全新的 UI 模組

function loadCSS(url) {
    if (document.querySelector(`link[href="${url}"]`)) return; 
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
}

export async function render(containerId, context, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    loadCSS('/assets/css/student.css');

    const response = await fetch('/assets/templates/student.html');
    const templateHtml = await response.text();
    container.innerHTML = templateHtml;

    state.db = context.db;
    state.isReadOnly = options.isReadOnly || false;

    bindEvents();

    // 🌟 在資料流進來前，先做 UI 靜態控制項的初始化
    initUIControls();

    const unsubscribe = setupDataListener(containerId);
    window.studentUnsubscribe = unsubscribe;
}
