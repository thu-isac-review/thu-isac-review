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
        ui.tableBody.innerHTML = `<tr><td colspan="${isManage ? 9 : 8}" class="text-center text-muted py-4" style="text-align:center;">沒有找到相關資料</td></tr>`;
        renderPagination();
        updateSelectionUI();
        return;
    }

    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const pageData = state.filteredData.slice(start, end);

    pageData.forEach(item => {
        const tr = document.createElement('tr');
        
        let checkboxTd = '';
        if (isManage) {
            checkboxTd = `<td width="40"><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${state.selectedIds.has(item.id) ? 'checked' : ''}></td>`;
        }

        let actionTd = '';
        if (isManage) {
            actionTd = `
                <td class="col-actions" width="120">
                    <button class="btn btn-icon btn-edit" data-id="${item.id}" title="編輯"><i class="ti ti-edit"></i></button>
                    <button class="btn btn-icon btn-delete text-danger" data-id="${item.id}" title="刪除"><i class="ti ti-trash"></i></button>
                </td>
            `;
        }

        tr.innerHTML = `
            ${checkboxTd}
            <td class="fw-medium">${item.student_id || ''}</td>
            <td>${item.name || ''}</td>
            <td>${item.gender || ''}</td>
            <td>${item.nationality || ''}</td>
            <td>${item.college || ''}</td>
            <td>${item.department || ''}</td>
            <td width="100"><span class="badge" style="background:var(--bg);color:var(--text-secondary);border:1px solid var(--border-strong);padding:4px 8px;border-radius:4px;">未設定</span></td>
            ${actionTd}
        `;
        ui.tableBody.appendChild(tr);
    });

    renderPagination();
    updateSelectionUI();
};

export const renderPagination = () => {
    if (!ui.pagination) return;
    
    const totalPages = Math.ceil(state.filteredData.length / state.itemsPerPage);
    ui.pagination.innerHTML = '';

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `btn btn-outline ${i === state.currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.style.margin = '0 4px';
        if (i === state.currentPage) {
            btn.style.background = 'var(--brand, #1a56db)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--brand, #1a56db)';
        }
        btn.onclick = () => {
            state.currentPage = i;
            renderTable();
        };
        ui.pagination.appendChild(btn);
    }
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
