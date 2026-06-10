/**
 * 個人資料頁面 (Profile) 核心邏輯 - 零 HTML 依賴版
 * * 使用方式：
 * 1. 在主頁面引入此檔案：<script type="module" src="assets/js/pages/profile.js"></script>
 * 2. 確保畫面中有容器：<div id="profile-container"></div>
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
    originalData: {}
};

const ProfileUI = {
    async init(containerId = 'profile-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`Profile container #${containerId} not found.`);
            return;
        }

        // 1. 動態建構 DOM 結構與專屬樣式
        this.renderSkeleton();
        
        // 2. 緩存 DOM 節點
        this.cacheDOM();
        
        // 3. 綁定事件
        this.bindEvents();

        // 4. 載入資料
        await this.loadUserData();
    },

    renderSkeleton() {
        // 注入確保樣式乾淨的 CSS（移除發光、螢光漸層效果，維持扁平實體色塊）
        const styleId = 'profile-clean-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                #profile-page-wrapper .btn {
                    box-shadow: none !important;
                    background-image: none !important;
                    text-shadow: none !important;
                }
                #profile-page-wrapper .field-input:focus {
                    box-shadow: none !important;
                    border-color: var(--brand, #475569);
                }
                .profile-toast {
                    box-shadow: none !important;
                    border: 1px solid var(--border-strong, #cbd5e1);
                }
            `;
            document.head.appendChild(style);
        }

        // 產生完整 HTML 結構
        this.container.innerHTML = `
            <div id="profile-page-wrapper" style="font-family: 'Noto Sans TC', sans-serif; flex: 1; display: flex; flex-direction: column; background: var(--bg, #f8fafc); min-height: 100vh;">
                <div class="toolbar" style="padding: 16px 24px; background: var(--surface, #ffffff); border-bottom: 1px solid var(--border, #e2e8f0); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary, #1e293b); margin: 0;">個人資料設定</h2>
                    <div class="toolbar-actions" style="display: flex; gap: 8px;">
                        <button type="button" id="btn-edit-profile" class="btn btn-secondary">
                            <i class="ti ti-edit"></i> 編輯資料
                        </button>
                        <button type="button" id="btn-cancel-profile" class="btn btn-secondary" style="display: none;">
                            取消
                        </button>
                        <button type="submit" form="profile-form" id="btn-save-profile" class="btn btn-primary" style="display: none;">
                            儲存變更
                        </button>
                    </div>
                </div>

                <div style="padding: 24px; max-width: 800px; width: 100%; margin: 0 auto;">
                    <div style="background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 32px;">
                        <form id="profile-form">
                            <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                                
                                <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label class="field-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase;">姓名</label>
                                    <div id="display-name" class="profile-display-text cell-primary bold" style="font-size: 14px; min-height: 36px; display: flex; align-items: center; color: #000;"></div>
                                    <input type="text" id="input-name" class="profile-input-field field-input" style="display: none; width: 100%; height: 36px; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 0 12px; font-size: 13px; outline: none; background: #ffffff;" required />
                                </div>

                                <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label class="field-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase;">聯絡信箱</label>
                                    <div id="display-email" class="profile-display-text cell-primary" style="font-size: 14px; min-height: 36px; display: flex; align-items: center;"></div>
                                    <input type="email" id="input-email" class="profile-input-field field-input" style="display: none; width: 100%; height: 36px; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 0 12px; font-size: 13px; outline: none; background: #ffffff;" required />
                                </div>

                                <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label class="field-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase;">所屬單位</label>
                                    <div id="display-department" class="profile-display-text cell-primary" style="font-size: 14px; min-height: 36px; display: flex; align-items: center;"></div>
                                    <input type="text" id="input-department" class="profile-input-field field-input" style="display: none; width: 100%; height: 36px; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 0 12px; font-size: 13px; outline: none; background: #ffffff;" />
                                </div>

                                <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label class="field-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase;">系統角色</label>
                                    <div id="display-role" class="cell-primary" style="font-size: 14px; min-height: 36px; display: flex; align-items: center; color: var(--text-secondary, #475569);"></div>
                                </div>

                                <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label class="field-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase;">帳號建立時間</label>
                                    <div id="display-created-at" class="cell-primary" style="font-size: 14px; min-height: 36px; display: flex; align-items: center; color: var(--text-secondary, #475569);"></div>
                                </div>

                                <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
                                    <label class="field-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase;">最後登入時間</label>
                                    <div id="display-last-login" class="cell-primary" style="font-size: 14px; min-height: 36px; display: flex; align-items: center; color: var(--text-secondary, #475569);"></div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    cacheDOM() {
        this.form = document.getElementById('profile-form');
        this.displayAreas = document.querySelectorAll('.profile-display-text');
        this.inputAreas = document.querySelectorAll('.profile-input-field');
        
        this.btnEdit = document.getElementById('btn-edit-profile');
        this.btnSave = document.getElementById('btn-save-profile');
        this.btnCancel = document.getElementById('btn-cancel-profile');
        
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
        this.btnEdit?.addEventListener('click', () => this.toggleEditMode(true));
        this.btnCancel?.addEventListener('click', () => {
            this.restoreOriginalData();
            this.toggleEditMode(false);
        });
        this.form?.addEventListener('submit', (e) => this.handleSave(e));
    },

    async loadUserData() {
        try {
            // 模擬 API 延遲
            const mockResponse = await new Promise(resolve => setTimeout(() => resolve({
                id: 'U001',
                name: '系統管理員',
                email: 'admin@example.com',
                department: '資訊中心',
                role: 'Administrator',
                created_at: '2025-01-15T09:00:00Z',
                last_login: new Date().toISOString()
            }), 300));
            
            ProfileState.userData = { ...mockResponse };
            ProfileState.originalData = { ...mockResponse };
            
            this.render();
        } catch (error) {
            console.error('Data loading error:', error);
            this.showNotification('資料載入失敗', 'error');
        }
    },

    render() {
        const data = ProfileState.userData;

        // 更新文字區塊
        if (this.fields.name.display) this.fields.name.display.textContent = data.name || '-';
        if (this.fields.email.display) this.fields.email.display.textContent = data.email || '-';
        if (this.fields.department.display) this.fields.department.display.textContent = data.department || '-';
        if (this.fields.role.display) this.fields.role.display.textContent = data.role || '-';
        
        // 日期嚴格套用 YYYY/MM/DD 格式
        if (this.fields.created_at.display) {
            this.fields.created_at.display.textContent = this.formatDate(data.created_at);
        }
        if (this.fields.last_login.display) {
            this.fields.last_login.display.textContent = this.formatDate(data.last_login);
        }

        // 更新輸入框初始值
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
            
            this.fields.name.input?.focus();
        } else {
            this.displayAreas.forEach(el => el.style.display = 'flex');
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

        const updatedData = {
            name: this.fields.name.input.value.trim(),
            email: this.fields.email.input.value.trim(),
            department: this.fields.department.input.value.trim()
        };

        if (!updatedData.name || !updatedData.email) {
            this.showNotification('姓名與信箱不可為空', 'error');
            return;
        }

        try {
            ProfileState.isSaving = true;
            this.setButtonLoadingState(this.btnSave, true);

            // 模擬儲存 API 延遲
            await new Promise(resolve => setTimeout(resolve, 600));

            ProfileState.userData = { ...ProfileState.userData, ...updatedData };
            ProfileState.originalData = { ...ProfileState.userData };
            
            this.render();
            this.toggleEditMode(false);
            this.showNotification('資料已成功更新', 'success');

        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('儲存失敗，請檢查網路狀態', 'error');
        } finally {
            ProfileState.isSaving = false;
            this.setButtonLoadingState(this.btnSave, false);
        }
    },

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
            button.innerHTML = button.dataset.originalText || '儲存變更';
            button.disabled = false;
            button.style.opacity = '1';
        }
    },

    showNotification(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `profile-toast fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl transition-all duration-300 transform translate-y-5 opacity-0`;
        
        if (type === 'success') {
            toast.style.backgroundColor = '#ecfdf5';
            toast.style.color = '#065f46';
            toast.innerHTML = `<i class="ti ti-circle-check" style="color: #10b981; font-size: 18px;"></i><span style="font-weight: 600; font-size: 14px;">${message}</span>`;
        } else {
            toast.style.backgroundColor = '#fff1f2';
            toast.style.color = '#9f1239';
            toast.innerHTML = `<i class="ti ti-alert-circle" style="color: #f43f5e; font-size: 18px;"></i><span style="font-weight: 600; font-size: 14px;">${message}</span>`;
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
    }
};

// 頁面載入後自動掛載
document.addEventListener('DOMContentLoaded', () => {
    // 您可以將 'profile-container' 替換為實際使用的 div ID
    ProfileUI.init('profile-container');
});
