import { state } from './state.js';
import { ui } from './ui.js';

export const renderTable = () => {
    if (!ui.tableBody) return;
    
    ui.tableBody.innerHTML = '';
    const searchTerm = ui.searchInput ? ui.searchInput.value.toLowerCase() : '';
    
    state.filteredData = state.allData.filter(item => 
        (item.student_id || '').toLowerCase().includes(searchTerm) ||
        (item.name || '').toLowerCase().includes(searchTerm) ||
        (item.department || '').toLowerCase().includes(searchTerm)
    );

    const isManage = state.viewMode === 'manage';

    if (state.filteredData.length === 0) {
        ui.tableBody.innerHTML = `<tr><td colspan="${isManage ? 9 : 8}" class="text-center text-gray-500 py-8">沒有找到相關資料</td></tr>`;
        renderPagination();
        updateSelectionUI();
        return;
    }

    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const pageData = state.filteredData.slice(start, end);

    pageData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors group';
        
        let checkboxTd = '';
        if (isManage) {
            checkboxTd = `<td class="px-4 py-3 text-center"><input type="checkbox" class="row-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-id="${item.id}" ${state.selectedIds.has(item.id) ? 'checked' : ''}></td>`;
        }

        let actionTd = '';
        if (isManage) {
            actionTd = `
                <td class="col-actions px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn-edit p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" data-id="${item.id}" title="編輯"><i class="ti ti-edit text-lg"></i></button>
                        <button class="btn-delete p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" data-id="${item.id}" title="刪除"><i class="ti ti-trash text-lg"></i></button>
                    </div>
                </td>
            `;
        }

        tr.innerHTML = `
            ${checkboxTd}
            <td class="px-4 py-3 font-medium text-gray-900">${item.student_id || ''}</td>
            <td class="px-4 py-3">${item.name || ''}</td>
            <td class="px-4 py-3">${item.gender || ''}</td>
            <td class="px-4 py-3 text-gray-500">${item.nationality || ''}</td>
            <td class="px-4 py-3 text-gray-500">${item.college || ''}</td>
            <td class="px-4 py-3 text-gray-500">${item.department || ''}</td>
            <td class="px-4 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">未設定</span></td>
            ${actionTd}
        `;
        ui.tableBody.appendChild(tr);
    });

    // Update page info
    const pageStartEl = document.getElementById('page-start');
    const pageEndEl = document.getElementById('page-end');
    const pageTotalEl = document.getElementById('page-total');
    
    if(pageStartEl) pageStartEl.textContent = state.filteredData.length > 0 ? start + 1 : 0;
    if(pageEndEl) pageEndEl.textContent = Math.min(end, state.filteredData.length);
    if(pageTotalEl) pageTotalEl.textContent = state.filteredData.length;

    renderPagination();
    updateSelectionUI();
};

export const renderPagination = () => {
    if (!ui.pagination) return;
    
    const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
    ui.pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `px-2 py-1 text-sm rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 transition-colors ${state.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`;
    prevBtn.innerHTML = '<i class="ti ti-chevron-left"></i>';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.onclick = () => {
        if(state.currentPage > 1) {
            state.currentPage--;
            renderTable();
        }
    };
    ui.pagination.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `px-3 py-1 text-sm rounded border transition-colors ${i === state.currentPage ? 'bg-blue-600 text-white border-blue-600 font-medium shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`;
        btn.textContent = i;
        btn.onclick = () => {
            state.currentPage = i;
            renderTable();
        };
        ui.pagination.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `px-2 py-1 text-sm rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 transition-colors ${state.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`;
    nextBtn.innerHTML = '<i class="ti ti-chevron-right"></i>';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.onclick = () => {
        if(state.currentPage < totalPages) {
            state.currentPage++;
            renderTable();
        }
    };
    ui.pagination.appendChild(nextBtn);
};

export const updateSelectionUI = () => {
    if (state.viewMode !== 'manage' || !ui.selectAllCheckbox || !ui.btnBatchDelete) return;

    const currentRows = Array.from(ui.tableBody.querySelectorAll('.row-checkbox'));
    const allChecked = currentRows.length > 0 && currentRows.every(cb => cb.checked);
    
    ui.selectAllCheckbox.checked = allChecked;
    state.isSelectAll = allChecked;

    if (state.selectedIds.size > 0) {
        ui.btnBatchDelete.style.display = 'inline-flex';
        if(ui.selectedCountDisplay) ui.selectedCountDisplay.textContent = state.selectedIds.size;
    } else {
        ui.btnBatchDelete.style.display = 'none';
    }
};
