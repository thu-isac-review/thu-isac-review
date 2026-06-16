/**
 * 實習紀錄模組 - 元件主控引導核心 (Main.js)
 * 負責系統初始載入串接，統合資料訂閱、視窗渲染和事件綁定三大區塊。
 */

import { state } from './state.js';
import * as db from './data.js';
import * as ui from './ui.js';
import * as render from './render.js';
import * as events from './events.js';

// 用於防止 SPA 切換時重複綁定全域事件
let isEventsBound = false;
let recordsUnsubscribe = null;

export const InternRecordTable = {
    /**
     * 元件啟動主方法
     * @param {Object} config - 初始化設定，如: { isViewOnly: false }
     */
    init(config = { isViewOnly: false }) {
        state.isViewOnly = !!config.isViewOnly;
        
        // 開始進行即時資料訂閱與認證追蹤
        db.onAuthStateChanged(db.auth, (user) => {
            if (user) {
                this.loadApplication(user);
            } else {
                const tbody = document.getElementById('table-body');
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="16" class="empty-state"><div class="empty-text">請先完成登入驗證。</div></td></tr>`;
                }
            }
        });
    },

    /**
     * 認證成功後載入主檔並建立即時數據訂閱
     */
    loadApplication(user) {
        // 🛡️ 核心防禦：如果 DOM 不存在 (代表使用者已切換到別的頁面，或是模板載入失敗)
        // 絕對不能使用 setTimeout 無限重試，而是直接中止執行！
        if (!document.getElementById('search-input')) {
            console.warn("[InternRecordTable] DOM 尚未就緒或已切換頁面，安全中止模組載入。");
            return;
        }

        // A. 載入並監聽必要的學生、科系、機構與課程等主檔參照
        try {
            db.initDataSubscriptions({
                onStudentsUpdate: (students) => {
                    state.allStudents = students;
                    this.safeRenderTable();
                },
                onInstsUpdate: (insts) => {
                    state.allInsts = insts;
                    this.safeRenderTable();
                },
                onCoursesUpdate: (courses) => {
                    state.allCourses = courses;
                    this.safeRenderTable();
                },
                onCollegesLoaded: (collegesList) => {
                    state.orderedColleges = collegesList;
                    this.safeRenderTable();
                },
                onDeptsLoaded: (depts) => {
                    state.globalDepts = depts;
                    if(document.getElementById('filter-container')) {
                        render.renderFilterDropdowns();
                    }
                    this.safeRenderTable();
                }
            });
        } catch (err) {
            console.error("訂閱主檔資料流程發生錯誤:", err);
        }

        // B. 監聽實習紀錄主資料異動
        try {
            // 清除前一次可能的監聽，防止資料重複渲染
            if (recordsUnsubscribe) {
                recordsUnsubscribe();
            }

            recordsUnsubscribe = db.subscribeToRecords((records) => {
                state.allRecords = records;
                state.selectedIds = [];
                
                if(document.getElementById('batch-bar')) {
                    events.updateBatchActionBar();
                }
                if(document.getElementById('filter-container')) {
                    render.renderFilterDropdowns();
                }
                this.safeRenderTable();
            });
        } catch (err) {
            console.error("訂閱實習紀錄發生錯誤:", err);
            this.safeRenderTable();
        }

        // C. 綁定所有視窗 UI 事件與輸入框監聽 (加上防重複鎖)
        if (!isEventsBound) {
            try {
                events.setupEventListeners();
                isEventsBound = true; // 確保全域事件只會被綁定一次
            } catch (err) {
                console.error("事件監聽器設定失敗:", err);
            }
        }
        
        // D. 初始化套用欄位設定
        try {
            if(document.querySelector('table')) {
                render.updateColumnVisibility();
            }
        } catch (err) {
            console.error("欄位能見度初始化失敗:", err);
        }
    },
    
    /**
     * 安全的渲染表格方法，每次渲染前再做最後一次 DOM 存在性確認
     */
    safeRenderTable() {
        if (document.getElementById('search-input') && document.getElementById('table-body')) {
            render.renderTable();
        }
    }
};
