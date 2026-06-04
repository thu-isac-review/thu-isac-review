import { state, LIST_COUNTRIES, LIST_CITIES, LIST_INDUSTRIES, LIST_VENUES } from './state.js';

export async function injectUI(container) {
    try {
        // 使用絕對路徑確保在 SPA 任何路由下都能正確抓到 HTML
        const response = await fetch('/assets/templates/institution.html');
        const html = await response.text();
        container.innerHTML = html;

        initSelectOptions(container);

        // 🌟 核心：如果是唯讀模式，拔除所有管理權限的功能
        if (state.isReadOnly) {
            const hideSelectors = [
                '#btn-create-inst',      // 新增按鈕
                '#btn-import-trigger',   // 匯入按鈕
                '.v-divider',            // 工具列分隔線
                '#batch-bar',            // 批次操作列
                'th.col-checkbox'        // 表頭 Checkbox
            ];
            
            hideSelectors.forEach(selector => {
                const el = container.querySelector(selector);
                if (el) el.style.display = 'none';
            });

            const actionTh = container.querySelector('th.col-actions');
            if (actionTh) actionTh.innerText = '詳細資料';
        }
    } catch (error) {
        console.error("載入模板失敗:", error);
        container.innerHTML = `<div class="p-4 text-red-500">無法載入系統介面，請確認網路或檔案路徑。</div>`;
    }
}

function initSelectOptions(container) {
    const genFilterHtml = (arr, cls) => arr.map(item => `<label class="filter-option"><input type="checkbox" class="${cls}" value="${item}"><span>${item}</span></label>`).join('');
    
    container.querySelector('#country-options-container').innerHTML = genFilterHtml(LIST_COUNTRIES, 'filter-chk-country');
    container.querySelector('#city-options-container').innerHTML = genFilterHtml(LIST_CITIES, 'filter-chk-city');
    container.querySelector('#industry-options-container').innerHTML = genFilterHtml(LIST_INDUSTRIES, 'filter-chk-industry');
    container.querySelector('#venue-options-container').innerHTML = genFilterHtml(LIST_VENUES, 'filter-chk-venue');

    if (!state.isReadOnly) {
        container.querySelector('#input-country').innerHTML = LIST_COUNTRIES.map(item => `<option value="${item}">${item}</option>`).join('');
        container.querySelector('#input-city').innerHTML = `<option value="">請選擇</option>` + LIST_CITIES.map(item => `<option value="${item}">${item}</option>`).join('');
        container.querySelector('#input-industry').innerHTML = `<option value="">請選擇</option>` + LIST_INDUSTRIES.map(item => `<option value="${item}">${item}</option>`).join('');
        container.querySelector('#input-venue-type').innerHTML = `<option value="">請選擇</option>` + LIST_VENUES.map(item => `<option value="${item}">${item}</option>`).join('');
        
        container.querySelector('#batch-input-industry').innerHTML = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>' + LIST_INDUSTRIES.map(item => `<option value="${item}">${item}</option>`).join('');
        container.querySelector('#batch-input-venue').innerHTML = '<option value="NO_CHANGE">-- 不修改 --</option><option value="">[清空此欄位]</option>' + LIST_VENUES.map(item => `<option value="${item}">${item}</option>`).join('');
    }
}

export function updateColStyles() {
    let css = '';
    if (!state.colVis.tax_id) css += '.col-tax_id { display: none !important; }\n';
    if (!state.colVis.industry) css += '.col-industry { display: none !important; }\n';
    if (!state.colVis.venue_type) css += '.col-venue_type { display: none !important; }\n';
    if (!state.colVis.country) css += '.col-country { display: none !important; }\n';
    if (!state.colVis.city) css += '.col-city { display: none !important; }\n';
    if (!state.colVis.address) css += '.col-address { display: none !important; }\n';
    
    const dynStyle = state.viewContainer.querySelector('#dynamic-col-styles');
    if (dynStyle) dynStyle.textContent = css;
}

export function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text || '';
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.toString().replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0;">$1</mark>');
}
