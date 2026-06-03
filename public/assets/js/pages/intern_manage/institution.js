import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. 全域模組狀態管理 (State)
// ==========================================
let db;
let allData = []; 
let allRecords = []; 
let filteredInstitutions = []; 
let selectedIds = [];

// 編輯與意圖暫存
let editingId = null; 
let editingOldData = null; 
let pendingPayload = null; 
let currentHistory = [];

// 表格與顯示組態
let currentPage = 1; 
let itemsPerPage = 15;
let sortCol = ''; 
let sortDir = '';
let isTreeMode = true; 
let isSearchAutoExpand = false; 
const expandedParents = new Set();

// 篩選器狀態集合
const filters = {
    country: new Set(),
    city: new Set(),
    industry: new Set(),
    venue: new Set()
};

// 欄位顯示權限
const colVis = { tax_id: true, industry: true, venue_type: true, country: true, city: true, address: true };

// ==========================================
// 2. 常數定義設定
// ==========================================
const LIST_COUNTRIES = ["中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門","馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"];
const LIST_CITIES = ["臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const LIST_INDUSTRIES = ["農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業","營建工程業","批發及零售業","運輸及儲配業","住宿及餐飲業","出版影音及資通訊業","電子零組件製造業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業","公共行政及國防","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"];
const LIST_VENUES = ["企業機構","其他機構","政府機構","就讀學校附屬機構"];

// ==========================================
// 3. 模組初始化入口
// ==========================================
export async function render(containerId, context) {
    db = context.db;
    const container = document.getElementById(containerId);
    
    // 初始化狀態
    selectedIds = []; 
    currentPage = 1; 
    expandedParents.clear(); 
    
    // UI 構建與綁定
    injectUI(container); 
    initSelectOptions(); 
    bindEvents(container); 
    updateColStyles(); 
    
    // 異步拉取雲端資料
    await fetchInitialDataOnce();
}

// ==========================================
// 4. UI 結構與樣式注入
// ==========================================
function injectUI(container) {
    container.innerHTML = `
    <style id="dynamic-col-styles"></style>
    <div id="institution-page-wrapper" class="flex flex-col h-full min-h-0 bg-[var(--bg)] text-[var(--text-primary)] font-sans text-sm antialiased select-none">
        <style>
            #institution-page-wrapper * { box-sizing: border-box; }
            .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .ti-spin { animation: spin 1s linear infinite; display: inline-block; }

            .tree-toggle { width: 22px; height: 22px; background: transparent; border: none; border-radius: 4px; cursor: pointer; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.2s; outline: none; margin-right: 8px; flex-shrink: 0; }
            .tree-toggle i { font-size: 16px; transition: transform 0.2s; }
            .tree-toggle:hover { color: var(--brand); background: var(--brand-light); }
            .tree-toggle.expanded i { transform: rotate(90deg); color: var(--brand); }
            
            .child-row { background-color: #fbfdff; }
            .child-row td { border-bottom: 1px dashed var(--border); }
            .child-row:hover td { background-color: #f0f7ff; }
            .child-name-wrap { display: flex; align-items: flex-start; padding-left: 24px; gap: 6px; }
            .child-name-wrap i { font-size: 16px; opacity: 0.5; color: var(--text-secondary); margin-top: 1px; flex-shrink: 0; }

            .searchable-select-wrap { position: relative; }
            .searchable-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; z-index: 150; display: none; }
            .searchable-dropdown.show { display: block; }
            .searchable-option { padding: 10px 12px; font-size: 13px; color: var(--text-primary); cursor: pointer; border-bottom: 1px solid var(--border); transition: all 0.15s; display: flex; align-items: center; justify-content: space-between; }
            .searchable-option:hover { background: var(--brand-light); color: var(--brand); font-weight: 600; }
            .searchable-option:last-child { border-bottom: none; }
            .searchable-option.empty-opt { color: var(--text-muted); font-style: italic; background: var(--bg); font-weight: 400; justify-content: center; }
            .searchable-option.empty-opt:hover { background: var(--bg); color: var(--text-muted); cursor: default; font-weight: 400; }

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
            .btn-indigo-solid { background: var(--indigo); color: white; border: 1px solid var(--indigo); }
            .btn-indigo-solid:hover { background: #4338ca; }
            .btn-icon { width: 34px; padding: 0; justify-content: center; }
            .btn-icon.sm { min-width: 28px; width: 28px; height: 28px; border-radius: 6px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .btn-sm { height: 28px; padding: 0 10px; font-size: 12px; }
            .btn:disabled { opacity: 0.5; cursor: not-allowed; }

            .filter-row { padding: 10px 24px; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; position: relative; }
            .filters-scroll-area { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
            .filter-pill-wrap { position: relative; }
            
            .filter-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0 10px; height: 28px; border: 1px solid var(--border); border-radius: 99px; background: var(--surface); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all var(--transition); white-space: nowrap; flex-shrink: 0; }
            .filter-pill:hover { border-color: var(--border-strong); color: var(--text-primary); }
            .filter-pill.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }
            .filter-pill .pill-count { background: var(--brand); color: white; border-radius: 99px; font-size: 10px; font-weight: 700; padding: 0 5px; min-width: 16px; text-align: center; }
            .filter-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); min-width: 220px; z-index: 100; display: none; flex-direction: column; overflow: hidden; }
            .filter-dropdown.show { display: flex; }
            .filter-dropdown-search { padding: 8px; border-bottom: 1px solid var(--border); }
            .filter-dropdown-search input { width: 100%; height: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px; font-size: 12px; outline: none; background: var(--bg); transition: 0.2s; }
            .filter-dropdown-search input:focus { border-color: var(--brand); background: var(--surface); box-shadow: 0 0 0 2px rgba(26,86,219,0.1); }
            .filter-dropdown-list { max-height: 200px; overflow-y: auto; padding: 4px; }
            .filter-option { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: background var(--transition); }
            .filter-option:hover { background: var(--bg); color: var(--text-primary); }
            .filter-option input[type=checkbox] { accent-color: var(--brand); flex-shrink: 0; }
            
            #display-settings-wrap { flex-shrink: 0; border-left: 1px solid var(--border); padding-left: 12px; margin-left: 4px; }
            #batch-bar { display: none; align-items: center; gap: 12px; padding: 8px 24px; background: var(--brand-light); border-bottom: 1px solid var(--brand-border); flex-shrink: 0; position: absolute; top: 0; left: 0; right: 0; height: 100%; z-index: 20; }
            #batch-bar.visible { display: flex; animation: slideDown 0.2s ease-out; }
            @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            .batch-info { font-size: 13px; font-weight: 600; color: var(--brand); display: flex; align-items: center; gap: 8px; }

            .table-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); min-height: 0; }
            .table-scroll { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: none; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; min-width: 1000px; }
            th { padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; position: sticky; top: 0; z-index: 10; background: var(--surface); border-bottom: 1px solid var(--border); }
            td { padding: 12px 16px; vertical-align: middle; word-break: break-word; border-bottom: 1px solid var(--border); background-color: inherit; }
            
            tr { background-color: var(--surface); transition: background-color 0.15s; }
            tr.child-row { background-color: #fbfdff; }
            tr:hover { background-color: #f3f6ff; }
            tr.child-row:hover { background-color: #edf3ff; }
            tr.selected { background-color: #eef2ff !important; }

            .col-checkbox { width: 48px; min-width: 48px; max-width: 48px; text-align: center; }
            th.col-checkbox { z-index: 15; }
            .col-name { min-width: 320px; }
            th.col-name { text-align: center; z-index: 15; } 
            .col-actions { width: 100px; min-width: 100px; max-width: 100px; text-align: center; }
            th.col-actions { z-index: 15; }
            .col-spacer { width: 100%; padding: 0 !important; border-bottom: 1px solid var(--border); }

            .merge-option { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 8px; background: white; cursor: pointer; transition: all var(--transition); }
            .merge-option:hover { background: var(--bg); border-color: var(--border-strong); }
            .merge-option input[type="radio"]:checked + .merge-option-content .merge-option-title { color: var(--brand); font-weight: 700; }

            @media (max-width: 768px) {
                .col-checkbox, .col-name, .col-actions { position: static !important; width: auto !important; min-width: 0 !important; }
                th.col-checkbox, th.col-name, th.col-actions { position: sticky !important; top: 0 !important; }
                .filter-row { padding: 10px 16px; flex-wrap: nowrap; }
                .filters-scroll-area { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; }
                #display-settings-wrap { border-left: none; padding-left: 8px; }
                #batch-bar { display: none !important; }
                .toolbar { padding: 12px 16px; }
                .search-wrap { flex: 0 0 100%; order: 1; margin-bottom: 8px; }
                .toolbar-actions { order: 2; width: 100%; justify-content: space-between; }
                .v-divider, .flex-spacer { display: none; }
                .pagination-bar { flex-direction: column; align-items: flex-start; padding: 12px 16px; gap: 12px; }
                .pagination-bar-right { width: 100%; justify-content: space-between; }
                #data-form, #tab-history { flex-direction: column !important; min-height: 0 !important; }
                .v-divider-modal { width: 100% !important; height: 1px !important; margin: 8px 0 !important; }
            }

            th[data-sort] { cursor: pointer; user-select: none; }
            th[data-sort]:hover { color: var(--text-secondary); }
            th .sort-icon { margin-left: 4px; font-size: 14px; opacity: 0.4; }
            th.sort-asc .sort-icon, th.sort-desc .sort-icon { opacity: 1; color: var(--brand); }
            .cell-primary { font-size: 13px; color: var(--text-primary); line-height: 1.4; }
            .cell-primary.bold { font-weight: 700; color: #000000; }

            .pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
            .pagination-info { font-size: 12px; color: var(--text-muted); }
            .pagination-info strong { color: var(--text-primary); }
            .pagination-bar-right { display: flex; align-items: center; gap: 10px; }
            .per-page-select { height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 12px; padding: 0 6px; cursor: pointer; outline: none; }
            .pagination-controls { display: flex; align-items: center; gap: 4px; }
            .page-btn { min-width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 12px; display: flex; align-items: center; justify-content: center; padding: 0 8px; transition: all var(--transition); }
            .page-btn:hover:not(:disabled) { background: var(--bg); border-color: var(--border-strong); }
            .page-btn.active { background: var(--brand); color: white; border-color: var(--brand); font-weight: 700; }
            .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

            .dialog-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; padding: 24px; }
            .dialog-overlay.open { display: flex; }
            .dialog-box { background: var(--surface); border-radius: var(--radius-xl); box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 100%; display: flex; flex-direction: column; overflow: hidden; }
            .dialog-header { background: var(--surface); }
            .dialog-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); }
            .dialog-close:hover { color: var(--danger); background: var(--danger-bg); }
            .dialog-body { padding: 24px; overflow-y: auto; max-height: calc(85vh - 150px); }
            .dialog-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: var(--bg); }

            .form-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
            .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
            .field-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
            .field-label .req { color: var(--danger); margin-left: 2px; }
            .field-input, .field-select { width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); padding: 0 12px; font-size: 13px; color: var(--text-primary); outline: none; transition: all var(--transition); }
            .field-input:focus, .field-select:focus, textarea.field-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(26,86,219,0.1); background: var(--surface); }

            .empty-state { text-align: center; padding: 40px; color: var(--text-muted); }
            .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
            .empty-text { font-size: 13px; font-weight: 600; }

            .intent-radio-card { display: block; cursor: pointer; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 12px; transition: all 0.2s; background: white; }
            .intent-radio-card:hover { border-color: var(--brand-light); background: #fafbff; }
            .intent-radio-card:has(input:checked) { border-color: var(--brand); background: #f0f4ff; box-shadow: 0 0 0 1px var(--brand); }
            .intent-radio-input { appearance: none; width: 16px; height: 16px; border: 2px solid #cbd5e1; border-radius: 50%; margin-right: 12px; position: relative; top: 2px; outline: none; cursor: pointer; background: white; }
            .intent-radio-input:checked { border-color: var(--brand); background-color: var(--brand); box-shadow: inset 0 0 0 3px #f0f4ff; }
        </style>

        <div class="toolbar">
            <div class="search-wrap">
                <i class="ti ti-search"></i>
                <input type="text" id="search-input" placeholder="搜尋機構名稱、統編或地址..." class="search-input">
            </div>
            <div class="flex-spacer"></div>
            <div class="toolbar-actions">
                <button id="btn-export-csv" class="btn btn-success-solid"><i class="ti ti-file-export"></i> <span class="btn-text">匯出清單</span></button>
                <button id="btn-import-trigger" class="btn btn-indigo-solid"><i class="ti ti-file-import"></i> <span class="btn-text">批次匯入</span></button>
                <div class="v-divider"></div>
                <button id="btn-create-inst" class="btn btn-primary"><i class="ti ti-plus"></i> <span class="btn-text">新增機構</span></button>
            </div>
            <input type="file" id="import-file" accept=".csv" style="display:none;">
        </div>

        <div class="filter-row">
            <div class="filters-scroll-area custom-scroll">
                <div class="filter-pill-wrap" id="pill-wrap-country">
                    <button class="filter-pill" id="pill-country">全部國別 <i class="ti ti-chevron-down"></i></button>
                    <div class="filter-dropdown" id="drop-country">
                        <div class="filter-dropdown-search">
                            <input type="text" id="search-country-input" placeholder="搜尋國別...">
                            <div class="flex justify-end mt-2 px-1">
                                <button type="button" class="text-xs text-brand hover:underline btn-filter-toggle" data-type="country" data-state="none">全選 / 全不選</button>
                            </div>
                        </div>
                        <div class="filter-dropdown-list" id="country-options-container"></div>
                    </div>
                </div>
                <div class="filter-pill-wrap" id="pill-wrap-city">
                    <button class="filter-pill" id="pill-city">全部縣市 <i class="ti ti-chevron-down"></i></button>
                    <div class="filter-dropdown" id="drop-city">
                        <div class="filter-dropdown-search">
                            <input type="text" id="search-city-input" placeholder="搜尋縣市...">
                            <div class="flex justify-end mt-2 px-1">
                                <button type="button" class="text-xs text-brand hover:underline btn-filter-toggle" data-type="city" data-state="none">全選 / 全不選</button>
                            </div>
                        </div>
                        <div class="filter-dropdown-list" id="city-options-container"></div>
                    </div>
                </div>
                <div class="filter-pill-wrap" id="pill-wrap-industry">
                    <button class="filter-pill" id="pill-industry">全部行業別 <i class="ti ti-chevron-down"></i></button>
                    <div class="filter-dropdown" id="drop-industry">
                        <div class="filter-dropdown-search">
                            <input type="text" id="search-industry-input" placeholder="搜尋行業別...">
                            <div class="flex justify-end mt-2 px-1">
                                <button type="button" class="text-xs text-brand hover:underline btn-filter-toggle" data-type="industry" data-state="none">全選 / 全不選</button>
                            </div>
                        </div>
                        <div class="filter-dropdown-list" id="industry-options-container"></div>
                    </div>
                </div>
                <div class="filter-pill-wrap" id="pill-wrap-venue">
                    <button class="filter-pill" id="pill-venue">全部場所 <i class="ti ti-chevron-down"></i></button>
                    <div class="filter-dropdown" id="drop-venue">
                        <div class="filter-dropdown-search">
                            <input type="text" id="search-venue-input" placeholder="搜尋場所...">
                            <div class="flex justify-end mt-2 px-1">
                                <button type="button" class="text-xs text-brand hover:underline btn-filter-toggle" data-type="venue" data-state="none">全選 / 全不選</button>
                            </div>
                        </div>
                        <div class="filter-dropdown-list" id="venue-options-container"></div>
                    </div>
                </div>
            </div>

            <div class="relative inline-block text-left" id="display-settings-wrap">
                <button id="btn-display-settings" class="btn btn-secondary btn-sm" style="font-weight: 500;"><i class="ti ti-settings"></i> 顯示設定</button>
                <div id="display-settings-menu" class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg hidden z-50 p-1.5">
                    <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition" id="btn-toggle-tree"><i class="ti ti-list-tree text-brand"></i> 切換為扁平列表</button>
                    <div class="h-px bg-gray-200 my-1 mx-2"></div>
                    <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition" id="btn-expand-all"><i class="ti ti-fold-down text-gray-400"></i> 展開所有分支</button>
                    <button class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition" id="btn-collapse-all"><i class="ti ti-fold-up text-gray-400"></i> 收合所有分支</button>
                    <div class="h-px bg-gray-200 my-2 mx-2"></div>
                    <div class="px-3 py-1 text-xs font-bold text-gray-400 tracking-wider">顯示欄位設定</div>
                    ${Object.keys(colVis).map(key => `
                        <label class="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer rounded">
                            <input type="checkbox" class="col-toggle-chk" value="${key}" checked> ${getFieldLabelText(key)}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div id="batch-bar">
                <div class="batch-info"><i class="ti ti-checks" style="font-size:18px;"></i> 已選 <span id="selected-count">0</span> 筆機構</div>
                <button id="btn-select-all-filtered" class="btn btn-sm btn-secondary">選取全部符合條件</button>
                <button id="btn-clear-selection" class="btn btn-sm btn-secondary">取消選取</button>
                <div class="flex-spacer"></div>
                <button id="btn-batch-edit" class="btn btn-sm btn-primary"><i class="ti ti-edit"></i> 批次修改屬性</button>
                <button id="btn-batch-merge" class="btn btn-sm btn-indigo-solid"><i class="ti ti-link"></i> 合併勾選</button>
                <button id="btn-batch-delete" class="btn btn-sm btn-danger"><i class="ti ti-trash"></i> 批次刪除</button>
            </div>
        </div>

        <div class="table-wrap">
            <div class="table-scroll custom-scroll">
                <table>
                    <thead>
                        <tr id="inst-table-head">
                            <th class="col-checkbox">
                                <div class="flex justify-center items-center">
                                    <input type="checkbox" id="selectAll" style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                                </div>
                            </th>
                            <th class="col-name" data-sort="name">實習機構名稱 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="tax_id" class="col-tax_id" style="min-width: 110px;">統一編號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="industry" class="col-industry" style="min-width: 130px;">行業別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="venue_type" class="col-venue_type" style="min-width: 130px;">實習場所 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="country" class="col-country" style="min-width: 90px;">國別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="city" class="col-city" style="min-width: 90px;">縣市別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="address" class="col-address" style="min-width: 220px; text-align: center;">實習場所地址 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th class="col-spacer"></th>
                            <th class="col-actions">操作</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
                        <tr><td colspan="10" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i><div class="empty-text">資料載入中...</div></td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="pagination-bar">
                <div class="pagination-info" id="pagination-info">共 0 間實習機構</div>
                <div class="pagination-bar-right">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs text-[var(--text-muted)]">每頁顯示</span>
                        <select class="per-page-select" id="per-page-select">
                            <option value="15">15 筆</option>
                            <option value="25">25 筆</option>
                            <option value="50">50 筆</option>
                        </select>
                    </div>
                    <div class="pagination-controls" id="pagination-controls"></div>
                </div>
            </div>
        </div>

        <div id="data-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 800px;">
                <div class="dialog-header flex flex-col items-start p-0 border-none">
                    <div class="w-full flex items-center justify-between p-5 pb-4">
                        <h3 id="modal-title" class="flex items-center gap-2 text-base font-bold text-gray-800"><i class="ti ti-building-skyscraper text-brand text-xl"></i> 新增實習機構</h3>
                        <button type="button" class="dialog-close" id="btn-close-modal-x"><i class="ti ti-x"></i></button>
                    </div>
                    <div id="modal-tabs" class="w-full border-b border-gray-200 px-5 hidden">
                        <nav class="-mb-px flex space-x-6">
                            <button type="button" id="tab-btn-main" class="border-brand text-brand whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors">機構詳細資料</button>
                            <button type="button" id="tab-btn-history" class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors">歷史變更軌跡</button>
                        </nav>
                    </div>
                </div>

                <form id="data-form" class="dialog-body custom-scroll" style="display: flex; gap: 24px; min-height: 420px;">
                    <div class="flex-1 flex flex-col gap-4">
                        <div class="form-section-title" style="margin-bottom: 0;"><i class="ti ti-building-skyscraper"></i> 機構基本資料</div>
                        <div class="field" style="margin-bottom: 0;">
                            <label class="field-label">隸屬主機構 (若為分公司請搜尋並選擇)</label>
                            <div class="searchable-select-wrap relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i class="ti ti-building text-gray-400"></i></div>
                                <input type="text" id="parent-search-input" class="w-full pl-9 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white" style="height: 36px; font-size: 13px;" placeholder="輸入關鍵字搜尋... (留空代表獨立機構)" autocomplete="off">
                                <button type="button" id="btn-clear-parent" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 cursor-pointer hidden"><i class="ti ti-x text-base"></i></button>
                                <input type="hidden" id="input-parent-id">
                                <div id="parent-dropdown-list" class="searchable-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"></div>
                            </div>
                        </div>
                        <div class="field" style="margin-bottom: 0;"><label class="field-label">實習場所國別 <span class="req">*</span></label><select id="input-country" required class="field-select"></select></div>
                        <div class="field" style="margin-bottom: 0;"><label class="field-label">機構主名稱 <span class="req">*</span></label><input type="text" id="input-name" required placeholder="國內/外機構主要識別名稱" class="field-input"></div>
                        <div class="field" id="wrap-name-translated" class="hidden" style="margin-bottom: 0;"><label class="field-label">中文譯名</label><input type="text" id="input-name-translated" placeholder="例如：蘋果公司 (選填)" class="field-input"></div>
                        <div class="field" id="wrap-name-local" class="hidden" style="margin-bottom: 0;"><label class="field-label">當地語言名稱</label><input type="text" id="input-name-local" placeholder="例如：Apple Inc. (選填)" class="field-input"></div>
                        <div class="field" id="wrap-overseas-tax" class="hidden" style="margin-bottom: 0;"><label class="field-label">海外稅號 / 立案號碼</label><input type="text" id="input-overseas-tax-id" placeholder="當地稅務或機構登記號碼 (選填)" class="field-input"></div>
                        <div class="field" id="wrap-tax-id" style="margin-bottom: 0;"><label class="field-label">統一編號 <span class="req">*</span></label><input type="text" id="input-tax-id" required placeholder="如: 12345678" class="field-input uppercase"></div>
                        <div class="field" id="wrap-city" style="margin-bottom: 0;"><label class="field-label">縣市別 <span id="req-city" class="req">*</span></label><select id="input-city" required class="field-select"><option value="">請選擇</option></select></div>
                        <div class="field" style="margin-bottom: 0;"><label class="field-label">完整實習地址 <span class="req">*</span></label><input type="text" id="input-address" required placeholder="詳細地址" class="field-input"></div>
                    </div>
                    <div class="v-divider-modal" style="width: 1px; background: var(--border); margin: 0;"></div>
                    <div class="flex-1 flex flex-col gap-4">
                        <div class="form-section-title" style="margin-bottom: 0;"><i class="ti ti-tags"></i> 分類與備註</div>
                        <div class="field" style="margin-bottom: 0;"><label class="field-label">行業別</label><select id="input-industry" class="field-select"><option value="">請選擇</option></select></div>
                        <div class="field" style="margin-bottom: 0;"><label class="field-label">實習場所</label><select id="input-venue-type" class="field-select"><option value="">請選擇</option></select></div>
                        <div class="field flex-1 flex flex-col" style="margin-bottom: 0;">
                            <label class="field-label">機構備註</label>
                            <textarea id="input-remarks" class="field-input custom-scroll flex-1 resize-none p-3 leading-relaxed" placeholder="可輸入與該機構相關之備註說明..."></textarea>
                        </div>
                    </div>
                </form>

                <div id="tab-history" class="dialog-body custom-scroll hidden" style="background: var(--bg); min-height: 420px;">
                    <div class="flex items-center justify-between mb-4">
                        <p class="text-xs text-gray-500 pr-4">將機構過去的舊名稱與地址封存於此，系統在建立未來的實習紀錄時，便可調用相應年份的正確資料。</p>
                        <button type="button" id="btn-show-add-history" class="btn btn-sm btn-indigo-solid flex-shrink-0 shadow-sm"><i class="ti ti-plus"></i> 新增歷史快照</button>
                    </div>

                    <div id="history-form-wrap" class="bg-white border border-indigo-200 rounded-xl p-5 mb-6 hidden shadow-sm relative">
                        <div class="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-4"><i class="ti ti-history text-lg"></i> 封存一筆歷史快照</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            <div class="field mb-0"><label class="field-label text-gray-600">適用結束日期 <span class="req text-red-500">*</span></label><input type="date" id="hist-end-date" class="field-input w-full bg-gray-50 focus:bg-white"></div>
                            <div class="field mb-0"><label class="field-label text-gray-600">舊統一編號 <span class="font-normal text-gray-400">(選填)</span></label><input type="text" id="hist-tax-id" class="field-input w-full bg-gray-50 focus:bg-white" placeholder="留空則代表沿用現況"></div>
                            <div class="field col-span-1 md:col-span-2 mb-0"><label class="field-label text-gray-600">歷史機構名稱 <span class="req text-red-500">*</span></label><input type="text" id="hist-name" class="field-input w-full bg-gray-50 focus:bg-white" placeholder="當時的機構名稱"></div>
                            <div class="field col-span-1 md:col-span-2 mb-0"><label class="field-label text-gray-600">歷史實習地址 <span class="req text-red-500">*</span></label><input type="text" id="hist-address" class="field-input w-full bg-gray-50 focus:bg-white" placeholder="當時的詳細地址"></div>
                            <div class="field col-span-1 md:col-span-2 mb-0"><label class="field-label text-gray-600">變更事由 <span class="font-normal text-gray-400">(選填)</span></label><input type="text" id="hist-reason" class="field-input w-full bg-gray-50 focus:bg-white" placeholder="例如：配合政府組織改造升格"></div>
                        </div>
                        <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
                            <button type="button" id="btn-cancel-history" class="btn btn-sm btn-secondary bg-white">取消</button>
                            <button type="button" id="btn-save-history" class="btn btn-sm btn-indigo-solid shadow-sm">確認封存快照</button>
                        </div>
                    </div>
                    <div id="history-list-container" class="flex flex-col gap-3"></div>
                </div>

                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-modal">取消</button>
                    <button type="button" id="btn-submit" class="btn btn-primary"><i class="ti ti-check"></i> 確認儲存變更</button>
                </div>
            </div>
        </div>

        <div id="change-intent-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 550px;">
                <div class="dialog-header flex flex-col items-start p-0 border-none">
                    <div class="w-full flex items-center justify-between p-5 pb-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                        <h3 class="flex items-center gap-2 text-base font-bold text-gray-800"><i class="ti ti-info-circle text-blue-500 text-xl"></i> 偵測到機構資料變更</h3>
                        <button type="button" class="dialog-close" id="btn-close-intent-x"><i class="ti ti-x"></i></button>
                    </div>
                </div>
                <div class="dialog-body bg-gray-50/50 p-6 custom-scroll">
                    <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-[13px] leading-relaxed mb-5 shadow-sm">
                        系統偵測到此機構的 <span class="font-bold text-red-500">核心資料（名稱、統編或地址等）</span> 已被修改。<br>為了確保資料庫關聯正確，請選擇此次變更的性質：
                    </div>
                    
                    <label class="intent-radio-card">
                        <div class="flex items-start">
                            <input type="radio" name="change_intent" value="typo" checked class="intent-radio-input flex-shrink-0">
                            <div>
                                <div class="text-[14px] font-bold text-gray-800 mb-1">這是單純改錯字 / 修正補漏</div>
                                <div class="text-[12px] text-gray-500 leading-relaxed">系統將同步更新過去所有學生的實習紀錄，全部修正為最新資料。</div>
                            </div>
                        </div>
                    </label>

                    <label class="intent-radio-card mb-0">
                        <div class="flex items-start">
                            <input type="radio" name="change_intent" value="history" class="intent-radio-input flex-shrink-0">
                            <div>
                                <div class="text-[14px] font-bold text-gray-800 mb-1">這是機構歷史改名 (如升格、改組、搬遷)</div>
                                <div class="text-[12px] text-gray-500 leading-relaxed">系統將保留過去學生的舊紀錄，並自動將舊資料封存為歷史快照。</div>
                            </div>
                        </div>
                    </label>

                    <div id="intent-history-fields" class="hidden mt-3 ml-[30px] p-4 bg-white border border-gray-200 rounded-lg shadow-sm relative">
                        <div class="absolute -top-2 left-6 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
                        <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">請補充歷史快照資訊</div>
                        <div class="field mb-3"><label class="field-label text-gray-600">舊資料適用結束日期 <span class="req text-red-500">*</span></label><input type="date" id="intent-end-date" class="field-input bg-gray-50 focus:bg-white h-9"></div>
                        <div class="field mb-0"><label class="field-label text-gray-600">變更事由 <span class="font-normal text-gray-400">(選填)</span></label><input type="text" id="intent-reason" class="field-input bg-gray-50 focus:bg-white h-9" placeholder="例如：配合政府組織改造升格"></div>
                    </div>
                </div>
                <div class="dialog-footer bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl flex justify-end gap-2">
                    <button type="button" class="btn btn-secondary bg-white" id="btn-cancel-intent">返回修改</button>
                    <button type="button" id="btn-confirm-intent" class="btn btn-primary shadow-sm"><i class="ti ti-check"></i> 確認執行儲存</button>
                </div>
            </div>
        </div>

        <div id="merge-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 650px;">
                <div class="dialog-header px-5 py-4 border-b border-gray-200">
                    <h3 class="text-base font-bold text-indigo-700 flex items-center gap-2"><i class="ti ti-link"></i> 合併重複主機構</h3>
                    <button type="button" class="dialog-close ml-auto" id="btn-close-merge-x"><i class="ti ti-x"></i></button>
                </div>
                <div class="dialog-body custom-scroll bg-[var(--bg)]">
                    <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-lg mb-4 text-xs text-indigo-800 leading-relaxed">
                        您已選取 <span id="merge-count" class="text-sm font-bold mx-1">0</span> 個機構準備進行合併。<br>
                        請在下方選擇<strong class="text-red-500 mx-1">「唯一要保留的主體機構」</strong>。合併後，其餘被勾選的機構將被刪除，且其底下的「分公司」及「學生實習紀錄」都會自動移轉到主體下。
                    </div>
                    <div id="merge-options-container" class="flex flex-col"></div>
                </div>
                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-merge">取消</button>
                    <button type="button" id="btn-merge-submit" class="btn btn-indigo-solid" disabled><i class="ti ti-link"></i> 確認執行深度合併</button>
                </div>
            </div>
        </div>

        <div id="batch-edit-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 450px;">
                <div class="dialog-header px-5 py-4 border-b border-gray-200">
                    <h3 class="text-base font-bold text-blue-700 flex items-center gap-2"><i class="ti ti-edit"></i> 批次修改機構屬性</h3>
                    <button type="button" class="dialog-close ml-auto" id="btn-close-batch-x"><i class="ti ti-x"></i></button>
                </div>
                <div class="dialog-body custom-scroll bg-[var(--bg)]">
                    <div class="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-4 text-xs text-blue-800 leading-relaxed">
                        將針對已選取的 <span id="batch-edit-count" class="text-sm font-bold mx-1">0</span> 筆機構進行統一修改。<br>
                        若保持「-- 不修改 --」，則該欄位維持原資料不變。
                    </div>
                    <div class="field"><label class="field-label">批次套用：行業別</label><select id="batch-input-industry" class="field-select"></select></div>
                    <div class="field"><label class="field-label">批次套用：實習場所</label><select id="batch-input-venue" class="field-select"></select></div>
                </div>
                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-batch">取消</button>
                    <button type="button" id="btn-batch-edit-submit" class="btn btn-primary"><i class="ti ti-check"></i> 確認批次更新</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

function getFieldLabelText(key) {
    const labels = { tax_id: "統一編號", industry: "行業別", venue_type: "實習場所", country: "國別", city: "縣市別", address: "實習場所地址" };
    return labels[key] || key;
}

// ==========================================
// 5. 元件渲染、資料繫結與動態選單初始化
// ==========================================
function initSelectOptions() {
    const renderOptions = (items, placeholder = false) => {
        let html = placeholder ? `<option value="">請選擇</option>` : '';
        items.forEach(item => html += `<option value="${item}">${item}</option>`);
        return html;
    };

    const renderFilterCheckboxes = (items, className) => {
        return items.map(item => `<label class="filter-option"><input type="checkbox" class="${className}" value="${item}"><span>${item}</span></label>`).join('');
    };

    document.getElementById('input-country').innerHTML = renderOptions(LIST_COUNTRIES);
    document.getElementById('input-city').innerHTML = renderOptions(LIST_CITIES, true);
    document.getElementById('input-industry').innerHTML = renderOptions(LIST_INDUSTRIES, true);
    document.getElementById('input-venue-type').innerHTML = renderOptions(LIST_VENUES, true);

    document.getElementById('country-options-container').innerHTML = renderFilterCheckboxes(LIST_COUNTRIES, 'filter-chk-country');
    document.getElementById('city-options-container').innerHTML = renderFilterCheckboxes(LIST_CITIES, 'filter-chk-city');
    document.getElementById('industry-options-container').innerHTML = renderFilterCheckboxes(LIST_INDUSTRIES, 'filter-chk-industry');
    document.getElementById('venue-options-container').innerHTML = renderFilterCheckboxes(LIST_VENUES, 'filter-chk-venue');
    
    const batchPlaceholder = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>';
    document.getElementById('batch-input-industry').innerHTML = batchPlaceholder + renderOptions(LIST_INDUSTRIES);
    document.getElementById('batch-input-venue').innerHTML = batchPlaceholder + renderOptions(LIST_VENUES);
}

function populateParentDropdown(excludeId = null) {
    const listContainer = document.getElementById('parent-dropdown-list');
    let html = '<div class="searchable-option empty-opt" data-id="" data-name="">-- 獨立機構 / 總公司 (無隸屬) --</div>';
    
    allData.forEach(d => {
        if (!d.parent_id && d.id !== excludeId) {
            html += `
            <div class="searchable-option" data-id="${d.id}" data-name="${d.name}">
                <span>${d.name}</span> 
                <span class="text-xs text-[var(--text-muted)] font-mono">${d.tax_id || ''}</span>
            </div>`;
        }
    });
    listContainer.innerHTML = html;
}

// ==========================================
// 6. 事件委派與核心事件監聽 (Events)
// ==========================================
function bindEvents(container) {
    // 頂部核心按鈕事件
    container.querySelector('#btn-export-csv').addEventListener('click', exportToCSV);
    container.querySelector('#btn-import-trigger').addEventListener('click', () => container.querySelector('#import-file').click());
    container.querySelector('#import-file').addEventListener('change', handleImport);
    container.querySelector('#btn-create-inst').addEventListener('click', openCreateModal);
    
    // 搜尋引擎輸入監聽
    container.querySelector('#search-input').addEventListener('input', () => { 
        currentPage = 1; 
        isSearchAutoExpand = true;
        renderTable(); 
    });

    // 篩選器 Popover 觸發控制
    ['country', 'city', 'industry', 'venue'].forEach(type => {
        container.querySelector(`#pill-${type}`).addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(type);
        });
        container.querySelector(`#search-${type}-input`).addEventListener('keyup', (e) => {
            filterDropdownItems(e.target, `${type}-options-container`);
        });
    });

    // 篩選選項切換 (全選/全不選)
    container.querySelectorAll('.btn-filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const isSelectAll = btn.dataset.state !== 'all';
            btn.dataset.state = isSelectAll ? 'all' : 'none';
            
            const targetSet = filters[type];
            container.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                if(c.closest('.filter-option').style.display !== 'none') { 
                    c.checked = isSelectAll; 
                    if(isSelectAll) targetSet.add(c.value); else targetSet.delete(c.value); 
                }
            });
            currentPage = 1; 
            updatePillActive(type); 
            renderTable();
        });
    });

    // 篩選面板 Checkbox 事件綁定
    container.querySelector('#country-options-container').addEventListener('change', (e) => handleFilterCheck('country', e));
    container.querySelector('#city-options-container').addEventListener('change', (e) => handleFilterCheck('city', e));
    container.querySelector('#industry-options-container').addEventListener('change', (e) => handleFilterCheck('industry', e));
    container.querySelector('#venue-options-container').addEventListener('change', (e) => handleFilterCheck('venue', e));

    // 顯示偏好設定選單控制
    const btnDisplaySettings = container.querySelector('#btn-display-settings');
    const displayMenu = container.querySelector('#display-settings-menu');
    btnDisplaySettings.addEventListener('click', (e) => {
        e.stopPropagation();
        displayMenu.classList.toggle('hidden');
    });

    container.querySelector('#btn-toggle-tree').addEventListener('click', (e) => {
        e.stopPropagation();
        isTreeMode = !isTreeMode;
        container.querySelector('#btn-toggle-tree').innerHTML = isTreeMode 
            ? `<i class="ti ti-list-tree text-brand mr-2"></i> 切換為扁平列表` 
            : `<i class="ti ti-list text-brand mr-2"></i> 切換為樹狀檢視`;
        renderTable();
    });

    container.querySelector('#btn-expand-all').addEventListener('click', (e) => {
        e.stopPropagation();
        allData.forEach(d => { if (!d.parent_id) expandedParents.add(d.id); });
        renderTable();
    });

    container.querySelector('#btn-collapse-all').addEventListener('click', (e) => {
        e.stopPropagation();
        expandedParents.clear();
        renderTable();
    });

    container.querySelectorAll('.col-toggle-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            colVis[e.target.value] = e.target.checked;
            updateColStyles();
        });
    });

    // 批次與分頁事件控制
    container.querySelector('#selectAll').addEventListener('change', toggleSelectPage);
    container.querySelector('#btn-select-all-filtered').addEventListener('click', selectAllFiltered);
    container.querySelector('#btn-clear-selection').addEventListener('click', clearSelection);
    container.querySelector('#btn-batch-delete').addEventListener('click', batchDelete);
    container.querySelector('#btn-batch-edit').addEventListener('click', openBatchEditModal);
    container.querySelector('#btn-batch-merge').addEventListener('click', openMergeModal);
    container.querySelector('#per-page-select').addEventListener('change', (e) => { itemsPerPage = Number(e.target.value); currentPage = 1; renderTable(); });
    
    container.querySelector('#pagination-controls').addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled || btn.classList.contains('active')) return;
        currentPage = Number(btn.dataset.page);
        renderTable();
    });
    
    container.querySelector('#inst-table-head').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) handleSort(th);
    });

    // 互動對話方塊 (Modal) 事件
    container.querySelector('#input-country').addEventListener('change', handleCountryChange);
    container.querySelector('#btn-close-modal-x').addEventListener('click', closeModal);
    container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
    container.querySelector('#btn-submit').addEventListener('click', submitForm);

    // 主從機構搜尋下拉選單 (精簡優化處理)
    const parentSearchInput = container.querySelector('#parent-search-input');
    const parentDropdown = container.querySelector('#parent-dropdown-list');
    const parentIdHidden = container.querySelector('#input-parent-id');
    const btnClearParent = container.querySelector('#btn-clear-parent');

    const toggleParentClearBtn = () => {
        btnClearParent.classList.toggle('hidden', !parentSearchInput.value);
    };

    parentSearchInput.addEventListener('focus', () => {
        parentDropdown.classList.add('show');
        parentDropdown.querySelectorAll('.searchable-option').forEach(o => o.style.display = 'flex');
    });

    parentSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        parentIdHidden.value = ''; 
        toggleParentClearBtn();
        parentDropdown.classList.add('show');
        parentDropdown.querySelectorAll('.searchable-option:not(.empty-opt)').forEach(opt => {
            opt.style.display = opt.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });

    btnClearParent.addEventListener('click', (e) => {
        e.stopPropagation();
        parentSearchInput.value = '';
        parentIdHidden.value = '';
        toggleParentClearBtn();
        parentDropdown.classList.remove('show');
    });

    parentDropdown.addEventListener('click', (e) => {
        const opt = e.target.closest('.searchable-option');
        if (!opt) return;
        parentIdHidden.value = opt.dataset.id || '';
        parentSearchInput.value = opt.dataset.name || '';
        toggleParentClearBtn();
        parentDropdown.classList.remove('show');
    });

    // 全域點擊自動收合處理，避免重複綁定，採用全域容器監聽
    container.addEventListener('click', (e) => {
        if (!e.target.closest('.searchable-select-wrap')) {
            parentDropdown.classList.remove('show');
            if (!parentIdHidden.value) { parentSearchInput.value = ''; toggleParentClearBtn(); }
        }
        if (!e.target.closest('#display-settings-wrap')) {
            displayMenu.classList.add('hidden');
        }
        if (!e.target.closest('.filter-pill-wrap')) {
            document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
        }
    });

    // 批次功能 Modal 事件
    container.querySelector('#btn-close-batch-x').addEventListener('click', closeBatchEditModal);
    container.querySelector('#btn-cancel-batch').addEventListener('click', closeBatchEditModal);
    container.querySelector('#btn-batch-edit-submit').addEventListener('click', executeBatchEdit);
    container.querySelector('#btn-close-merge-x').addEventListener('click', closeMergeModal);
    container.querySelector('#btn-cancel-merge').addEventListener('click', closeMergeModal);
    container.querySelector('#btn-merge-submit').addEventListener('click', executeMerge);

    // 表格列點擊代理 (包含展開、選取、編輯與刪除)
    container.querySelector('#table-body').addEventListener('click', (e) => {
        const target = e.target;
        const toggleBtn = target.closest('.tree-toggle');
        const rowChk = target.closest('.row-select-chk');
        const btnEdit = target.closest('.btn-row-edit');
        const btnDel = target.closest('.btn-row-delete');

        if (toggleBtn) {
            const pId = toggleBtn.closest('tr').dataset.id;
            const isExpanded = toggleBtn.classList.toggle('expanded');
            if (isExpanded) expandedParents.add(pId); else expandedParents.delete(pId);
            document.querySelectorAll(`.child-of-${pId}`).forEach(row => row.style.display = isExpanded ? '' : 'none');
            renderTable(); // 重新計算與更新計數面板
        } else if (rowChk) {
            toggleSelect(rowChk.value);
        } else if (btnEdit) {
            editData(btnEdit.dataset.id);
        } else if (btnDel) {
            deleteData(btnDel.dataset.id, btnDel.dataset.name);
        }
    });

    // 歷史快照分頁標籤切換處理
    const tabBtnMain = container.querySelector('#tab-btn-main');
    const tabBtnHistory = container.querySelector('#tab-btn-history');
    const tabMain = container.querySelector('#data-form');
    const tabHistory = container.querySelector('#tab-history');

    const toggleTabs = (showMain) => {
        tabBtnMain.classList.toggle('border-brand', showMain);
        tabBtnMain.classList.toggle('text-brand', showMain);
        tabBtnMain.classList.toggle('border-transparent', !showMain);
        tabBtnMain.classList.toggle('text-gray-500', !showMain);
        
        tabBtnHistory.classList.toggle('border-brand', !showMain);
        tabBtnHistory.classList.toggle('text-brand', !showMain);
        tabBtnHistory.classList.toggle('border-transparent', showMain);
        tabBtnHistory.classList.toggle('text-gray-500', showMain);
        
        tabMain.style.display = showMain ? 'flex' : 'none';
        tabHistory.style.display = showMain ? 'none' : 'block';
        if (!showMain) renderHistoryList();
    };

    tabBtnMain.addEventListener('click', () => toggleTabs(true));
    tabBtnHistory.addEventListener('click', () => toggleTabs(false));

    // 歷史快照表單操作
    container.querySelector('#btn-show-add-history').addEventListener('click', () => {
        document.getElementById('history-form-wrap').classList.remove('hidden');
        document.getElementById('hist-end-date').value = '';
        document.getElementById('hist-name').value = document.getElementById('input-name').value;
        document.getElementById('hist-address').value = document.getElementById('input-address').value;
        document.getElementById('hist-tax-id').value = document.getElementById('input-tax-id').value;
        document.getElementById('hist-reason').value = '';
    });

    container.querySelector('#btn-cancel-history').addEventListener('click', () => {
        document.getElementById('history-form-wrap').classList.add('hidden');
    });

    container.querySelector('#btn-save-history').addEventListener('click', () => {
        const endDate = document.getElementById('hist-end-date').value;
        const name = document.getElementById('hist-name').value.trim();
        const address = document.getElementById('hist-address').value.trim();
        if(!endDate || !name || !address) { alert('請填寫結束日期、歷史機構名稱與地址！'); return; }

        currentHistory.push({
            end_date: endDate,
            name,
            address,
            tax_id: document.getElementById('hist-tax-id').value.trim(),
            reason: document.getElementById('hist-reason').value.trim(),
            created_at: new Date().toISOString()
        });
        document.getElementById('history-form-wrap').classList.add('hidden');
        renderHistoryList();
    });

    // 歷史快照單項刪除
    tabHistory.addEventListener('click', (e) => {
        const btnDel = e.target.closest('.btn-del-history');
        if(btnDel && confirm('確定要刪除這筆歷史快照嗎？')) {
            currentHistory.splice(Number(btnDel.dataset.idx), 1);
            renderHistoryList();
        }
    });

    // 變更意圖 Modal 控制與執行攔截
    container.querySelector('#btn-close-intent-x').addEventListener('click', () => document.getElementById('change-intent-modal').classList.remove('open'));
    container.querySelector('#btn-cancel-intent').addEventListener('click', () => document.getElementById('change-intent-modal').classList.remove('open'));
    
    container.querySelectorAll('input[name="change_intent"]').forEach(r => {
        r.addEventListener('change', (e) => {
            document.getElementById('intent-history-fields').classList.toggle('hidden', e.target.value !== 'history');
        });
    });

    container.querySelector('#btn-merge-submit').disabled = true;
    container.querySelector('#merge-options-container').addEventListener('change', (e) => {
        if (e.target.name === 'master_inst') {
            container.querySelector('#btn-merge-submit').disabled = false;
        }
    });
}

function handleFilterCheck(type, e) {
    if (e.target.type !== 'checkbox') return;
    const set = filters[type];
    if (e.target.checked) set.add(e.target.value); else set.delete(e.target.value);
    currentPage = 1; 
    updatePillActive(type); 
    renderTable();
}

// ==========================================
// 7. 資料過濾與表格渲染引擎 (Render Module)
// ==========================================
function updateColStyles() {
    let css = '';
    Object.keys(colVis).forEach(key => {
        if (!colVis[key]) css += `.col-${key} { display: none !important; }\n`;
    });
    document.getElementById('dynamic-col-styles').textContent = css;
}

function toggleDropdown(type) {
    const drop = document.getElementById(`drop-${type}`);
    const wrap = document.getElementById(`pill-wrap-${type}`);
    const isOpen = drop.classList.contains('show');
    document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
    if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
}

function filterDropdownItems(inputElement, containerId) {
    const term = inputElement.value.toLowerCase();
    document.getElementById(containerId).querySelectorAll('.filter-option').forEach(lbl => {
        lbl.style.display = lbl.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
    });
}

function updatePillActive(type) {
    const set = filters[type];
    const titles = { country: '國別', city: '縣市', industry: '行業別', venue: '場所' };
    const pill = document.getElementById(`pill-${type}`);
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${titles[type]} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${titles[type]} <i class="ti ti-chevron-down"></i>`;
    }
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();

    const checkMatch = (d) => {
        const matchSearch = !searchTerm || 
                            (d.name || '').toLowerCase().includes(searchTerm) || 
                            (d.tax_id || '').toLowerCase().includes(searchTerm) ||
                            (d.address || '').toLowerCase().includes(searchTerm);
        const matchCountry = filters.country.size === 0 || filters.country.has(d.country);
        const matchCity = filters.city.size === 0 || filters.city.has(d.city);
        const matchIndustry = filters.industry.size === 0 || filters.industry.has(d.industry);
        const matchVenue = filters.venue.size === 0 || filters.venue.has(d.venue_type);
        return matchSearch && matchCountry && matchCity && matchIndustry && matchVenue;
    };

    filteredInstitutions = [];
    
    if (isTreeMode) {
        const grouped = {};
        const independent = [];
        allData.forEach(d => {
            if (!d.parent_id) { grouped[d.id] = { ...d, children: [] }; independent.push(grouped[d.id]); }
        });
        allData.forEach(d => {
            if (d.parent_id) {
                if (grouped[d.parent_id]) grouped[d.parent_id].children.push(d);
                else independent.push({ ...d, children: [] });
            }
        });

        independent.forEach(parent => {
            const pMatch = checkMatch(parent);
            const matchedChildren = parent.children.filter(c => checkMatch(c));
            
            if (pMatch || matchedChildren.length > 0) {
                if (isSearchAutoExpand && searchTerm && matchedChildren.length > 0) expandedParents.add(parent.id);
                filteredInstitutions.push({ 
                    ...parent, 
                    children: (pMatch && !searchTerm) ? parent.children : matchedChildren,
                    isExpanded: expandedParents.has(parent.id)
                });
            }
        });
    } else {
        filteredInstitutions = allData.filter(d => checkMatch(d));
    }
    
    isSearchAutoExpand = false; 

    // 資料排序邏輯
    if (sortCol) {
        filteredInstitutions.sort((a, b) => {
            let valA = a[sortCol] || ''; let valB = b[sortCol] || '';
            if (sortCol === 'country') {
                const aIdx = valA === '中華民國' ? 0 : 1;
                const bIdx = valB === '中華民國' ? 0 : 1;
                if (aIdx !== bIdx) return sortDir === 'asc' ? aIdx - bIdx : bIdx - aIdx;
            }
            return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });
    }

    // 分頁處理
    const totalMainItems = filteredInstitutions.length;
    const totalPages = Math.max(1, Math.ceil(totalMainItems / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredInstitutions.slice(start, start + itemsPerPage);

    // 計算符合條件的總數
    let totalAllMatched = 0;
    let totalChildrenMatched = 0;
    if (isTreeMode) {
        filteredInstitutions.forEach(p => { totalAllMatched++; p.children.forEach(c => { totalAllMatched++; totalChildrenMatched++; }); });
        document.getElementById('pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalAllMatched}</strong> 間實習機構（包含 ${totalChildrenMatched} 間分支機構），顯示第 ${start + 1}–${Math.min(start + itemsPerPage, totalMainItems)} 間主機構` : `共 <strong>0</strong> 間實習機構`;
    } else {
        document.getElementById('pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalMainItems}</strong> 間實習機構，顯示第 ${start + 1}–${Math.min(start + itemsPerPage, totalMainItems)} 間` : `共 <strong>0</strong> 間實習機構`;
    }
    
    // 渲染分頁按鈕頁碼
    let pHtml = `<button class="page-btn" data-page="${currentPage-1}" ${currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=totalPages; p++) {
        if (p===1 || p===totalPages || Math.abs(p-currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    pHtml += `<button class="page-btn" data-page="${currentPage+1}" ${currentPage>=totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById('pagination-controls').innerHTML = pHtml;

    const currentPaginatedIds = paginatedItems.map(d => d.id);
    document.getElementById('selectAll').checked = currentPaginatedIds.length > 0 && currentPaginatedIds.every(id => selectedIds.includes(id));

    if (totalMainItems === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的機構資料。</div></td></tr>`;
        return;
    }

    const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
        const isChecked = selectedIds.includes(data.id) ? 'checked' : '';
        const isDomestic = data.country === '中華民國';
        const dispTax = isDomestic && data.tax_id ? highlightKeyword(data.tax_id, searchTerm) : '-';
        const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span class="w-[22px] mr-2 flex-shrink-0 inline-block"></span>`;
        const childCountHtml = hasChildren && !isExpanded && data.children ? `<span class="ml-2 bg-[var(--brand-light)] text-[var(--brand)] px-1.5 py-0.5 rounded text-xs font-bold">${data.children.length}</span>` : '';
        const hName = highlightKeyword(data.name, searchTerm);
        
        const nameHtml = isChild 
            ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i><span class="cell-primary">${hName}</span></div>` 
            : `<div class="flex items-center">${toggleHtml}<span class="cell-primary bold">${hName}</span>${childCountHtml}</div>`;

        return `
        <tr class="${isChecked ? 'selected' : ''} ${isChild ? `child-row child-of-${parentId}` : 'parent-row'}" data-id="${data.id}" style="${isChild && !isExpanded ? 'display:none;' : ''}">
            <td class="col-checkbox"><div class="flex justify-center items-center"><input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked} style="accent-color: var(--brand); cursor: pointer; width:14px; height:14px; margin:0;"></div></td>
            <td class="col-name" style="text-align: left; padding-left: 16px;">${nameHtml}</td>
            <td class="col-tax_id" style="text-align: center;"><div class="cell-primary font-mono text-[var(--text-muted)]">${dispTax}</div></td>
            <td class="col-industry" style="text-align: center;"><div class="cell-primary">${data.industry || '-'}</div></td>
            <td class="col-venue_type" style="text-align: center;"><div class="cell-primary">${data.venue_type || '-'}</div></td>
            <td class="col-country" style="text-align: center;"><div class="cell-primary">${data.country}</div></td>
            <td class="col-city" style="text-align: center;"><div class="cell-primary">${isDomestic && data.city ? data.city : '-'}</div></td>
            <td class="col-address" style="text-align: left;"><div class="cell-primary truncate max-w-[240px]" title="${data.address}">${highlightKeyword(data.address, searchTerm)}</div></td>
            <td class="col-spacer"></td>
            <td class="col-actions"><div class="flex items-center justify-center gap-1.5"><button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit" title="編輯"><i class="ti ti-edit"></i></button><button data-id="${data.id}" data-name="${data.name}" class="btn btn-danger btn-icon sm btn-row-delete" title="刪除"><i class="ti ti-trash"></i></button></div></td>
        </tr>`;
    };

    let finalHtml = '';
    paginatedItems.forEach(item => {
        if (isTreeMode) {
            finalHtml += renderRow(item, false, null, item.isExpanded, item.children.length > 0);
            item.children.forEach(child => finalHtml += renderRow(child, true, item.id, item.isExpanded, false));
        } else {
            finalHtml += renderRow(item);
        }
    });
    tbody.innerHTML = finalHtml;
    updateBatchActionBar();
}

function renderHistoryList() {
    const container = document.getElementById('history-list-container');
    if(!currentHistory || currentHistory.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">尚無歷史快照紀錄</div>`;
        return;
    }
    const sorted = [...currentHistory].map((h, i) => ({...h, originalIndex: i})).sort((a,b) => new Date(b.end_date) - new Date(a.end_date));
    container.innerHTML = sorted.map(h => `
        <div class="relative pl-6 pb-4 border-l-2 border-indigo-100 last:border-0 last:pb-0">
            <div class="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1 border-2 border-white shadow-sm"></div>
            <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded tracking-wide">~ ${h.end_date} 前適用</span>
                    <button type="button" class="text-gray-400 hover:text-red-500 btn-del-history transition-colors" data-idx="${h.originalIndex}"><i class="ti ti-trash"></i></button>
                </div>
                <div class="font-bold text-gray-800 text-sm mt-1.5">${h.name}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="ti ti-map-pin"></i> ${h.address}</div>
                ${h.tax_id ? `<div class="text-xs text-gray-500 mt-0.5"><i class="ti ti-receipt"></i> 舊統編：${h.tax_id}</div>` : ''}
                ${h.reason ? `<div class="text-[13px] text-indigo-700 mt-2 pt-2 border-t border-gray-100"><i class="ti ti-info-circle"></i> 事由：${h.reason}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text || '';
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.toString().replace(regex, '<mark class="bg-yellow-200 text-black p-0">$1</mark>');
}

// ==========================================
// 8. 狀態更新與選取管理 (Selection)
// ==========================================
function toggleSelectPage(e) {
    const isChecked = e.target.checked;
    const visibleIds = [];
    document.querySelectorAll('#table-body tr').forEach(tr => {
        if(tr.style.display !== 'none' && !tr.querySelector('.empty-state')) {
            const chk = tr.querySelector('.row-select-chk');
            if(chk) visibleIds.push(chk.value);
        }
    });
    if (isChecked) {
        visibleIds.forEach(id => { if (!selectedIds.includes(id)) selectedIds.push(id); });
    } else {
        selectedIds = selectedIds.filter(id => !visibleIds.includes(id));
    }
    renderTable(); 
}

function toggleSelect(id) {
    const idx = selectedIds.indexOf(id);
    if (idx === -1) selectedIds.push(id); else selectedIds.splice(idx, 1);
    renderTable();
}

function selectAllFiltered() {
    selectedIds = [];
    filteredInstitutions.forEach(p => {
        selectedIds.push(p.id);
        if(isTreeMode) p.children.forEach(c => selectedIds.push(c.id));
    });
    renderTable();
}

function clearSelection() { selectedIds = []; renderTable(); }

function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    
    if (selectedIds.length > 0) {
        bar.classList.add('visible');
        count.innerText = selectedIds.length;
        
        let totalMatched = isTreeMode ? filteredInstitutions.reduce((acc, p) => acc + 1 + p.children.length, 0) : filteredInstitutions.length;
        if (selectedIds.length < totalMatched) {
            btnSelectAll.style.display = 'inline-flex';
            btnSelectAll.innerText = `選取全部符合條件 (${totalMatched})`;
        } else {
            btnSelectAll.style.display = 'none';
        }
    } else {
        bar.classList.remove('visible');
    }
}

function handleSort(thElement) {
    const col = thElement.dataset.sort;
    sortDir = (sortCol === col) ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    sortCol = col;
    
    document.querySelectorAll('th[data-sort]').forEach(t => {
        t.classList.remove('sort-asc', 'sort-desc');
        t.querySelector('.sort-icon').className = 'ti ti-arrows-sort sort-icon';
    });
    thElement.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    thElement.querySelector('.sort-icon').className = `ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
    renderTable();
}

function handleCountryChange() {
    const isDomestic = document.getElementById('input-country').value === '中華民國';
    document.getElementById('wrap-tax-id').classList.toggle('hidden', !isDomestic);
    document.getElementById('wrap-city').classList.toggle('hidden', !isDomestic);
    document.getElementById('wrap-name-translated').classList.toggle('hidden', isDomestic);
    document.getElementById('wrap-name-local').classList.toggle('hidden', isDomestic);
    document.getElementById('wrap-overseas-tax').classList.toggle('hidden', isDomestic);

    document.getElementById('input-tax-id').required = isDomestic;
    document.getElementById('input-city').required = isDomestic;
    if (!isDomestic) { document.getElementById('input-tax-id').value = ''; document.getElementById('input-city').value = ''; }
}

// ==========================================
// 9. 雲端資料交互與防錯機制 (Cloud API & Save)
// ==========================================
async function fetchInitialDataOnce() {
    try {
        const dataSnap = await getDocs(collection(db, "internship_institutions"));
        allData = dataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        selectedIds = [];
        renderTable();
        
        const recordSnap = await getDocs(collection(db, "internship_records"));
        allRecords = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        document.getElementById('table-body').innerHTML = `<tr><td colspan="10" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger); opacity:1;"></i><div class="empty-text">雲端資料同步中斷。</div></td></tr>`;
    }
}

function openCreateModal() {
    editingId = null; editingOldData = null; currentHistory = [];
    document.getElementById('data-form').reset();
    document.getElementById('input-parent-id').value = '';
    document.getElementById('parent-search-input').value = '';
    document.getElementById('btn-clear-parent').classList.add('hidden');
    document.getElementById('modal-tabs').classList.add('hidden');
    populateParentDropdown();
    handleCountryChange();
    document.getElementById('modal-title').innerHTML = '<i class="ti ti-plus text-brand"></i> 新增實習機構';
    document.getElementById('data-modal').classList.add('open');
}

function editData(id) {
    const docData = allData.find(d => d.id === id); if (!docData) return;
    editingId = id; editingOldData = { ...docData }; currentHistory = docData.history || [];
    
    document.getElementById('modal-tabs').classList.remove('hidden');
    document.getElementById('tab-btn-main').click();
    populateParentDropdown(id); 

    document.getElementById('input-parent-id').value = docData.parent_id || '';
    if (docData.parent_id) {
        const parentObj = allData.find(p => p.id === docData.parent_id);
        document.getElementById('parent-search-input').value = parentObj ? parentObj.name : '';
        document.getElementById('btn-clear-parent').classList.remove('hidden');
    } else {
        document.getElementById('parent-search-input').value = '';
        document.getElementById('btn-clear-parent').classList.add('hidden');
    }
    
    document.getElementById('input-country').value = docData.country || '中華民國';
    document.getElementById('input-name').value = docData.name || '';
    document.getElementById('input-name-translated').value = docData.name_translated || '';
    document.getElementById('input-name-local').value = docData.name_local || '';
    document.getElementById('input-tax-id').value = docData.tax_id || '';
    document.getElementById('input-overseas-tax-id').value = docData.overseas_tax_id || '';
    document.getElementById('input-city').value = docData.city || '';
    document.getElementById('input-industry').value = docData.industry || '';
    document.getElementById('input-venue-type').value = docData.venue_type || '';
    document.getElementById('input-address').value = docData.address || '';
    document.getElementById('input-remarks').value = docData.remarks || '';
    
    handleCountryChange(); 
    document.getElementById('modal-title').innerHTML = '<i class="ti ti-edit text-brand"></i> 編輯機構與歷史軌跡';
    document.getElementById('data-modal').classList.add('open');
}

function closeModal() { document.getElementById('data-modal').classList.remove('open'); editingId = null; pendingPayload = null; }

async function submitForm() {
    const isDomestic = document.getElementById('input-country').value === '中華民國';
    const payload = { 
        parent_id: document.getElementById('input-parent-id').value || '',
        country: document.getElementById('input-country').value,
        name: document.getElementById('input-name').value.trim(),
        name_translated: isDomestic ? '' : document.getElementById('input-name-translated').value.trim(),
        name_local: isDomestic ? '' : document.getElementById('input-name-local').value.trim(),
        tax_id: isDomestic ? document.getElementById('input-tax-id').value.trim() : '',
        overseas_tax_id: isDomestic ? '' : document.getElementById('input-overseas-tax-id').value.trim(),
        city: isDomestic ? document.getElementById('input-city').value : '',
        industry: document.getElementById('input-industry').value,
        venue_type: document.getElementById('input-venue-type').value,
        address: document.getElementById('input-address').value.trim(),
        remarks: document.getElementById('input-remarks').value.trim(),
        history: currentHistory 
    };

    if(!payload.country || !payload.name || !payload.address) { alert("請填寫所有必填欄位！"); return; }
    if (isDomestic && (!payload.tax_id || !payload.city)) { alert("中華民國機構必須填寫「統一編號」與「縣市別」！"); return; }

    let hasSignificantChange = false;
    if (editingId && editingOldData) {
        if (editingOldData.name !== payload.name || editingOldData.address !== payload.address) hasSignificantChange = true;
        if (isDomestic && (editingOldData.tax_id !== payload.tax_id || editingOldData.city !== payload.city)) hasSignificantChange = true;
        if (!isDomestic && editingOldData.overseas_tax_id !== payload.overseas_tax_id) hasSignificantChange = true;
    }

    if (hasSignificantChange) {
        pendingPayload = payload;
        document.getElementById('intent-end-date').value = new Date().toISOString().split('T')[0]; 
        document.getElementById('intent-history-fields').classList.add('hidden');
        document.querySelector('input[name="change_intent"][value="typo"]').checked = true;
        document.getElementById('change-intent-modal').classList.add('open');
        return; 
    }
    await executeSave(payload, true);
}

async function executeSave(payload, isTypo = true) {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerHTML = '儲存中...';
    try {
        const batch = writeBatch(db);
        if (editingId) {
            batch.update(doc(db, "internship_institutions", editingId), { ...payload, updated_at: serverTimestamp() });
            if (isTypo && editingOldData && editingOldData.name !== payload.name) {
                allRecords.forEach(rec => {
                    if (rec.inst_id === editingId || (!rec.inst_id && rec.inst_raw === editingOldData.name)) {
                        batch.update(doc(db, "internship_records", rec.id), { inst_raw: payload.name, updated_at: serverTimestamp() });
                    }
                });
            }
        } else {
            await addDoc(collection(db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
        }
        await batch.commit();
        closeModal(); 
        await fetchInitialDataOnce();
    } catch (err) { 
        alert("儲存失敗"); 
    } finally { 
        btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存變更'; 
    }
}

// ==========================================
// 10. 批次處理、深度合併與匯出匯入 (Batch Engine)
// ==========================================
function openBatchEditModal() {
    if (selectedIds.length === 0) return;
    document.getElementById('batch-edit-count').innerText = selectedIds.length;
    document.getElementById('batch-input-industry').value = 'NO_CHANGE';
    document.getElementById('batch-input-venue').value = 'NO_CHANGE';
    document.getElementById('batch-edit-modal').classList.add('open');
}
function closeBatchEditModal() { document.getElementById('batch-edit-modal').classList.remove('open'); }

async function executeBatchEdit() {
    const indVal = document.getElementById('batch-input-industry').value;
    const venVal = document.getElementById('batch-input-venue').value;
    if (!confirm(`確定要批次修改這 ${selectedIds.length} 筆機構嗎？`)) return;
    try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            const updates = { updated_at: serverTimestamp() };
            if (indVal !== 'NO_CHANGE') updates.industry = indVal;
            if (venVal !== 'NO_CHANGE') updates.venue_type = venVal;
            batch.update(doc(db, "internship_institutions", id), updates);
        });
        await batch.commit();
        closeBatchEditModal(); 
        await fetchInitialDataOnce();
    } catch(e) { alert("更新失敗"); }
}

function openMergeModal() {
    if(selectedIds.length < 2) { alert("請至少勾選 2 個機構進行合併！"); return; }
    document.getElementById('merge-count').innerText = selectedIds.length;
    const container = document.getElementById('merge-options-container');
    const targetInsts = allData.filter(i => selectedIds.includes(i.id));
    
    container.innerHTML = targetInsts.map(inst => `
        <label class="merge-option">
            <input type="radio" name="master_inst" value="${inst.id}">
            <div class="merge-option-content">
                <div class="merge-option-title">${inst.name}</div>
                <div class="merge-option-desc">統編：${inst.tax_id || '無'} | 地址：${inst.address || '無'}</div>
            </div>
        </label>
    `).join('');
    document.getElementById('merge-modal').classList.add('open');
}
function closeMergeModal() { document.getElementById('merge-modal').classList.remove('open'); }

async function executeMerge() {
    const masterId = document.querySelector('input[name="master_inst"]:checked')?.value; if(!masterId) return;
    const masterInst = allData.find(i => i.id === masterId);
    const instsToDelete = selectedIds.filter(id => id !== masterId);
    const deletedNames = allData.filter(i => instsToDelete.includes(i.id)).map(i => i.name);
    
    if(!confirm(`確認深度合併？\n\n📌 保留主體：${masterInst.name}\n🗑️ 刪除對象：${deletedNames.join('、')}`)) return;
    
    try {
        const batch = writeBatch(db);
        allRecords.forEach(record => {
            if (instsToDelete.includes(record.inst_id) || (!record.inst_id && deletedNames.includes(record.inst_raw))) {
                batch.update(doc(db, "internship_records", record.id), { inst_id: masterInst.id, updated_at: serverTimestamp() });
            }
        });
        allData.forEach(d => {
            if (instsToDelete.includes(d.parent_id)) { batch.update(doc(db, "internship_institutions", d.id), { parent_id: masterId }); }
        });
        instsToDelete.forEach(id => batch.delete(doc(db, "internship_institutions", id)));
        await batch.commit();
        closeMergeModal(); 
        await fetchInitialDataOnce();
    } catch(e) { alert("合併失敗"); }
}

async function batchDelete() {
    const hasChildren = selectedIds.some(id => allData.some(d => d.parent_id === id && !selectedIds.includes(d.id)));
    if (hasChildren) { alert("⚠️ 批次刪除失敗！\n您選取的項目中包含「尚有分公司未被選取」的主機構。\n請移除該主機構，或連同其分公司一併勾選刪除。"); return; }
    if (!confirm(`確定刪除這 ${selectedIds.length} 筆機構嗎？`)) return;
    try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, "internship_institutions", id)));
        await batch.commit(); 
        await fetchInitialDataOnce();
    } catch (e) { alert("刪除失敗"); }
}

async function deleteData(id, name) {
    if (allData.some(d => d.parent_id === id)) { alert(`⚠️ 無法刪除！\n\n「${name}」底下還有綁定分公司。\n請先解除分公司的隸屬綁定。`); return; }
    if (confirm(`確定要刪除機構「${name}」嗎？`)) {
        try {
            await deleteDoc(doc(db, "internship_institutions", id));
            await fetchInitialDataOnce();
        } catch(e) { alert("刪除失敗"); }
    }
}

function exportToCSV() {
    if (filteredInstitutions.length === 0) { alert("沒有資料可供匯出！"); return; }
    let csv = '\uFEFF實習機構主名稱,隸屬主機構,中文譯名,當地語言名稱,統一編號,海外稅號,行業別,實習場所,實習場所國別,縣市別,實習場所地址,備註\n';
    
    const appendRow = (d, parentName = '') => {
        return [ d.name, parentName, d.name_translated || '', d.name_local || '', d.tax_id || '', d.overseas_tax_id || '', d.industry || '', d.venue_type || '', d.country, d.city || '', d.address, d.remarks || '' ]
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    };

    filteredInstitutions.forEach(p => {
        csv += appendRow(p);
        if (isTreeMode && p.children) { p.children.forEach(c => csv += appendRow(c, p.name)); }
    });

    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `實習機構清單_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click();
}

async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const btn = document.getElementById('btn-import-trigger');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> <span>匯入中...</span>';
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const rows = event.target.result.split('\n').map(r => r.trim()).filter(r => r);
            const batch = writeBatch(db);
            
            for (let i = 1; i < rows.length; i++) {
                let cols = []; let inQuotes = false; let currentVal = '';
                for (let char of rows[i]) {
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                    else currentVal += char;
                }
                cols.push(currentVal.trim());
                if (cols.length >= 10 && cols[0]) {
                    const newDocRef = doc(collection(db, "internship_institutions"));
                    batch.set(newDocRef, {
                        name: cols[0], name_translated: cols[1] || '', name_local: cols[2] || '', 
                        tax_id: cols[3] || '', overseas_tax_id: cols[4] || '', industry: cols[5] || '', venue_type: cols[6] || '',
                        country: cols[7] || '中華民國', city: cols[8] || '', address: cols[9] || '', remarks: cols[10] || '',
                        parent_id: '', history: [], created_at: serverTimestamp()
                    });
                }
            }
            await batch.commit();
            alert(`✅ 成功批次匯入完成！`); 
            await fetchInitialDataOnce();
        } catch (error) { 
            alert("格式錯誤\n" + error.message); 
        } finally { 
            btn.innerHTML = originalHtml; btn.disabled = false; e.target.value = ''; 
        }
    };
    reader.readAsText(file);
}
