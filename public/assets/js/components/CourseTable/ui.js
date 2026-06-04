// public/assets/js/components/CourseTable/ui.js
export function openModal(isEdit = false, courseData = null) {
    const modal = document.getElementById('courseModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('courseForm');
    
    if (!modal || !title || !form) return;

    title.textContent = isEdit ? '編輯實習課程' : '新增實習課程';
    form.reset();
    document.getElementById('courseId').value = '';

    if (isEdit && courseData) {
        document.getElementById('courseId').value = courseData.id;
        document.getElementById('academicYear').value = courseData.academic_year || '';
        document.getElementById('department').value = courseData.department || '';
        document.getElementById('courseName').value = courseData.course_name || '';
        document.getElementById('courseType').value = courseData.course_type || '必修'; // 預設必修
        document.getElementById('credits').value = courseData.credits || '';
        document.getElementById('duration').value = courseData.duration || '';
        document.getElementById('description').value = courseData.description || '';
        document.getElementById('requirements').value = courseData.requirements || '';
        document.getElementById('assessments').value = courseData.assessments || '';
        document.getElementById('creditsUnit').value = courseData.credits_granting_unit || '';
        document.getElementById('notes').value = courseData.notes || '';
    }

    modal.style.display = 'block';
}

export function closeModal() {
    const modal = document.getElementById('courseModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
