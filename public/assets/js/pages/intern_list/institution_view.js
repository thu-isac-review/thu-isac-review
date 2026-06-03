import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. 唯讀模組狀態管理 (清單瀏覽版專屬)
// ==========================================
let db;
let viewContainer; // 🌟 關鍵修正：將所有 DOM 操作限制在此容器內，避免與管理頁面 ID 衝突
let allData = [];
let baseTree = [];
let filteredInstitutions = [];

let currentPage = 1;
let itemsPerPage = 15;
let sortCol = '';
let sortDir = '';
let isTreeMode = true;
let expandedParents = new Set();
let isSearchAutoExpand = false;
let isAllExpanded = false;

// 欄位顯示設定
let colVis = { tax_id: true, industry: true, venue_type: true, country: true, city: true, address: true };

// 篩選條件 Set
let filterCountrySet = new Set();
let filterCitySet = new Set();
let filterIndustrySet = new Set();
let filterVenueSet = new Set();

let searchDebounceTimer = null;
let activeModalId = null;
let currentHistory = [];

const LIST_COUNTRIES = ["中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門","馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"];
const LIST_CITIES = ["臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const LIST_INDUSTRIES = ["農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業","營建工程業","批發及零售業","運輸及倉儲業","住宿及餐飲業","出版及影音等內容傳播業","電信及資訊服務業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業","公共行政及國防；強制性社會安全","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"];
const LIST_VENUES = ["企業機構","其他機構","政府機構","就讀學校附屬機構"];

// ==========================================
// 2. 頁面初始化入口
// ==========================================
export async function render(containerId, context) {
    db = context.db;
    viewContainer = document.getElementById(containerId); // 記錄當前模組的容器
    
    // 狀態重設
    currentPage = 1;
    expandedParents.clear();
    isAllExpanded = false;
    
    // 注入唯讀版專屬 HTML 骨架與樣式
    injectUI(viewContainer);
    initSelectOptions();
    bindEvents(viewContainer);
    updateColStyles();
    
    // 獲取並渲染資料
    await fetchInitialDataOnce();
}

// ==========================================
// 3. UI 注入與靜態選項初始化
// ==========================================
function injectUI(container) {
    container.innerHTML = `
    <style id="dynamic-col-styles-view"></style>
    <style>
        #inst-view-page-wrapper { font-family: 'Noto Sans TC', sans-serif; font-size: 14px; color: var(--text-primary); background: var(--bg); flex: 1; display: flex; flex-direction: column; min-height: 0; }
        #inst-view-page-wrapper * { box-sizing: border-box; }
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
        
        .toolbar-view { padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 0 0 280px; }
        .search-wrap i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 16px; }
        .search-input { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0 10px 0 34px; font-size: 13px; outline: none; transition: all 0.15s; }
        .search-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }
        
        .filter-row-view { padding: 10px 24px; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; position: relative; }
        .filters-scroll-area { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
        .filter-pill-wrap { position: relative; }
        .filter-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0 10px; height: 28px; border: 1px solid var(--border); border-radius: 99px; background: var(--surface); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .filter-pill.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }
        .filter-pill .pill-count { background: var(--brand); color: white; border-radius: 99px; font-size: 10px; font-weight: 700; padding: 0 5px; min-width: 16px; text-align: center; }
        
        .filter-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); min-width: 220px; z-index: 100; display: none; flex-direction: column; overflow: hidden; }
        .filter-dropdown.show { display: flex; }
        .filter-dropdown-search { padding: 8px; border-bottom: 1px solid var(--border); }
        .filter-dropdown-search input { width: 100%; height: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 10px; font-size: 12px; outline: none; background: var(--bg); }
        .filter-dropdown-list { max-height: 200px; overflow-y: auto; padding: 4px; }
        .filter-option { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--text-secondary); }
        .filter-option:hover { background: var(--bg); color: var(--text-primary); }
        .filter-option input[type=checkbox] { accent-color: var(--brand); }
        
        .table-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--surface); min-height: 0; }
        .table-scroll { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1000px; }
        th { padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; position: sticky; top: 0; z-index: 1; background: var(--surface); border-bottom: 1px solid var(--border); }
        td { padding: 12px 16px; vertical-align: middle; border-bottom: 1px solid var(--border); background-color: inherit; }
        tr { background-color: var(--surface); transition: background-color 0.15s; cursor: pointer; }
        tr:hover { background-color: #f3f6ff; }
        
        .col-name { min-width: 260px; width: auto; }
        .col-address { min-width: 220px; width: auto; }
        .col-tax_id { width: 10%; min-width: 110px; }
        .col-industry { width: 12%; min-width: 130px; }
        .col-venue_type { width: 12%; min-width: 130px; }
        .col-country { width: 8%; min-width: 90px; }
        .col-city { width: 8%; min-width: 90px; }
        .col-actions { position: sticky; right: 0; width: 100px; min-width: 100px; z-index: 2; background-color: inherit; text-align: center; }
        th.col-actions { z-index: 3; background-color: var(--surface); }

        .tree-toggle { width: 22px; height: 22px; background: transparent; border: none; border-radius: 4px; cursor: pointer; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.2s; outline: none; margin-right: 8px; }
        .tree-toggle i { font-size: 16px; transition: transform 0.2s; }
        .tree-toggle.expanded i { transform: rotate(90deg); color: var(--brand); }
        .child-row { background-color: #fbfdff; }
        .child-row td { border-bottom: 1px dashed var(--border); }
        .child-name-wrap { display: flex; align-items: flex-start; padding-left: 3px; gap: 11px; }
        .child-name-wrap i { font-size: 16px; opacity: 0.5; color: var(--text-secondary); margin-top: 1px; }

        .pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
        .page-btn { min-width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 8px; transition: all 0.15s; }
        .page-btn:hover:not(:disabled) { background: var(--bg); border-color: var(--border-strong); }
        .page-btn.active { background: var(--brand); color: white; border-color: var(--brand); font-weight: 700; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .read-card { background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; min-height: 38px; display: flex; align-items: center; font-size: 13px; color: var(--text-primary); }

        .dialog-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; padding: 24px; }
        .dialog-overlay.open { display: flex; }
        .dialog-box { background: var(--surface); border-radius: var(--radius-xl); box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 100%; display: flex; flex-direction: column; overflow: hidden; animation: dialogIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes dialogIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } }
        .dialog-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--surface); }
        .dialog-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); transition: all 0.15s; }
        .dialog-close:hover { color: var(--danger); background: var(--danger-bg); }
        .dialog-body-container { height: 500px; display: flex; overflow: hidden; background: var(--bg); }
        .dialog-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: var(--bg); flex-shrink: 0; }
        .form-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
        .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
        .field-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        @media (max-width: 768px) {
            .dialog-box { max-height: 100% !important; display: flex !important; flex-direction: column !important; }
            .dialog-body-container { flex: 1 !important; min-height: 0 !important; overflow-y: auto !important; height: auto !important; flex-direction: column !important; }
            #tab-main-view, #tab-history-view { flex-direction: column !important; padding: 16px !important; gap: 16px !important; overflow-y: visible !important; height: auto !important; flex: none !important; }
            #tab-main-view > div { width: 100% !important; flex: none !important; }
        }
    </style>

    <div id="inst-view-page-wrapper">
        <div class="toolbar-view">
            <div class="search-wrap">
                <i class="ti ti-search"></i>
                <input type="text" id="search-input" placeholder="搜尋機構名稱、統編或地址..." class="search-input">
            </div>
            <div class="flex-spacer" style="flex:1;"></div>
            <button id="btn-export-csv" class="btn btn-success-solid"><i class="ti ti-file-export"></i> 匯出清單</button>
        </div>

        <div class="filter-row-view">
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
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="address" checked> 實際實習地址</label>
                </div>
            </div>
        </div>

        <div class="table-wrap">
            <div class="table-scroll custom-scroll">
                <table>
                    <thead>
                        <tr id="inst-table-head">
                            <th class="col-name" data-sort="name">實習機構名稱 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="tax_id" class="col-tax_id">統一編號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="industry" class="col-industry">行業別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="venue_type" class="col-venue_type">實習場所 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="country" class="col-country">國別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="city" class="col-city">縣市別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th data-sort="address" class="col-address" style="text-align: center;">實際實習地址 <i class="ti ti-arrows-sort sort-icon"></i></th>
                            <th class="col-actions">操作</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
                        <tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted);"><i class="ti ti-loader-2 ti-spin text-2xl" style="color:var(--brand);"></i><div class="mt-2 text-sm">機構資料同步中...</div></td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="pagination-bar">
                <div id="pagination-info" style="font-size:12px; color:var(--text-muted)">共 0 間實習機構</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:12px; color:var(--text-muted)">每頁顯示</span>
                        <select class="per-page-select" id="per-page-select" style="height:30px; border:1px solid var(--border); border-radius:var(--radius); font-size:12px;">
                            <option value="15">15 筆</option>
                            <option value="25">25 筆</option>
                            <option value="50">50 筆</option>
                        </select>
                    </div>
                    <div id="pagination-controls" style="display:flex; gap:4px;"></div>
                </div>
            </div>
        </div>

        <div id="view-modal" class="dialog-overlay">
            <div class="dialog-box" style="max-width: 800px;">
                <div class="dialog-header flex-col items-start p-0 border-none" style="flex-direction: column; align-items: flex-start; padding: 0; border: none;">
                    <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 16px;">
                        <h3 style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color:var(--text-primary);"><i class="ti ti-building-community text-brand" style="font-size: 20px;"></i> 實習機構詳細資訊</h3>
                        <button type="button" class="dialog-close" id="btn-close-modal-x"><i class="ti ti-x"></i></button>
                    </div>
                    <div id="modal-tabs" style="width: 100%; border-bottom: 1px solid var(--border); padding: 0 20px; display: flex;">
                        <nav style="display: flex; gap: 24px; margin-bottom: -1px;">
                            <button type="button" id="tab-btn-main" style="padding: 12px 4px; border: none; border-bottom: 2px solid var(--brand); background: none; color: var(--brand); font-size: 14px; font-weight: 600; cursor: pointer;">機構詳細資料</button>
                            <button type="button" id="tab-btn-history" style="padding: 12px 4px; border: none; border-bottom: 2px solid transparent; background: none; color: var(--text-muted); font-size: 14px; font-weight: 600; cursor: pointer;">歷史變更軌跡</button>
                        </nav>
                    </div>
                </div>

                <div class="dialog-body-container" style="height: 480px;">
                    <div id="tab-main-view" class="custom-scroll" style="display: flex; gap: 24px; width: 100%; padding: 24px; overflow-y: auto;">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 14px;">
                            <div class="form-section-title" style="font-weight:700;"><i class="ti ti-building-skyscraper text-brand"></i> 基本組織歸屬</div>
                            
                            <div class="field">
                                <label class="field-label">隸屬主機構</label>
                                <div class="read-card" id="view-parent-name">-</div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="field"><label class="field-label">實習場所國別</label><div class="read-card" id="view-country">-</div></div>
                                <div class="field"><label class="field-label" id="label-tax-view">統一編號</label><div class="read-card" id="view-tax-id">-</div></div>
                            </div>
                            
                            <div class="field"><label class="field-label">機構主名稱</label><div class="read-card font-bold text-gray-900" id="view-name">-</div></div>
                            <div class="field" id="wrap-translated-view" style="display:none;"><label class="field-label">中文譯名</label><div class="read-card" id="view-name-translated">-</div></div>
                            <div class="field"><label class="field-label">實際實習地址</label><div class="read-card" id="view-address">-</div></div>
                        </div>
                        <div style="width: 1px; background: var(--border); margin: 0;"></div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 14px;">
                            <div class="form-section-title" style="font-weight:700;"><i class="ti ti-tags text-indigo-500"></i> 分類與備註</div>
                            <div class="field"><label class="field-label">行業別</label><div class="read-card" id="view-industry">-</div></div>
                            <div class="field"><label class="field-label">實習場所</label><div class="read-card" id="view-venue-type">-</div></div>
                            <div class="field" style="flex: 1; display: flex; flex-direction: column;">
                                <label class="field-label">機構備註</label>
                                <div class="read-card custom-scroll" id="view-remarks" style="flex: 1; align-items: flex-start; overflow-y: auto; padding: 10px 12px; line-height: 1.5; min-height: 120px;">-</div>
                            </div>
                        </div>
                    </div>

                    <div id="tab-history-view" class="custom-scroll" style="display: none; width: 100%; padding: 24px; overflow-y: auto;">
                        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">以下為該實習機構過去封存之舊名稱、舊地址與結束適用日期。可用於對照過往實習紀錄。</p>
                        <div id="history-list-container-view" style="display:flex; flex-direction:column; gap:12px;"></div>
                    </div>
                </div>

                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="btn-close-modal">關閉視窗</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

function initSelectOptions() {
    let filterCountryHtml = '';
    LIST_COUNTRIES.forEach(item => { filterCountryHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-country" value="${item}"><span>${item}</span></label>`; });
    viewContainer.querySelector('#country-options-container').innerHTML = filterCountryHtml;

    let filterCityHtml = '';
    LIST_CITIES.forEach(item => { filterCityHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-city" value="${item}"><span>${item}</span></label>`; });
    viewContainer.querySelector('#city-options-container').innerHTML = filterCityHtml;

    let filterIndustryHtml = '';
    LIST_INDUSTRIES.forEach(item => { filterIndustryHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-industry" value="${item}"><span>${item}</span></label>`; });
    viewContainer.querySelector('#industry-options-container').innerHTML = filterIndustryHtml;

    let filterVenueHtml = '';
    LIST_VENUES.forEach(item => { filterVenueHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-venue" value="${item}"><span>${item}</span></label>`; });
    viewContainer.querySelector('#venue-options-container').innerHTML = filterVenueHtml;
}

// ==========================================
// 4. 事件綁定邏輯
// ==========================================
function bindEvents(container) {
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        if (filteredInstitutions.length === 0) { alert("沒有資料可供匯出！"); return; }
        let csv = '\uFEFF實習機構主名稱,隸屬主機構,統一編號,海外稅號,行業別,實習場所,實習場所國別,縣市別,實際實習地址,備註\n';
        
        if (isTreeMode) {
            filteredInstitutions.forEach(p => {
                csv += [ p.name, '', p.tax_id || '', p.overseas_tax_id || '', p.industry || '', p.venue_type || '', p.country, p.city || '', p.address, p.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
                p.children.forEach(c => { csv += [ c.name, p.name, c.tax_id || '', c.overseas_tax_id || '', c.industry || '', c.venue_type || '', c.country, c.city || '', c.address, c.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n'; });
            });
        } else {
            filteredInstitutions.forEach(d => {
                csv += [ d.name, '', d.tax_id || '', d.overseas_tax_id || '', d.industry || '', d.venue_type || '', d.country, d.city || '', d.address, d.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            });
        }
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習機構查詢清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    });

    container.querySelector('#search-input')?.addEventListener('input', () => { 
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentPage = 1; isSearchAutoExpand = true; renderTable(); 
        }, 250);
    });

    ['country', 'city', 'industry', 'venue'].forEach(type => {
        container.querySelector(`#pill-${type}`)?.addEventListener('click', (e) => {
            e.stopPropagation();
            const drop = container.querySelector(`#drop-${type}`);
            const wrap = container.querySelector(`#pill-wrap-${type}`);
            const isOpen = drop.classList.contains('show');
            container.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
            if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
        });
        container.querySelector(`#search-${type}-input`)?.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const labels = container.querySelector(`#${type}-options-container`).querySelectorAll('.filter-option');
            labels.forEach(lbl => {
                lbl.style.display = lbl.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
        container.querySelector(`#${type}-options-container`)?.addEventListener('change', (e) => { 
            if(e.target.type === 'checkbox') {
                let set = type === 'country' ? filterCountrySet : (type === 'city' ? filterCitySet : (type === 'industry' ? filterIndustrySet : filterVenueSet));
                if (set.has(e.target.value)) set.delete(e.target.value); else set.add(e.target.value);
                container.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
                currentPage = 1; updatePillActive(type); renderTable();
            }
        });
    });

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

    const btnDisplaySettings = container.querySelector('#btn-display-settings');
    const displayMenu = container.querySelector('#display-settings-menu');
    btnDisplaySettings?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(displayMenu) displayMenu.style.display = displayMenu.style.display === 'block' ? 'none' : 'block';
    });

    container.querySelector('#btn-toggle-tree')?.addEventListener('click', (e) => {
        e.stopPropagation();
        isTreeMode = !isTreeMode;
        const btn = container.querySelector('#btn-toggle-tree');
        if(btn) btn.innerHTML = isTreeMode 
            ? `<i class="ti ti-list-tree" style="color:var(--brand); margin-right:4px;"></i> <span>切換為扁平列表</span>` 
            : `<i class="ti ti-list" style="color:var(--brand); margin-right:4px;"></i> <span>切換為樹狀檢視</span>`;
        renderTable();
    });

    container.querySelector('#btn-toggle-expand')?.addEventListener('click', (e) => {
        e.stopPropagation();
        isAllExpanded = !isAllExpanded;
        const btn = container.querySelector('#btn-toggle-expand');
        if (isAllExpanded) {
            allData.forEach(d => { if (!d.parent_id) expandedParents.add(d.id); });
            if(btn) btn.innerHTML = `<i class="ti ti-arrows-minimize" style="color:var(--brand); margin-right:4px;"></i> <span>收合所有分支</span>`;
        } else {
            expandedParents.clear();
            if(btn) btn.innerHTML = `<i class="ti ti-arrows-maximize" style="color:var(--brand); margin-right:4px;"></i> <span>展開所有分支</span>`;
        }
        renderTable();
    });

    container.querySelectorAll('.col-toggle-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            colVis[e.target.value] = e.target.checked;
            updateColStyles();
        });
    });

    document.addEventListener('click', (e) => {
        if(viewContainer) {
            viewContainer.querySelectorAll('.filter-dropdown').forEach(d => {
                if (!e.target.closest('.filter-pill-wrap')) d.classList.remove('show');
            });
            const dMenu = viewContainer.querySelector('#display-settings-menu');
            if (dMenu && !e.target.closest('#display-settings-wrap')) dMenu.style.display = 'none';
        }
    });

    container.querySelector('#per-page-select')?.addEventListener('change', (e) => { 
        itemsPerPage = Number(e.target.value); currentPage = 1; renderTable(); 
    });
    container.querySelector('#pagination-controls')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled || btn.classList.contains('active')) return;
        const p = Number(btn.dataset.page);
        if (p) { currentPage = p; renderTable(); }
    });

    container.querySelector('#inst-view-page-wrapper #inst-table-head')?.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const col = th.dataset.sort;
            if (sortCol === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; } 
            else { sortCol = col; sortDir = 'asc'; }
            
            container.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                const icon = t.querySelector('.sort-icon');
                if(icon) icon.className = 'ti ti-arrows-sort sort-icon';
            });
            
            th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            const thIcon = th.querySelector('.sort-icon');
            if(thIcon) thIcon.className = `ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            renderTable();
        }
    });

    const tabBtnMain = container.querySelector('#tab-btn-main');
    const tabBtnHistory = container.querySelector('#tab-btn-history');
    const tabMain = container.querySelector('#tab-main-view');
    const tabHistory = container.querySelector('#tab-history-view');

    tabBtnMain?.addEventListener('click', () => {
        if(tabBtnMain) { tabBtnMain.style.borderColor = 'var(--brand)'; tabBtnMain.style.color = 'var(--brand)'; }
        if(tabBtnHistory) { tabBtnHistory.style.borderColor = 'transparent'; tabBtnHistory.style.color = 'var(--text-muted)'; }
        if(tabMain) tabMain.style.display = 'flex'; 
        if(tabHistory) tabHistory.style.display = 'none';
    });

    tabBtnHistory?.addEventListener('click', () => {
        if(tabBtnHistory) { tabBtnHistory.style.borderColor = 'var(--brand)'; tabBtnHistory.style.color = 'var(--brand)'; }
        if(tabBtnMain) { tabBtnMain.style.borderColor = 'transparent'; tabBtnMain.style.color = 'var(--text-muted)'; }
        if(tabHistory) { tabHistory.style.display = 'block'; tabMain.style.display = 'none'; }
        renderHistoryList();
    });

    container.querySelector('#btn-close-modal-x')?.addEventListener('click', () => container.querySelector('#view-modal')?.classList.remove('open'));
    container.querySelector('#btn-close-modal')?.addEventListener('click', () => container.querySelector('#view-modal')?.classList.remove('open'));

    container.querySelector('#table-body')?.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.tree-toggle');
        const actionBtn = e.target.closest('.btn-row-view-detail');
        const tr = e.target.closest('tr');
        
        if (toggleBtn) {
            e.stopPropagation();
            const parentTr = toggleBtn.closest('tr');
            const pId = parentTr.dataset.id;
            const isExpanded = toggleBtn.classList.toggle('expanded');
            
            if (isExpanded) expandedParents.add(pId);
            else expandedParents.delete(pId);
            
            container.querySelectorAll(`.child-of-${pId}`).forEach(row => { row.style.display = isExpanded ? '' : 'none'; });
            return;
        }

        if (actionBtn || tr) {
            const targetId = actionBtn ? actionBtn.dataset.id : tr.dataset.id;
            if(targetId) openDetailModal(targetId);
        }
    });
}

// ==========================================
// 5. 資料處理與篩選引擎
// ==========================================
async function fetchInitialDataOnce() {
    try {
        const dataSnap = await getDocs(collection(db, "internship_institutions"));
        allData = dataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        buildBaseTree();
        renderTable();
    } catch (e) {
        console.error(e);
        viewContainer.querySelector('#table-body').innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--danger);">資料載入中斷，請確認您的帳號權限或刷新重試。</td></tr>`;
    }
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

function renderTable() {
    const tbody = viewContainer.querySelector('#table-body');
    const searchInputEl = viewContainer.querySelector('#search-input');
    const searchTerm = searchInputEl ? searchInputEl.value.trim().toLowerCase() : '';

    const checkMatch = (d) => {
        const matchSearch = String(d.name || '').toLowerCase().includes(searchTerm) || 
                            String(d.tax_id || '').toLowerCase().includes(searchTerm) ||
                            String(d.address || '').toLowerCase().includes(searchTerm);
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

    if (sortCol) {
        const sortFn = (a, b) => {
            let valA = a[sortCol] || ''; let valB = b[sortCol] || '';
            if (sortCol === 'country') {
                const aIsDomestic = valA === '中華民國' ? 0 : 1;
                const bIsDomestic = valB === '中華民國' ? 0 : 1;
                if (aIsDomestic !== bIsDomestic) return sortDir === 'asc' ? aIsDomestic - bIsDomestic : bIsDomestic - aIsDomestic;
            }
            valA = valA.toString(); valB = valB.toString();
            let cmp = valA.localeCompare(valB, 'zh-TW'); 
            return sortDir === 'asc' ? cmp : -cmp;
        };

        filteredInstitutions.sort(sortFn);
        if (isTreeMode) {
            filteredInstitutions.forEach(p => { if (p.children?.length > 0) p.children.sort(sortFn); });
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
        viewContainer.querySelector('#pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalAllMatched}</strong> 間實習機構（含 ${totalChildrenMatched} 間分支機構），顯示第 ${start + 1}–${Math.min(start + itemsPerPage, totalMainItems)} 間主機構` : `共 <strong>0</strong> 間實習機構`;
    } else {
        viewContainer.querySelector('#pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalMainItems}</strong> 間實習機構，顯示第 ${start + 1}–${Math.min(start + itemsPerPage, totalMainItems)} 間` : `共 <strong>0</strong> 間實習機構`;
    }
    
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
    viewContainer.querySelector('#pagination-controls').innerHTML = pHtml;

    if (totalMainItems === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted);"><i class="ti ti-inbox text-3xl opacity-40"></i><div class="mt-2">找不到符合條件的機構資料。</div></td></tr>`;
        return;
    }

    const highlight = (text) => {
        if (!searchTerm || !text) return text || '-';
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
    };

    const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
        const isDomestic = data.country === '中華民國';
        let dispTax = isDomestic && data.tax_id ? highlight(data.tax_id) : (data.overseas_tax_id ? highlight(data.overseas_tax_id) : '-');
        
        const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span style="display:inline-block; width:22px; margin-right:8px;"></span>`;
        
        let childCountHtml = '';
        if (hasChildren && !isExpanded && data.children) {
            childCountHtml = `<span style="background: var(--brand-light); color: var(--brand); padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">${data.children.length}</span>`;
        }

        const hName = highlight(data.name);
        const nameHtml = isChild 
            ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i> <span style="font-size:13px; color:var(--text-primary);">${hName}</span></div>` 
            : `<div style="display:flex; align-items:center;">${toggleHtml} <span class="font-bold text-gray-900" style="font-size:13px;">${hName}</span>${childCountHtml}</div>`;

        const hAddress = highlight(data.address);

        return `
        <tr class="${isChild ? `child-row child-of-${parentId}` : 'parent-row'}" data-id="${data.id}" style="${isChild && !isExpanded ? 'display:none;' : ''}">
            <td class="col-name" style="text-align: left; padding-left: 16px;">${nameHtml}</td>
            <td class="col-tax_id" style="text-align: center;"><div class="cell-primary" style="color: var(--text-muted);">${dispTax}</div></td>
            <td class="col-industry" style="text-align: center;"><div class="cell-primary">${data.industry || '-'}</div></td>
            <td class="col-venue_type" style="text-align: center;"><div class="cell-primary">${data.venue_type || '-'}</div></td>
            <td class="col-country" style="text-align: center;"><div class="cell-primary">${data.country}</div></td>
            <td class="col-city" style="text-align: center;"><div class="cell-primary">${isDomestic && data.city ? data.city : '-'}</div></td>
            <td class="col-address" style="text-align: left;"><div class="cell-primary truncate" style="max-width:320px;" title="${data.address}">${hAddress}</div></td>
            <td class="col-actions" style="text-align: center;">
                <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-view-detail" title="查看詳細資料"><i class="ti ti-eye"></i></button>
            </td>
        </tr>`;
    };

    let finalHtml = '';
    paginatedItems.forEach(item => {
        if (isTreeMode) {
            finalHtml += renderRow(item, false, null, item.isExpanded, item.children?.length > 0);
            item.children?.forEach(child => { finalHtml += renderRow(child, true, item.id, item.isExpanded, false); });
        } else {
            finalHtml += renderRow(item, false, null, false, false);
        }
    });
    tbody.innerHTML = finalHtml;
}

// ==========================================
// 6. 瀏覽詳細資料與歷史軌跡
// ==========================================
function openDetailModal(id) {
    const docData = allData.find(d => d.id === id); if (!docData) return;
    activeModalId = id;
    currentHistory = docData.history || [];
    
    viewContainer.querySelector('#tab-btn-main')?.click();
    
    const parentObj = allData.find(p => p.id === docData.parent_id);
    viewContainer.querySelector('#view-parent-name').textContent = parentObj ? parentObj.name : '獨立主機構 (無隸屬)';
    
    viewContainer.querySelector('#view-country').textContent = docData.country || '-';
    
    const isDomestic = docData.country === '中華民國';
    viewContainer.querySelector('#label-tax-view').textContent = isDomestic ? '統一編號' : '海外稅號 / 立案號碼';
    viewContainer.querySelector('#view-tax-id').textContent = isDomestic ? (docData.tax_id || '-') : (docData.overseas_tax_id || '-');
    
    viewContainer.querySelector('#view-name').textContent = docData.name || '-';
    
    const wrapTrans = viewContainer.querySelector('#wrap-translated-view');
    if (!isDomestic && docData.name_translated) {
        if(wrapTrans) wrapTrans.style.display = 'block';
        viewContainer.querySelector('#view-name-translated').textContent = docData.name_translated;
    } else if(wrapTrans) {
        wrapTrans.style.display = 'none';
    }
    
    viewContainer.querySelector('#view-address').textContent = docData.address || '-';
    viewContainer.querySelector('#view-industry').textContent = docData.industry || '未填寫';
    viewContainer.querySelector('#view-venue-type').textContent = docData.venue_type || '未填寫';
    viewContainer.querySelector('#view-remarks').textContent = docData.remarks || '無備註說明。';
    
    viewContainer.querySelector('#view-modal')?.classList.add('open');
}

function renderHistoryList() {
    const container = viewContainer.querySelector('#history-list-container-view');
    if(!currentHistory || currentHistory.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 0; color:var(--text-muted); font-size:13px; border:2px dashed var(--border); border-radius:12px;">尚無任何歷史更迭紀錄</div>`;
        return;
    }
    
    const sorted = [...currentHistory].sort((a,b) => b.end_date.localeCompare(a.end_date, 'zh-TW'));
    
    container.innerHTML = sorted.map(h => `
        <div style="position:relative; padding-left:24px; padding-bottom:16px; border-left:2px solid #e0e7ff;">
            <div style="position:absolute; width:12px; height:12px; background:#6366f1; border-radius:50%; left:-7px; top:4px; border:2px solid white; box-shadow:var(--shadow-sm);"></div>
            <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px; box-shadow:var(--shadow-sm);">
                <span style="font-size:11px; font-weight:700; background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; letter-spacing:0.05em;">~ ${h.end_date} 前適用</span>
                <div style="font-weight:700; color:var(--text-primary); font-size:14px; margin-top:6px;">${h.name}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;"><i class="ti ti-map-pin"></i> ${h.address}</div>
                ${h.tax_id ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;"><i class="ti ti-receipt"></i> 舊代碼/統編：${h.tax_id}</div>` : ''}
                ${h.reason ? `<div style="font-size:13px; color:#4338ca; margin-top:8px; padding-top:8px; border-top:1px solid var(--border);"><i class="ti ti-info-circle"></i> 事由：${h.reason}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// ==========================================
// 7. 輔助介面控制
// ==========================================
function updatePillActive(type) {
    let set, typeName;
    if(type === 'country') { set = filterCountrySet; typeName = '國別'; }
    else if(type === 'city') { set = filterCitySet; typeName = '縣市'; }
    else if(type === 'industry') { set = filterIndustrySet; typeName = '行業別'; }
    else { set = filterVenueSet; typeName = '場所'; }

    const pill = viewContainer.querySelector(`#pill-${type}`);
    if(!pill) return;
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeName} <i class="ti ti-chevron-down"></i>`;
    }
}

function updateColStyles() {
    let css = '';
    if (!colVis.tax_id) css += '.col-tax_id { display: none !important; }\n';
    if (!colVis.industry) css += '.col-industry { display: none !important; }\n';
    if (!colVis.venue_type) css += '.col-venue_type { display: none !important; }\n';
    if (!colVis.country) css += '.col-country { display: none !important; }\n';
    if (!colVis.city) css += '.col-city { display: none !important; }\n';
    if (!colVis.address) css += '.col-address { display: none !important; }\n';
    const dynStyle = viewContainer.querySelector('#dynamic-col-styles-view');
    if(dynStyle) dynStyle.textContent = css;
}
