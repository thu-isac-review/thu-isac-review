import { state, formatCourseInfo } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    // 【新增快捷鍵功能】：綁定 / (搜尋) 以及 Esc (關閉/清空)
    if (!state.isKeyboardShortcutBound) {
        document.addEventListener('keydown', (e) => {
            const targetTag = e.target.tagName.toLowerCase();
            const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

            if (e.key === '/') {
                // 不在輸入框內按下 '/' 時，自動 Focus 到搜尋框
                if (!isInput) {
                    e.preventDefault();
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.focus();
                        // 將游標移到最後
                        const val = searchInput.value;
                        searchInput.value = '';
                        searchInput.value = val;
                    }
                }
            } else if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.dialog-overlay.open, .info-modal-overlay.open, .fs-modal.open');
                const openDropdowns = document.querySelectorAll('.filter-dropdown.show');
                
                if (openModals.length > 0) {
                    // 若有開啟 Modal，則關閉最上層的那個
                    const topModal = openModals[openModals.length - 1];
                    if (topModal.id === 'data-modal') {
                        UI.closeFormModal();
                    } else {
                        topModal.classList.remove('open');
                    }
                } else if (openDropdowns.length > 0) {
                    // 關閉所有的進階篩選選單
                    openDropdowns.forEach(d => d.classList.remove('show'));
                    document.querySelectorAll('.filter-pill-wrap.open').forEach(w => w.classList.remove('open'));
                } else if (isInput) {
                    // 若在輸入狀態，則取消 Focus；若是搜尋框且有文字，則清空並重繪
                    e.target.blur();
                    if (e.target.id === 'search-input' && e.target.value !== '') {
                        e.target.value = '';
                        e.target.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }
        });
        state.isKeyboardShortcutBound = true;
    }

    // ... 後續的 CSV 匯入匯出、表單送出、清單點擊等代碼 (1., 2., 3. 節) 請維持原樣即可 ...
