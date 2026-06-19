import { state, formatCourseInfo } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    // 🌟 [統一] 鍵盤快捷鍵防呆設計 (對齊 Student 模組)
    if (!state.isKeyboardShortcutBound) {
        document.addEventListener('keydown', (e) => {
            // 1. Esc 關閉層級視窗
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.dialog-overlay.open, .info-modal-overlay.open, .fs-modal.open');
                const openDropdowns = document.querySelectorAll('.filter-dropdown.show');
                
                if (openModals.length > 0) {
                    const topModal = openModals[openModals.length - 1];
                    if (topModal.id === 'data-modal') UI.closeFormModal();
                    else topModal.classList.remove('open');
                } else if (openDropdowns.length > 0) {
                    openDropdowns.forEach(d => d.classList.remove('show'));
                    document.querySelectorAll('.filter-pill-wrap.open').forEach(w => w.classList.remove('open'));
                } else {
                    // 若搜尋框 Focus 中，也可使用 Esc 取消 Focus
                    const searchInput = document.getElementById('search-input');
                    if (document.activeElement === searchInput) searchInput.blur();
                }
            }
            
            // 2. Ctrl/Cmd + F 快速搜尋
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) { searchInput.focus(); searchInput.select(); }
            }

            // 3. Ctrl/Cmd + S 快速儲存
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                if (state.isReadOnly) return;
                e.preventDefault();
                if (document.getElementById('data-modal')?.classList.contains('open')) {
                    document.getElementById('btn-submit')?.click();
                }
            }
        });
        state.isKeyboardShortcutBound = true;
    }

    // --- 搜尋框 debounce 統一設計 ---
    container.querySelector('#search-input')?.addEventListener('input', () => { 
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1; 
            Render.renderTable(); 
        }, 250);
    });

    // ... 下方的匯出 CSV、匯入、新增按鈕事件請保留原樣 ...
