/**
 * 實習紀錄模組 - UI 彈窗控制與自訂通知系統 (UI.js)
 */

import { state } from './state.js';

export function openFormModal(isEdit = false) {
    document.getElementById('main-view')?.style.setProperty('display', 'none');
    document.getElementById('data-modal')?.classList.add('open');
    const title = document.getElementById('modal-title');
    if (title) title.innerText = isEdit ? '編輯實習紀錄' : '新增實習紀錄';
}

export function closeFormModal() {
    document.getElementById('data-modal')?.classList.remove('open');
    document.getElementById('main-view')?.style.setProperty('display', 'flex');
    state.editingId = null;
}

export function openInfoPopup(htmlContent, titleText) {
    const title = document.getElementById('info-popup-title');
    const body = document.getElementById('info-popup-body');
    if (title) title.innerHTML = titleText;
    if (body) body.innerHTML = htmlContent;
    document.getElementById('info-popup')?.classList.add('open');
}

export function closeInfoPopup() {
    document.getElementById('info-popup')?.classList.remove('open');
}

export function openImportReportModal() {
    document.getElementById('import-report-modal')?.classList.add('open');
}

export function closeImportReportModal() {
    document.getElementById('import-report-modal')?.classList.remove('open');
}

export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    let bg = 'var(--brand)';
    let color = 'white';
    let icon = 'ti-info-circle';

    if (type === 'error') {
        bg = 'var(--danger-bg)';
        color = 'var(--danger)';
        icon = 'ti-alert-circle';
    } else if (type === 'success') {
        bg = 'var(--success-bg)';
        color = 'var(--success)';
        icon = 'ti-circle-check';
    } else if (type === 'warning') {
        bg = 'var(--warning-bg)';
        color = 'var(--warning)';
        icon = 'ti-alert-triangle';
    }

    toast.style.cssText = `
        background: ${bg}; color: ${color}; border: 1px solid currentColor;
        padding: 12px 20px; border-radius: var(--radius); box-shadow: var(--shadow-md);
        font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;
        min-width: 280px; pointer-events: auto; animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transition: opacity 0.3s;
    `;

    toast.innerHTML = `<i class="ti ${icon}" style="font-size: 18px;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

export function showConfirm(message, onConfirm) {
    let confirmModal = document.getElementById('custom-confirm-modal');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'custom-confirm-modal';
        confirmModal.className = 'info-modal-overlay';
        confirmModal.style.zIndex = '1000';
        document.body.appendChild(confirmModal);
    }

    confirmModal.innerHTML = `
        <div class="info-modal-box" style="max-width: 360px;">
            <div class="info-modal-header" style="background: var(--danger-bg); border-bottom-color: var(--danger-border);">
                <h4 style="font-weight: 700; font-size: 14px; margin: 0; color: var(--danger);">
                    <i class="ti ti-alert-triangle" style="margin-right: 4px;"></i> 確認操作
                </h4>
                <button class="btn btn-icon sm btn-close-confirm" style="background:transparent; color: var(--text-muted);"><i class="ti ti-x"></i></button>
            </div>
            <div class="info-modal-body" style="padding: 20px; font-size: 13px; line-height: 1.5; color: var(--text-secondary);">
                ${message}
            </div>
            <div style="padding: 12px 20px; border-top: 1px solid var(--border); text-align: right; background: var(--bg); display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn btn-secondary btn-sm btn-cancel-confirm">取消</button>
                <button class="btn btn-danger btn-sm" id="confirm-modal-yes">確認執行</button>
            </div>
        </div>
    `;

    confirmModal.classList.add('open');

    const closeFn = () => confirmModal.classList.remove('open');
    confirmModal.querySelector('.btn-close-confirm').onclick = closeFn;
    confirmModal.querySelector('.btn-cancel-confirm').onclick = closeFn;
    confirmModal.querySelector('#confirm-modal-yes').onclick = () => { closeFn(); onConfirm(); };
}
