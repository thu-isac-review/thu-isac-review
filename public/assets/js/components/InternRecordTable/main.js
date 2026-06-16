/**
 * 實習紀錄模組 - 元件主控引導核心 (Main.js)
 */

import { state } from './state.js';
import * as db from './data.js';
import * as ui from './ui.js';
import * as render from './render.js';
import * as events from './events.js';

export const InternRecordTable = {
    init(config = { isViewOnly: false }) {
        state.isViewOnly = !!config.isViewOnly;
        
        db.onAuthStateChanged(db.auth, (user) => {
            if (user) {
                // 等待瀏覽器完成 DOM 渲染後再執行綁定
                setTimeout(() => {
                    this.loadApplication(user);
                }, 50);
            } else {
                const tbody = document.getElementById('table-body');
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="16" class="empty-state"><div class="empty-text">請先完成登入驗證。</div></td></tr>`;
                }
            }
        });
    },

    loadApplication(user) {
        if (!document.getElementById('search-input')) {
            console.warn("DOM 尚未就緒，延遲載入模組...");
            setTimeout(() => this.loadApplication(user), 100);
            return;
        }

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

        try {
            db.subscribeToRecords((records) => {
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

        try {
            events.setupEventListeners();
        } catch (err) {
            console.error("事件監聽器設定失敗:", err);
        }
        
        try {
            if(document.querySelector('table')) {
                render.updateColumnVisibility();
            }
        } catch (err) {
            console.error("欄位能見度初始化失敗:", err);
        }
    },
    
    safeRenderTable() {
        if (document.getElementById('search-input') && document.getElementById('table-body')) {
            render.renderTable();
        }
    }
};
