import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 模組區域變數 (SPA 本地狀態) ---
let db;
let allInstitutions = []; 
let editingId = null; 
let currentPage = 1; 
let itemsPerPage = 10;
let filterStatusSet = new Set(); 
let filterScaleSet = new Set(); // 規模篩選 (國內/國外或金流等)
let sortCol = 'created_at'; 
let sortDir = 'desc';

// --- 主渲染入口 ---
export async function render(containerId, context) {
    db = context.db;
    const container = document.getElementById(containerId);

    // 1. 注入保留完整 UI/UX 的 HTML 與 CSS (移除外側圓角與內邊距，滿版設計)
    injectUI(container);

    // 2. 綁定事件監聽 (全面改用 SPA 安全事件代理與監聽機制)
    bindEvents(container);

    // 3. 執行單次讀取 (Get Once) 極致省流，排除 onSnapshot
    await fetchInstitutionsOnce();
}

// ==========================================
// 1. UI 注入模組 (完美還原原版機構管理 UI/UX)
// ==========================================
function injectUI(container) {
    container.innerHTML = `
    <div id="institution-page-wrapper" style="height: 100%; display: flex; flex-direction: column;">
        <style>
            #institution-page-wrapper { font-family: 'Noto Sans TC', sans-serif; font-size: 14px; color: var(--text-primary); background: var(--bg); -webkit-font-smoothing: antialiased; flex: 1; display: flex; flex-direction: column; min-height: 0; }
            #institution-page-wrapper * { box-sizing: border-box; }
            
            .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .ti-spin { animation: spin 1s linear infinite; display: inline-block; }

            .toolbar { padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; }
            .search-wrap { position: relative; flex: 0 0 260px; }
            .search-wrap i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 16px; }
            .search-input { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0 10px 0 34px; font-size: 13px; font-family: inherit; color: var(--text-primary); outline: none; transition: border-color var(--transition), box-shadow var(--transition); }
            .search-input::placeholder { color: #9ca3af !important; opacity: 1 !important; }
            .search-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }
            .flex-spacer { flex: 1; }
            .v-divider { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; margin: 0 4px; }
            .toolbar-actions { display: flex; align-items: center; gap: 8px; }

            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 14px; height: 34px; border-radius: var(--radius); font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: none; white-space: nowrap; transition: all var(--transition); text-decoration: none; }
            .btn-primary { background: var(--brand); color: white; border: 1px solid var(--brand); }
            .btn-primary:hover { background: var(--brand-hover); }
            .btn-secondary { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
            .btn-secondary:hover { background: var(--bg); border-color: var(--border-strong); color: var(--text-primary); }
            .btn-danger { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }
            .btn-danger:hover { background: #fee2e2; }
            .btn-success-solid { background: var(--success); color: white; border: 1px solid var(--success); }
            .btn-success-solid:hover { background: #047857; }
            .btn-icon { width: 34px; padding: 0; justify-content: center; }
            .btn-icon.sm { width: 28px; height: 28px; }
            .btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .btn i { font-size: 16px; }

            .filter-row { padding: 10px 24px; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
            .filter-pill-wrap { position: relative; }
            .filter-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0 10px; height: 28px; border: 1px solid var(--border); border-radius: 99px; background: var(--surface); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all var(--transition); white-space: nowrap; }
            .filter-pill:hover { border-color: var(--border-strong); color: var(--text-primary); }
            .filter-pill.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }
            .filter-pill .pill-count { background: var(--brand); color: white; border-radius: 99px; font-size: 10px; font-weight: 700; padding: 0 5px; min-width: 16px; text-align: center; }
            .filter-pill i { font-size: 14px; transition: transform 0.2s; }
            .filter-pill-wrap.open .filter-pill i { transform: rotate(180deg); }
            .filter-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); min-width: 200px; z-index: 100; display: none; flex-direction: column; overflow: hidden; }
            .filter-dropdown.show { display: flex; }
            .filter-dropdown-list { max-height: 200px; overflow-y: auto; padding: 4px; }
            .filter-option { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: background var(--transition); }
            .filter-option:hover { background: var(--bg); color: var(--text-primary); }
            .filter-option input[type=checkbox] { accent-color: var(--brand); flex-shrink: 0; }
            .filter-dropdown-footer { padding: 6px 8px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
            .filter-dropdown-footer button { font-size: 11px; font-weight: 600; color: var(--danger); background: none; border: none; cursor: pointer; padding: 2px 4px; border-radius: var(--radius-sm); }
            .filter-dropdown-footer button:hover { background: var(--danger-bg); }

            .table-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); min-height: 0; }
            .table-scroll { flex: 1; overflow: auto; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 900px; }
            thead { position: sticky; top: 0; z-index: 10; background: var(--surface); }
            thead tr { border-bottom: 2px solid var(--border); }
            th { padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
            th[data-sort] { cursor: pointer; user-select: none; transition: color var(--transition); }
            th[data-sort]:hover { color: var(--text-secondary); }
            th .sort-icon { margin-left: 4px; font-size: 14px; opacity: 0.4; vertical-align: middle; }
            th.sort-asc .sort-icon, th.sort-desc .sort-icon { opacity: 1; color: var(--brand); }
            td { padding: 12px 16px; vertical-align: middle; word-break: break-word; border-bottom: 1px solid var(--border); }
            tr:hover td { background: #fafbff; }
            tr.disabled td { opacity: 0.6; filter: grayscale(40%); background: var(--bg); }

            .cell-primary { font-size: 13px; color: var(--text-primary); line-height: 1.4; }
            .cell-primary.bold { font-weight: 600; }
            .cell-secondary { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.5; }
            .cell-flex { display: flex; align-items: center; gap: 10px; }
            .institution-avatar { width: 32px; height: 32px; border-radius: var(--radius); background: var(--brand-light); border: 1px solid var(--brand-border); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--brand); flex-shrink: 0; }
            
            .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
            .badge-blue { background: var(--brand-light); color: var(--brand); border: 1px solid var(--brand-border); }
            
            .toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
            .toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
            .toggle-slider { width: 34px; height: 18px; background: var(--border-strong); border-radius: 20px; transition: 0.3s; position: relative; }
            .toggle-slider::before { content: ""; position: absolute; width: 12px; height: 12px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: var(--shadow-sm); }
            .toggle input:checked + .toggle-slider { background: var(--success); }
            .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
            .toggle.disabled { opacity: 0.5; cursor: not-allowed; }
            .toggle-label { margin-left: 8px; font-size: 11px; font-weight: 700; }
            .toggle-label.active { color: var(--success); }
            .toggle-label.inactive { color: var(--text-muted); }
            .row-actions { display: flex; align-items: center; justify-content: center; gap: 6px; opacity: 1; }

            .pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; flex-wrap: wrap; gap: 10px; border-radius: 0 !important; }
            .pagination-info { font-size: 12px; color: var(--text-muted); }
            .pagination-info strong { color: var(--text-primary); }
            .pagination-bar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            .per-page-select { height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 12px; font-family: inherit; color: var(--text-secondary); padding: 0 6px; cursor: pointer; outline: none; }
            .pagination-controls { display: flex; align-items: center; gap: 4px; }
            .page-btn { min-width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 8px; transition: all var(--transition); }
            .page-btn:hover:not(:disabled) { background: var(--bg); border-color: var(--border-strong); }
            .page-btn.active { background: var(--brand); color: white; border-color: var(--brand); font-weight: 700; }
            .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

            .dialog-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; padding: 24px; }
            .dialog-overlay.open { display: flex; }
            .dialog-box { background: var(--surface); border-radius: var(--radius-xl); box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 100%; display: flex; flex-direction: column; overflow: hidden; animation: dialogIn 0.25s cubic-bezier(0.16,1,0.3,1); }
            @keyframes dialogIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } }
            .dialog-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--surface); }
            .dialog-header h3 { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
            .dialog-header h3 i { font-size: 20px; color: var(--brand); }
            .dialog-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); transition: all var(--transition); }
            .dialog-close:hover { color: var(--danger); background: var(--danger-bg); }
            .dialog-body { padding: 24px; overflow-y: auto; max-height: calc(85vh - 130px); }
            .dialog-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: var(--bg); }

            .form-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
            .form-section-title i { color: var(--text-muted); font-size: 16px; }
            .field { display: flex; flex-direction: column; gap: 4px; }
            .field-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
            .field-label .req { color: var(--danger); margin-left: 2px; }
            .field-input, .field-select { width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); padding: 0 12px; font-size: 13px; font-family: inherit; color: var(--text-primary); outline: none; transition: border-color var(--transition), box-shadow var(--transition); }
            .field-input:focus, .field-select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(26,86,219,0.1); background: var(--surface); }
            select.field-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }

            @media (max-width: 768px) {
                .toolbar { padding: 12px 16px; justify-content: flex-end; }
                .search-wrap { flex: 0 0 100%; order: 1; margin-bottom: 8px; }
                .flex-spacer { display: none; }
                .toolbar-actions { order: 2; width: 100%; justify-content: space-between; }
                .toolbar-actions .btn { flex: 1; }
                .v-divider { display: none; }
                .filter-row { padding: 10px 16px; }
                .pagination-bar { flex-direction: column; align-items: flex-start; padding: 12px 16px; gap: 12px; }
                .pagination-bar-right { width: 100%; justify-content: space-between; }
                .dialog-overlay { padding: 12px; }
                #inst-form { flex-direction: column !important; gap: 16px !important; }
                #inst-form > div { width: 100% !important; margin: 0 !important; }
                .v-divider-modal { display: block !important; width: 100% !important; height: 1px !important; min-height: 1px !important; background-color: var(--border) !important; margin: 8px 0 !important; flex-shrink: 0 !important; }
            }
        </style>

        <div class="toolbar">
            <div class="search-wrap">
                <i class="ti ti-search"></i>
                <input type="text" id="inst-search-input" placeholder="搜尋機構名稱、統一編號..." class="search-input">
            </div>
            <div class="flex-spacer"></div>
            <div class="toolbar-actions">
                <button id="btn-export-inst" class="btn btn-success-solid"><i class="ti ti-file-export"></i> <span class="btn-text">匯出</span></button>
                <div class="v-divider"></div>
                <button id="btn-open-inst-modal" class="btn btn-primary"><i class="ti ti-building-plus"></i> <span class="btn-text">新增實習機構</span></button>
            </div>
        </div>

        <div class="filter-row">
            <div class="filter-pill-wrap" id="pill-wrap-scale">
                <button class="filter-pill" id="pill-scale">機構地域規格 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-scale">
                    <div class="filter-dropdown-list">
                        <label class="filter-option"><input type="checkbox" class="filter-chk-scale" value="國內企業"><span>國內企業</span></label>
                        <label class="filter-option"><input type="checkbox" class="filter-chk-scale" value="境外/國外企業"><span>境外/國外企業</span></label>
                        <label class="filter-option"><input type="checkbox" class="filter-chk-scale" value="公家機關/法人"><span>公家機關/法人</span></label>
                    </div>
                    <div class="filter-dropdown-footer"><button id="btn-clear-scale">清除此篩選</button></div>
                </div>
            </div>
            <div class="filter-pill-wrap" id="pill-wrap-status">
                <button class="filter-pill" id="pill-status">合作狀態 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-status">
                    <div class="filter-dropdown-list">
                        <label class="filter-option"><input type="checkbox" class="filter-chk-status" value="active"><span>合作中</span></label>
                        <label class="filter-option"><input type="checkbox" class="filter-chk-status" value="inactive"><span>暫停合作</span></label>
                    </div>
                    <div class="filter-dropdown-footer"><button id="btn-clear-status">清除此篩選</button></div>
                </div>
            </div>
        </div>

        <div class="table-wrap">
            <div class="table-scroll custom-scroll">
                <table>
                    <thead id="inst-table-head">
                        <tr>
                            <th data-sort="name" style="width: 30%;">實習機構資訊 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="tax_id" style="width: 15%;">統一編號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="scale" style="width: 15%;">地域規格 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="contact_name" style="width: 15%;">主要聯絡人 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="is_active" style="width: 12%;">合作狀態 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th style="width: 13%;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="inst-table-body">
                        <tr><td colspan="6" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i><div class="empty-text">同步機構資料中...</div></td></tr>
                    </tbody>
                </table>
            </div>
            <div class="pagination-bar">
                <div class="pagination-info" id="inst-pagination-info">共 0 筆</div>
                <div class="pagination-bar-right">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:12px; color:var(--text-muted)">每頁顯示</span>
                        <select class="per-page-select" id="inst-per-page-select">
                            <option value="10">10 筆</option>
                            <option value="25">25 筆</option>
                            <option value="50">50 筆</option>
                        </select>
                    </div>
                    <div class="pagination-controls" id="inst-pagination-controls"></div>
                </div>
            </div>
        </div>

        <div id="inst-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 800px;">
                <div class="dialog-header">
                    <h3 id="inst-modal-title"><i class="ti ti-building-plus"></i> 新增實習機構</h3>
                    <button type="button" class="dialog-close" id="btn-close-inst-x"><i class="ti ti-x"></i></button>
                </div>
                <form id="inst-form" class="dialog-body custom-scroll" style="display: flex; gap: 24px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-section-title" style="margin-bottom: 0;"><i class="ti ti-building"></i> 機構核心登記資料</div>
                        <div class="field"><label class="field-label">機構名稱 <span class="req">*</span></label><input type="text" id="input-inst-name" required placeholder="例如：台積電股份有限公司" class="field-input"></div>
                        <div class="field"><label class="field-label">統一編號 / 登記碼 <span class="req">*</span></label><input type="text" id="input-inst-tax" required placeholder="請輸入 8 位統一編號" class="field-input" style="font-family:monospace"></div>
                        <div class="field">
                            <label class="field-label">地域規格 <span class="req">*</span></label>
                            <select id="input-inst-scale" required class="field-select">
                                <option value="">請選擇...</option>
                                <option value="國內企業">國內企業</option>
                                <option value="境外/國外企業">境外/國外企業</option>
                                <option value="公家機關/法人">公家機關/法人</option>
                            </select>
                        </div>
                    </div>
                    <div class="v-divider-modal" style="width: 1px; background: var(--border); margin: 0;"></div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-section-title" style="margin-bottom: 0;"><i class="ti ti-user-phone"></i> 主要聯絡窗口</div>
                        <div class="field"><label class="field-label">聯絡人姓名 <span class="req">*</span></label><input type="text" id="input-inst-contact" required placeholder="請輸入主窗口姓名" class="field-input"></div>
                        <div class="field"><label class="field-label">聯絡電話 <span class="req">*</span></label><input type="text" id="input-inst-phone" required placeholder="例如：02-23456789 #123" class="field-input"></div>
                        <div class="field"><label class="field-label">電子郵件 <span class="req">*</span></label><input type="email" id="input-inst-email" required placeholder="例如：hr@company.com" class="field-input" style="font-family:monospace"></div>
                    </div>
                </form>
                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-inst">取消</button>
                    <button type="button" class="btn btn-primary" id="btn-submit-inst"><i class="ti ti-check"></i> 確認儲存</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ==========================================
// 2. 核心安全事件代理與監聽機制
// ==========================================
function bindEvents(container) {
    container.querySelector('#btn-export-inst').addEventListener('click', exportToCSV);
    container.querySelector('#btn-open-inst-modal').addEventListener('click', () => {
        editingId = null;
        document.getElementById('inst-form').reset();
        document.getElementById('inst-modal-title').innerHTML = '<i class="ti ti-building-plus" style="color:var(--brand)"></i> 新增實習機構';
        document.getElementById('input-inst-tax').readOnly = false;
        document.getElementById('input-inst-tax').style.background = 'var(--bg)';
        document.getElementById('inst-modal').classList.add('open');
    });
    container.querySelector('#inst-search-input').addEventListener('input', () => { currentPage = 1; renderTable(); });

    container.querySelector('#inst-per-page-select').addEventListener('change', (e) => { itemsPerPage = Number(e.target.value); currentPage = 1; renderTable(); });
    container.querySelector('#inst-table-head').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if(th) handleSort(th);
    });

    const toggleDrop = (type) => {
        const drop = document.getElementById(`drop-${type}`);
        const wrap = document.getElementById(`pill-wrap-${type}`);
        const isOpen = drop.classList.contains('show');
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
        if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
    };
    container.querySelector('#pill-scale').addEventListener('click', (e) => { e.stopPropagation(); toggleDrop('scale'); });
    container.querySelector('#pill-status').addEventListener('click', (e) => { e.stopPropagation(); toggleDrop('status'); });
    
    container.querySelector('#btn-clear-scale').addEventListener('click', () => clearFilter('scale'));
    container.querySelector('#btn-clear-status').addEventListener('click', () => clearFilter('status'));

    container.querySelectorAll('.filter-chk-scale').forEach(chk => {
        chk.addEventListener('change', (e) => handleFilterCheck('scale', e.target.value, e.target.checked));
    });
    container.querySelectorAll('.filter-chk-status').forEach(chk => {
        chk.addEventListener('change', (e) => handleFilterCheck('status', e.target.value, e.target.checked));
    });

    const closeInstModal = () => document.getElementById('inst-modal').classList.remove('open');
    container.querySelector('#btn-close-inst-x').addEventListener('click', closeInstModal);
    container.querySelector('#btn-cancel-inst').addEventListener('click', closeInstModal);
    container.querySelector('#btn-submit-inst').addEventListener('click', submitInstForm);

    // ✨ 表格行內按鈕：精確防錯事件委派機制 (與最新現況 roles 一致)
    container.querySelector('#inst-table-body').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-inst');
        const btnDel = e.target.closest('.btn-delete-inst');
        if(btnEdit) editInstitution(btnEdit.dataset.id);
        if(btnDel) deleteInstitution(btnDel.dataset.id, btnDel.dataset.name);
    });
    
    container.querySelector('#inst-table-body').addEventListener('change', (e) => {
        const toggle = e.target.closest('.toggle-inst-status-chk');
        if(toggle) toggleStatus(toggle.dataset.id, toggle.checked);
    });
}

// ==========================================
// 3. 業務資料處理核心 (Get Once)
// ==========================================
async function fetchInstitutionsOnce() {
    try {
        const snapshot = await getDocs(collection(db, "internship_institutions"));
        allInstitutions = snapshot.docs.map(doc => {
            const data = doc.data();
            let createdDate = '未知';
            if (data.created_at && data.created_at.toDate) {
                const date = data.created_at.toDate();
                createdDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
            }
            return { id: doc.id, ...data, createdDate };
        });
        
        renderTable();
    } catch (error) {
        document.getElementById('inst-table-body').innerHTML = `<tr><td colspan="6" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger); opacity:1;"></i><div class="empty-text">機構資料同步失敗，請聯絡中心管理員。</div></td></tr>`;
    }
}

function handleSort(thElement) {
    const col = thElement.dataset.sort;
    if (sortCol === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; } 
    else { sortCol = col; sortDir = 'asc'; }
    
    document.querySelectorAll('th[data-sort]').forEach(t => {
        t.classList.remove('sort-asc', 'sort-desc');
        t.querySelector('.sort-icon').className = 'ti ti-arrows-sort sort-icon';
    });
    
    thElement.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    thElement.querySelector('.sort-icon').className = `ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
    renderTable();
}

function handleFilterCheck(type, val, isChecked) {
    const set = type === 'scale' ? filterScaleSet : filterStatusSet;
    if (isChecked) set.add(val); else set.delete(val);
    currentPage = 1;
    updatePillActive(type);
    renderTable();
}

function clearFilter(type) {
    const set = type === 'scale' ? filterScaleSet : filterStatusSet;
    set.clear();
    document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = false);
    currentPage = 1;
    updatePillActive(type);
    renderTable();
}

function updatePillActive(type) {
    const set = type === 'scale' ? filterScaleSet : filterStatusSet;
    const pill = document.getElementById(`pill-${type}`);
    let typeName = type === 'scale' ? '機構地域規格' : '合作狀態';
    
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `${typeName} <i class="ti ti-chevron-down"></i>`;
    }
}

function renderTable() {
    const tbody = document.getElementById('inst-table-body');
    const searchTerm = document.getElementById('inst-search-input').value.toLowerCase();

    let filtered = allInstitutions.filter(u => {
        const matchSearch = (u.name || '').toLowerCase().includes(searchTerm) || (u.tax_id || '').toLowerCase().includes(searchTerm) || (u.contact_name || '').toLowerCase().includes(searchTerm);
        const matchScale = filterScaleSet.size === 0 || filterScaleSet.has(u.scale);
        const statusStr = u.is_active ? 'active' : 'inactive';
        const matchStatus = filterStatusSet.size === 0 || filterStatusSet.has(statusStr);
        return matchSearch && matchScale && matchStatus;
    });

    if (sortCol) {
        filtered.sort((a, b) => {
            let valA = (a[sortCol] || '').toString().toLowerCase();
            let valB = (b[sortCol] || '').toString().toLowerCase();
            if (sortCol === 'created_at') {
                valA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
                valB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const items = filtered.slice(start, start + itemsPerPage);

    document.getElementById('inst-pagination-info').innerHTML = total > 0 ? `共 <strong>${total}</strong> 筆，顯示第 ${start + 1}–${Math.min(start + itemsPerPage, total)} 筆` : `共 <strong>0</strong> 筆`;
    
    //分頁選單生成
    let pHtml = `<button class="page-btn page-step-btn" data-page="${currentPage-1}" ${currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=totalPages; p++) {
        if (p===1 || p===totalPages || Math.abs(p-currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn page-num-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    pHtml += `<button class="page-btn page-step-btn" data-page="${currentPage+1}" ${currentPage>=totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    
    document.getElementById('inst-pagination-controls').innerHTML = pHtml;
    document.querySelectorAll('#inst-pagination-controls .page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const p = Number(e.currentTarget.dataset.page);
            if(p && p >= 1 && p <= totalPages) { currentPage = p; renderTable(); }
        });
    });

    if (total === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-icon"><i class="ti ti-building-broadcast"></i></div><div class="empty-text">沒有符合篩選條件的實習機構。</div></td></tr>`; 
        return; 
    }

    tbody.innerHTML = items.map(data => {
        const initial = data.name ? data.name.charAt(0) : '🏢';
        return `
        <tr class="${!data.is_active ? 'disabled' : ''}">
            <td>
                <div class="cell-flex">
                    <div class="institution-avatar">${initial}</div>
                    <div style="min-width:0">
                        <div class="cell-primary bold" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${data.name || '未名'}</div>
                        <div class="cell-secondary" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">建檔時間: ${data.createdDate}</div>
                    </div>
                </div>
            </td>
            <td style="text-align: center; font-family: monospace;">${data.tax_id || '-'}</td>
            <td style="text-align: center;"><span class="badge badge-blue">${data.scale || '未分類'}</span></td>
            <td style="text-align: center;">
                <div class="cell-primary font-bold">${data.contact_name || '-'}</div>
                <div class="cell-secondary" style="margin-top:2px;">${data.contact_phone || ''}</div>
            </td>
            <td style="text-align: center;">
                <div style="display:flex; justify-content:center;">
                    <label class="toggle">
                        <input type="checkbox" class="toggle-inst-status-chk" data-id="${data.id}" ${data.is_active ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label ${data.is_active ? 'active' : 'inactive'}">${data.is_active ? '合作中' : '暫停'}</span>
                    </label>
                </div>
            </td>
            <td style="text-align: center;">
                <div class="row-actions">
                    <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-edit-inst" title="編輯機構資訊"><i class="ti ti-edit"></i></button>
                    <button data-id="${data.id}" data-name="${data.name}" class="btn btn-danger btn-icon sm btn-delete-inst" title="刪除機構資訊"><i class="ti ti-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ==========================================
// 4. 記憶體狀態同步（0 次 Firebase Reads 消耗）
// ==========================================
function exportToCSV() {
    if (allInstitutions.length === 0) return;
    let csv = '\uFEFF機構名稱,統一編號,地域規格,聯絡人,聯絡電話,電子郵件,合作狀態,建立時間\n';
    allInstitutions.forEach(u => csv += [u.name, u.tax_id, u.scale, u.contact_name, u.contact_phone, u.contact_email, u.is_active? '合作中':'暫停合作', u.createdDate].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n');
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `實習機構清單歷史庫_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click();
}

async function submitInstForm() {
    const btn = document.getElementById('btn-submit-inst');
    const payload = { 
        name: document.getElementById('input-inst-name').value.trim(),
        tax_id: document.getElementById('input-inst-tax').value.trim(),
        scale: document.getElementById('input-inst-scale').value,
        contact_name: document.getElementById('input-inst-contact').value.trim(),
        contact_phone: document.getElementById('input-inst-phone').value.trim(),
        contact_email: document.getElementById('input-inst-email').value.trim()
    };

    if(Object.values(payload).some(v => !v)) { alert("請填寫實習機構所有星號欄位"); return; }
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...';
    
    try {
        if (editingId) { 
            await updateDoc(doc(db, "internship_institutions", editingId), { ...payload, updated_at: serverTimestamp() });
            const idx = allInstitutions.findIndex(u => u.id === editingId);
            if (idx > -1) allInstitutions[idx] = { ...allInstitutions[idx], ...payload };
        } else {
            // 用統一編號作為 Firestore Document ID，天然防重複
            const docRef = doc(db, "internship_institutions", payload.tax_id);
            const newInstData = { ...payload, is_active: true, created_at: serverTimestamp() };
            await setDoc(docRef, newInstData);
            
            const date = new Date();
            const createdDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
            allInstitutions.unshift({ id: payload.tax_id, ...newInstData, createdDate });
        }
        document.getElementById('inst-modal').classList.remove('open');
        renderTable();
    } catch (err) { 
        alert("錯誤: " + err.message); 
    } finally { 
        btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存'; 
    }
}

function editInstitution(id) {
    const inst = allInstitutions.find(u => u.id === id);
    if (!inst) return;
    editingId = id;
    document.getElementById('input-inst-name').value = inst.name || '';
    document.getElementById('input-inst-tax').value = inst.tax_id || '';
    document.getElementById('input-inst-scale').value = inst.scale || '';
    document.getElementById('input-inst-contact').value = inst.contact_name || '';
    document.getElementById('input-inst-phone').value = inst.contact_phone || '';
    document.getElementById('input-inst-email').value = inst.contact_email || '';
    
    document.getElementById('input-inst-tax').readOnly = true;
    document.getElementById('input-inst-tax').style.background = 'var(--surface)';
    document.getElementById('inst-modal-title').innerHTML = '<i class="ti ti-edit" style="color:var(--brand)"></i> 編輯機構資料';
    document.getElementById('inst-modal').classList.add('open');
}

async function toggleStatus(id, isChecked) {
    try {
        await updateDoc(doc(db, "internship_institutions", id), { is_active: isChecked });
        const inst = allInstitutions.find(u => u.id === id);
        if(inst) inst.is_active = isChecked;
        renderTable();
    } catch (err) {
        alert("變更狀態失敗");
        renderTable();
    }
}

async function deleteInstitution(id, name) { 
    if (confirm(`警告：確定要徹底刪除實習機構「${name}」的所有建檔紀錄嗎？`)) {
        try {
            await deleteDoc(doc(db, "internship_institutions", id));
            allInstitutions = allInstitutions.filter(u => u.id !== id);
            renderTable();
        } catch (err) { alert("刪除失敗"); }
    }
}
