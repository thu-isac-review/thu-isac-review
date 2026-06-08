// 事件綁定模組：負責綁定所有 DOM 事件
import { state } from './state.js';
import { loadAndRenderStudents, handleSaveStudent, handleDeleteStudent } from './main.js';
import { showModal, hideModal } from './ui.js';

export function bindEvents() {
    // 搜尋與篩選
    const searchInput = document.getElementById('student-search-input');
    const statusFilter = document.getElementById('student-status-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.filters.keyword = e.target.value.trim();
            loadAndRenderStudents();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            loadAndRenderStudents();
        });
    }

    // 管理員專屬操作
    if (state.isManageMode) {
        const btnAdd = document.getElementById('btn-add-student');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => showModal());
        }

        // Modal 操作
        document.getElementById('btn-close-student-modal')?.addEventListener('click', hideModal);
        document.getElementById('btn-cancel-student-modal')?.addEventListener('click', hideModal);

        const form = document.getElementById('student-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                handleSaveStudent(data);
            });
        }

        // 表格內編輯/刪除按鈕 (事件委派)
        const tbody = document.getElementById('student-table-body');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const target = e.target;
                const id = target.getAttribute('data-id');
                
                if (!id) return;

                if (target.classList.contains('btn-edit')) {
                    const student = state.students.find(s => s.id === id);
                    if (student) showModal(student);
                } else if (target.classList.contains('btn-delete')) {
                    if (confirm('確定要刪除這筆學生資料嗎？')) {
                        handleDeleteStudent(id);
                    }
                }
            });
        }
    }
}
