import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 模組區域變數 ---
let db;
let allData = []; 
let allRecords = []; 
let baseTree = []; 

let editingId = null; 
let editingOldData = null; 
let pendingPayload = null; 

let currentPage = 1; 
let itemsPerPage = 15;
let selectedIds = [];
let filteredInstitutions = []; 

let filterCountrySet = new Set();
let filterCitySet = new Set();
let filterIndustrySet = new Set();
let filterVenueSet = new Set();

let sortCol = ''; 
let sortDir = '';

let isTreeMode = true; 
let expandedParents = new Set();
let isSearchAutoExpand = false; 
let isAllExpanded = false; // ✨ 展開收合狀態追蹤

let currentHistory = [];
let colVis = { tax_id: true, industry: true, venue_type: true, country: true, city: true, address: true };

let isGlobalListenerBound = false;
let searchDebounceTimer = null; 

const LIST_COUNTRIES = ["中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門","馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"];
const LIST_CITIES = ["臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const LIST_INDUSTRIES = ["農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業","營建工程業","批發及零售業","運輸及倉儲業","住宿及餐飲業","出版及影音等內容傳播業","電信及資訊服務業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業","公共行政及國防；強制性社會安全","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"];
const LIST_VENUES = ["企業機構","其他機構","政府機構","就讀學校附屬機構"];

export async function render(containerId, context) {
    db = context.db;
    const container = document.getElementById(containerId);
    selectedIds = []; currentPage = 1; expandedParents.clear(); isAllExpanded = false;
    injectUI(container); initSelectOptions(); bindEvents(container); updateColStyles(); 
    await fetchInitialDataOnce();
}

// 取得今日民國日期格式 (YYY/MM/DD)
function getROCDateString() {
    const today = new Date();
    const rocYear = today.getFullYear() - 1911;
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${rocYear}/${mm}/${dd}`;
}

// ✨ 修正 3：民國日期自動格式化與驗證
function formatROCDate(val) {
    let s = val.replace(/\D/g, '');
    if (s.length === 6) s = '0' + s; 
    if (s.length === 7) return `${s.substring(0,3)}/${s.substring(3,5)}/${s.substring(5,7)}`;
    return val; 
}
function isValidROCDate(val) {
    return /^\d{2,3}\/\d{2}\/\d{2}$/.test(val);
}

// ==========================================
// 1. UI 注入模組
// ==========================================
function injectUI(container) {
    container.innerHTML = `
    <style id="dynamic-col-styles"></style>

    <div id="institution-page-wrapper" style="height: 100%; display: flex; flex-direction: column;">
        <style>
            #institution-page-wrapper { font-family: 'Noto Sans TC', sans-serif; font-size: 14px; color: var(--text-primary); background: var(--bg); -webkit-font-smoothing: antialiased; flex: 1; display: flex; flex-direction: column; min-height: 0; }
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
            .child-name-wrap { display: flex; align-items: flex-start; padding-left: 3px; gap: 11px; }
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
            #batch-bar { display: none; align-items: center; gap: 12px; padding: 8px 24px; background: var(--brand-light); border-bottom: 1px solid var(--brand-border); flex-shrink: 0; position: absolute; top: 0; left: 0; right: 0; height: 100%; z-index: 5; }
            #batch-bar.visible { display: flex; animation: slideDown 0.2s ease-out; }
            @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            .batch-info { font-size: 13px; font-weight: 600; color: var(--brand); display: flex; align-items: center; gap: 8px; }

            /* ✨ 修正 6：拔除 spacer，使用 auto 讓欄位自由延展填充空間 */
            .table-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); min-height: 0; border-left: none; border-right: none; isolation: isolate; z-index: 0; }
            .table-scroll { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: none; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; min-width: 1000px; }
            th { padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; position: sticky; top: 0; z-index: 1; background: var(--surface); border-bottom: 1px solid var(--border); }
            td { padding: 12px 16px; vertical-align: middle; word-break: break-word; border-bottom: 1px solid var(--border); background-color: inherit; }
            
            tr { background-color: var(--surface); transition: background-color 0.15s; }
            tr.child-row { background-color: #fbfdff; }
            tr.child-row td { border-bottom: 1px dashed var(--border); }
            tr:hover { background-color: #f3f6ff; }
            tr.child-row:hover { background-color: #edf3ff; }
            tr.selected { background-color: #eef2ff !important; }

            .col-checkbox { position: sticky; left: 0; width: 48px; min-width: 48px; max-width: 48px; text-align: center; z-index: 2; background-color: inherit; }
            th.col-checkbox { z-index: 3; background-color: var(--surface); }

            /* 名稱欄位拔除 max-width 讓它自由伸展 */
            .col-name { min-width: 250px; }
            th.col-name { text-align: center; z-index: 1; } 
            
            .col-tax_id { width: 12%; min-width: 110px; }
            .col-industry { width: 12%; min-width: 130px; }
            .col-venue_type { width: 12%; min-width: 130px; }
            .col-country { width: 8%; min-width: 90px; }
            .col-city { width: 8%; min-width: 90px; }
            .col-address { width: auto; min-width: 220px; }

            .col-actions { position: sticky; right: 0; width: 100px; min-width: 100px; max-width: 100px; text-align: center; z-index: 2; background-color: inherit; }
            th.col-actions { z-index: 3; background-color: var(--surface); }

            @media (max-width: 768px) {
                .col-checkbox { position: static !important; min-width: 48px !important; }
                .col-name { position: static !important; min-width: 250px !important; width: auto !important; }
                .col-actions { position: static !important; min-width: 100px !important; box-shadow: none !important;}
                th.col-checkbox, th.col-name, th.col-actions { position: sticky !important; top: 0 !important; left: auto !important; right: auto !important; z-index: 2 !important; box-shadow: none !important; border-bottom: 1px solid var(--border) !important;}
                
                .filter-row { padding: 10px 16px; flex-wrap: nowrap; }
                .filters-scroll-area { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: none; padding-bottom: 2px; scrollbar-width: none; }
                .filters-scroll-area::-webkit-scrollbar { display: none; }
                .filter-pill-wrap { position: static; }
                .filter-dropdown { top: 100%; left: 16px; right: 16px; min-width: 0; width: auto; margin-top: 4px; }
                #display-settings-wrap { border-left: none; padding-left: 8px; margin-left: 0; }

                #batch-bar { display: none !important; }
                .toolbar { padding: 12px 16px; justify-content: flex-end; }
                .search-wrap { flex: 0 0 100%; order: 1; margin-bottom: 8px; }
                .flex-spacer { display: none; }
                .toolbar-actions { order: 2; width: 100%; justify-content: space-between; display: flex; gap: 8px; }
                .toolbar-actions .btn { flex: 1; padding: 0 4px; font-size: 11px; margin: 0; }
                .v-divider { display: none; }
                
                .pagination-bar { flex-direction: column; align-items: flex-start; padding: 12px 16px; gap: 12px; }
                .pagination-bar-right { width: 100%; justify-content: space-between; }
                .dialog-overlay { padding: 12px; }
                .dialog-body-container { flex-direction: column !important; gap: 16px !important; height: auto !important; min-height: 0 !important; }
                .dialog-body-container > div { width: 100% !important; margin: 0 !important; padding: 0 !important; }
                .v-divider-modal { display: block !important; width: 100% !important; height: 1px !important; min-height: 1px !important; background-color: var(--border) !important; margin: 8px 0 !important; flex-shrink: 0 !important; }
            }

            th[data-sort] { cursor: pointer; user-select: none; transition: color var(--transition); }
            th[data-sort]:hover { color: var(--text-secondary); }
            th .sort-icon { margin-left: 4px; font-size: 14px; opacity: 0.4; vertical-align: middle; }
            th.sort-asc .sort-icon, th.sort-desc .sort-icon { opacity: 1; color: var(--brand); }

            .cell-primary { font-size: 13px; color: var(--text-primary); line-height: 1.4; }
            .cell-primary.bold { font-weight: 700; color: #000000; }
            .row-actions { display: flex; align-items: center; justify-content: center; gap: 6px; }

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
            
            .dialog-header { background: var(--surface); }
            .dialog-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); transition: all var(--transition); }
            .dialog-close:hover { color: var(--danger); background: var(--danger-bg); }
            
            .dialog-body-container { height: 500px; display: flex; overflow: hidden; background: var(--bg); }
            .dialog-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: var(--bg); flex-shrink: 0; }

            .form-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
            .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
            .field-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
            .field-label .req { color: var(--danger); margin-left: 2px; }
            /* ✨ 修正 5: 輸入框一律白底 */
            .field-input, .field-select { width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius); background: #ffffff; padding: 0 12px; font-size: 13px; font-family: inherit; color: var(--text-primary); outline: none; transition: all var(--transition); }
            .field-input:focus, .field-select:focus, textarea.field-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }

            .empty-state { text-align: center; padding: 40px; color: var(--text-muted); }
            .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
            .empty-text { font-size: 13px; font-weight: 600; }

            .intent-radio-card { display: block; cursor: pointer; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 12px; transition: all 0.2s; background: white; }
            .intent-radio-card:hover { border-color: var(--brand-light); background: #fafbff; }
            .intent-radio-card:has(input:checked) { border-color: var(--brand); background: #f0f4ff; box-shadow: 0 0 0 1px var(--brand); }
            .intent-radio-input { appearance: none; width: 16px; height: 16px; border: 2px solid #cbd5e1; border-radius: 50%; margin-right: 12px; position: relative; top: 2px; outline: none; cursor: pointer; transition: all 0.2s; background: white; flex-shrink: 0; }
            .intent-radio-input:checked { border-color: var(--brand); background-color: var(--brand); box-shadow: inset 0 0 0 3px #f0f4ff; }
            
            .flex-center { display: flex; align-items: center; justify-content: center; }
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
                            <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                                <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="country" data-state="none">全選 / 全不選</button>
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
                            <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                                <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="city" data-state="none">全選 / 全不選</button>
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
                            <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                                <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="industry" data-state="none">全選 / 全不選</button>
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
                            <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                                <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="venue" data-state="none">全選 / 全不選</button>
                            </div>
                        </div>
                        <div class="filter-dropdown-list" id="venue-options-container"></div>
                    </div>
                </div>
            </div>

            <div class="relative inline-block text-left" id="display-settings-wrap">
                <button id="btn-display-settings" class="btn btn-secondary btn-sm" style="font-weight: 500;"><i class="ti ti-settings"></i> 顯示設定</button>
                <div id="display-settings-menu" style="position:absolute; right:0; top:calc(100% + 4px); width:200px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-md); padding:8px; z-index:100; display:none;" class="menu-popup">
                    <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:flex-start; border:none; margin-bottom:4px;" id="btn-toggle-tree"><i class="ti ti-list-tree" style="color:var(--brand); margin-right:4px;"></i> <span>切換為扁平列表</span></button>
                    <div style="height:1px; background:var(--border); margin:4px 0;"></div>
                    <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:flex-start; border:none; margin-bottom:4px;" id="btn-toggle-expand"><i class="ti ti-arrows-maximize" style="color:var(--brand); margin-right:4px;"></i> <span>展開所有分支</span></button>
                    
                    <div style="height:1px; background:var(--border); margin:4px 0;"></div>
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted); padding:4px 8px;">顯示欄位設定</div>
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="tax_id" checked> 統一編號</label>
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="industry" checked> 行業別</label>
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="venue_type" checked> 實習場所</label>
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="country" checked> 國別</label>
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="city" checked> 縣市別</label>
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="address" checked> 實習場所地址</label>
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
                                <div class="flex-center">
                                    <input type="checkbox" id="selectAll" style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                                </div>
                            </th>
                            <th class="col-name" data-sort="name">實習機構名稱 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            
                            <th data-sort="tax_id" class="col-tax_id">統一編號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="industry" class="col-industry">行業別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="venue_type" class="col-venue_type">實習場所 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="country" class="col-country">國別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="city" class="col-city">縣市別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="address" class="col-address" style="text-align: center;">實習場所地址 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            
                            <th class="col-actions">操作</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
                        <tr><td colspan="9" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i><div class="empty-text">資料載入中...</div></td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="pagination-bar">
                <div class="pagination-info" id="pagination-info">共 0 間實習機構</div>
                <div class="pagination-bar-right">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:12px; color:var(--text-muted)">每頁顯示</span>
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
                <div class="dialog-header flex-col items-start p-0 border-none" style="flex-direction: column; align-items: flex-start; padding: 0; border: none;">
                    <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 16px;">
                        <h3 id="modal-title" style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700;"><i class="ti ti-building-skyscraper text-brand" style="font-size: 20px;"></i> 新增實習機構</h3>
                        <button type="button" class="dialog-close" id="btn-close-modal-x"><i class="ti ti-x"></i></button>
                    </div>
                    <div id="modal-tabs" style="width: 100%; border-bottom: 1px solid var(--border); padding: 0 20px; display: none;">
                        <nav style="display: flex; gap: 24px; margin-bottom: -1px;">
                            <button type="button" id="tab-btn-main" style="padding: 12px 4px; border: none; border-bottom: 2px solid var(--brand); background: none; color: var(--brand); font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s;">機構詳細資料</button>
                            <button type="button" id="tab-btn-history" style="padding: 12px 4px; border: none; border-bottom: 2px solid transparent; background: none; color: var(--text-muted); font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s;">歷史變更軌跡</button>
                        </nav>
                    </div>
                </div>

                <div class="dialog-body-container">
                    <form id="data-form" class="custom-scroll" style="display: flex; gap: 24px; width: 100%; padding: 24px; overflow-y: auto;">
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="form-section-title"><i class="ti ti-building-skyscraper"></i> 機構基本資料</div>
                            
                            <div class="field">
                                <label class="field-label">隸屬主機構 (若為分公司請搜尋並選擇)</label>
                                <div class="searchable-select-wrap relative">
                                    <div style="position: absolute; left: 12px; top: 0; bottom: 0; display: flex; align-items: center; pointer-events: none;">
                                        <i class="ti ti-building" style="color: var(--text-muted); font-size: 16px;"></i>
                                    </div>
                                    <input type="text" id="parent-search-input" class="field-input" style="padding-left: 36px; padding-right: 32px;" placeholder="輸入關鍵字搜尋... (留空代表獨立機構)" autocomplete="off">
                                    <button type="button" id="btn-clear-parent" style="position: absolute; right: 10px; top: 0; bottom: 0; background: none; border: none; cursor: pointer; display: none; align-items: center; color: var(--text-muted); transition: 0.2s;">
                                        <i class="ti ti-x" style="font-size: 16px;"></i>
                                    </button>
                                    <input type="hidden" id="input-parent-id">
                                    <div id="parent-dropdown-list" class="searchable-dropdown custom-scroll"></div>
                                </div>
                            </div>
                            
                            <div class="field"><label class="field-label">實習場所國別 <span class="req">*</span></label><select id="input-country" required class="field-select"></select></div>
                            <div class="field"><label class="field-label">機構主名稱 <span class="req">*</span></label><input type="text" id="input-name" required placeholder="請輸入完整機構名稱" class="field-input"></div>
                            
                            <div class="field" id="wrap-name-translated" style="display:none;"><label class="field-label">當地名稱 / 英文譯名</label><input type="text" id="input-name-translated" placeholder="例如：Apple Inc. (選填)" class="field-input"></div>
                            <div class="field" id="wrap-overseas-tax" style="display:none;"><label class="field-label">海外稅號 / 立案號碼</label><input type="text" id="input-overseas-tax-id" placeholder="當地稅務或機構登記號碼 (選填)" class="field-input"></div>
                            
                            <div class="field" id="wrap-tax-id"><label class="field-label">統一編號 <span class="req">*</span></label><input type="text" id="input-tax-id" required placeholder="如: 12345678" class="field-input" style="text-transform:uppercase;"></div>
                            <div class="field" id="wrap-city"><label class="field-label">縣市別 <span id="req-city" class="req">*</span></label><select id="input-city" required class="field-select"><option value="">請選擇</option></select></div>
                            
                            <div class="field" style="margin-bottom:0;"><label class="field-label">實際實習地址 <span class="req">*</span></label><input type="text" id="input-address" required placeholder="請輸入完整實習地址" class="field-input"></div>
                        </div>
                        <div class="v-divider-modal" style="width: 1px; background: var(--border); margin: 0;"></div>
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div class="form-section-title"><i class="ti ti-tags"></i> 分類與備註</div>
                            <div class="field"><label class="field-label">行業別</label><select id="input-industry" class="field-select"><option value="">請選擇</option></select></div>
                            <div class="field"><label class="field-label">實習場所</label><select id="input-venue-type" class="field-select"><option value="">請選擇</option></select></div>
                            
                            <div class="field" style="flex: 1; display: flex; flex-direction: column; margin-bottom: 0;">
                                <label class="field-label">機構備註</label>
                                <textarea id="input-remarks" class="field-input custom-scroll" placeholder="可輸入與該機構相關之備註說明..." style="flex: 1; resize: none; padding: 10px 12px; line-height: 1.5; min-height: 120px;"></textarea>
                            </div>
                        </div>
                    </form>

                    <div id="tab-history" class="custom-scroll" style="display: none; width: 100%; padding: 24px; overflow-y: auto;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                            <p style="font-size:12px; color:var(--text-muted); padding-right:16px;">將機構過去的舊名稱與地址封存於此，系統在建立未來的實習紀錄時，便可調用相應年份的正確資料。</p>
                            <button type="button" id="btn-show-add-history" class="btn btn-sm btn-indigo-solid" style="flex-shrink:0; box-shadow:var(--shadow-sm);"><i class="ti ti-plus"></i> 新增歷史快照</button>
                        </div>
                        <div id="history-list-container" style="display:flex; flex-direction:column; gap:12px;"></div>
                    </div>

                </div>

                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-modal">取消</button>
                    <button type="button" id="btn-submit" class="btn btn-primary"><i class="ti ti-check"></i> 確認儲存變更</button>
                </div>
            </div>
        </div>

        <div id="add-history-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 550px;">
                <div class="dialog-header flex-col items-start p-0 border-none">
                    <div style="width:100%; display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid var(--border); background:#f8fafc;">
                        <h3 style="display:flex; align-items:center; gap:8px; font-size:16px; font-weight:700; color:var(--text-primary);"><i class="ti ti-history" style="color:var(--indigo); font-size:20px;"></i> 封存一筆歷史快照</h3>
                        <button type="button" class="dialog-close" id="btn-close-add-hist-x"><i class="ti ti-x"></i></button>
                    </div>
                </div>
                <div class="dialog-body bg-white p-6 custom-scroll">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="field" style="margin-bottom:0;"><label class="field-label text-gray-600">適用結束日期 <span class="req text-red-500">*</span></label><input type="text" id="hist-end-date" class="field-input bg-gray-50 focus:bg-white transition-colors" placeholder="例如：115/06/04"></div>
                        <div class="field" style="margin-bottom:0;"><label class="field-label text-gray-600">舊統一編號 <span class="font-normal text-gray-400">(選填)</span></label><input type="text" id="hist-tax-id" class="field-input bg-gray-50 focus:bg-white transition-colors" placeholder="留空則沿用現況"></div>
                        <div class="field col-span-1 md:col-span-2" style="margin-bottom:0;"><label class="field-label text-gray-600">歷史機構名稱 <span class="req text-red-500">*</span></label><input type="text" id="hist-name" class="field-input bg-gray-50 focus:bg-white transition-colors" placeholder="當時的機構名稱"></div>
                        <div class="field col-span-1 md:col-span-2" style="margin-bottom:0;"><label class="field-label text-gray-600">歷史實習地址 <span class="req text-red-500">*</span></label><input type="text" id="hist-address" class="field-input bg-gray-50 focus:bg-white transition-colors" placeholder="當時的詳細地址"></div>
                        <div class="field col-span-1 md:col-span-2" style="margin-bottom:0;"><label class="field-label text-gray-600">變更事由 <span class="font-normal text-gray-400">(選填)</span></label><input type="text" id="hist-reason" class="field-input bg-gray-50 focus:bg-white transition-colors" placeholder="例如：配合政府組織改造升格"></div>
                    </div>
                </div>
                <div class="dialog-footer" style="background:#f8fafc; border-top:1px solid var(--border); padding:16px 24px; border-radius: 0 0 12px 12px; display:flex; justify-content:flex-end; gap:8px;">
                    <button type="button" class="btn btn-secondary" style="background:white;" id="btn-cancel-add-hist">取消</button>
                    <button type="button" id="btn-save-history" class="btn btn-indigo-solid shadow-sm"><i class="ti ti-check"></i> 確認封存快照</button>
                </div>
            </div>
        </div>
        
        <div id="change-intent-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 550px;">
                <div class="dialog-header flex-col items-start p-0 border-none">
                    <div style="width:100%; display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid var(--border); background:#f8fafc;">
                        <h3 style="display:flex; align-items:center; gap:8px; font-size:16px; font-weight:700; color:var(--text-primary);"><i class="ti ti-info-circle" style="color:#3b82f6; font-size:20px;"></i> 偵測到機構資料變更</h3>
                        <button type="button" class="dialog-close" id="btn-close-intent-x"><i class="ti ti-x"></i></button>
                    </div>
                </div>
                <div class="dialog-body custom-scroll" style="background:#f8fafc; padding:24px;">
                    <div style="background:#fefce8; border:1px solid #fef08a; color:#854d0e; padding:12px 16px; border-radius:8px; font-size:13px; line-height:1.6; margin-bottom:20px; box-shadow:var(--shadow-sm);">
                        系統偵測到此機構的 <span style="font-weight:700; color:#ef4444;">核心資料（名稱、統編或地址等）</span> 已被修改。<br>為了確保資料庫關聯正確，請選擇此次變更的性質：
                    </div>
                    
                    <label class="intent-radio-card" style="margin-bottom:12px;">
                        <div style="display:flex; align-items:flex-start;">
                            <input type="radio" name="change_intent" value="typo" checked class="intent-radio-input">
                            <div>
                                <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">這是單純改錯字 / 修正補漏</div>
                                <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">系統將同步更新過去所有學生的實習紀錄，全部修正為最新資料。</div>
                            </div>
                        </div>
                    </label>

                    <label class="intent-radio-card" style="margin-bottom:0;">
                        <div style="display:flex; align-items:flex-start;">
                            <input type="radio" name="change_intent" value="history" class="intent-radio-input">
                            <div>
                                <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">這是機構歷史改名 (如升格、改組、搬遷)</div>
                                <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">系統將保留過去學生的舊紀錄，並自動將舊資料封存為歷史快照。</div>
                            </div>
                        </div>
                    </label>

                    <div id="intent-history-fields" class="hidden" style="margin-top:12px; margin-left:30px; padding:16px; background:white; border:1px solid var(--border); border-radius:8px; box-shadow:var(--shadow-sm); position:relative;">
                        <div style="position:absolute; top:-6px; left:24px; width:10px; height:10px; background:white; border-top:1px solid var(--border); border-left:1px solid var(--border); transform:rotate(45deg);"></div>
                        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">請補充歷史快照資訊</div>
                        
                        <div class="field" style="margin-bottom:12px;"><label class="field-label" style="color:var(--text-secondary);">舊資料適用結束日期 <span style="color:var(--danger);">*</span></label><input type="text" id="intent-end-date" class="field-input" style="background:#f8fafc; height:34px;" placeholder="例如：115/06/04"></div>
                        <div class="field" style="margin-bottom:0;"><label class="field-label" style="color:var(--text-secondary);">變更事由 <span style="font-weight:400; color:var(--text-muted);">(選填)</span></label><input type="text" id="intent-reason" class="field-input" style="background:#f8fafc; height:34px;" placeholder="例如：配合政府組織改造升格"></div>
                    </div>
                </div>
                <div class="dialog-footer" style="background:#f8fafc; border-top:1px solid var(--border); padding:16px 24px; border-radius: 0 0 12px 12px; display:flex; justify-content:flex-end; gap:8px;">
                    <button type="button" class="btn btn-secondary" style="background:white;" id="btn-cancel-intent">返回修改</button>
                    <button type="button" id="btn-confirm-intent" class="btn btn-primary" style="box-shadow:var(--shadow-sm);"><i class="ti ti-check"></i> 確認執行儲存</button>
                </div>
            </div>
        </div>

        <div id="merge-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 650px;">
                <div class="dialog-header flex-col items-start p-0 border-none">
                    <div style="width:100%; display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid var(--border); background:#f8fafc;">
                        <h3 style="display:flex; align-items:center; gap:8px; font-size:16px; font-weight:700; color:var(--text-primary);"><i class="ti ti-link" style="color:var(--indigo); font-size:20px;"></i> 合併重複主機構</h3>
                        <button type="button" class="dialog-close" id="btn-close-merge-x"><i class="ti ti-x"></i></button>
                    </div>
                </div>
                <div class="dialog-body custom-scroll" style="background:white; padding:24px;">
                    <div style="background:#fefce8; border:1px solid #fef08a; color:#854d0e; padding:12px 16px; border-radius:8px; font-size:13px; line-height:1.6; margin-bottom:20px; box-shadow:var(--shadow-sm);">
                        您已選取 <span id="merge-count" style="font-size: 16px; font-weight: 700; margin: 0 4px;">0</span> 個機構準備進行合併。<br>
                        請在下方選擇<strong style="color: var(--danger); margin: 0 4px;">「唯一要保留的主體機構」</strong>。合併後，其餘被勾選的機構將被刪除，<br>且其底下的「分公司」及「學生實習紀錄」都會自動移轉到新的主體下。
                    </div>
                    <div id="merge-options-container" style="display: flex; flex-direction: column;"></div>
                </div>
                <div class="dialog-footer" style="background:#f8fafc; border-top:1px solid var(--border); padding:16px 24px; border-radius: 0 0 12px 12px; display:flex; justify-content:flex-end; gap:8px;">
                    <button type="button" class="btn btn-secondary" style="background:white;" id="btn-cancel-merge">取消</button>
                    <button type="button" id="btn-merge-submit" class="btn btn-indigo-solid" disabled><i class="ti ti-link"></i> 確認執行深度合併</button>
                </div>
            </div>
        </div>
        
        <div id="batch-edit-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 450px;">
                <div class="dialog-header">
                    <h3 style="color: var(--brand)"><i class="ti ti-edit" style="color: var(--brand)"></i> 批次修改機構屬性</h3>
                    <button type="button" class="dialog-close" id="btn-close-batch-x"><i class="ti ti-x"></i></button>
                </div>
                <div class="dialog-body custom-scroll" style="background: var(--bg);">
                    <div style="background: var(--brand-light); border: 1px solid var(--brand-border); padding: 12px; border-radius: var(--radius); margin-bottom: 16px;">
                        <p style="font-size: 13px; color: var(--brand); font-weight: 600; line-height: 1.5;">
                            將針對已選取的 <span id="batch-edit-count" style="font-size: 16px; font-weight: 700; margin: 0 4px;">0</span> 筆機構進行統一修改。<br>
                            若保持「-- 不修改 --」，則該欄位維持原資料不變。
                        </p>
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

// ==========================================
// 2. 靜態資料與選項初始化
// ==========================================
function initSelectOptions() {
    let countryHtml = '';
    LIST_COUNTRIES.forEach(item => countryHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-country').innerHTML = countryHtml;

    let cityHtml = `<option value="">請選擇</option>`;
    LIST_CITIES.forEach(item => cityHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-city').innerHTML = cityHtml;

    let industryHtml = `<option value="">請選擇</option>`;
    LIST_INDUSTRIES.forEach(item => industryHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-industry').innerHTML = industryHtml;

    let venueHtml = `<option value="">請選擇</option>`;
    LIST_VENUES.forEach(item => venueHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-venue-type').innerHTML = venueHtml;

    let filterCountryHtml = '';
    LIST_COUNTRIES.forEach(item => { filterCountryHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-country" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('country-options-container').innerHTML = filterCountryHtml;

    let filterCityHtml = '';
    LIST_CITIES.forEach(item => { filterCityHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-city" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('city-options-container').innerHTML = filterCityHtml;

    let filterIndustryHtml = '';
    LIST_INDUSTRIES.forEach(item => { filterIndustryHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-industry" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('industry-options-container').innerHTML = filterIndustryHtml;

    let filterVenueHtml = '';
    LIST_VENUES.forEach(item => { filterVenueHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-venue" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('venue-options-container').innerHTML = filterVenueHtml;
    
    let batchIndHtml = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>';
    LIST_INDUSTRIES.forEach(item => batchIndHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('batch-input-industry').innerHTML = batchIndHtml;

    let batchVenueHtml = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>';
    LIST_VENUES.forEach(item => batchVenueHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('batch-input-venue').innerHTML = batchVenueHtml;
}

function populateParentDropdown(excludeId = null) {
    const listContainer = document.getElementById('parent-dropdown-list');
    let html = '<div class="searchable-option empty-opt" data-id="" data-name="">-- 獨立機構 / 總公司 (無隸屬) --</div>';
    
    allData.forEach(d => {
        if (!d.parent_id && d.id !== excludeId) {
            html += `
            <div class="searchable-option" data-id="${d.id}" data-name="${d.name}">
                <span>${d.name}</span> 
            </div>`;
        }
    });
    listContainer.innerHTML = html;
}

// ==========================================
// 3. 事件代理與動態樣式邏輯
// ==========================================
function updateColStyles() {
    let css = '';
    if (!colVis.tax_id) css += '.col-tax_id { display: none !important; }\n';
    if (!colVis.industry) css += '.col-industry { display: none !important; }\n';
    if (!colVis.venue_type) css += '.col-venue_type { display: none !important; }\n';
    if (!colVis.country) css += '.col-country { display: none !important; }\n';
    if (!colVis.city) css += '.col-city { display: none !important; }\n';
    if (!colVis.address) css += '.col-address { display: none !important; }\n';
    document.getElementById('dynamic-col-styles').textContent = css;
}

function buildBaseTree() {
    let grouped = {};
    baseTree = [];
    allData.forEach(d => {
        if (!d.parent_id) { grouped[d.id] = { ...d, children: [] }; baseTree.push(grouped[d.id]); }
    });
    allData.forEach(d => {
        if (d.parent_id) {
            if (grouped[d.parent_id]) grouped[d.parent_id].children.push(d);
            else baseTree.push({ ...d, children: [] });
        }
    });
}

function bindEvents(container) {
    container.querySelector('#btn-export-csv').addEventListener('click', exportToCSV);
    container.querySelector('#btn-import-trigger').addEventListener('click', () => container.querySelector('#import-file').click());
    container.querySelector('#import-file').addEventListener('change', handleImport);
    container.querySelector('#btn-create-inst').addEventListener('click', openCreateModal);
    
    container.querySelector('#search-input').addEventListener('input', () => { 
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentPage = 1; 
            isSearchAutoExpand = true;
            renderTable(); 
        }, 250);
    });

    container.querySelector('#pill-country').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('country'); });
    container.querySelector('#pill-city').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('city'); });
    container.querySelector('#pill-industry').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('industry'); });
    container.querySelector('#pill-venue').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('venue'); });

    container.querySelector('#search-country-input').addEventListener('keyup', (e) => filterDropdownItems(e.target, 'country-options-container'));
    container.querySelector('#search-city-input').addEventListener('keyup', (e) => filterDropdownItems(e.target, 'city-options-container'));
    container.querySelector('#search-industry-input').addEventListener('keyup', (e) => filterDropdownItems(e.target, 'industry-options-container'));
    container.querySelector('#search-venue-input').addEventListener('keyup', (e) => filterDropdownItems(e.target, 'venue-options-container'));

    container.querySelectorAll('.btn-filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const isSelectAll = btn.dataset.state !== 'all';
            btn.dataset.state = isSelectAll ? 'all' : 'none';
            
            let set = type === 'country' ? filterCountrySet : (type === 'city' ? filterCitySet : (type === 'industry' ? filterIndustrySet : filterVenueSet));
            container.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                if(c.closest('.filter-option').style.display !== 'none') { 
                    c.checked = isSelectAll; 
                    if(isSelectAll) set.add(c.value); else set.delete(c.value); 
                }
            });
            currentPage = 1; updatePillActive(type); renderTable();
        });
    });

    container.querySelector('#country-options-container').addEventListener('change', (e) => { if(e.target.type==='checkbox') toggleFilterCheck('country', e.target.value); });
    container.querySelector('#city-options-container').addEventListener('change', (e) => { if(e.target.type==='checkbox') toggleFilterCheck('city', e.target.value); });
    container.querySelector('#industry-options-container').addEventListener('change', (e) => { if(e.target.type==='checkbox') toggleFilterCheck('industry', e.target.value); });
    container.querySelector('#venue-options-container').addEventListener('change', (e) => { if(e.target.type==='checkbox') toggleFilterCheck('venue', e.target.value); });

    const btnDisplaySettings = container.querySelector('#btn-display-settings');
    const displayMenu = container.querySelector('#display-settings-menu');
    btnDisplaySettings.addEventListener('click', (e) => {
        e.stopPropagation();
        if (displayMenu.style.display === 'block') {
            displayMenu.style.display = 'none';
        } else {
            displayMenu.style.display = 'block';
        }
    });
    
    displayMenu.addEventListener('click', (e) => { e.stopPropagation(); });

    // 1. 樹狀/扁平模式切換
    container.querySelector('#btn-toggle-tree').addEventListener('click', (e) => {
        e.stopPropagation();
        isTreeMode = !isTreeMode;
        const btn = container.querySelector('#btn-toggle-tree');
        btn.innerHTML = isTreeMode 
            ? `<i class="ti ti-list-tree" style="color:var(--brand); margin-right:4px;"></i> <span>切換為扁平列表</span>` 
            : `<i class="ti ti-list" style="color:var(--brand); margin-right:4px;"></i> <span>切換為樹狀檢視</span>`;
        renderTable();
    });

    // 2. 展開/收合全部分支切換
    container.querySelector('#btn-toggle-expand').addEventListener('click', (e) => {
        e.stopPropagation();
        isAllExpanded = !isAllExpanded;
        const btn = container.querySelector('#btn-toggle-expand');
        if (isAllExpanded) {
            allData.forEach(d => { if (!d.parent_id) expandedParents.add(d.id); });
            btn.innerHTML = `<i class="ti ti-arrows-minimize" style="color:var(--brand); margin-right:4px;"></i> <span>收合所有分支</span>`;
        } else {
            expandedParents.clear();
            btn.innerHTML = `<i class="ti ti-arrows-maximize" style="color:var(--brand); margin-right:4px;"></i> <span>展開所有分支</span>`;
        }
        renderTable();
    });

    container.querySelectorAll('.col-toggle-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            colVis[e.target.value] = e.target.checked;
            updateColStyles();
        });
    });

    if (!isGlobalListenerBound) {
        document.addEventListener('click', (e) => {
            const parentDropdown = document.getElementById('parent-dropdown-list');
            const parentIdHidden = document.getElementById('input-parent-id');
            const parentSearchInput = document.getElementById('parent-search-input');
            const btnClearParent = document.getElementById('btn-clear-parent');
            
            if (parentDropdown && !e.target.closest('.searchable-select-wrap')) {
                parentDropdown.classList.remove('show');
                if (parentIdHidden && !parentIdHidden.value && parentSearchInput) {
                    parentSearchInput.value = '';
                    if(btnClearParent) btnClearParent.style.display = 'none';
                }
            }
            
            const dpMenu = document.getElementById('display-settings-menu');
            if (dpMenu && !e.target.closest('#display-settings-wrap')) {
                dpMenu.style.display = 'none';
            }
        });
        isGlobalListenerBound = true;
    }

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
        const p = Number(btn.dataset.page);
        if (p) { currentPage = p; renderTable(); }
    });
    
    container.querySelector('#institution-page-wrapper #inst-table-head').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) handleSort(th);
    });

    container.querySelector('#input-country').addEventListener('change', handleCountryChange);
    container.querySelector('#btn-close-modal-x').addEventListener('click', closeModal);
    container.querySelector('#btn-cancel-modal').addEventListener('click', closeModal);
    container.querySelector('#btn-submit').addEventListener('click', submitForm);

    const parentSearchInput = container.querySelector('#parent-search-input');
    const parentDropdown = container.querySelector('#parent-dropdown-list');
    const parentIdHidden = container.querySelector('#input-parent-id');
    const btnClearParent = container.querySelector('#btn-clear-parent');

    const updateParentClearBtn = () => {
        if (parentSearchInput.value) {
            btnClearParent.style.display = 'flex';
            btnClearParent.addEventListener('mouseover', () => btnClearParent.style.color = 'var(--danger)');
            btnClearParent.addEventListener('mouseout', () => btnClearParent.style.color = 'var(--text-muted)');
        } else {
            btnClearParent.style.display = 'none';
        }
    };

    parentSearchInput.addEventListener('focus', () => {
        parentDropdown.classList.add('show');
        parentDropdown.querySelectorAll('.searchable-option').forEach(o => o.style.display = 'flex');
    });
    parentSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        parentIdHidden.value = ''; 
        updateParentClearBtn();
        parentDropdown.classList.add('show');
        parentDropdown.querySelectorAll('.searchable-option:not(.empty-opt)').forEach(opt => {
            opt.style.display = opt.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
    btnClearParent.addEventListener('click', (e) => {
        e.stopPropagation();
        parentSearchInput.value = '';
        parentIdHidden.value = '';
        updateParentClearBtn();
        parentDropdown.classList.remove('show');
    });
    parentDropdown.addEventListener('click', (e) => {
        const opt = e.target.closest('.searchable-option');
        if (opt && !opt.classList.contains('empty-opt')) {
            parentIdHidden.value = opt.dataset.id || '';
            parentSearchInput.value = opt.dataset.name || '';
            updateParentClearBtn();
            parentDropdown.classList.remove('show');
        } else if (opt && opt.classList.contains('empty-opt')) {
            parentIdHidden.value = '';
            parentSearchInput.value = '';
            updateParentClearBtn();
            parentDropdown.classList.remove('show');
        }
    });

    container.querySelector('#btn-close-batch-x').addEventListener('click', closeBatchEditModal);
    container.querySelector('#btn-cancel-batch').addEventListener('click', closeBatchEditModal);
    container.querySelector('#btn-batch-edit-submit').addEventListener('click', executeBatchEdit);

    container.querySelector('#btn-close-merge-x').addEventListener('click', closeMergeModal);
    container.querySelector('#btn-cancel-merge').addEventListener('click', closeMergeModal);
    container.querySelector('#btn-merge-submit').addEventListener('click', executeMerge);

    container.querySelector('#table-body').addEventListener('click', (e) => {
        const rowChk = e.target.closest('.row-select-chk');
        const btnEdit = e.target.closest('.btn-row-edit');
        const btnDel = e.target.closest('.btn-row-delete');
        const toggleBtn = e.target.closest('.tree-toggle');
        
        if (toggleBtn) {
            const tr = toggleBtn.closest('tr');
            const pId = tr.dataset.id;
            const isExpanded = toggleBtn.classList.toggle('expanded');
            
            if (isExpanded) expandedParents.add(pId);
            else expandedParents.delete(pId);
            
            document.querySelectorAll(`.child-of-${pId}`).forEach(row => {
                row.style.display = isExpanded ? '' : 'none';
            });
        }
        else if (rowChk) { toggleSelect(rowChk.value); }
        else if (btnEdit) { editData(btnEdit.dataset.id); }
        else if (btnDel) { deleteData(btnDel.dataset.id, btnDel.dataset.name); }
    });

    const tabBtnMain = container.querySelector('#tab-btn-main');
    const tabBtnHistory = container.querySelector('#tab-btn-history');
    const tabMain = container.querySelector('#data-form');
    const tabHistory = container.querySelector('#tab-history');

    tabBtnMain.addEventListener('click', () => {
        tabBtnMain.style.borderColor = 'var(--brand)';
        tabBtnMain.style.color = 'var(--brand)';
        tabBtnHistory.style.borderColor = 'transparent';
        tabBtnHistory.style.color = 'var(--text-muted)';
        tabMain.style.display = 'flex';
        tabHistory.style.display = 'none';
    });

    tabBtnHistory.addEventListener('click', () => {
        tabBtnHistory.style.borderColor = 'var(--brand)';
        tabBtnHistory.style.color = 'var(--brand)';
        tabBtnMain.style.borderColor = 'transparent';
        tabBtnMain.style.color = 'var(--text-muted)';
        tabHistory.style.display = 'block';
        tabMain.style.display = 'none';
        renderHistoryList();
    });

    // 歷史紀錄獨立 Modal 控制
    container.querySelector('#btn-show-add-history').addEventListener('click', () => {
        document.getElementById('add-history-modal').classList.add('open');
        document.getElementById('hist-end-date').value = getROCDateString();
        document.getElementById('hist-name').value = document.getElementById('input-name').value;
        document.getElementById('hist-address').value = document.getElementById('input-address').value;
        const taxVal = document.getElementById('input-country').value === '中華民國' 
            ? document.getElementById('input-tax-id').value 
            : document.getElementById('input-overseas-tax-id').value;
        document.getElementById('hist-tax-id').value = taxVal;
        document.getElementById('hist-reason').value = '';
    });

    container.querySelector('#btn-close-add-hist-x').addEventListener('click', () => document.getElementById('add-history-modal').classList.remove('open'));
    container.querySelector('#btn-cancel-add-hist').addEventListener('click', () => document.getElementById('add-history-modal').classList.remove('open'));

    container.querySelector('#btn-save-history').addEventListener('click', () => {
        let endDate = document.getElementById('hist-end-date').value.trim();
        endDate = formatROCDate(endDate);
        if(!isValidROCDate(endDate)) {
            alert('適用結束日期格式錯誤！請輸入 YYY/MM/DD (例如: 113/01/01)');
            return;
        }
        document.getElementById('hist-end-date').value = endDate;

        const name = document.getElementById('hist-name').value.trim();
        const address = document.getElementById('hist-address').value.trim();
        const taxId = document.getElementById('hist-tax-id').value.trim();
        const reason = document.getElementById('hist-reason').value.trim();

        if(!name || !address) { alert('請填寫歷史機構名稱與地址！'); return; }

        currentHistory.push({ end_date: endDate, name: name, address: address, tax_id: taxId, reason: reason, created_at: new Date().toISOString() });
        document.getElementById('add-history-modal').classList.remove('open');
        renderHistoryList();
    });

    container.querySelector('#tab-history').addEventListener('click', (e) => {
        const btnDel = e.target.closest('.btn-del-history');
        if(btnDel && confirm('確定要刪除這筆歷史快照嗎？')) {
            const idx = Number(btnDel.dataset.idx);
            currentHistory.splice(idx, 1);
            renderHistoryList();
        }
    });

    // 變更意圖 Modal 控制
    container.querySelector('#btn-close-intent-x').addEventListener('click', () => document.getElementById('change-intent-modal').classList.remove('open'));
    container.querySelector('#btn-cancel-intent').addEventListener('click', () => document.getElementById('change-intent-modal').classList.remove('open'));
    
    container.querySelectorAll('input[name="change_intent"]').forEach(r => {
        r.addEventListener('change', (e) => {
            if(e.target.value === 'history') {
                document.getElementById('intent-history-fields').classList.remove('hidden');
                document.getElementById('intent-end-date').value = getROCDateString(); 
            } else {
                document.getElementById('intent-history-fields').classList.add('hidden');
            }
        });
    });

    container.querySelector('#btn-confirm-intent').addEventListener('click', async () => {
        const intent = document.querySelector('input[name="change_intent"]:checked').value;
        const isTypo = (intent === 'typo');
        
        if (!isTypo) {
            let endDate = document.getElementById('intent-end-date').value.trim();
            endDate = formatROCDate(endDate);
            if(!isValidROCDate(endDate)) {
                alert('適用結束日期格式錯誤！請輸入 YYY/MM/DD (例如: 113/01/01)');
                return;
            }
            document.getElementById('intent-end-date').value = endDate;

            const reason = document.getElementById('intent-reason').value.trim();
            
            pendingPayload.history = pendingPayload.history || [];
            pendingPayload.history.push({
                end_date: endDate,
                name: editingOldData.name,
                address: editingOldData.address || '',
                tax_id: editingOldData.tax_id || editingOldData.overseas_tax_id || '',
                reason: reason,
                created_at: new Date().toISOString()
            });
        }
        
        document.getElementById('change-intent-modal').classList.remove('open');
        await executeSave(pendingPayload, isTypo); 
    });
}

// ==========================================
// 4. 輔助函式與狀態操作
// ==========================================
function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text || '';
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
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
    const labels = document.getElementById(containerId).querySelectorAll('.filter-option');
    labels.forEach(lbl => {
        const text = lbl.textContent.toLowerCase();
        lbl.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

function toggleFilterCheck(type, val) {
    let set = type === 'country' ? filterCountrySet : (type === 'city' ? filterCitySet : (type === 'industry' ? filterIndustrySet : filterVenueSet));
    if (set.has(val)) set.delete(val); else set.add(val);
    document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
    currentPage = 1; updatePillActive(type); renderTable();
}

function clearFilter(type) {
    let set = type === 'country' ? filterCountrySet : (type === 'city' ? filterCitySet : (type === 'industry' ? filterIndustrySet : filterVenueSet));
    set.clear();
    document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = false);
    const searchInput = document.getElementById(`search-${type}-input`);
    if (searchInput) { searchInput.value = ''; filterDropdownItems(searchInput, `${type}-options-container`); }
    currentPage = 1; updatePillActive(type); renderTable();
}

function updatePillActive(type) {
    let set, typeName;
    if(type === 'country') { set = filterCountrySet; typeName = '國別'; }
    else if(type === 'city') { set = filterCitySet; typeName = '縣市'; }
    else if(type === 'industry') { set = filterIndustrySet; typeName = '行業別'; }
    else { set = filterVenueSet; typeName = '場所'; }

    const pill = document.getElementById(`pill-${type}`);
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeName} <i class="ti ti-chevron-down"></i>`;
    }
}

// ✨ 修正 4：已拔除當地語言名稱，兩邊欄位高度對稱
function handleCountryChange() {
    const country = document.getElementById('input-country').value;
    const isDomestic = country === '中華民國';
    
    const wrapTax = document.getElementById('wrap-tax-id');
    const wrapCity = document.getElementById('wrap-city');
    const wrapNameTrans = document.getElementById('wrap-name-translated');
    const wrapOverseasTax = document.getElementById('wrap-overseas-tax');

    const taxInput = document.getElementById('input-tax-id');
    const cityInput = document.getElementById('input-city');

    if (isDomestic) {
        wrapTax.style.display = 'flex'; wrapCity.style.display = 'flex';
        wrapNameTrans.style.display = 'none'; wrapOverseasTax.style.display = 'none';
        taxInput.required = true; cityInput.required = true;
    } else {
        wrapTax.style.display = 'none'; wrapCity.style.display = 'none';
        wrapNameTrans.style.display = 'flex'; wrapOverseasTax.style.display = 'flex';
        taxInput.required = false; cityInput.required = false;
        taxInput.value = ''; cityInput.value = '';
    }
}

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
    updateBatchActionBar();
    renderTable(); 
}

function toggleSelect(id) {
    const index = selectedIds.indexOf(id);
    if (index === -1) selectedIds.push(id); else selectedIds.splice(index, 1);
    updateBatchActionBar(); 
    
    const chk = document.querySelector(`.row-select-chk[value="${id}"]`);
    if(chk) {
        const row = chk.closest('tr');
        if(index === -1) row.classList.add('selected'); else row.classList.remove('selected');
    }
}

function selectAllFiltered() {
    selectedIds = [];
    filteredInstitutions.forEach(p => {
        selectedIds.push(p.id);
        if(isTreeMode) p.children.forEach(c => selectedIds.push(c.id));
    });
    updateBatchActionBar(); 
    renderTable();
}

function clearSelection() {
    selectedIds = []; 
    updateBatchActionBar(); 
    renderTable();
}

function renderHistoryList() {
    const container = document.getElementById('history-list-container');
    if(!currentHistory || currentHistory.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 0; color:var(--text-muted); font-size:13px; border:2px dashed var(--border); border-radius:12px;">尚無歷史快照紀錄</div>`;
        return;
    }
    
    const sorted = [...currentHistory].map((h, i) => ({...h, originalIndex: i})).sort((a,b) => b.end_date.localeCompare(a.end_date));
    
    container.innerHTML = sorted.map(h => `
        <div style="position:relative; padding-left:24px; padding-bottom:16px; border-left:2px solid #e0e7ff;">
            <div style="position:absolute; width:12px; height:12px; background:#6366f1; border-radius:50%; left:-7px; top:4px; border:2px solid white; box-shadow:var(--shadow-sm);"></div>
            <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px; box-shadow:var(--shadow-sm); transition:0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <span style="font-size:11px; font-weight:700; background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; letter-spacing:0.05em;">~ ${h.end_date} 前適用</span>
                    <button type="button" class="btn-del-history" style="background:none; border:none; color:var(--text-muted); cursor:pointer;" data-idx="${h.originalIndex}"><i class="ti ti-trash"></i></button>
                </div>
                <div style="font-weight:700; color:var(--text-primary); font-size:14px; margin-top:6px;">${h.name}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;"><i class="ti ti-map-pin"></i> ${h.address}</div>
                ${h.tax_id ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;"><i class="ti ti-receipt"></i> 舊代碼/統編：${h.tax_id}</div>` : ''}
                ${h.reason ? `<div style="font-size:13px; color:#4338ca; margin-top:8px; padding-top:8px; border-top:1px solid var(--border);"><i class="ti ti-info-circle"></i> 事由：${h.reason}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// ==========================================
// 5. 資料維護核心與 API 讀取
// ==========================================
async function handleInitialLoadEngine() {
    try {
        const recordsCol = collection(db, "internship_records");
        const recordSnap = await getDocs(recordsCol);
        allRecords = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) { console.warn("歷史名單預載未完成", e); }
}

async function fetchInitialDataOnce() {
    try {
        const dataSnap = await getDocs(collection(db, "internship_institutions"));
        allData = dataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        selectedIds = [];
        updateBatchActionBar();
        buildBaseTree(); 
        renderTable();
        await handleInitialLoadEngine();
    } catch (error) {
        document.getElementById('table-body').innerHTML = `<tr><td colspan="9" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger); opacity:1;"></i><div class="empty-text">雲端資料同步中斷。</div></td></tr>`;
    }
}

function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    
    if (selectedIds.length > 0) {
        bar.classList.add('visible');
        count.innerText = selectedIds.length;
        
        let totalMatched = 0;
        if(isTreeMode) {
            filteredInstitutions.forEach(p => { totalMatched += 1 + p.children.length; });
        } else {
            totalMatched = filteredInstitutions.length;
        }

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

function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();

    const checkMatch = (d) => {
        const matchSearch = (d.name || '').toLowerCase().includes(searchTerm) || 
                            (d.tax_id || '').toLowerCase().includes(searchTerm) ||
                            (d.address || '').toLowerCase().includes(searchTerm);
        const matchCountry = filterCountrySet.size === 0 || filterCountrySet.has(d.country);
        const matchCity = filterCitySet.size === 0 || filterCitySet.has(d.city);
        const matchIndustry = filterIndustrySet.size === 0 || filterIndustrySet.has(d.industry);
        const matchVenue = filterVenueSet.size === 0 || filterVenueSet.has(d.venue_type);
        return matchSearch && matchCountry && matchCity && matchIndustry && matchVenue;
    };

    filteredInstitutions = [];
    
    if (isTreeMode) {
        baseTree.forEach(parent => {
            const pMatch = checkMatch(parent);
            const matchedChildren = parent.children.filter(c => checkMatch(c));
            
            if (pMatch || matchedChildren.length > 0) {
                if (isSearchAutoExpand && searchTerm && matchedChildren.length > 0) {
                    expandedParents.add(parent.id);
                }
                let isExpanded = expandedParents.has(parent.id);

                filteredInstitutions.push({ 
                    ...parent, 
                    children: (pMatch && !searchTerm) ? parent.children : matchedChildren,
                    isExpanded: isExpanded 
                });
            }
        });
    } else {
        filteredInstitutions = allData.filter(d => checkMatch(d));
    }
    
    isSearchAutoExpand = false; 

    // ✨ 修正 9：中文字精準筆畫排序，且包含子節點
    if (sortCol) {
        const sortFn = (a, b) => {
            let valA = a[sortCol] || ''; let valB = b[sortCol] || '';
            if (sortCol === 'country') {
                const aIsDomestic = valA === '中華民國' ? 0 : 1;
                const bIsDomestic = valB === '中華民國' ? 0 : 1;
                if (aIsDomestic !== bIsDomestic) return sortDir === 'asc' ? aIsDomestic - bIsDomestic : bIsDomestic - aIsDomestic;
            }
            valA = valA.toString(); valB = valB.toString();
            let cmp = valA.localeCompare(valB, 'zh-TW'); // 支援中文筆畫
            return sortDir === 'asc' ? cmp : -cmp;
        };

        filteredInstitutions.sort(sortFn);
        if (isTreeMode) {
            filteredInstitutions.forEach(p => {
                if (p.children && p.children.length > 0) p.children.sort(sortFn);
            });
        }
    }

    const totalMainItems = filteredInstitutions.length;
    const totalPages = Math.max(1, Math.ceil(totalMainItems / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredInstitutions.slice(start, start + itemsPerPage);

    let totalAllMatched = 0;
    let totalChildrenMatched = 0;
    if (isTreeMode) {
        filteredInstitutions.forEach(p => { 
            totalAllMatched++; 
            p.children.forEach(c => { totalAllMatched++; totalChildrenMatched++; }); 
        });
        document.getElementById('pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalAllMatched}</strong> 間實習機構（含 ${totalChildrenMatched} 間分支機構），顯示第 ${start + 1}–${Math.min(start + itemsPerPage, totalMainItems)} 間主機構` : `共 <strong>0</strong> 間實習機構`;
    } else {
        document.getElementById('pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalMainItems}</strong> 間實習機構，顯示第 ${start + 1}–${Math.min(start + itemsPerPage, totalMainItems)} 間` : `共 <strong>0</strong> 間實習機構`;
    }
    
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
    document.getElementById('pagination-controls').innerHTML = pHtml;

    const currentPaginatedIds = paginatedItems.map(d => d.id);
    document.getElementById('selectAll').checked = currentPaginatedIds.length > 0 && currentPaginatedIds.every(id => selectedIds.includes(id));

    if (totalMainItems === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的機構資料。</div></td></tr>`;
        return;
    }

    const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
        const isChecked = selectedIds.includes(data.id) ? 'checked' : '';
        const isDomestic = data.country === '中華民國';
        
        let dispTax = '-';
        // ✨ 修正 8：海外機構列表直接顯示 - 不顯示稅號
        if (isDomestic && data.tax_id) dispTax = highlightKeyword(data.tax_id, searchTerm);
        
        const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span style="display:inline-block; width:22px; margin-right:8px; flex-shrink:0;"></span>`;
        
        let childCountHtml = '';
        if (hasChildren && !isExpanded && data.children) {
            childCountHtml = `<span style="background: var(--brand-light); color: var(--brand); padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">${data.children.length}</span>`;
        }

        const hName = highlightKeyword(data.name, searchTerm);
        const nameHtml = isChild 
            ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i> <span class="cell-primary" style="word-break: break-word;">${hName}</span></div>` 
            : `<div style="display:flex; align-items:center;">${toggleHtml} <span class="cell-primary bold" style="word-break: break-word;">${hName}</span>${childCountHtml}</div>`;

        const hAddress = highlightKeyword(data.address, searchTerm);

        return `
        <tr class="${isChecked ? 'selected' : ''} ${isChild ? `child-row child-of-${parentId}` : 'parent-row'}" data-id="${data.id}" style="${isChild && !isExpanded ? 'display:none;' : ''}">
            <td class="col-checkbox" style="text-align: center;">
                <div style="display:flex; justify-content:center; align-items:center;">
                    <input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                </div>
            </td>
            <td class="col-name" style="text-align: left; padding-left: 16px;">${nameHtml}</td>
            <td class="col-tax_id" style="text-align: center;"><div class="cell-primary" style="color: var(--text-muted); font-family: inherit;">${dispTax}</div></td>
            <td class="col-industry" style="text-align: center;"><div class="cell-primary">${data.industry || '-'}</div></td>
            <td class="col-venue_type" style="text-align: center;"><div class="cell-primary">${data.venue_type || '-'}</div></td>
            <td class="col-country" style="text-align: center;"><div class="cell-primary">${data.country}</div></td>
            <td class="col-city" style="text-align: center;"><div class="cell-primary">${isDomestic && data.city ? data.city : '-'}</div></td>
            <td class="col-address" style="text-align: left;"><div class="cell-primary" title="${data.address}">${hAddress}</div></td>
            <td class="col-actions" style="text-align: center;">
                <div class="row-actions">
                    <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit" title="編輯"><i class="ti ti-edit"></i></button>
                    <button data-id="${data.id}" data-name="${data.name}" class="btn btn-danger btn-icon sm btn-row-delete" title="刪除"><i class="ti ti-trash"></i></button>
                </div>
            </td>
        </tr>`;
    };

    let finalHtml = '';
    paginatedItems.forEach(item => {
        if (isTreeMode) {
            finalHtml += renderRow(item, false, null, item.isExpanded, item.children.length > 0);
            item.children.forEach(child => { finalHtml += renderRow(child, true, item.id, item.isExpanded, false); });
        } else {
            finalHtml += renderRow(item, false, null, false, false);
        }
    });
    tbody.innerHTML = finalHtml;
    
    const currentVisibleIds = [];
    document.querySelectorAll('#table-body tr').forEach(tr => {
        if(tr.style.display !== 'none') {
            const chk = tr.querySelector('.row-select-chk');
            if(chk) currentVisibleIds.push(chk.value);
        }
    });
    document.getElementById('selectAll').checked = currentVisibleIds.length > 0 && currentVisibleIds.every(id => selectedIds.includes(id));
}

function exportToCSV() {
    if (filteredInstitutions.length === 0) { alert("沒有資料可供匯出！"); return; }
    let csv = '\uFEFF實習機構主名稱,隸屬主機構,當地名稱/英文譯名,統一編號,海外稅號,行業別,實習場所,實習場所國別,縣市別,實習場所地址,備註\n';
    
    if (isTreeMode) {
        filteredInstitutions.forEach(p => {
            csv += [ p.name, '', p.name_translated || '', p.tax_id || '', p.overseas_tax_id || '', p.industry || '', p.venue_type || '', p.country, p.city || '', p.address, p.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            p.children.forEach(c => { csv += [ c.name, p.name, c.name_translated || '', c.tax_id || '', c.overseas_tax_id || '', c.industry || '', c.venue_type || '', c.country, c.city || '', c.address, c.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n'; });
        });
    } else {
        filteredInstitutions.forEach(d => {
            csv += [ d.name, '', d.name_translated || '', d.tax_id || '', d.overseas_tax_id || '', d.industry || '', d.venue_type || '', d.country, d.city || '', d.address, d.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
    }
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `實習機構清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
}

async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const btn = document.getElementById('btn-import-trigger');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> <span class="btn-text">匯入中...</span>';
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const rows = event.target.result.split('\n').map(row => row.trim()).filter(row => row);
            let parsedRows = [];
            for (let i = 1; i < rows.length; i++) {
                let cols = []; let inQuotes = false; let currentVal = '';
                for (let char of rows[i]) {
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                    else currentVal += char;
                }
                cols.push(currentVal.trim());
                if (cols.length >= 10) {
                    const payload = {
                        name: cols[0], name_translated: cols[1] || '',
                        tax_id: cols[2] || '', overseas_tax_id: cols[3] || '', industry: cols[4] || '', venue_type: cols[5] || '',
                        country: cols[6] || '中華民國', city: cols[7] || '', address: cols[8] || '', remarks: cols[9] || '',
                        parent_id: '', history: []
                    };
                    if (!payload.name) continue;
                    parsedRows.push(payload);
                }
            }
            for (let payload of parsedRows) {
                const docRef = await addDoc(collection(db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
                allData.unshift({ id: docRef.id, ...payload });
            }
            alert(`✅ 成功批次匯入完成！`); fetchInitialDataOnce();
        } catch (error) { alert("格式錯誤\n" + error.message); } 
        finally { btn.innerHTML = originalHtml; btn.disabled = false; e.target.value = ''; }
    };
    reader.readAsText(file);
}

function openCreateModal() {
    editingId = null; editingOldData = null; currentHistory = [];
    document.getElementById('data-form').reset();
    
    document.getElementById('input-parent-id').value = '';
    document.getElementById('parent-search-input').value = '';
    document.getElementById('btn-clear-parent').style.display = 'none';
    
    document.getElementById('modal-tabs').style.display = 'none';
    document.getElementById('tab-btn-main').click();

    populateParentDropdown();
    handleCountryChange();
    document.getElementById('modal-title').innerHTML = '<i class="ti ti-building-skyscraper text-brand" style="font-size: 20px;"></i> 新增實習機構';
    document.getElementById('data-modal').classList.add('open');
}

function closeModal() { document.getElementById('data-modal').classList.remove('open'); editingId = null; pendingPayload = null; }

// ✨ 擴大攔截器偵測範圍
async function submitForm() {
    const isDomestic = document.getElementById('input-country').value === '中華民國';
    
    const payload = { 
        parent_id: document.getElementById('input-parent-id').value || '',
        country: document.getElementById('input-country').value,
        name: document.getElementById('input-name').value.trim(),
        name_translated: isDomestic ? '' : document.getElementById('input-name-translated').value.trim(),
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
        if (editingOldData.name !== payload.name) hasSignificantChange = true;
        if (editingOldData.address !== payload.address) hasSignificantChange = true;
        if (isDomestic) {
            if (editingOldData.tax_id !== payload.tax_id) hasSignificantChange = true;
            if (editingOldData.city !== payload.city) hasSignificantChange = true;
        } else {
            if (editingOldData.overseas_tax_id !== payload.overseas_tax_id) hasSignificantChange = true;
        }
    }

    if (hasSignificantChange) {
        pendingPayload = payload;
        document.getElementById('intent-end-date').value = getROCDateString(); 
        document.getElementById('intent-reason').value = '';
        document.getElementById('intent-history-fields').classList.add('hidden');
        document.querySelector('input[name="change_intent"][value="typo"]').checked = true;
        document.getElementById('change-intent-modal').classList.add('open');
        return; 
    }

    await executeSave(payload, true);
}

async function executeSave(payload, isTypo = true) {
    const btn = document.getElementById('btn-submit');
    const intentBtn = document.getElementById('btn-confirm-intent');
    btn.disabled = true; btn.innerHTML = '儲存中...';
    intentBtn.disabled = true; intentBtn.innerHTML = '儲存中...';

    try {
        if (editingId) {
            const batch = writeBatch(db);
            batch.update(doc(db, "internship_institutions", editingId), { ...payload, updated_at: serverTimestamp() });
            
            if (isTypo && editingOldData && editingOldData.name !== payload.name) {
                allRecords.forEach(record => {
                    if (record.inst_id === editingId || (!record.inst_id && record.inst_raw === editingOldData.name)) {
                        batch.update(doc(db, "internship_records", record.id), { inst_raw: payload.name, updated_at: serverTimestamp() });
                    }
                });
            }
            await batch.commit();
        } else {
            await addDoc(collection(db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
        }
        closeModal(); fetchInitialDataOnce();
    } catch (err) { 
        alert("儲存失敗"); 
    } finally { 
        btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存變更'; 
        intentBtn.disabled = false; intentBtn.innerHTML = '<i class="ti ti-check"></i> 確認執行儲存'; 
    }
}

function editData(id) {
    const docData = allData.find(d => d.id === id); if (!docData) return;
    editingId = id; 
    editingOldData = { ...docData }; 
    currentHistory = docData.history || [];
    
    document.getElementById('modal-tabs').style.display = 'block';
    document.getElementById('tab-btn-main').click();

    populateParentDropdown(id); 
    document.getElementById('input-parent-id').value = docData.parent_id || '';
    if (docData.parent_id) {
        const parentObj = allData.find(p => p.id === docData.parent_id);
        document.getElementById('parent-search-input').value = parentObj ? parentObj.name : '';
        document.getElementById('btn-clear-parent').style.display = 'flex';
    } else {
        document.getElementById('parent-search-input').value = '';
        document.getElementById('btn-clear-parent').style.display = 'none';
    }
    
    document.getElementById('input-country').value = docData.country || '中華民國';
    document.getElementById('input-name').value = docData.name || '';
    document.getElementById('input-name-translated').value = docData.name_translated || '';
    document.getElementById('input-tax-id').value = docData.tax_id || '';
    document.getElementById('input-overseas-tax-id').value = docData.overseas_tax_id || '';
    document.getElementById('input-city').value = docData.city || '';
    document.getElementById('input-industry').value = docData.industry || '';
    document.getElementById('input-venue-type').value = docData.venue_type || '';
    document.getElementById('input-address').value = docData.address || '';
    document.getElementById('input-remarks').value = docData.remarks || '';
    
    handleCountryChange(); 
    document.getElementById('modal-title').innerHTML = '<i class="ti ti-edit text-brand" style="font-size: 20px;"></i> 編輯機構與歷史軌跡';
    document.getElementById('data-modal').classList.add('open');
}

async function deleteData(id, name) {
    const hasChildren = allData.some(d => d.parent_id === id);
    if (hasChildren) {
        alert(`⚠️ 無法刪除！\n\n「${name}」底下還有綁定分公司 / 分部。\n請先解除分公司的隸屬綁定，或先刪除分公司，才能刪除該主機構。`);
        return;
    }
    if (confirm(`確定要刪除機構「${name}」嗎？`)) {
        try {
            await deleteDoc(doc(db, "internship_institutions", id));
            allData = allData.filter(d => d.id !== id);
            selectedIds = selectedIds.filter(sid => sid !== id);
            updateBatchActionBar(); 
            buildBaseTree(); 
            renderTable();
        } catch(e) { alert("刪除失敗"); }
    }
}

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
        closeBatchEditModal(); fetchInitialDataOnce();
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
                <div class="merge-option-desc">統編/代碼：${inst.tax_id || inst.overseas_tax_id || '無'} | 地址：${inst.address || '無'}</div>
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
    
    if(!confirm(`確認合併？\n\n📌 保留主體：${masterInst.name}\n🗑️ 刪除對象：${deletedNames.join('、')}`)) return;
    
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
        closeMergeModal(); fetchInitialDataOnce();
    } catch(e) { alert("合併失敗"); }
}

async function batchDelete() {
    const hasChildren = selectedIds.some(id => allData.some(d => d.parent_id === id && !selectedIds.includes(d.id)));
    if (hasChildren) {
        alert("⚠️ 批次刪除失敗！\n您選取的項目中包含「尚有綁定分公司的主機構」。\n請取消勾選主機構，或連同其分公司一併勾選刪除。");
        return;
    }
    if (!confirm(`確定刪除這 ${selectedIds.length} 筆機構嗎？`)) return;
    try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, "internship_institutions", id)));
        await batch.commit(); fetchInitialDataOnce();
    } catch (e) { alert("刪除失敗"); }
}
