/**
 * 個人資料頁面 (Profile) 核心邏輯
 */

const ProfileState = {
    isEditing: false,
    isSaving: false,
    userData: {
        id: '',
        name: '',
        email: '',
        department: '',
        role: '',
        created_at: '',
        last_login: ''
    },
    // 用於取消編輯時還原資料
    originalData: {}
};

const ProfileUI = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadUserData();
    },

    cacheDOM() {
        this.form = document.getElementById('profile-form');
        this.displayAreas = document.querySelectorAll('.profile-display-text');
        this.inputAreas = document.querySelectorAll('.profile-input-field');
        
        // 按鈕區塊 (這裡的動態樣式皆採用純色、無漸層、無發光陰影的設定)
        this.btnEdit = document.getElementById('btn-edit-profile');
        this.btnSave = document.getElementById('btn-save-profile');
        this.btnCancel = document.getElementById('btn-cancel-profile');
        
        // 欄位 DOM
        this.fields = {
            name: {
                display: document.getElementById('display-name'),
                input: document.getElementById('input-name')
            },
            email: {
                display: document.getElementById('display-email'),
                input: document.getElementById('input-email')
            },
            department: {
                display: document.getElementById('display-department'),
                input: document.getElementById('input-department')
            },
            role: { display: document.getElementById('display-role') },
            created_at: { display: document.getElementById('display-created-at') },
            last_login: { display: document.getElementById('display-last-login') }
        };
    },

    bindEvents() {
        if (this.btnEdit) {
            this.btnEdit.addEventListener('click', () => this.toggleEditMode(true));
        }
        if (this.btnCancel) {
            this.btnCancel.addEventListener('click', () => {
                this.restoreOriginalData();
                this.toggleEditMode(false);
            });
        }
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSave(e));
        }
    },

    async loadUserData() {
        try {
            this.showLoading(true);
            
            // 模擬 API 或 Firebase 資料獲取 (請依據實際後端邏輯替換)
            const mockResponse = await this.fetchMockData();
            
            ProfileState.userData = { ...mockResponse };
            ProfileState.originalData = { ...mockResponse };
            
            this.render();
        } catch (error) {
            console.error('無法載入使用者資料:', error);
            this.showNotification('資料載入失敗，請稍後再試', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    render() {
        const data = ProfileState.userData;

        // 渲染純文字顯示區
        if (this.fields.name.display) this.fields.name.display.textContent = data.name || '-';
        if (this.fields.email.display) this.fields.email.display.textContent = data.email || '-';
        if (this.fields.department.display) this.fields.department.display.textContent = data.department || '-';
        if (this.fields.role.display) this.fields.role.display.textContent = data.role || '-';
        
        // 渲染日期 (固定統一格式：YYYY/MM/DD)
        if (this.fields.created_at.display) {
            this.fields.created_at.display.textContent = this.formatDate(data.created_at);
        }
        if (this.fields.last_login.display) {
            this.fields.last_login.display.textContent = this.formatDate(data.last_login);
        }

        // 渲染輸入框初始值
        if (this.fields.name.input) this.fields.name.input.value = data.name || '';
        if (this.fields.email.input) this.fields.email.input.value = data.email || '';
        if (this.fields.department.input) this.fields.department.input.value = data.department || '';
    },

    toggleEditMode(enable) {
        ProfileState.isEditing = enable;

        if (enable) {
            this.displayAreas.forEach(el => el.style.display = 'none');
            this.inputAreas.forEach(el => el.style.display = 'block');
            if (this.btnEdit) this.btnEdit.style.display = 'none';
            if (this.btnSave) this.btnSave.style.display = 'inline-flex';
            if (this.btnCancel) this.btnCancel.style.display = 'inline-flex';
            
            // 自動聚焦第一個輸入框
            if (this.fields.name.input) this.fields.name.input.focus();
        } else {
            this.displayAreas.forEach(el => el.style.display = 'block');
            this.inputAreas.forEach(el => el.style.display = 'none');
            if (this.btnEdit) this.btnEdit.style.display = 'inline-flex';
            if (this.btnSave) this.btnSave.style.display = 'none';
            if (this.btnCancel) this.btnCancel.style.display = 'none';
        }
    },

    restoreOriginalData() {
        ProfileState.userData = { ...ProfileState.originalData };
        this.render();
    },

    async handleSave(e) {
        e.preventDefault();
        if (ProfileState.isSaving) return;

        // 收集表單資料
        const updatedData = {
            name: this.fields.name.input.value.trim(),
            email: this.fields.email.input.value.trim(),
            department: this.fields.department.input.value.trim()
        };

        // 簡單驗證
        if (!updatedData.name || !updatedData.email) {
            this.showNotification('姓名與信箱為必填欄位', 'error');
            return;
        }

        try {
            ProfileState.isSaving = true;
            this.setButtonLoadingState(this.btnSave, true);

            // 模擬儲存 API 呼叫
            await new Promise(resolve => setTimeout(resolve, 800));

            // 更新本機狀態
            ProfileState.userData = { ...ProfileState.userData, ...updatedData };
            ProfileState.originalData = { ...ProfileState.userData };
            
            this.render();
            this.toggleEditMode(false);
            this.showNotification('個人資料更新成功', 'success');

        } catch (error) {
            console.error('儲存失敗:', error);
            this.showNotification('儲存失敗，請檢查網路連線', 'error');
        } finally {
            ProfileState.isSaving = false;
            this.setButtonLoadingState(this.btnSave, false);
        }
    },

    // 格式化日期：嚴格回傳 YYYY/MM/DD
    formatDate(dateString) {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}/${month}/${day}`;
    },

    setButtonLoadingState(button, isLoading) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `<i class="ti ti-loader ti-spin"></i> 儲存中...`;
            button.disabled = true;
            button.style.opacity = '0.7';
        } else {
            button.innerHTML = button.dataset.originalText || '儲存設定';
            button.disabled = false;
            button.style.opacity = '1';
        }
    },

    showNotification(message, type = 'success') {
        // 沿用專案既有的 Toast 通知設計，無漸層或多餘的發光效果
        const toast = document.createElement('div');
        toast.className = `fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all duration-300 transform translate-y-5 opacity-0`;
        
        if (type === 'success') {
            toast.className += ' bg-emerald-50 text-emerald-800 border-emerald-200';
            toast.innerHTML = `<i class="ti ti-circle-check text-emerald-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
        } else if (type === 'error') {
            toast.className += ' bg-rose-50 text-rose-800 border-rose-200';
            toast.innerHTML = `<i class="ti ti-alert-circle text-rose-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
        }
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-5', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });
        
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-5', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showLoading(show) {
        // 全局載入狀態控制
        const loader = document.getElementById('profile-loader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    },

    // 模擬假資料
    async fetchMockData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: 'U1001',
                    name: '王小明',
                    email: 'ming@thu.edu.tw',
                    department: '資訊中心',
                    role: '系統管理員',
                    created_at: '2025-09-01T08:30:00Z',
                    last_login: new Date().toISOString()
                });
            }, 500);
        });
    }
};

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    ProfileUI.init();
});
