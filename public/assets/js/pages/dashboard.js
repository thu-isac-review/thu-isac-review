import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. 初始化入口
// ==========================================
export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);
    
    // 注入 UI
    injectUI(container);
    
    // 獲取數據並顯示
    await loadDashboardStats(db);
}

// ==========================================
// 2. UI 注入 (HTML 與 CSS)
// ==========================================
function injectUI(container) {
    container.innerHTML = `
    <div id="dashboard-wrapper" style="padding: 24px;">
        <style>
            .dashboard-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); }
            .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: white; border: 1px solid var(--border); border-radius: var(--radius-lg); transition: transform 0.2s; }
            .stat-card:hover { transform: translateY(-2px); border-color: var(--brand-border); }
            .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
            .stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); }
            .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        </style>

        <!-- 統計數字區 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--brand-light); color: var(--brand);"><i class="ti ti-building-community"></i></div>
                <div>
                    <div class="stat-label">實習機構總數</div>
                    <div class="stat-value" id="stat-inst">-</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #f0fdf4; color: var(--success);"><i class="ti ti-file-text"></i></div>
                <div>
                    <div class="stat-label">實習記錄總數</div>
                    <div class="stat-value" id="stat-records">-</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #fef2f2; color: var(--danger);"><i class="ti ti-alert-triangle"></i></div>
                <div>
                    <div class="stat-label">待審核項目</div>
                    <div class="stat-value">0</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--indigo-bg); color: var(--indigo);"><i class="ti ti-users"></i></div>
                <div>
                    <div class="stat-label">系統使用者</div>
                    <div class="stat-value" id="stat-users">-</div>
                </div>
            </div>
        </div>

        <!-- 功能區塊 -->
        <div class="dashboard-card">
            <h2 class="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
                <i class="ti ti-layout-grid text-brand"></i> 系統快速連結
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="#intern_list/institution_view" class="p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition flex items-center gap-3">
                    <i class="ti ti-search text-2xl text-blue-600"></i>
                    <div>
                        <div class="font-bold text-sm">機構查詢</div>
                        <div class="text-xs text-gray-500">瀏覽所有已登錄之實習機構</div>
                    </div>
                </a>
                <a href="#intern_list/record_view" class="p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition flex items-center gap-3">
                    <i class="ti ti-file-analytics text-2xl text-blue-600"></i>
                    <div>
                        <div class="font-bold text-sm">實習記錄瀏覽</div>
                        <div class="text-xs text-gray-500">查看目前的實習記錄進度</div>
                    </div>
                </a>
                <div class="p-4 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                    更多功能規劃中...
                </div>
            </div>
        </div>
    </div>
    `;
}

// ==========================================
// 3. 資料獲取邏輯
// ==========================================
async function loadDashboardStats(db) {
    try {
        // 獲取機構數量
        const instSnap = await getDocs(collection(db, "internship_institutions"));
        document.getElementById('stat-inst').innerText = instSnap.size;

        // 獲取紀錄數量
        const recordSnap = await getDocs(collection(db, "internship_records"));
        document.getElementById('stat-records').innerText = recordSnap.size;

        // 獲取用戶數量
        const userSnap = await getDocs(collection(db, "users"));
        document.getElementById('stat-users').innerText = userSnap.size;
    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    }
}
