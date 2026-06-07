import { render as renderInstitutionTable } from '../../../components/InstitutionTable/main.js';
import { resetInstitutionState } from '../../../components/InstitutionTable/state.js';

export async function render(containerId, context) {
    // 1. 確保清空原本舊容器的 HTML 內容，避免舊殘留元件干擾
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 2. 徹底重置機構模組的記憶體全域狀態
    resetInstitutionState();

    // 3. 如果之前有綁定過全域的 Firebase 監聽器或 Unsubscribe 函式，執行它以釋放記憶體
    if (window.institutionUnsubscribe) {
        try { window.institutionUnsubscribe(); } catch(e) {}
        window.institutionUnsubscribe = null;
    }

    // 4. 開啟「管理員模式」：isReadOnly 為 false，可以新增、編輯、刪除
    await renderInstitutionTable(containerId, context, { isReadOnly: false });
}