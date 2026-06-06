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
    
    // 如果是唯讀模式，不需要顯示批次操作列
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
    const term = inputElement.value.toLowerCase();
    const labels = document.getElementById(containerId).querySelectorAll('.filter-option');
    labels.forEach(lbl => {
        const text = lbl.textContent.toLowerCase();
        lbl.style.display = text.includes(term) ? 'flex' : 'none';
    });
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

export function closeModal() { 
    document.getElementById('data-modal').classList.remove('open'); 
    state.editingId = null; 
    state.pendingPayload = null; 
}

// 統一 Notification 管理
export function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl shadow-xl border transition-all duration-300 transform translate-y-5 opacity-0`;
    
    if (type === 'success') {
        toast.className += ' bg-emerald-50 text-emerald-800 border-emerald-200';
        toast.innerHTML = `<i class="ti ti-circle-check text-emerald-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    } else if (type === 'error') {
        toast.className += ' bg-rose-50 text-rose-800 border-rose-200';
        toast.innerHTML = `<i class="ti ti-alert-circle text-rose-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    } else {
        toast.className += ' bg-blue-50 text-blue-800 border-blue-200';
        toast.innerHTML = `<i class="ti ti-info-circle text-blue-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 50);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-5', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
