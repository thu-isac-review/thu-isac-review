import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 狀態變數
let db;
let allData = [];
let baseTree = [];
let filteredInstitutions = [];

let currentPage = 1;
let itemsPerPage = 15;
let sortCol = 'name'; // 預設用名稱排序
let sortDir = 'asc';

let isTreeMode = true;
let expandedParents = new Set();
let isSearchAutoExpand = false;

// 靜態選項
const LIST_COUNTRIES = ["中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門","馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"];
const LIST_CITIES = ["臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const LIST_INDUSTRIES = ["農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業","營建工程業","批發及零售業","運輸及倉儲業","住宿及餐飲業","出版及影音等內容傳播業","電信及資訊服務業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業","公共行政及國防；強制性社會安全","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"];
const LIST_VENUES = ["企業機構","其他機構","政府機構","就讀學校附屬機構"];

let filterCountrySet = new Set();
let filterCitySet = new Set();
let filterIndustrySet = new Set();
let filterVenueSet = new Set();
let searchDebounceTimer = null;

// ===============================
// 輔助函式
// ===============================
function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text || '';
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
}

function buildBaseTree() {
    let grouped = {};
    baseTree = [];
    allData.forEach(d => {
        if (!d.parent_id) {
            grouped[d.id] = { ...d, children: [] };
            baseTree.push(grouped[d.id]);
        }
    });
    allData.forEach(d => {
        if (d.parent_id) {
            if (grouped[d.parent_id]) grouped[d.parent_id].children.push(d);
            else baseTree.push({ ...d, children: [] });
        }
    });
}

// ===============================
// 核心渲染
// ===============================
function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
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

    // 顯示資訊更新
    document.getElementById('pagination-info').innerHTML = `共 <strong>${totalMainItems}</strong> 間實習機構`;

    if (totalMainItems === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的機構資料。</div></td></tr>`;
        return;
    }

    const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
        const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span style="display:inline-block; width:22px;"></span>`;
        const hName = highlightKeyword(data.name, searchTerm);
        const nameHtml = isChild
            ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i> ${hName}</div>`
            : `<div style="display:flex; align-items:center;">${toggleHtml} ${hName}</div>`;
        const hAddress = highlightKeyword(data.address, searchTerm);

        return `
        <tr class="${isChild ? `child-row child-of-${parentId}` : 'parent-row'}" data-id="${data.id}" style="${isChild && !isExpanded ? 'display:none;' : ''}">
            <td class="col-name" style="text-align: left; padding-left: 24px;">${nameHtml}</td>
            <td class="col-tax_id">${data.tax_id || ''}</td>
            <td class="col-industry">${data.industry || '-'}</td>
            <td class="col-venue_type">${data.venue_type || '-'}</td>
            <td class="col-country">${data.country}</td>
            <td class="col-city">${data.city || '-'}</td>
            <td class="col-address" style="text-align: left;">${hAddress}</td>
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
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const controls = document.getElementById('pagination-controls');
    if (!controls) return;
    let html = '';
    html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i></button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="padding:0 4px; color:var(--text-muted);">...</span>`;
        }
    }
    html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>`;
    controls.innerHTML = html;
}

// ===============================
// 獲取資料
// ===============================
async function fetchInstitutions() {
    try {
        const snap = await getDocs(collection(db, "internship_institutions"));
        allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        buildBaseTree();
        renderTable();
    } catch (error) {
        console.error("讀取機構資料失敗:", error);
        const tbody = document.getElementById('table-body');
        if(tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger)"></i><div class="empty-text">雲端資料讀取失敗，請重新整理頁面。</div></td></tr>`;
    }
}

// ===============================
// 初始化與事件綁定
// ===============================
export async function render(containerId, context) {
    db = context.db;
    
    // 綁定搜尋
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                currentPage = 1;
                isSearchAutoExpand = true;
                renderTable();
            }, 250);
        });
    }

    // 綁定分頁
    const perPageSelect = document.getElementById('per-page-select');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
            itemsPerPage = Number(e.target.value);
            currentPage = 1;
            renderTable();
        });
    }
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled || btn.classList.contains('active')) return;
            currentPage = Number(btn.dataset.page);
            renderTable();
        });
    }

    // 綁定展開收合
    const tableBody = document.getElementById('table-body');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.tree-toggle');
            if (toggleBtn) {
                const tr = toggleBtn.closest('tr');
                const pId = tr.dataset.id;
                const isExpanded = toggleBtn.classList.toggle('expanded');
                if (isExpanded) expandedParents.add(pId);
                else expandedParents.delete(pId);
                document.querySelectorAll(`.child-of-${pId}`).forEach(row => row.style.display = isExpanded ? '' : 'none');
            }
        });
    }

    // 綁定排序
    const tableHead = document.getElementById('inst-table-head');
    if (tableHead) {
        tableHead.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (th) {
                const col = th.dataset.sort;
                if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                else { sortCol = col; sortDir = 'asc'; }
                
                // 更新 UI 箭頭
                tableHead.querySelectorAll('th').forEach(el => el.classList.remove('sort-asc', 'sort-desc'));
                th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
                
                renderTable();
            }
        });
    }

    // 初始化獲取資料
    await fetchInstitutions();
}
