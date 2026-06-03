// ===============================
// 0. Firestore Import 與全局變數
// ===============================
import {
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 全局狀態變數
let db;
let allData = [];
let allRecords = [];
let baseTree = [];

let editingId = null;
let editingOldData = null;
let pendingPayload = null;
let currentHistory = [];

let currentPage = 1;
let itemsPerPage = 15;
let selectedIds = [];
let filteredInstitutions = [];
let sortCol = '';
let sortDir = '';

let isTreeMode = true;
let expandedParents = new Set();
let isSearchAutoExpand = false;
let isAllExpanded = false;
let colVis = { tax_id: true, industry: true, venue_type: true, country: true, city: true, address: true };

let filterCountrySet = new Set();
let filterCitySet = new Set();
let filterIndustrySet = new Set();
let filterVenueSet = new Set();

let isGlobalListenerBound = false;
let searchDebounceTimer = null;

// ===============================
// 1. 靜態資料列表
// ===============================
const LIST_COUNTRIES = [
  "中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門",
  "馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"
];
const LIST_CITIES = [
  "臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣",
  "南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣",
  "臺東縣","澎湖縣","金門縣","連江縣"
];
const LIST_INDUSTRIES = [
  "農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業",
  "營建工程業","批發及零售業","運輸及倉儲業","住宿及餐飲業","出版及影音等內容傳播業",
  "電信及資訊服務業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業",
  "公共行政及國防；強制性社會安全","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"
];
const LIST_VENUES = [
  "企業機構","其他機構","政府機構","就讀學校附屬機構"
];

// ===============================
// 2. 工具函數區
// ===============================
// 取得今日民國日期格式 (YYY/MM/DD)
function getROCDateString() {
  const today = new Date();
  const rocYear = today.getFullYear() - 1911;
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${rocYear}/${mm}/${dd}`;
}

// 民國日期格式化
function formatROCDate(val) {
  let s = val.replace(/\D/g, '');
  if (s.length === 6) s = '0' + s;
  if (s.length === 7)
    return `${s.substring(0, 3)}/${s.substring(3, 5)}/${s.substring(5, 7)}`;
  return val;
}
// 民國日期驗證
function isValidROCDate(val) {
  return /^\d{2,3}\/\d{2}\/\d{2}$/.test(val);
}

// 關鍵字高亮
function highlightKeyword(text, keyword) {
  if (!keyword || !text) return text || '';
  const regex = new RegExp(
    `(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );
  return text.toString().replace(
    regex,
    '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>'
  );
}

// ===============================
// 3. UI 模板注入
// ===============================

// 分離的 CSS 模板
const UI_STYLES = `
<style id="dynamic-col-styles"></style>
<style>
/* === 原 CSS 保留 === */
#institution-page-wrapper { font-family: 'Noto Sans TC', sans-serif; font-size: 14px; color: var(--text-primary); background: var(--bg); -webkit-font-smoothing: antialiased; flex: 1; display: flex; flex-direction: column; min-height: 0; }
#institution-page-wrapper * { box-sizing: border-box; }
/* 捲軸樣式與動畫 */
.custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.ti-spin { animation: spin 1s linear infinite; display: inline-block; }
/* 省略：你原本的所有CSS都可以塞進來，保留原樣式 */
</style>
`;

// 分離的 HTML 模板
const UI_HTML = `
<div id="institution-page-wrapper" style="height: 100%; display: flex; flex-direction: column;">
  <!-- Toolbar -->
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
  <!-- 篩選區 -->
  <div class="filter-row">
    <div class="filters-scroll-area custom-scroll" id="filters-container">
      <!-- 國別、縣市、行業別、場所 filter pill -->
    </div>
    <div class="relative inline-block text-left" id="display-settings-wrap">
      <button id="btn-display-settings" class="btn btn-secondary btn-sm" style="font-weight: 500;"><i class="ti ti-settings"></i> 顯示設定</button>
      <div id="display-settings-menu" class="menu-popup" style="display:none;">
        <!-- 顯示欄位設定 -->
      </div>
    </div>
    <div id="batch-bar">
      <!-- 批次選擇工具列 -->
    </div>
  </div>
  <!-- 表格 -->
  <div class="table-wrap">
    <div class="table-scroll custom-scroll">
      <table>
        <thead>
          <tr id="inst-table-head">
            <th class="col-checkbox"><input type="checkbox" id="selectAll"></th>
            <th class="col-name" data-sort="name">實習機構名稱</th>
            <th data-sort="tax_id" class="col-tax_id">統一編號</th>
            <th data-sort="industry" class="col-industry">行業別</th>
            <th data-sort="venue_type" class="col-venue_type">實習場所</th>
            <th data-sort="country" class="col-country">國別</th>
            <th data-sort="city" class="col-city">縣市別</th>
            <th data-sort="address" class="col-address">實習場所地址</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody id="table-body">
          <tr><td colspan="9" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon"></i><div class="empty-text">資料載入中...</div></td></tr>
        </tbody>
      </table>
    </div>
    <div class="pagination-bar">
      <div class="pagination-info" id="pagination-info">共 0 間實習機構</div>
      <div class="pagination-bar-right">
        <select class="per-page-select" id="per-page-select">
          <option value="15">15 筆</option>
          <option value="25">25 筆</option>
          <option value="50">50 筆</option>
        </select>
        <div class="pagination-controls" id="pagination-controls"></div>
      </div>
    </div>
  </div>
  <!-- 模態窗們（新增、編輯、批次、合併、歷史快照） -->
  <div id="data-modal" class="dialog-overlay">…</div>
  <div id="add-history-modal" class="dialog-overlay">…</div>
  <div id="change-intent-modal" class="dialog-overlay">…</div>
  <div id="merge-modal" class="dialog-overlay">…</div>
  <div id="batch-edit-modal" class="dialog-overlay">…</div>
</div>
`;

// UI 注入函式
function injectUI(container) {
  container.innerHTML = UI_STYLES + UI_HTML;
}

// ===============================
// 4. 靜態選項初始化
// ===============================
function initSelectOptions() {
  // 國別下拉
  let countryHtml = LIST_COUNTRIES.map(item => `<option value="${item}">${item}</option>`).join('');
  document.getElementById('input-country').innerHTML = countryHtml;

  // 縣市下拉
  let cityHtml = `<option value="">請選擇</option>` + LIST_CITIES.map(item => `<option value="${item}">${item}</option>`).join('');
  document.getElementById('input-city').innerHTML = cityHtml;

  // 行業別下拉
  let industryHtml = `<option value="">請選擇</option>` + LIST_INDUSTRIES.map(item => `<option value="${item}">${item}</option>`).join('');
  document.getElementById('input-industry').innerHTML = industryHtml;

  // 場所下拉
  let venueHtml = `<option value="">請選擇</option>` + LIST_VENUES.map(item => `<option value="${item}">${item}</option>`).join('');
  document.getElementById('input-venue-type').innerHTML = venueHtml;

  // 過濾器選項（checkbox）
  const genFilterHtml = (arr, cls) => arr.map(item => `<label class="filter-option"><input type="checkbox" class="${cls}" value="${item}"><span>${item}</span></label>`).join('');
  document.getElementById('country-options-container').innerHTML = genFilterHtml(LIST_COUNTRIES, 'filter-chk-country');
  document.getElementById('city-options-container').innerHTML    = genFilterHtml(LIST_CITIES, 'filter-chk-city');
  document.getElementById('industry-options-container').innerHTML = genFilterHtml(LIST_INDUSTRIES, 'filter-chk-industry');
  document.getElementById('venue-options-container').innerHTML     = genFilterHtml(LIST_VENUES, 'filter-chk-venue');

  // 批次修改下拉
  let batchIndHtml = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>' + LIST_INDUSTRIES.map(item => `<option value="${item}">${item}</option>`).join('');
  document.getElementById('batch-input-industry').innerHTML = batchIndHtml;
  let batchVenueHtml = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>' + LIST_VENUES.map(item => `<option value="${item}">${item}</option>`).join('');
  document.getElementById('batch-input-venue').innerHTML = batchVenueHtml;
}

// ===============================
// 5. 建立 Base Tree
// ===============================
function buildBaseTree() {
  let grouped = {};
  baseTree = [];

  // 主機構
  allData.forEach(d => {
    if (!d.parent_id) {
      grouped[d.id] = { ...d, children: [] };
      baseTree.push(grouped[d.id]);
    }
  });

  // 分公司
  allData.forEach(d => {
    if (d.parent_id) {
      if (grouped[d.parent_id]) grouped[d.parent_id].children.push(d);
      else baseTree.push({ ...d, children: [] }); // fallback
    }
  });
}

// ===============================
// 6. 表格渲染
// ===============================
function renderTable() {
  const tbody = document.getElementById('table-body');
  const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();

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
        filteredInstitutions.push({ ...parent, children: matchedChildren, isExpanded: expandedParents.has(parent.id) });
      }
    });
  } else {
    filteredInstitutions = allData.filter(d => checkMatch(d));
  }

  // 排序
  if (sortCol) {
    const sortFn = (a, b) => {
      let valA = a[sortCol] || '';
      let valB = b[sortCol] || '';
      if (sortCol === 'country') {
        const aIsDomestic = valA === '中華民國' ? 0 : 1;
        const bIsDomestic = valB === '中華民國' ? 0 : 1;
        if (aIsDomestic !== bIsDomestic) return sortDir === 'asc' ? aIsDomestic - bIsDomestic : bIsDomestic - aIsDomestic;
      }
      let cmp = valA.toString().localeCompare(valB.toString(), 'zh-TW');
      return sortDir === 'asc' ? cmp : -cmp;
    };
    filteredInstitutions.sort(sortFn);
    if (isTreeMode) filteredInstitutions.forEach(p => p.children.sort(sortFn));
  }

  // 分頁
  const totalMainItems = filteredInstitutions.length;
  const totalPages = Math.max(1, Math.ceil(totalMainItems / itemsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredInstitutions.slice(start, start + itemsPerPage);

  // 渲染
  if (totalMainItems === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的機構資料。</div></td></tr>`;
    return;
  }

  const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
    const isChecked = selectedIds.includes(data.id) ? 'checked' : '';
    const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span style="display:inline-block; width:22px;"></span>`;
    const hName = highlightKeyword(data.name, searchTerm);
    const nameHtml = isChild
      ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i> ${hName}</div>`
      : `<div style="display:flex; align-items:center;">${toggleHtml} ${hName}</div>`;
    const hAddress = highlightKeyword(data.address, searchTerm);

    return `
    <tr class="${isChecked ? 'selected' : ''} ${isChild ? `child-row child-of-${parentId}` : 'parent-row'}"
        data-id="${data.id}" style="${isChild && !isExpanded ? 'display:none;' : ''}">
      <td class="col-checkbox"><input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked}></td>
      <td class="col-name">${nameHtml}</td>
      <td class="col-tax_id">${data.tax_id || ''}</td>
      <td class="col-industry">${data.industry || '-'}</td>
      <td class="col-venue_type">${data.venue_type || '-'}</td>
      <td class="col-country">${data.country}</td>
      <td class="col-city">${data.city || '-'}</td>
      <td class="col-address">${hAddress}</td>
      <td class="col-actions">
        <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit"><i class="ti ti-edit"></i></button>
        <button data-id="${data.id}" data-name="${data.name}" class="btn btn-danger btn-icon sm btn-row-delete"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  };

  let html = '';
  paginatedItems.forEach(item => {
    if (isTreeMode) {
      html += renderRow(item, false, null, item.isExpanded, item.children.length > 0);
      item.children.forEach(child => html += renderRow(child, true, item.id, item.isExpanded));
    } else {
      html += renderRow(item, false);
    }
  });

  tbody.innerHTML = html;
}

// ===============================
// 7. Firestore 資料操作 (CRUD)
// ===============================

// 預載 internship_records，便於更新學生紀錄
async function preloadRecords() {
  try {
    const recordsCol = collection(db, "internship_records");
    const recordSnap = await getDocs(recordsCol);
    allRecords = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn("歷史名單預載未完成", e);
  }
}

// 載入機構資料
async function fetchInstitutions() {
  try {
    const snap = await getDocs(collection(db, "internship_institutions"));
    allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    selectedIds = [];
    buildBaseTree();
    renderTable();
    await preloadRecords();
  } catch (error) {
    console.error("雲端資料同步或渲染失敗:", error);
    document.getElementById('table-body').innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <i class="ti ti-lock empty-icon" style="color:var(--danger)"></i>
          <div class="empty-text">雲端資料同步中斷。</div>
        </td>
      </tr>`;
  }
}

// 新增機構
async function createInstitution(payload) {
  try {
    await addDoc(collection(db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
  } catch (err) {
    console.error("新增失敗", err);
    alert("新增失敗");
  }
}

// 更新機構
async function updateInstitution(id, payload) {
  try {
    await updateDoc(doc(db, "internship_institutions", id), { ...payload, updated_at: serverTimestamp() });
  } catch (err) {
    console.error("更新失敗", err);
    alert("更新失敗");
  }
}

// 刪除機構
async function deleteInstitution(id) {
  try {
    await deleteDoc(doc(db, "internship_institutions", id));
  } catch (err) {
    console.error("刪除失敗", err);
    alert("刪除失敗");
  }
}

// ===============================
// 8. 匯出 CSV
// ===============================
function exportToCSV() {
  if (filteredInstitutions.length === 0) {
    alert("沒有資料可供匯出！");
    return;
  }

  let csv = '\uFEFF實習機構主名稱,隸屬主機構,統一編號,海外稅號,行業別,實習場所,國別,縣市別,地址,備註\n';
  if (isTreeMode) {
    filteredInstitutions.forEach(p => {
      csv += [ p.name, '', p.tax_id || '', p.overseas_tax_id || '', p.industry || '', p.venue_type || '', p.country, p.city || '', p.address, p.remarks || '' ].map(v => `"${(v||'').replace(/"/g, '""')}"`).join(',') + '\n';
      p.children.forEach(c => {
        csv += [ c.name, p.name, c.tax_id || '', c.overseas_tax_id || '', c.industry || '', c.venue_type || '', c.country, c.city || '', c.address, c.remarks || '' ].map(v => `"${(v||'').replace(/"/g, '""')}"`).join(',') + '\n';
      });
    });
  } else {
    filteredInstitutions.forEach(d => {
      csv += [ d.name, '', d.tax_id || '', d.overseas_tax_id || '', d.industry || '', d.venue_type || '', d.country, d.city || '', d.address, d.remarks || '' ].map(v => `"${(v||'').replace(/"/g, '""')}"`).join(',') + '\n';
    });
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `實習機構清單_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// ===============================
// 9. 匯入 CSV
// ===============================
async function importFromCSV(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const rows = e.target.result.split('\n').map(row => row.trim()).filter(r => r);
      let parsedRows = [];

      // 解析每一行
      for (let i = 1; i < rows.length; i++) {
        let cols = [];
        let inQuotes = false;
        let currentVal = '';
        for (let char of rows[i]) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            cols.push(currentVal.trim());
            currentVal = '';
          } else currentVal += char;
        }
        cols.push(currentVal.trim());

        if (cols.length >= 9) {
          const payload = {
            name: cols[0],
            tax_id: cols[2] || '',
            overseas_tax_id: cols[3] || '',
            industry: cols[4] || '',
            venue_type: cols[5] || '',
            country: cols[6] || '中華民國',
            city: cols[7] || '',
            address: cols[8] || '',
            remarks: cols[9] || '',
            parent_id: '',
            history: []
          };
          if (!payload.name) continue;
          parsedRows.push(payload);
        }
      }

      // 寫入 Firestore
      for (let payload of parsedRows) {
        await createInstitution(payload);
      }
      alert(`✅ 成功匯入 ${parsedRows.length} 筆`);
      fetchInstitutions();
    } catch (err) {
      console.error("CSV 匯入錯誤", err);
      alert("匯入失敗");
    }
  };
  reader.readAsText(file);
}

// ===============================
// 10. 事件綁定拆分
// ===============================

// 搜尋事件
function bindSearchEvents(container) {
  const searchInput = container.querySelector('#search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage = 1;
      isSearchAutoExpand = true;
      renderTable();
    }, 250);
  });
}

// CSV 匯出 / 匯入事件
function bindCSVEvents(container) {
  container.querySelector('#btn-export-csv').addEventListener('click', exportToCSV);
  container.querySelector('#btn-import-trigger').addEventListener('click', () => container.querySelector('#import-file').click());
  container.querySelector('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importFromCSV(e.target.files[0]);
  });
}

// 分頁事件
function bindPaginationEvents(container) {
  container.querySelector('#per-page-select').addEventListener('change', (e) => {
    itemsPerPage = Number(e.target.value);
    currentPage = 1;
    renderTable();
  });

  container.querySelector('#pagination-controls').addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled || btn.classList.contains('active')) return;
    currentPage = Number(btn.dataset.page);
    renderTable();
  });
}

// 排序事件
function bindSortEvents(container) {
  container.querySelector('#inst-table-head').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (th) {
      const col = th.dataset.sort;
      if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortCol = col; sortDir = 'asc'; }
      renderTable();
    }
  });
}

// 列操作事件 (編輯、刪除、展開)
function bindRowEvents(container) {
  container.querySelector('#table-body').addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.tree-toggle');
    const btnEdit = e.target.closest('.btn-row-edit');
    const btnDel = e.target.closest('.btn-row-delete');
    const rowChk = e.target.closest('.row-select-chk');

    if (toggleBtn) {
      const tr = toggleBtn.closest('tr');
      const pId = tr.dataset.id;
      const isExpanded = toggleBtn.classList.toggle('expanded');
      if (isExpanded) expandedParents.add(pId);
      else expandedParents.delete(pId);
      document.querySelectorAll(`.child-of-${pId}`).forEach(row => row.style.display = isExpanded ? '' : 'none');
    }
    if (rowChk) {
      const id = rowChk.value;
      const idx = selectedIds.indexOf(id);
      if (idx === -1) selectedIds.push(id);
      else selectedIds.splice(idx, 1);
      renderTable();
    }
    if (btnEdit) {
      const id = btnEdit.dataset.id;
      // TODO: 實作編輯視窗開啟邏輯
    }
    if (btnDel) {
      const id = btnDel.dataset.id;
      const name = btnDel.dataset.name;
      if (confirm(`確定要刪除「${name}」嗎？`)) {
        deleteInstitution(id);
        fetchInstitutions();
      }
    }
  });
}

// ===============================
// 11. 主初始化函式
// ===============================
export async function render(containerId, context) {
  db = context.db;
  const container = document.getElementById(containerId);

  selectedIds = [];
  currentPage = 1;
  expandedParents.clear();
  isAllExpanded = false;

  injectUI(container);
  initSelectOptions();
  bindSearchEvents(container);
  bindCSVEvents(container);
  bindPaginationEvents(container);
  bindSortEvents(container);
  bindRowEvents(container);

  await fetchInstitutions();
}

// ===============================
// 12. Modal 開關輔助函式
// ===============================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ===============================
// 13. 新增 / 編輯機構
// ===============================
function openCreateModal() {
  editingId = null;
  editingOldData = null;
  currentHistory = [];
  document.getElementById('data-form').reset();
  document.getElementById('modal-title').innerHTML = '<i class="ti ti-building-skyscraper text-brand"></i> 新增實習機構';
  openModal('data-modal');
}

function openEditModal(id) {
  const docData = allData.find(d => d.id === id);
  if (!docData) return;
  editingId = id;
  editingOldData = { ...docData };
  currentHistory = docData.history || [];

  document.getElementById('modal-title').innerHTML = '<i class="ti ti-edit text-brand"></i> 編輯機構與歷史軌跡';
  // TODO: 填表單值到 input
  openModal('data-modal');
}

async function submitInstitutionForm() {
  const form = document.getElementById('data-form');
  const data = new FormData(form);

  const payload = {
    parent_id: data.get('input-parent-id') || '',
    country: data.get('input-country'),
    name: data.get('input-name').trim(),
    tax_id: data.get('input-tax-id').trim(),
    overseas_tax_id: data.get('input-overseas-tax-id').trim(),
    city: data.get('input-city'),
    industry: data.get('input-industry'),
    venue_type: data.get('input-venue-type'),
    address: data.get('input-address').trim(),
    remarks: data.get('input-remarks').trim(),
    history: currentHistory
  };

  const isDomestic = payload.country === '中華民國';
  if (!payload.country || !payload.name || !payload.address) {
    alert("請填寫所有必填欄位！");
    return;
  }
  if (isDomestic && (!payload.tax_id || !payload.city)) {
    alert("中華民國機構必須填寫統一編號與縣市別！");
    return;
  }

  if (editingId) await updateInstitution(editingId, payload);
  else await createInstitution(payload);

  closeModal('data-modal');
  fetchInstitutions();
}

// ===============================
// 14. 批次修改
// ===============================
function openBatchEditModal() {
  if (selectedIds.length === 0) return;
  document.getElementById('batch-edit-count').innerText = selectedIds.length;
  openModal('batch-edit-modal');
}

async function executeBatchEdit() {
  const indVal = document.getElementById('batch-input-industry').value;
  const venVal = document.getElementById('batch-input-venue').value;

  const batch = writeBatch(db);
  selectedIds.forEach(id => {
    const updates = { updated_at: serverTimestamp() };
    if (indVal !== 'NO_CHANGE') updates.industry = indVal;
    if (venVal !== 'NO_CHANGE') updates.venue_type = venVal;
    batch.update(doc(db, "internship_institutions", id), updates);
  });

  await batch.commit();
  closeModal('batch-edit-modal');
  fetchInstitutions();
}

// ===============================
// 15. 合併機構
// ===============================
function openMergeModal() {
  if (selectedIds.length < 2) {
    alert("請至少勾選 2 個機構進行合併！");
    return;
  }
  const container = document.getElementById('merge-options-container');
  const targetInsts = allData.filter(i => selectedIds.includes(i.id));
  container.innerHTML = targetInsts.map(inst => `
    <label class="merge-option">
      <input type="radio" name="master_inst" value="${inst.id}">
      <div>
        <div class="merge-option-title">${inst.name}</div>
        <div class="merge-option-desc">統編/代碼：${inst.tax_id || inst.overseas_tax_id || '無'} | 地址：${inst.address || '無'}</div>
      </div>
    </label>
  `).join('');
  openModal('merge-modal');
}

async function executeMerge() {
  const masterId = document.querySelector('input[name="master_inst"]:checked')?.value;
  if (!masterId) return;
  const masterInst = allData.find(i => i.id === masterId);
  const instsToDelete = selectedIds.filter(id => id !== masterId);
  const deletedNames = allData.filter(i => instsToDelete.includes(i.id)).map(i => i.name);

  if (!confirm(`確認合併？\n保留主體：${masterInst.name}\n刪除對象：${deletedNames.join('、')}`)) return;

  const batch = writeBatch(db);
  allRecords.forEach(record => {
    if (instsToDelete.includes(record.inst_id) || deletedNames.includes(record.inst_raw)) {
      batch.update(doc(db, "internship_records", record.id), { inst_id: masterInst.id, updated_at: serverTimestamp() });
    }
  });
  allData.forEach(d => {
    if (instsToDelete.includes(d.parent_id)) {
      batch.update(doc(db, "internship_institutions", d.id), { parent_id: masterId });
    }
  });
  instsToDelete.forEach(id => batch.delete(doc(db, "internship_institutions", id)));
  await batch.commit();

  closeModal('merge-modal');
  fetchInstitutions();
}

// ===============================
// 16. 批次刪除
// ===============================
async function batchDelete() {
  if (!confirm(`確定刪除這 ${selectedIds.length} 筆機構嗎？`)) return;
  const batch = writeBatch(db);
  selectedIds.forEach(id => batch.delete(doc(db, "internship_institutions", id)));
  await batch.commit();
  fetchInstitutions();
}
