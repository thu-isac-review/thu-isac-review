// 渲染單筆課程列
export function renderTableRow(data, isChecked, colDispName, deptDispName) {
    return `
    <tr class="${isChecked ? 'selected' : ''}">
        <td class="col-checkbox" style="text-align: center;">
            <div style="display:flex; justify-content:center; align-items:center;">
                <input type="checkbox" value="${data.id}" onchange="toggleSelect('${data.id}')" ${isChecked ? 'checked' : ''} style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
            </div>
        </td>
        <td style="text-align: center;"><div class="cell-primary bold">${data.academic_year}</div></td>
        <td style="text-align: center;"><div class="cell-primary">${data.term}</div></td>
        <td style="text-align: center;"><div class="cell-primary">${data.edu_system}</div></td>
        <td style="text-align: center;"><div class="cell-primary">${colDispName}</div></td>
        <td style="text-align: center;"><div class="cell-primary">${deptDispName}</div></td>
        <td style="text-align: center;"><span class="pill-code">${data.course_code}</span></td>
        <td style="text-align: left;"><div class="cell-primary bold" title="${data.course_name}">${data.course_name}</div></td>
        <td style="text-align: center;"><div class="cell-primary">${data.course_type}</div></td>
        <td style="text-align: center;"><div class="cell-primary bold">${data.credits}</div></td>
        <td style="text-align: center;">
            <div class="row-actions">
                <button onclick="window.editData('${data.id}')" class="btn btn-secondary btn-icon sm" title="編輯"><i class="ti ti-edit"></i></button>
                <button onclick="window.deleteData('${data.id}', '${data.course_name}')" class="btn btn-icon sm" style="color:var(--danger); border-color:var(--danger-border);" title="刪除"><i class="ti ti-trash"></i></button>
            </div>
        </td>
    </tr>`;
}

// 渲染無資料或狀態提示
export function renderEmptyState(type) {
    if (type === 'loading') {
        return `<tr><td colspan="11" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i><div class="empty-text">資料載入中...</div></td></tr>`;
    }
    if (type === 'error') {
        return `<tr><td colspan="11" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger); opacity:1;"></i><div class="empty-text">資料讀取失敗，權限不足。</div></td></tr>`;
    }
    if (type === 'unauth') {
        return `<tr><td colspan="11" class="empty-state"><i class="ti ti-shield-half empty-icon"></i><div class="empty-text">請先登入系統以存取資料。</div></td></tr>`;
    }
    return `<tr><td colspan="11" class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-text">找不到符合條件的課程。</div></td></tr>`;
}
