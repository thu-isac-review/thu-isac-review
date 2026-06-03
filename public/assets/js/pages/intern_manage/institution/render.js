import { state, Utils } from './state.js';

export function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();

    const checkMatch = (d) => {
        const matchSearch = String(d.name || '').toLowerCase().includes(searchTerm) || 
                            String(d.tax_id || '').toLowerCase().includes(searchTerm) ||
                            String(d.address || '').toLowerCase().includes(searchTerm);
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
                if (state.isSearchAutoExpand && searchTerm && matchedChildren.length > 0) {
                    state.expandedParents.add(parent.id);
                }
                let isExpanded = state.expandedParents.has(parent.id);

                state.filteredInstitutions.push({ 
                    ...parent, 
                    children: (pMatch && !searchTerm) ? parent.children : matchedChildren,
                    isExpanded: isExpanded 
                });
            }
        });
    } else {
        state.filteredInstitutions = state.allData.filter(d => checkMatch(d));
    }
    
    state.isSearchAutoExpand = false; 

    if (state.sortCol) {
        const sortFn = (a, b) => {
            let valA = a[state.sortCol] || ''; let valB = b[state.sortCol] || '';
            if (state.sortCol === 'country') {
                const aIsDomestic = valA === '中華民國' ? 0 : 1;
                const bIsDomestic = valB === '中華民國' ? 0 : 1;
                if (aIsDomestic !== bIsDomestic) return state.sortDir === 'asc' ? aIsDomestic - bIsDomestic : bIsDomestic - aIsDomestic;
            }
            valA = valA.toString(); valB = valB.toString();
            let cmp = valA.localeCompare(valB, 'zh-TW'); 
            return state.sortDir === 'asc' ? cmp : -cmp;
        };

        state.filteredInstitutions.sort(sortFn);
        if (state.isTreeMode) {
            state.filteredInstitutions.forEach(p => {
                if (p.children && p.children.length > 0) p.children.sort(sortFn);
            });
        }
    }

    const totalMainItems = state.filteredInstitutions.length;
    const totalPages = Math.max(1, Math.ceil(totalMainItems / state.itemsPerPage));
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = state.filteredInstitutions.slice(start, start + state.itemsPerPage);

    let totalAllMatched = 0;
    let totalChildrenMatched = 0;
    if (state.isTreeMode) {
        state.filteredInstitutions.forEach(p => { 
            totalAllMatched++; 
            p.children.forEach(c => { totalAllMatched++; totalChildrenMatched++; }); 
        });
        document.getElementById('pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalAllMatched}</strong> 間實習機構（含 ${totalChildrenMatched} 間分支機構），顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, totalMainItems)} 間主機構` : `共 <strong>0</strong> 間實習機構`;
    } else {
        document.getElementById('pagination-info').innerHTML = totalMainItems > 0 ? `共 <strong>${totalMainItems}</strong> 間實習機構，顯示第 ${start + 1}–${Math.min(start + state.itemsPerPage, totalMainItems)} 間` : `共 <strong>0</strong> 間實習機構`;
    }
    
    let pHtml = `<button class="page-btn page-step-btn" data-page="${state.currentPage-1}" ${state.currentPage<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    const pages = [];
    for (let p=1; p<=totalPages; p++) {
        if (p===1 || p===totalPages || Math.abs(p-state.currentPage)<=1) pages.push(p);
        else if (pages[pages.length-1] !== '…') pages.push('…');
    }
    pages.forEach(p => {
        if (p === '…') pHtml += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
        else pHtml += `<button class="page-btn page-num-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    pHtml += `<button class="page-btn page-step-btn" data-page="${state.currentPage+1}" ${state.currentPage>=totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    document.getElementById('pagination-controls').innerHTML = pHtml;

    const currentPaginatedIds = paginatedItems.map(d => d.id);
    document.getElementById('selectAll').checked = currentPaginatedIds.length > 0 && currentPaginatedIds.every(id => state.selectedIds.includes(id));

    if (totalMainItems === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的機構資料。</div></td></tr>`;
        return;
    }

    const renderRow = (data, isChild = false, parentId = null, isExpanded = false, hasChildren = false) => {
        const isChecked = state.selectedIds.includes(data.id) ? 'checked' : '';
        const isDomestic = data.country === '中華民國';
        
        let dispTax = '-';
        if (isDomestic && data.tax_id) dispTax = Utils.highlightKeyword(data.tax_id, searchTerm);
        
        const toggleHtml = hasChildren ? `<button class="tree-toggle ${isExpanded ? 'expanded' : ''}"><i class="ti ti-chevron-right"></i></button>` : `<span style="display:inline-block; width:22px; margin-right:8px; flex-shrink:0;"></span>`;
        
        let childCountHtml = '';
        if (hasChildren && !isExpanded && data.children) {
            childCountHtml = `<span style="background: var(--brand-light); color: var(--brand); padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px;">${data.children.length}</span>`;
        }

        const hName = Utils.highlightKeyword(data.name, searchTerm);
        const nameHtml = isChild 
            ? `<div class="child-name-wrap"><i class="ti ti-corner-down-right"></i> <span class="cell-primary" style="word-break: break-word;">${hName}</span></div>` 
            : `<div style="display:flex; align-items:center;">${toggleHtml} <span class="cell-primary bold" style="word-break: break-word;">${hName}</span>${childCountHtml}</div>`;

        const hAddress = Utils.highlightKeyword(data.address, searchTerm);

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
        if (state.isTreeMode) {
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
    document.getElementById('selectAll').checked = currentVisibleIds.length > 0 && currentVisibleIds.every(id => state.selectedIds.includes(id));
}

export function renderHistoryList() {
    const container = document.getElementById('history-list-container');
    if(!state.currentHistory || state.currentHistory.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 0; color:var(--text-muted); font-size:13px; border:2px dashed var(--border); border-radius:12px;">尚無歷史快照紀錄</div>`;
        return;
    }
    
    const sorted = [...state.currentHistory].map((h, i) => ({...h, originalIndex: i})).sort((a,b) => b.end_date.localeCompare(a.end_date, 'zh-TW'));
    
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
