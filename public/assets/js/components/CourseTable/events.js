// public/assets/js/components/CourseTable/events.js
import { state, updateState } from './state.js';
import { renderTable } from './render.js';
import { saveCourse, deleteCourse } from './data.js';
import { openModal, closeModal } from './ui.js';

let dbInstance = null; // 儲存 db 參考以便事件處理使用

export function initEvents(db) {
    dbInstance = db;
    setupFilters();
    setupSearch();
    
    if (state.role === 'intern_manage') {
        setupModalEvents();
        setupTableActions();
    }
}

// 根據 allCourses 建立過濾器的選項
export function updateFilters() {
    const academicYears = new Set();
    const departments = new Set();

    state.allCourses.forEach(course => {
        if (course.academic_year) academicYears.add(course.academic_year);
        if (course.department) departments.add(course.department);
    });

    const academicYearSelect = document.getElementById('academicYearFilter');
    const departmentSelect = document.getElementById('departmentFilter');

    if (academicYearSelect) {
        // 保留 'all' 選項
        academicYearSelect.innerHTML = '<option value="all">所有學年度</option>';
        [...academicYears].sort().reverse().forEach(year => {
            academicYearSelect.innerHTML += `<option value="${year}">${year}</option>`;
        });
        academicYearSelect.value = state.academicYearFilter;
    }

    if (departmentSelect) {
        // 保留 'all' 選項
        departmentSelect.innerHTML = '<option value="all">所有系所</option>';
        [...departments].sort().forEach(dept => {
            departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        });
        departmentSelect.value = state.departmentFilter;
    }
}

function setupFilters() {
    const academicYearSelect = document.getElementById('academicYearFilter');
    const departmentSelect = document.getElementById('departmentFilter');

    if (academicYearSelect) {
        academicYearSelect.addEventListener('change', (e) => {
            updateState({ academicYearFilter: e.target.value });
            filterData();
        });
    }

    if (departmentSelect) {
        departmentSelect.addEventListener('change', (e) => {
            updateState({ departmentFilter: e.target.value });
            filterData();
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            updateState({ searchQuery: e.target.value.toLowerCase() });
            filterData();
        });
    }
}

function filterData() {
    let filtered = state.allCourses;

    if (state.academicYearFilter !== 'all') {
        filtered = filtered.filter(course => course.academic_year === state.academicYearFilter);
    }

    if (state.departmentFilter !== 'all') {
        filtered = filtered.filter(course => course.department === state.departmentFilter);
    }

    if (state.searchQuery) {
        filtered = filtered.filter(course => 
            (course.course_name && course.course_name.toLowerCase().includes(state.searchQuery)) ||
            (course.department && course.department.toLowerCase().includes(state.searchQuery)) ||
            (course.description && course.description.toLowerCase().includes(state.searchQuery)) ||
            (course.academic_year && course.academic_year.toLowerCase().includes(state.searchQuery))
        );
    }

    updateState({ filteredCourses: filtered });
    renderTable();
}

function setupModalEvents() {
    const btnAdd = document.getElementById('btnAddCourse');
    const btnCancel = document.getElementById('btnCancel');
    const form = document.getElementById('courseForm');
    const closeBtn = document.querySelector('.close'); // Modal 的 X 按鈕

    if (btnAdd) {
        btnAdd.addEventListener('click', () => openModal(false));
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', closeModal);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // 點擊 Modal 外部關閉
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('courseModal');
        if (event.target == modal) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const courseId = document.getElementById('courseId').value;
            const data = {
                academic_year: document.getElementById('academicYear').value,
                department: document.getElementById('department').value,
                course_name: document.getElementById('courseName').value,
                course_type: document.getElementById('courseType').value,
                credits: document.getElementById('credits').value,
                duration: document.getElementById('duration').value,
                description: document.getElementById('description').value,
                requirements: document.getElementById('requirements').value,
                assessments: document.getElementById('assessments').value,
                credits_granting_unit: document.getElementById('creditsUnit').value,
                notes: document.getElementById('notes').value
            };

            const success = await saveCourse(dbInstance, courseId, data);
            if (success) {
                closeModal();
            }
        });
    }
}

function setupTableActions() {
    const tableBody = document.getElementById('courseTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target;
            if (btn.classList.contains('btn-edit')) {
                const id = btn.getAttribute('data-id');
                const course = state.allCourses.find(c => c.id === id);
                if (course) {
                    openModal(true, course);
                }
            } else if (btn.classList.contains('btn-delete')) {
                const id = btn.getAttribute('data-id');
                if (confirm('確定要刪除這筆實習課程嗎？此動作無法復原。')) {
                    deleteCourse(dbInstance, id);
                }
            }
        });
    }
}
