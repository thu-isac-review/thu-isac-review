export const ui = {
    tableBody: null,
    pagination: null,
    searchInput: null,
    selectAllCheckbox: null,
    btnBatchDelete: null,
    selectedCountDisplay: null,
    modal: null,
    modalTitle: null,
    form: null,
    btnCancel: null,
    modalClose: null,
    btnAdd: null,
    btnExport: null,
    importCsv: null,
    btnImport: null,
    // 表單欄位
    fStudentId: null,
    fName: null,
    fGender: null,
    fNationality: null,
    fCollege: null,
    fDepartment: null,

    init() {
        this.tableBody = document.getElementById('table-body');
        this.pagination = document.getElementById('pagination');
        this.searchInput = document.getElementById('search-input');
        this.selectAllCheckbox = document.getElementById('select-all');
        this.btnBatchDelete = document.getElementById('btn-batch-delete');
        this.selectedCountDisplay = document.getElementById('selected-count');
        this.modal = document.getElementById('form-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.form = document.getElementById('data-form');
        this.btnCancel = document.getElementById('btn-cancel');
        this.modalClose = document.getElementById('modal-close');
        this.btnAdd = document.getElementById('btn-add');
        this.btnExport = document.getElementById('btn-export');
        this.importCsv = document.getElementById('import-csv');
        this.btnImport = document.getElementById('btn-import');

        this.fStudentId = document.getElementById('f-student-id');
        this.fName = document.getElementById('f-name');
        this.fGender = document.getElementById('f-gender');
        this.fNationality = document.getElementById('f-nationality');
        this.fCollege = document.getElementById('f-college');
        this.fDepartment = document.getElementById('f-department');
    },

    openModal(isEdit = false) {
        if(this.modalTitle) {
            this.modalTitle.textContent = isEdit ? '編輯學生資料' : '新增學生';
        }
        if(this.modal) {
            this.modal.classList.add('show');
            this.modal.style.display = 'flex';
        }
    },

    closeModal() {
        if(this.modal) {
            this.modal.classList.remove('show');
            this.modal.style.display = 'none';
        }
        if(this.form) this.form.reset();
    },

    setLoading(buttonId, isLoading, originalHtml) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        if (isLoading) {
            btn.innerHTML = `<i class="ti ti-loader" style="animation: spin 1s linear infinite;"></i> 處理中...`;
            btn.disabled = true;
        } else {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
};
