// public/assets/js/components/CourseTable/render.js
import { state } from './state.js';

export function renderTable() {
    const tableBody = document.getElementById('courseTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    // 如果沒有資料，顯示提示訊息
    if (state.filteredCourses.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${state.role === 'intern_manage' ? '12' : '11'}" style="text-align: center; padding: 20px;">找不到符合條件的課程資料</td>`;
        tableBody.appendChild(tr);
        return;
    }

    state.filteredCourses.forEach(course => {
        const tr = document.createElement('tr');
        
        // 處理多行文字顯示 (將換行符號轉為 <br>)
        const displayDescription = course.description ? course.description.replace(/\n/g, '<br>') : '';
        const displayRequirements = course.requirements ? course.requirements.replace(/\n/g, '<br>') : '';
        const displayAssessments = course.assessments ? course.assessments.replace(/\n/g, '<br>') : '';
        const displayNotes = course.notes ? course.notes.replace(/\n/g, '<br>') : '';

        // 決定是否顯示操作欄 (管理模式)
        const actionColumn = state.role === 'intern_manage' ? `
            <td class="action-buttons">
                <button class="btn btn-edit" data-id="${course.id}">編輯</button>
                <button class="btn btn-delete" data-id="${course.id}">刪除</button>
            </td>
        ` : '';

        tr.innerHTML = `
            <td>${course.academic_year || ''}</td>
            <td>${course.department || ''}</td>
            <td>${course.course_name || ''}</td>
            <td>${course.course_type || ''}</td>
            <td>${course.credits || ''}</td>
            <td>${course.duration || ''}</td>
            <td>${displayDescription}</td>
            <td>${displayRequirements}</td>
            <td>${displayAssessments}</td>
            <td>${course.credits_granting_unit || ''}</td>
            <td>${displayNotes}</td>
            ${actionColumn}
        `;
        tableBody.appendChild(tr);
    });
}
