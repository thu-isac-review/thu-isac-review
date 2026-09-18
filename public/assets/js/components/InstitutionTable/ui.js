import { state, CONSTANTS } from './state.js';

export async function loadTemplate(containerId) {
    const response = await fetch('./assets/templates/institution.html');
    const htmlString = await response.text();
    document.getElementById(containerId).innerHTML = htmlString;
}

// 根據權限狀態來決定要隱藏哪些按鈕
export function applyReadOnlyMode() {
    if (state.isReadOnly) {
        const style = document.createElement('style');
        style.textContent = `
            #btn-import-trigger, 
            #btn-create-inst, 
            .v-divider,
            #btn-batch-edit, 
            #btn-batch-merge, 
            #btn-batch-delete,
            #btn-batch-parent, /* 🌟 [新增] 唯讀模式下隱藏批次設定總公司按鈕 */
            .col-checkbox, 
            .col-actions {
                display: none !important;
            }
        `;
        document.getElementById('institution-page-wrapper').appendChild(style);
    }
}

export function initSelectOptions() {
    let countryHtml = '';
    CONSTANTS.COUNTRIES.forEach(item => countryHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-country').innerHTML = countryHtml;

    let cityHtml = `<option value="">請選擇</option>`;
    CONSTANTS.CITIES.forEach(item => cityHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-city').innerHTML = cityHtml;

    let industryHtml = `<option value="">請選擇</option>`;
    CONSTANTS.INDUSTRIES.forEach(item => industryHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-industry').innerHTML = industryHtml;

    let venueHtml = `<option value="">請選擇</option>`;
    CONSTANTS.VENUES.forEach(item => venueHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('input-venue-type').innerHTML = venueHtml;

    let filterCountryHtml = '';
    CONSTANTS.COUNTRIES.forEach(item => { filterCountryHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-country" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('country-options-container').innerHTML = filterCountryHtml;

    let filterCityHtml = '';
    CONSTANTS.CITIES.forEach(item => { filterCityHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-city" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('city-options-container').innerHTML = filterCityHtml;

    let filterIndustryHtml = '';
    CONSTANTS.INDUSTRIES.forEach(item => { filterIndustryHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-industry" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('industry-options-container').innerHTML = filterIndustryHtml;

    let filterVenueHtml = '';
    CONSTANTS.VENUES.forEach(item => { filterVenueHtml += `<label class="filter-option"><input type="checkbox" class="filter-chk-venue" value="${item}"><span>${item}</span></label>`; });
    document.getElementById('venue-options-container').innerHTML = filterVenueHtml;
    
    let batchIndHtml = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>';
    CONSTANTS.INDUSTRIES.forEach(item => batchIndHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('batch-input-industry').innerHTML = batchIndHtml;

    let batchVenueHtml = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>';
    CONSTANTS.VENUES.forEach(item => batchVenueHtml += `<option value="${item}">${item}</option>`);
    document.getElementById('batch-input-venue').innerHTML = batchVenueHtml;
}

export function updateColStyles() {
    let css = '';
    if (!state.colVis.tax_id) css += '.col-tax_id { display: none !important; }\n';
    if (!state.colVis.industry) css += '.col-industry { display: none !important; }\n';
    if (!state.colVis.venue_type) css += '.col-venue_type { display: none !important; }\n';
    if (!state.colVis.country) css += '.col-country { display: none !important; }\n';
    if (!state.colVis.city) css += '.col-city { display: none !important; }\n';
    if (!state.colVis.address) css += '.col-address { display: none !important; }\n';
    document.getElementById('dynamic-col-styles').textContent = css;
}

export function buildBaseTree() {
    let grouped = {};
    state.baseTree = [];
    state.allData.forEach(d => {
        if (!d.parent_id) { grouped[d.id] = { ...d, children: [] }; state.baseTree.push(grouped[d.id]); }
    });
    state.allData.forEach(d => {
        if (d.parent_id) {
            if (grouped[d.parent_id]) grouped[d.parent_id].children.push(d);
            else state.baseTree.push({ ...d, children: [] });
        }
    });
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    
    if (state.isReadOnly) {
        bar.classList.remove('visible');
        return;
    }
    
    if (state.selectedIds.length > 0) {
        bar.classList.add('visible');
        count.innerText = state.selectedIds.length;
        
        let totalMatched = 0;
        if(state.isTreeMode) {
            state.filteredInstitutions.forEach(p => { totalMatched += 1 + p.children.length; });
        } else {
            totalMatched = state.filteredInstitutions.length;
        }

        if (state.selectedIds.length < totalMatched) {
            btnSelectAll.style.display = 'inline-flex';
            btnSelectAll.innerText = `選取全部符合條件 (${totalMatched})`;
        } else {
            btnSelectAll.style.display = 'none';
        }
    } else {
        bar.classList.remove('visible');
    }
}

export function handleCountryChange() {
    const country = document.getElementById('input-country').value;
    const isDomestic = country === '中華民國';
    
    const wrapTax = document.getElementById('wrap-tax-id');
    const wrapCity = document.getElementById('wrap-city');
    const wrapNameTrans = document.getElementById('wrap-name-translated');
    const wrapOverseasTax = document.getElementById('wrap-overseas-tax');

    const taxInput = document.getElementById('input-tax-id');
    const cityInput = document.getElementById('input-city');

    if (isDomestic) {
        wrapTax.style.display = 'flex'; 
        wrapCity.style.display = 'flex';
        wrapNameTrans.style.display = 'none'; 
        wrapOverseasTax.style.display = 'none';
        taxInput.required = true; 
        cityInput.required = true;
    } else {
        wrapTax.style.display = 'none'; 
        wrapCity.style.display = 'none';
        wrapNameTrans.style.display = 'flex'; 
        wrapOverseasTax.style.display = 'flex';
        taxInput.required = false; 
        cityInput.required = false;
        taxInput.value = ''; 
        cityInput.value = '';
    }
}

export function toggleDropdown(type) {
    const drop = document.getElementById(`drop-${type}`);
    const wrap = document.getElementById(`pill-wrap-${type}`);
    const isOpen = drop.classList.contains('show');
    document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
    if (!isOpen) { drop.classList.add('show'); wrap.classList.add('open'); }
}

export function filterDropdownItems(inputElement, containerId) {
    const term = inputElement.value.toLowerCase().trim();
    const container = document.getElementById(containerId);
    if (!container) return;
    const labels = container.querySelectorAll('.filter-option');
    let visibleCount = 0;

    labels.forEach(lbl => {
        const text = lbl.textContent.toLowerCase();
        const isMatch = text.includes(term);
        lbl.style.display = isMatch ? 'flex' : 'none';
        if (isMatch) visibleCount++;
    });

    let emptyMsg = container.querySelector('.empty-filter-msg');
    if (visibleCount === 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-filter-msg';
            emptyMsg.style.cssText = 'color: #dc2626; font-weight: 700; padding: 12px; text-align: center; font-size: 13px;';
            emptyMsg.textContent = '查無符合的選項';
            container.appendChild(emptyMsg);
        }
    } else {
        if (emptyMsg) emptyMsg.remove();
    }
}

export function updatePillActive(type) {
    let set, typeName;
    if(type === 'country') { set = state.filterCountrySet; typeName = '國別'; }
    else if(type === 'city') { set = state.filterCitySet; typeName = '縣市'; }
    else if(type === 'industry') { set = state.filterIndustrySet; typeName = '行業別'; }
    else { set = state.filterVenueSet; typeName = '場所'; }

    const pill = document.getElementById(`pill-${type}`);
    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeName} <i class="ti ti-chevron-down"></i>`;
    }
}

export function populateParentDropdown(excludeId = null) {
    const listContainer = document.getElementById('parent-dropdown-list');
    let html = '<div class="searchable-option empty-opt" data-id="" data-name="">-- 獨立機構 / 總公司 (無隸屬) --</div>';
    
    state.allData.forEach(d => {
        if (!d.parent_id && d.id !== excludeId) {
            html += `
            <div class="searchable-option" data-id="${d.id}" data-name="${d.name}">
                <span>${d.name}</span> 
            </div>`;
        }
    });
    listContainer.innerHTML = html;
}

// 🌟 [新增] 批次設定總公司的專屬下拉選單渲染 (過濾掉自己，避免無限迴圈)
export function populateBatchParentDropdown() {
    const listContainer = document.getElementById('batch-parent-dropdown-list');
    if (!listContainer) return;

    // 第一個選項：清除隸屬關係
    let html = `
    <label class="merge-option" style="margin-bottom: 8px;">
        <input type="radio" name="batch_parent_inst" value="" class="batch-parent-radio">
        <div class="merge-option-content">
            <div class="merge-option-title" style="color: var(--text-secondary);"><i class="ti ti-unlink"></i> 獨立機構 (清除隸屬關係)</div>
            <div class="merge-option-desc">解除目前所選機構的隸屬關係，將其設為獨立機構。</div>
        </div>
    </label>`;
    
    state.allData.forEach(d => {
        // 過濾掉已有總公司的機構，以及目前正在被勾選的機構
        if (!d.parent_id && !state.selectedIds.includes(d.id)) {
            html += `
            <label class="merge-option batch-parent-item" data-name="${d.name}" style="margin-bottom: 8px;">
                <input type="radio" name="batch_parent_inst" value="${d.id}" class="batch-parent-radio">
                <div class="merge-option-content">
                    <div class="merge-option-title">${d.name}</div>
                    <div class="merge-option-desc">統編/代碼：${d.tax_id || d.overseas_tax_id || '無'} | 地址：${d.address || '無'}</div>
                </div>
            </label>`;
        }
    });
    listContainer.innerHTML = html;
}

export function closeModal() { 
    document.getElementById('data-modal').classList.remove('open'); 
    state.editingId = null; 
    state.pendingPayload = null; 
}

// 🌟 [新增] 關閉批次設定總公司的 Modal
export function closeBatchParentModal() { 
    const modal = document.getElementById('batch-parent-modal');
    if(modal) {
        modal.classList.remove('open'); 
        document.getElementById('batch-parent-search').value = ''; 
    }
}
