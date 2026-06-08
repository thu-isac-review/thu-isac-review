// 渲染模組：負責將狀態反映到 DOM 上
import { state } from './state.js';

export function renderTable() {
    const tbody = document.getElementById('student-table-body');
    if (!tbody) return;

    if (state.students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${state.isManageMode ? 6 : 5}" style="text-align: center;">目前沒有符合的資料</td></tr>`;
        return;
    }

    tbody.innerHTML = state.students.map(student => `
        <tr>
            <td>${student.number}</td>
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.company || '-'}</td>
            <td>${renderStatusBadge(student.status)}</td>
            ${state.isManageMode ? `
            <td class="action-column">
                <button class="btn btn-edit" data-id="${student.id}">編輯</button>
                <button class="btn btn-delete" data-id="${student.id}">刪除</button>
            </td>` : ''}
        </tr>
    `).join('');
}

function renderStatusBadge(status) {
    const statusMap = {
        'pending': { text: '審核中', className: 'status-pending' },
        'active': { text: '實習中', className: 'status-active' },
        'completed': { text: '已結案', className: 'status-completed' }
    };
    const info = statusMap[status] || { text: '未知', className: '' };
    return `<span class="status-badge ${info.className}">${info.text}</span>`;
}

export function updateUIPermissions() {
    const btnAdd = document.getElementById('btn-add-student');
    const actionHeaders = document.querySelectorAll('.action-column');
    
    if (state.isManageMode) {
        if(btnAdd) btnAdd.style.display = 'inline-block';
        actionHeaders.forEach(el => el.style.display = 'table-cell');
    } else {
        if(btnAdd) btnAdd.style.display = 'none';
        actionHeaders.forEach(el => el.style.display = 'none');
    }
}
