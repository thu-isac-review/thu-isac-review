import { state, resetInternRecordState } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

/**
 * 實習紀錄元件總初始化入口
 * 統一導出 InternRecordTable 供 Pages 層呼叫
 */
export const InternRecordTable = {
    init: async function(options = { isViewOnly: false }) {
        // 1. 狀態重置與權限寫入
        resetInternRecordState();
        state.isReadOnly = options.isViewOnly;
        
        // 2. 獲取 Firebase DB (自動掛載現有的 App 實體)
        try {
            const app = getApp();
            state.db = getFirestore(app);
        } catch (err) {
            console.error("Firebase App 尚未初始化，無法啟動實習紀錄元件", err);
            return;
        }
        
        const container = document.getElementById('intern-record-page-wrapper');
        if (!container) {
            console.warn("找不到實習紀錄容器 #intern-record-page-wrapper");
            return;
        }

        // 3. 若為「檢視模式 (View Only)」，自動抹除管理專用的 UI 元素
        if (state.isReadOnly) {
            const addBtn = document.getElementById('btn-create-record');
            const importBtn = document.getElementById('btn-import-trigger');
            const batchBar = document.getElementById('batch-bar');
            const selectAllChk = document.getElementById('selectAll');
            
            if (addBtn) addBtn.remove();
            if (importBtn) importBtn.remove();
            if (batchBar) batchBar.remove();
            if (selectAllChk) selectAllChk.closest('th').innerHTML = ''; // 清空全選表頭

            // 強制隱藏所有勾選框與操作按鈕
            let styleEl = document.getElementById('view-only-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'view-only-styles';
                document.head.appendChild(styleEl);
            }
            styleEl.innerHTML = `
                .col-checkbox, .col-actions, .row-select-chk, .btn-row-edit, .btn-row-delete { display: none !important; }
            `;
        }

        // 4. UI 權限限制與事件綁定
        Events.bindEvents(container);
        
        // 5. 初始化主檔與實習紀錄訂閱
        await Data.initDataSubscriptions(() => {
            if(document.getElementById('filter-container')) {
                Render.renderFilterDropdowns();
            }
            Render.renderTable();
        });

        // 6. 監聽資料庫更新並重繪
        Data.subscribeToRecords(() => {
            if(!state.isReadOnly) Events.updateBatchActionBar();
            if(document.getElementById('filter-container')) {
                Render.renderFilterDropdowns();
            }
            Render.renderTable();
        });
    }
};
