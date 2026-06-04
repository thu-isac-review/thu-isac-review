import { state } from './state.js';
import { highlightKeyword } from './ui.js';

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

export function renderTable() {
    const container = state.viewContainer;
    const tbody = container.querySelector('#table-body');
    const searchTerm = container.querySelector('#search-input').value.trim().toLowerCase();

    const checkMatch = (d) => {
        const matchSearch = String(d.name || '').toLowerCase().includes(searchTerm) || String(d.tax_id || '').toLowerCase().includes(searchTerm) || String(d.address || '').toLowerCase().includes(searchTerm);
        const matchCountry = state.filterCountrySet.size === 0 || state.filterCountrySet.has(d.country);
        const matchCity = state.filterCitySet.size === 0 || state.filterCitySet.has(d.city);
        const matchIndustry = state.filterIndustrySet.size === 0 || state.filterIndustrySet.has(d.industry);
        const matchVenue = state.filterVenueSet.size === 0 || state.filterVenueSet.has(d.venue_type);
        return matchSearch && matchCountry && matchCity && matchIndustry && matchVenue;
    };

    state.filteredInstitutions = [];
    if (state.isTreeMode) {
        state.baseTree.forEach(parent => {
            const pMatch = checkMatch(parent);
            const matchedChildren = parent.children.filter(c => checkMatch(c));
            if (pMatch || matchedChildren.length > 0) {
                if (state.isSearchAutoExpand && searchTerm && matchedChildren.length > 0) state.expandedParents.add(parent.id);
                state.filteredInstitutions.push({ ...parent, children: matchedChildren, isExpanded: state.expandedParents.has(parent.id) });
            }
        });
    } else {
        state.filteredInstitutions = state.allData.filter(d => checkMatch(d));
    }

    if (state.sortCol) {
        const sortFn = (a, b) => {
            let valA = a[state.sortCol] || ''; let valB = b[state.sortCol] || '';
            let cmp = valA.toString().localeCompare(valB.toString(), 'zh-TW');
            return state.sortDir === 'asc' ? cmp : -cmp;
        };
        state.filteredInstitutions.sort(sortFn);
        if (state.isTreeMode) state.filteredInstitutions.forEach(p => p.children.sort(sortFn));
    }

    const total = state.filteredInstitutions.length;
    const totalPages = Math.max(1, Math.ceil(total / state.itemsPerPage));
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = state.filteredInstitutions.slice(start, start + state.itemsPerPage);

    container.querySelector('#pagination-info').innerHTML = `共 <strong>${total}</strong> 間機構`;

    if (total === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的機構資料。</div></td></tr>`;
        return;
    }

    const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
        const isChecked = state.selectedIds.includes(data.id) ? 'checked' : '';
        const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span style="display:inline-block; width:22px;"></span>`;
        const hName = highlightKeyword(data.name, searchTerm);
        const nameHtml = isChild ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i> ${hName}</div>` : `<div style="display:flex; align-items:center;">${toggleHtml} ${hName}</div>`;
        const hAddress = highlightKeyword(data.address, searchTerm);

        // 🌟 判斷是否顯示 Checkbox
        const checkboxHtml = state.isReadOnly 
            ? `<td class="col-checkbox" style="display:none;"></td>`
            : `<td class="col-checkbox"><div class="flex-center"><input type="checkbox" value="${data.id}" class="row-select-chk" ${isChecked}></div></td>`;

        // 🌟 判斷要顯示什麼操作按鈕
        const actionsHtml = state.isReadOnly
            ? `<td class="col-actions">
                 <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-view-detail" title="查看詳細資料"><i class="ti ti-eye"></i></button>
               </td>`
            : `<td class="col-actions">
                 <button data-id="${data.id}" class="btn btn-secondary btn-icon sm btn-row-edit" title="編輯"><i class="ti ti-edit"></i></button>
                 <button data-id="${data.id}" data-name="${data.name}" class="btn btn-danger btn-icon sm btn-row-delete" title="刪除"><i class="ti ti-trash"></i></button>
               </td>`;

        return `
        <tr class="${isChecked ? 'selected' : ''} ${isChild ? `child-row child-of-${parentId}` : 'parent-row'}" data-id="${data.id}" style="${isChild && !isExpanded ? 'display:none;' : ''}">
            ${checkboxHtml}
            <td class="col-name">${nameHtml}</td>
            <td class="col-tax_id">${data.tax_id || ''}</td>
            <td class="col-industry">${data.industry || '-'}</td>
            <td class="col-venue_type">${data.venue_type || '-'}</td>
            <td class="col-country">${data.country}</td>
            <td class="col-city">${data.city || '-'}</td>
            <td class="col-address">${hAddress}</td>
            ${actionsHtml}
        </tr>`;
    };

    let html = '';
    paginatedItems.forEach(item => {
        if (state.isTreeMode) {
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
    const controls = state.viewContainer.querySelector('#pagination-controls');
    if (!controls) return;
    let html = `<button class="page-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - state.currentPage) <= 1) {
            html += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
            html += `<span class="page-btn" style="border:none; cursor:default;">...</span>`;
        }
    }
    html += `<button class="page-btn" data-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>`;
    controls.innerHTML = html;
}
