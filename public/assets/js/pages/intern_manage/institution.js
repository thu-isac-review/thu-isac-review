import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 模組區域變數 ---
let db;
let allData = []; 
let allRecords = []; 
let editingId = null; 
let editingOldName = null; 

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

const LIST_COUNTRIES = ["中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門","馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"];
const LIST_CITIES = ["臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const LIST_INDUSTRIES = ["農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業","營建工程業","批發及零售業","運輸及倉儲業","住宿及餐飲業","出版及影音等內容傳播業","電信及資訊服務業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業","公共行政及國防；強制性社會安全","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"];
const LIST_VENUES = ["企業機構","其他機構","政府機構","就讀學校附屬機構"];

// --- 主渲染入口 ---
export async function render(containerId, context) {
    db = context.db;
    const container = document.getElementById(containerId);
    
    selectedIds = [];
    currentPage = 1;

    injectUI(container);
    initSelectOptions();
    bindEvents(container);
    await fetchInitialDataOnce();
}

// ==========================================
// 1. UI 注入模組
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
            .btn-indigo-solid { background: var(--indigo); color: white; border: 1px solid var(--indigo); }
            .btn-indigo-solid:hover { background: #4338ca; }
            .btn-icon { width: 34px; padding: 0; justify-content: center; }
            .btn-icon.sm { width: 28px; height: 28px; }
            .btn-sm { height: 28px; padding: 0 10px; font-size: 12px; }
            .btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .btn i { font-size: 16px; display: inline-flex; align-items: center; justify-content: center; }

            .filter-row { padding: 10px 24px; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; position: relative; }
            .filter-pill-wrap { position: relative; }
            .filter-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0 10px; height: 28px; border: 1px solid var(--border); border-radius: 99px; background: var(--surface); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all var(--transition); white-space: nowrap; }
            .filter-pill:hover { border-color: var(--border-strong); color: var(--text-primary); }
            .filter-pill.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }
            .filter-pill .pill-count { background: var(--brand); color: white; border-radius: 99px; font-size: 10px; font-weight: 700; padding: 0 5px; min-width: 16px; text-align: center; }
            .filter-pill i { font-size: 14px; transition: transform 0.2s; }
            .filter-pill-wrap.open .filter-pill i { transform: rotate(180deg); }
            .filter-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); min-width: 220px; z-index: 100; display: none; flex-direction: column; overflow: hidden; }
            .filter-dropdown.show { display: flex; }
            .filter-dropdown-search { padding: 8px; border-bottom: 1px solid var(--border); }
            .filter-dropdown-search input { width: 100%; height: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px; font-size: 12px; outline: none; background: var(--bg); transition: 0.2s; }
            .filter-dropdown-search input:focus { border-color: var(--brand); background: var(--surface); box-shadow: 0 0 0 2px rgba(26,86,219,0.1); }
            .filter-dropdown-list { max-height: 200px; overflow-y: auto; padding: 4px; }
            .filter-option { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: background var(--transition); }
            .filter-option:hover { background: var(--bg); color: var(--text-primary); }
            .filter-option input[type=checkbox] { accent-color: var(--brand); flex-shrink: 0; }
            .filter-dropdown-footer { padding: 6px 8px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
            .filter-dropdown-footer button { font-size: 11px; font-weight: 600; color: var(--danger); background: none; border: none; cursor: pointer; padding: 2px 4px; border-radius: var(--radius-sm); }
            .filter-dropdown-footer button:hover { background: var(--danger-bg); }

            #batch-bar { display: none; align-items: center; gap: 12px; padding: 8px 24px; background: var(--brand-light); border-bottom: 1px solid var(--brand-border); flex-shrink: 0; position: absolute; top: 0; left: 0; right: 0; height: 100%; z-index: 20; }
            #batch-bar.visible { display: flex; animation: slideDown 0.2s ease-out; }
            @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            .batch-info { font-size: 13px; font-weight: 600; color: var(--brand); display: flex; align-items: center; gap: 8px; }
            .batch-info span { font-size: 16px; font-weight: 700; margin: 0 2px; }

            .table-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); min-height: 0; border-left: none; border-right: none; }
            .table-scroll { flex: 1; overflow: auto; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 1000px; }
            th { padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; position: sticky; top: 0; z-index: 10; background: var(--surface); box-shadow: inset 0 -2px 0 var(--border); }
            th[data-sort] { cursor: pointer; user-select: none; transition: color var(--transition); }
            th[data-sort]:hover { color: var(--text-secondary); }
            th .sort-icon { margin-left: 4px; font-size: 14px; opacity: 0.4; vertical-align: middle; }
            th.sort-asc .sort-icon, th.sort-desc .sort-icon { opacity: 1; color: var(--brand); }
            td { padding: 12px 16px; vertical-align: middle; word-break: break-word; border-bottom: 1px solid var(--border); }
            tr:hover td { background: #fafbff; }
            tr.selected td { background: #f0f4ff; }

            .cell-primary { font-size: 13px; color: var(--text-primary); line-height: 1.4; }
            .cell-primary.bold { font-weight: 600; }
            .cell-secondary { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.5; }
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
            .dialog-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--surface); }
            .dialog-header h3 { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
            .dialog-header h3 i { font-size: 20px; color: var(--brand); }
            .dialog-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); transition: all var(--transition); }
            .dialog-close:hover { color: var(--danger); background: var(--danger-bg); }
            .dialog-body { padding: 24px; overflow-y: auto; max-height: calc(85vh - 130px); }
            .dialog-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: var(--bg); }

            .form-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
            .form-section-title i { color: var(--text-muted); font-size: 16px; }
            .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
            .field-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
            .field-label .req { color: var(--danger); margin-left: 2px; }
            .field-input, .field-select { width: 100%; height: 36px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); padding: 0 12px; font-size: 13px; font-family: inherit; color: var(--text-primary); outline: none; transition: all var(--transition); }
            .field-input:focus, .field-select:focus, textarea.field-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(26,86,219,0.1); background: var(--surface); }
            .field-input:disabled, .field-select:disabled { opacity: 0.5; cursor: not-allowed; }
            select.field-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }

            .merge-option { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 2px solid var(--border); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition); background: var(--surface); margin-bottom: 10px; }
            .merge-option:hover { border-color: var(--indigo-border); background: var(--bg); }
            .merge-option:has(input:radio:checked) { border-color: var(--indigo); background: var(--indigo-bg); }
            .merge-option input[type="radio"] { width: 16px; height: 16px; accent-color: var(--indigo); flex-shrink: 0; margin-top: 2px; cursor: pointer; }
            .merge-option-content { flex: 1; }
            .merge-option-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
            .merge-option-desc { font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4; }

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

            .empty-state { text-align: center; padding: 40px; color: var(--text-muted); }
            .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
            .empty-text { font-size: 13px; font-weight: 600; }

            @media (max-width: 768px) {
                .col-checkbox { display: none !important; }
                #batch-bar { display: none !important; }
                .toolbar { padding: 12px 16px; justify-content: flex-end; }
                .search-wrap { flex: 0 0 100%; order: 1; margin-bottom: 8px; }
                .flex-spacer { display: none; }
                .toolbar-actions { order: 2; width: 100%; justify-content: space-between; display: flex; gap: 8px; }
                .toolbar-actions .btn { flex: 1; padding: 0 4px; font-size: 11px; margin: 0; }
                .v-divider { display: none; }
                .filter-row { padding: 10px 16px; }
                .pagination-bar { flex-direction: column; align-items: flex-start; padding: 12px 16px; gap: 12px; }
                .pagination-bar-right { width: 100%; justify-content: space-between; }
                .dialog-overlay { padding: 12px; }
                #data-form { flex-direction: column !important; gap: 16px !important; }
                #data-form > div { width: 100% !important; margin: 0 !important; }
                .v-divider-modal { display: block !important; width: 100% !important; height: 1px !important; min-height: 1px !important; background-color: var(--border) !important; margin: 8px 0 !important; flex-shrink: 0 !important; }
            }
        </style>

        <div class="toolbar">
            <div class="search-wrap">
                <i class="ti ti-search"></i>
                <input type="text" id="search-input" placeholder="搜尋機構名稱或統編..." class="search-input">
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
            <div class="filter-pill-wrap" id="pill-wrap-country">
                <button class="filter-pill" id="pill-country">全部國別 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-country">
                    <div class="filter-dropdown-search"><input type="text" id="search-country-input" placeholder="搜尋國別..."></div>
                    <div class="filter-dropdown-list" id="country-options-container"></div>
                    <div class="filter-dropdown-footer"><button id="btn-clear-country">清除此篩選</button></div>
                </div>
            </div>

            <div class="filter-pill-wrap" id="pill-wrap-city">
                <button class="filter-pill" id="pill-city">全部縣市 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-city">
                    <div class="filter-dropdown-search"><input type="text" id="search-city-input" placeholder="搜尋縣市..."></div>
                    <div class="filter-dropdown-list" id="city-options-container"></div>
                    <div class="filter-dropdown-footer"><button id="btn-clear-city">清除此篩選</button></div>
                </div>
            </div>

            <div class="filter-pill-wrap" id="pill-wrap-industry">
                <button class="filter-pill" id="pill-industry">全部行業別 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-industry">
                    <div class="filter-dropdown-search"><input type="text" id="search-industry-input" placeholder="搜尋行業別..."></div>
                    <div class="filter-dropdown-list" id="industry-options-container"></div>
                    <div class="filter-dropdown-footer"><button id="btn-clear-industry">清除此篩選</button></div>
                </div>
            </div>

            <div class="filter-pill-wrap" id="pill-wrap-venue">
                <button class="filter-pill" id="pill-venue">全部場所 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-venue">
                    <div class="filter-dropdown-search"><input type="text" id="search-venue-input" placeholder="搜尋場所..."></div>
                    <div class="filter-dropdown-list" id="venue-options-container"></div>
                    <div class="filter-dropdown-footer"><button id="btn-clear-venue">清除此篩選</button></div>
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
                            <th class="col-checkbox" style="width: 4%;">
                                <div style="display:flex; justify-content:center; align-items:center;">
                                    <input type="checkbox" id="selectAll" style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                                </div>
                            </th>
                            <th data-sort="name" style="width: 20%;">實習機構名稱 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="tax_id" style="width: 12%;">統一編號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="industry" style="width: 12%;">行業別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="venue_type" style="width: 12%;">實習場所 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="country" style="width: 8%;">國別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="city" style="width: 8%;">縣市別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="address" style="width: 16%;">實習場所地址 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th style="width: 12%;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
                        <tr><td colspan="9" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i><div class="empty-text">資料載入中...</div></td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="pagination-bar">
                <div class="pagination-info" id="pagination-info">共 0 筆</div>
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
                <div class="dialog-header">
                    <h3 id="modal-title"><i class="ti ti-building-skyscraper"></i> 新增實習機構</h3>
                    <button type="button" class="dialog-close" id="btn-close-modal-x"><i class="ti ti-x"></i></button>
                </div>
                <form id="data-form" class="dialog-body custom-scroll" style="display: flex; gap: 24px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-section-title" style="margin-bottom: 0;"><i class="ti ti-building-skyscraper"></i> 機構基本資料</div>
                        <div class="field"><label class="field-label">實習場所國別 <span class="req">*</span></label><select id="input-country" required class="field-select"></select></div>
                        <div class="field"><label class="field-label">實習機構名稱 <span class="req">*</span></label><input type="text" id="input-name" required placeholder="例如：台灣積體電路製造股份有限公司" class="field-input"></div>
                        <div class="field"><label class="field-label">統一編號 <span id="req-tax" class="req">*</span></label><input type="text" id="input-tax-id" required placeholder="如: 12345678" class="field-input" style="text-transform:uppercase;"></div>
                        <div class="field"><label class="field-label">縣市別 <span id="req-city" class="req">*</span></label><select id="input-city" required class="field-select"><option value="">請選擇</option></select></div>
                        <div class="field"><label class="field-label">完整實習地址 <span class="req">*</span></label><input type="text" id="input-address" required placeholder="如: 臺灣大道四段1727號" class="field-input"></div>
                    </div>
                    <div class="v-divider-modal" style="width: 1px; background: var(--border); margin: 0;"></div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-section-title" style="margin-bottom: 0;"><i class="ti ti-tags"></i> 分類與備註</div>
                        <div class="field"><label class="field-label">行業別</label><select id="input-industry" class="field-select"><option value="">請選擇</option></select></div>
                        <div class="field"><label class="field-label">實習場所</label><select id="input-venue-type" class="field-select"><option value="">請選擇</option></select></div>
                        <div class="field" style="flex: 1;"><label class="field-label">機構備註</label><textarea id="input-remarks" class="field-input" placeholder="可輸入與該機構相關之備註說明..." style="height: 100%; min-height: 120px; resize: none; padding: 10px 12px; line-height: 1.5;"></textarea></div>
                    </div>
                </form>
                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-modal">取消</button>
                    <button type="button" id="btn-submit" class="btn btn-primary"><i class="ti ti-check"></i> 確認儲存</button>
                </div>
            </div>
        </div>

        <div id="merge-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 650px;">
                <div class="dialog-header">
                    <h3 style="color: var(--indigo)"><i class="ti ti-link" style="color: var(--indigo)"></i> 合併重複機構</h3>
                    <button type="button" class="dialog-close" id="btn-close-merge-x"><i class="ti ti-x"></i></button>
                </div>
                <div class="dialog-body custom-scroll" style="background: var(--bg);">
                    <div style="background: var(--indigo-light); border: 1px solid var(--indigo-border); padding: 12px; border-radius: var(--radius); margin-bottom: 16px;">
                        <p style="font-size: 13px; color: var(--indigo); font-weight: 600; line-height: 1.5;">
                            您已選取 <span id="merge-count" style="font-size: 16px; font-weight: 700; margin: 0 4px;">0</span> 個機構準備進行合併。<br>
                            請在下方選擇<strong style="color: var(--danger); margin: 0 4px;">「唯一要保留的主體機構」</strong>。合併後，其餘被勾選的機構將被刪除，且系統會自動更新所有關聯到被刪除機構的實習紀錄。
                        </p>
                    </div>
                    <div id="merge-options-container" style="display: flex; flex-direction: column;"></div>
                </div>
                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-merge">取消</button>
                    <button type="button" id="btn-merge-submit" class="btn btn-indigo-solid" disabled><i class="ti ti-link"></i> 確認執行合併作業</button>
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
                    <div class="field"><label class="field-label
