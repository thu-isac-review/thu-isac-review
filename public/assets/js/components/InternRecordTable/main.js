import { state, resetInternRecordState } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

export const InternRecordTable = {
    init: async function(options = { isViewOnly: false }) {
        resetInternRecordState();
        state.isReadOnly = options.isViewOnly;
        
        try {
            const app = getApp();
            state.db = getFirestore(app);
        } catch (err) {
            console.error("Firebase App 尚未初始化，無法啟動實習紀錄元件", err);
            return;
        }
        
        const container = document.getElementById('intern-record-page-wrapper');
        if (!container) return;

        // 【終極防呆】：初始化時立刻強制生成一版表頭 CSS 寬度鎖定，預防非同步載入過程中的破版。
        UI.updateColumnVisibility();

        const residualStyle = document.getElementById('view-only-styles');
        if (residualStyle) residualStyle.remove();

        if (state.isReadOnly) {
            const addBtn = document.getElementById('btn-create-record');
            const importBtn = document.getElementById('btn-import-trigger');
            const batchBar = document.getElementById('batch-bar');
            const selectAllChk = document.getElementById('selectAll');
            
            if (addBtn) addBtn.remove();
            if (importBtn) importBtn.remove();
            if (batchBar) batchBar.remove();
            if (selectAllChk) selectAllChk.closest('th').innerHTML = '';

            let styleEl = document.createElement('style');
            styleEl.id = 'view-only-styles';
            document.head.appendChild(styleEl);
            styleEl.innerHTML = `
                #intern-record-page-wrapper .col-checkbox, 
                #intern-record-page-wrapper .col-actions, 
                #intern-record-page-wrapper .row-select-chk, 
                #intern-record-page-wrapper .btn-row-edit, 
                #intern-record-page-wrapper .btn-row-delete { display: none !important; }
            `;
        }

        Events.bindEvents(container);
        
        await Data.initDataSubscriptions(() => {
            if(document.getElementById('filter-container')) Render.renderFilterDropdowns();
            Render.renderTable();
        });

        Data.subscribeToRecords(() => {
            if(!state.isReadOnly) Events.updateBatchActionBar();
            if(document.getElementById('filter-container')) Render.renderFilterDropdowns();
            Render.renderTable();
        });
    }
};
