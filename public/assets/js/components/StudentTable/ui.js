// UI 控制模組：負責處理 Modal 的顯示與隱藏、表單填充等
export function showModal(studentData = null) {
    const modal = document.getElementById('student-modal');
    const form = document.getElementById('student-form');
    const title = document.getElementById('student-modal-title');
    
    if (modal && form) {
        form.reset();
        if (studentData) {
            title.textContent = '編輯學生';
            document.getElementById('student-id').value = studentData.id;
            document.getElementById('student-number').value = studentData.number;
            document.getElementById('student-name').value = studentData.name;
            document.getElementById('student-dept').value = studentData.department;
            document.getElementById('student-company').value = studentData.company || '';
            document.getElementById('student-status').value = studentData.status;
        } else {
            title.textContent = '新增學生';
            document.getElementById('student-id').value = '';
        }
        modal.classList.remove('hidden');
    }
}

export function hideModal() {
    const modal = document.getElementById('student-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
