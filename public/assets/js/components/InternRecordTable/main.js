/**
 * 實習紀錄模組 - 元件主控引導核心 (Main.js)
 * 負責系統初始載入串接，統合資料訂閱、視窗渲染和事件綁定三大區塊。
 */

import { state } from './state.js';
import * as db from './data.js';
import * as ui from './ui.js';
import * as render from './render.js';
import * as events from './events.js';

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
                // 未登入之轉導或載入載入骨架遮罩處理
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
        // A. 載入並監聽必要的學生、科系、機構與課程等主檔參照
        db.initDataSubscriptions({
            onStudentsUpdate: (students) => {
                state.allStudents = students;
                render.renderTable();
            },
            onInstsUpdate: (insts) => {
                state.allInsts = insts;
                render.renderTable();
            },
            onCoursesUpdate: (courses) => {
                state.allCourses = courses;
                render.renderTable();
            },
            onCollegesLoaded: (collegesList) => {
                state.orderedColleges = collegesList;
                render.renderTable();
            },
            onDeptsLoaded: (depts) => {
                state.globalDepts = depts;
                render.renderFilterDropdowns(); // 篩選需要系所簡稱，在此初始化篩選標籤
                render.renderTable();
            }
        });

        // B. 監聽實習紀錄主資料異動
        db.subscribeToRecords((records) => {
            state.allRecords = records;
            
            // 每次資料異動，主動重置批次選取狀態
            state.selectedIds = [];
            events.updateBatchActionBar();
            
            render.renderFilterDropdowns();
            render.renderTable();
        });

        // C. 綁定所有視窗 UI 事件與輸入框監聽
        events.setupEventListeners();
        
        // D. 初始化套用欄位設定
        render.updateColumnVisibility();
    }
};
