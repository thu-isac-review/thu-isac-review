import { state } from './state.js';

export async function loadTemplate(containerId) {
    const response = await fetch('./assets/templates/institution.html');
    const htmlString = await response.text();
    document.getElementById(containerId).innerHTML = htmlString;
}

export function applyReadOnlyMode() {
    if (state.isReadOnly) {
        const style = document.createElement('style');
        style.textContent = `
            #btn-import-trigger, 
            #btn-create-inst, 
            .v-divider,
            #batch-bar,
            .col-checkbox, 
            .col-actions {
                display: none !important;
            }
        `;
        document.getElementById('institution-page-wrapper').appendChild(style);
    }
}

export function updateColStyles() {
    let css = '';
    const cols = ['inst_name', 'status', 'inst_type', 'inst_vat', 'inst_address', 'inst_category', 'employee_count'];
    
    cols.forEach(col => {
        if (!state.colVis[col]) {
            css += `.col-${col} { display: none !important; }\n`;
            css += `td.col-${col} * { display: none !important; }\n`;
        }
    });
    
    const styleEl = document.getElementById('dynamic-col-styles');
    if (styleEl) styleEl.textContent = css;
}

export function toggleDropdown(type) {
    const drop = document.getElementById(`drop-${type}`);
    const wrap = document.getElementById(`pill-wrap-${type}`);
    const isOpen = drop.classList.contains('show');
    
    document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.filter-pill-wrap').forEach(w => w.classList.remove('open'));
    
    if (!isOpen) {
        drop.classList.add('show');
        wrap.classList.add('open');
    }
}

// 修正：補上空選項提示與反黃功能
export function filterDropdownItems(inputElement, containerId) {
    const term = inputElement.value.toLowerCase().trim();
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const labels = container.querySelectorAll('.filter-option');
    let hasVisible = false;

    labels.forEach(lbl => {
        const span = lbl.querySelector('span:not(.pill-count)'); 
        if (!span) return;
        
        const originalText = span.textContent || span.innerText;
        const textLower = originalText.toLowerCase();
        
        if (term === '') {
            lbl.style.display = 'flex';
            span.innerHTML = originalText; 
            hasVisible = true;
        } else if (textLower.includes(term)) {
            lbl.style.display = 'flex';
            hasVisible = true;
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            span.innerHTML = originalText.replace(regex, '<mark style="background-color: #ffff00; color: #000; padding: 0;">$1</mark>');
        } else {
            lbl.style.display = 'none';
        }
    });

    let emptyOpt = container.querySelector('.empty-opt');
    if (!hasVisible) {
        if (!emptyOpt) {
            emptyOpt = document.createElement('label');
            emptyOpt.className = 'searchable-option empty-opt';
            emptyOpt.textContent = '找不到符合的選項';
            container.appendChild(emptyOpt);
        } else {
            emptyOpt.style.display = 'flex';
        }
    } else if (emptyOpt) {
        emptyOpt.style.display = 'none';
    }
}

export function updatePillActive(type) {
    const setMap = {
        'status': state.filterStatusSet,
        'type': state.filterTypeSet,
        'category': state.filterCategorySet
    };
    const nameMap = {
        'status': '合作狀態',
        'type': '機構類型',
        'category': '產業類別'
    };
    
    const set = setMap[type];
    const typeName = nameMap[type];
    const pill = document.getElementById(`pill-${type}`);
    
    if (!pill) return;

    if (set.size > 0) {
        pill.classList.add('active');
        pill.innerHTML = `${typeName} <span class="pill-count">${set.size}</span> <i class="ti ti-chevron-down"></i>`;
    } else {
        pill.classList.remove('active');
        pill.innerHTML = `全部${typeName} <i class="ti ti-chevron-down"></i>`;
    }
}

export function populateAllFiltersUI() {
    const getUnique = (key) => {
        return [...new Set(state.allData.map(d => d[key]))].filter(Boolean).sort();
    };

    const categories = getUnique('inst_category');
    
    const generateHtml = (arr, type) => {
        return arr.map(v => `
            <label class="filter-option">
                <input type="checkbox" class="filter-chk-${type}" value="${v}"> 
                <span>${v}</span>
            </label>
        `).join('');
    };

    if(document.getElementById('category-options-container')) {
        document.getElementById('category-options-container').innerHTML = generateHtml(categories, 'category');
    }

    ['status', 'type', 'category'].forEach(type => {
        const setMap = { 'status': state.filterStatusSet, 'type': state.filterTypeSet, 'category': state.filterCategorySet };
        document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = setMap[type].has(c.value));
        updatePillActive(type);
    });
}

export function updateBatchActionBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all-filtered');
    
    if (state.isReadOnly) {
        if(bar) bar.classList.remove('visible');
        return;
    }
    
    if (state.selectedIds.length > 0) {
        if(bar) bar.classList.add('visible');
        if(count) count.innerText = state.selectedIds.length;
        if(btnSelectAll) {
            if (state.selectedIds.length < state.filteredData.length) {
                btnSelectAll.style.display = 'inline-flex';
                btnSelectAll.innerText = `選取全部符合條件 (${state.filteredData.length})`;
            } else {
                btnSelectAll.style.display = 'none';
            }
        }
    } else {
        if(bar) bar.classList.remove('visible');
    }
}

export function switchTab(tabId) {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    
    const btn = document.querySelector(`.sidebar-item[data-tab="${tabId}"]`);
    const content = document.getElementById(`tab-${tabId}`);
    
    if (btn) btn.classList.add('active');
    if (content) content.style.display = 'block';
}

export function closeModal() {
    document.getElementById('data-modal')?.classList.remove('open');
    state.editingId = null;
}

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
