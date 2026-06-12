import { state, Utils } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Data from './data.js';

export function bindEvents(container) {
    if (!container) return;

    // 🌟 [新增] 全域鍵盤快捷鍵綁定
    if (!state.isKeyboardShortcutBound) {
        document.addEventListener('keydown', (e) => {
            // [快捷鍵: ESC] 關閉最上層彈窗
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.dialog-overlay.open, .modal-overlay.open');
                if (openModals.length > 0) {
                    openModals[openModals.length - 1].classList.remove('open');
                }
            }

            // [快捷鍵: Ctrl + F 或 Cmd + F] 聚焦到搜尋框
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            // [快捷鍵: Ctrl + S 或 Cmd + S] 儲存當前開啟的彈窗表單
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                if (state.isReadOnly) return; // 唯讀模式阻擋儲存
                e.preventDefault();
                
                if (document.getElementById('change-intent-modal')?.classList.contains('open')) {
                    document.getElementById('btn-confirm-intent')?.click();
                } else if (document.getElementById('add-history-modal')?.classList.contains('open')) {
                    document.getElementById('btn-save-history')?.click();
                } else if (document.getElementById('batch-edit-modal')?.classList.contains('open')) {
                    document.getElementById('btn-batch-edit-submit')?.click();
                } else if (document.getElementById('merge-modal')?.classList.contains('open')) {
                    document.getElementById('btn-merge-submit')?.click();
                } else if (document.getElementById('batch-parent-modal')?.classList.contains('open')) {
                    document.getElementById('btn-confirm-batch-parent')?.click(); // 🌟 新增批次總公司快捷儲存
                } else if (document.getElementById('data-modal')?.classList.contains('open')) {
                    document.getElementById('btn-submit')?.click();
                }
            }
        });
        state.isKeyboardShortcutBound = true;
    }

    // ---------------- 1. 頂部工具列事件 ----------------
    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        if (state.filteredInstitutions.length === 0) { 
            showNotification("沒有資料可供匯出！", "error"); 
            return; 
        }
        let csv = '\uFEFF實習機構主名稱,隸屬主機構,統一編號,海外稅號,行業別,實習場所,實習場所國別,縣市別,實習場所地址,備註\n';
        
        if (state.isTreeMode) {
            state.filteredInstitutions.forEach(p => {
                csv += [ p.name, '', p.tax_id || '', p.overseas_tax_id || '', p.industry || '', p.venue_type || '', p.country, p.city || '', p.address, p.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
                p.children.forEach(c => { csv += [ c.name, p.name, c.tax_id || '', c.overseas_tax_id || '', c.industry || '', c.venue_type || '', c.country, c.city || '', c.address, c.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n'; });
            });
        } else {
            state.filteredInstitutions.forEach(d => {
                csv += [ d.name, '', d.tax_id || '', d.overseas_tax_id || '', d.industry || '', d.venue_type || '', d.country, d.city || '', d.address, d.remarks || '' ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + '\n';
            });
        }
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `實習機構清單_${new Date().toISOString().split('T')[0]}.csv`; link.click();
        showNotification("實習機構清單匯出成功！", "success");
    });
    
    container.querySelector('#btn-import-trigger')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        container.querySelector('#import-file')?.click();
    });
    
    container.querySelector('#import-file')?.addEventListener('change', async (e) => {
        if(state.isReadOnly) return;
        const file = e.target.files[0]; if (!file) return;
        const btn = document.getElementById('btn-import-trigger');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> <span class="btn-text">匯入中...</span>';
        btn.disabled = true;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const rows = event.target.result.split('\n').map(row => row.trim()).filter(row => row);
                let parsedRows = [];
                for (let i = 1; i < rows.length; i++) {
                    let cols = []; let inQuotes = false; let currentVal = '';
                    for (let char of rows[i]) {
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                        else currentVal += char;
                    }
                    cols.push(currentVal.trim());
                    if (cols.length >= 9) {
                        const payload = {
                            name: cols[0], tax_id: cols[1] || '', overseas_tax_id: cols[2] || '', industry: cols[3] || '', venue_type: cols[4] || '',
                            country: cols[5] || '中華民國', city: cols[6] || '', address: cols[7] || '', remarks: cols[8] || '', parent_id: '', history: []
                        };
                        if (payload.name) parsedRows.push(payload);
                    }
                }
                for (let payload of parsedRows) {
                    await Data.createInstitutionRaw(payload);
                }
                showNotification("✅ 成功批次匯入完成！", "success");
                await Data.fetchInitialDataOnce();
                UI.updateBatchActionBar(); UI.buildBaseTree(); Render.renderTable();
            } catch (error) { 
                showNotification("匯入失敗：" + error.message, "error"); 
            } 
            finally { btn.innerHTML = originalHtml; btn.disabled = false; e.target.value = ''; }
        };
        reader.readAsText(file);
    });

    container.querySelector('#btn-create-inst')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        state.editingId = null; state.editingOldData = null; state.currentHistory = [];
        document.getElementById('data-form')?.reset();
        if(document.getElementById('input-parent-id')) document.getElementById('input-parent-id').value = '';
        if(document.getElementById('parent-search-input')) document.getElementById('parent-search-input').value = '';
        if(document.getElementById('btn-clear-parent')) document.getElementById('btn-clear-parent').style.display = 'none';
        if(document.getElementById('modal-tabs')) document.getElementById('modal-tabs').style.display = 'none';
        document.getElementById('tab-btn-main')?.click();
        
        UI.populateParentDropdown();
        UI.handleCountryChange();
        const mt = document.getElementById('modal-title');
        if(mt) mt.innerHTML = '<i class="ti ti-building-skyscraper text-brand" style="font-size: 20px;"></i> 新增實習機構';
        document.getElementById('data-modal')?.classList.add('open');
    });
    
    container.querySelector('#search-input')?.addEventListener('input', () => { 
        clearTimeout(state.searchDebounceTimer);
        state.searchDebounceTimer = setTimeout(() => {
            state.currentPage = 1; state.isSearchAutoExpand = true; Render.renderTable(); 
        }, 250);
    });

    // ---------------- 2. 篩選器事件 ----------------
    ['country', 'city', 'industry', 'venue'].forEach(type => {
        container.querySelector(`#pill-${type}`)?.addEventListener('click', (e) => { e.stopPropagation(); UI.toggleDropdown(type); });
        container.querySelector(`#search-${type}-input`)?.addEventListener('keyup', (e) => UI.filterDropdownItems(e.target, `${type}-options-container`));
        container.querySelector(`#${type}-options-container`)?.addEventListener('change', (e) => { 
            if(e.target.type === 'checkbox') {
                let set = type === 'country' ? state.filterCountrySet : (type === 'city' ? state.filterCitySet : (type === 'industry' ? state.filterIndustrySet : state.filterVenueSet));
                if (set.has(e.target.value)) set.delete(e.target.value); else set.add(e.target.value);
                document.querySelectorAll(`.filter-chk-${type}`).forEach(c => c.checked = set.has(c.value));
                state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
            }
        });
    });

    container.querySelectorAll('.btn-filter-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const isSelectAll = btn.dataset.state !== 'all';
            btn.dataset.state = isSelectAll ? 'all' : 'none';
            btn.innerText = isSelectAll ? '取消選取' : '全選';
            
            let set = type === 'country' ? state.filterCountrySet : (type === 'city' ? state.filterCitySet : (type === 'industry' ? state.filterIndustrySet : state.filterVenueSet));
            container.querySelectorAll(`.filter-chk-${type}`).forEach(c => {
                if(c.closest('.filter-option').style.display !== 'none') { 
                    c.checked = isSelectAll; 
                    if(isSelectAll) set.add(c.value); else set.delete(c.value); 
                }
            });
            state.currentPage = 1; UI.updatePillActive(type); Render.renderTable();
        });
    });

    // ---------------- 3. 表格顯示設定與全域關閉 ----------------
    const btnDisplaySettings = container.querySelector('#btn-display-settings');
    const displayMenu = container.querySelector('#display-settings-menu');
    btnDisplaySettings?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(displayMenu) displayMenu.style.display = displayMenu.style.display === 'block' ? 'none' : 'block';
    });
    displayMenu?.addEventListener('click', (e) => { e.stopPropagation(); });

    container.querySelector('#btn-toggle-tree')?.addEventListener('click', (e) => {
        e.stopPropagation();
        state.isTreeMode = !state.isTreeMode;
        const btn = container.querySelector('#btn-toggle-tree');
        if(btn) btn.innerHTML = state.isTreeMode 
            ? `<i class="ti ti-list-tree" style="color:var(--brand); margin-right:4px;"></i> <span>切換為扁平列表</span>` 
            : `<i class="ti ti-list" style="color:var(--brand); margin-right:4px;"></i> <span>切換為樹狀檢視</span>`;
        Render.renderTable();
    });

    container.querySelector('#btn-toggle-expand')?.addEventListener('click', (e) => {
        e.stopPropagation();
        state.isAllExpanded = !state.isAllExpanded;
        const btn = container.querySelector('#btn-toggle-expand');
        if (state.isAllExpanded) {
            state.allData.forEach(d => { if (!d.parent_id) state.expandedParents.add(d.id); });
            if(btn) btn.innerHTML = `<i class="ti ti-arrows-minimize" style="color:var(--brand); margin-right:4px;"></i> <span>收合所有分支</span>`;
        } else {
            state.expandedParents.clear();
            if(btn) btn.innerHTML = `<i class="ti ti-arrows-maximize" style="color:var(--brand); margin-right:4px;"></i> <span>展開所有分支</span>`;
        }
        Render.renderTable();
    });

    container.querySelectorAll('.col-toggle-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            state.colVis[e.target.value] = e.target.checked;
            UI.updateColStyles();
        });
    });

    if (!state.isGlobalListenerBound) {
        document.addEventListener('click', (e) => {
            const parentDropdown = document.getElementById('parent-dropdown-list');
            const parentIdHidden = document.getElementById('input-parent-id');
            const parentSearchInput = document.getElementById('parent-search-input');
            const btnClearParent = document.getElementById('btn-clear-parent');
            
            if (parentDropdown && !e.target.closest('.searchable-select-wrap')) {
                parentDropdown.classList.remove('show');
                if (parentIdHidden && !parentIdHidden.value && parentSearchInput) {
                    parentSearchInput.value = '';
                    if(btnClearParent) btnClearParent.style.display = 'none';
                }
            }
            const dm = document.getElementById('display-settings-menu');
            if (dm && !e.target.closest('#display-settings-wrap')) {
                dm.style.display = 'none';
            }
        });
        state.isGlobalListenerBound = true;
    }

    // ---------------- 4. 批次操作列事件 ----------------
    container.querySelector('#selectAll')?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleIds = [];
        
        document.querySelectorAll('#institution-table-body tr').forEach(tr => {
            if(tr.style.display !== 'none' && !tr.querySelector('.empty-state')) {
                const chk = tr.querySelector('.row-select-chk');
                if(chk) visibleIds.push(chk.value);
            }
        });
        
        if (isChecked) {
            visibleIds.forEach(id => { if (!state.selectedIds.includes(id)) state.selectedIds.push(id); });
        } else {
            state.selectedIds = state.selectedIds.filter(id => !visibleIds.includes(id));
        }
        UI.updateBatchActionBar(); Render.renderTable(); 
    });

    container.querySelector('#btn-select-all-filtered')?.addEventListener('click', () => {
        state.selectedIds = [];
        state.filteredInstitutions.forEach(p => {
            state.selectedIds.push(p.id);
            if(state.isTreeMode) p.children.forEach(c => state.selectedIds.push(c.id));
        });
        UI.updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-clear-selection')?.addEventListener('click', () => {
        state.selectedIds = []; UI.updateBatchActionBar(); Render.renderTable();
    });

    container.querySelector('#btn-batch-delete')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        const hasChildren = state.selectedIds.some(id => state.allData.some(d => d.parent_id === id && !state.selectedIds.includes(d.id)));
        if (hasChildren) {
            showNotification("批次刪除失敗！您選取的項目中包含「尚有綁定分公司的主機構」", "error");
            return;
        }
        if (!confirm(`確定刪除這 ${state.selectedIds.length} 筆機構嗎？`)) return;
        
        const btn = document.getElementById('btn-batch-delete');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 刪除中...';
        btn.disabled = true;

        try {
            await Data.batchDelete();
            await Data.fetchInitialDataOnce(); 
            UI.updateBatchActionBar(); UI.buildBaseTree(); Render.renderTable(); 
            showNotification("已成功批次刪除所選機構！", "success");
        } catch (e) {
            showNotification("刪除失敗，請檢查資料庫連線", "error");
        } finally {
            if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        }
    });

    container.querySelector('#btn-batch-edit')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        if (state.selectedIds.length === 0) return;
        document.getElementById('batch-edit-count').innerText = state.selectedIds.length;
        document.getElementById('batch-input-industry').value = 'NO_CHANGE';
        document.getElementById('batch-input-venue').value = 'NO_CHANGE';
        document.getElementById('batch-edit-modal')?.classList.add('open');
    });

    container.querySelector('#btn-batch-merge')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        if(state.selectedIds.length < 2) { alert("請至少勾選 2 個機構進行合併！"); return; }
        document.getElementById('merge-count').innerText = state.selectedIds.length;
        const mc = document.getElementById('merge-options-container');
        const targetInsts = state.allData.filter(i => state.selectedIds.includes(i.id));
        if(mc) mc.innerHTML = targetInsts.map(inst => `
            <label class="merge-option">
                <input type="radio" name="master_inst" value="${inst.id}">
                <div class="merge-option-content">
                    <div class="merge-option-title">${inst.name}</div>
                    <div class="merge-option-desc">統編/代碼：${inst.tax_id || inst.overseas_tax_id || '無'} | 地址：${inst.address || '無'}</div>
                </div>
            </label>
        `).join('');
        document.getElementById('merge-modal')?.classList.add('open');
    });

    // 🌟 [新增] 點擊快捷列上的「設為分支」按鈕 -> 打開 Modal
    container.querySelector('#btn-batch-parent')?.addEventListener('click', () => {
        if(state.isReadOnly) return;
        if(state.selectedIds.length === 0) return;
        document.getElementById('batch-parent-selected-count').textContent = state.selectedIds.length;
        UI.populateBatchParentDropdown(); // 載入過濾後的總公司清單
        document.getElementById('batch-parent-id-value').value = '';
        document.getElementById('batch-parent-search').value = '';
        document.getElementById('batch-parent-modal')?.classList.add('open');
    });

    // ---------------- 5. 分頁與排序 ----------------
    // ... [這區與原本完全相同，省略文字，您原本的 code 留著]
    container.querySelector('#per-page-select')?.addEventListener('change', (e) => { 
        state.itemsPerPage = Number(e.target.value); state.currentPage = 1; Render.renderTable(); 
    });
    
    container.querySelector('#pagination-controls')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled || btn.classList.contains('active')) return;
        const p = Number(btn.dataset.page);
        if (p) { state.currentPage = p; Render.renderTable(); }
    });
    
    container.querySelector('#institution-page-wrapper #inst-table-head')?.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (th) {
            const col = th.dataset.sort;
            if (state.sortCol === col) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; } 
            else { state.sortCol = col; state.sortDir = 'asc'; }
            
            document.querySelectorAll('th[data-sort]').forEach(t => {
                t.classList.remove('sort-asc', 'sort-desc');
                const icon = t.querySelector('.sort-icon');
                if(icon) icon.className = 'ti ti-arrows-sort sort-icon';
            });
            
            th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            const thIcon = th.querySelector('.sort-icon');
            if(thIcon) thIcon.className = `ti ti-sort-${state.sortDir === 'asc' ? 'ascending' : 'descending'} sort-icon`;
            Render.renderTable();
        }
    });

    // ---------------- 6. 表單與隸屬機構下拉搜尋 ----------------
    container.querySelector('#input-country')?.addEventListener('change', UI.handleCountryChange);
    container.querySelector('#btn-close-modal-x')?.addEventListener('click', UI.closeModal);
    container.querySelector('#btn-cancel-modal')?.addEventListener('click', UI.closeModal);

    const parentSearchInput = container.querySelector('#parent-search-input');
    const parentDropdown = container.querySelector('#parent-dropdown-list');
    const parentIdHidden = container.querySelector('#input-parent-id');
    const btnClearParent = container.querySelector('#btn-clear-parent');

    const updateParentClearBtn = () => {
        if (parentSearchInput && parentSearchInput.value && btnClearParent) {
            btnClearParent.style.display = 'flex';
        } else if(btnClearParent) {
            btnClearParent.style.display = 'none';
        }
    };

    parentSearchInput?.addEventListener('focus', () => {
        parentDropdown?.classList.add('show');
        parentDropdown?.querySelectorAll('.searchable-option').forEach(o => o.style.display = 'flex');
    });
    parentSearchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if(parentIdHidden) parentIdHidden.value = ''; 
        updateParentClearBtn();
        parentDropdown?.classList.add('show');
        parentDropdown?.querySelectorAll('.searchable-option:not(.empty-opt)').forEach(opt => {
            opt.style.display = opt.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
    btnClearParent?.addEventListener('click', (e) => {
        e.stopPropagation();
        if(parentSearchInput) parentSearchInput.value = ''; 
        if(parentIdHidden) parentIdHidden.value = ''; 
        updateParentClearBtn();
        parentDropdown?.classList.remove('show');
    });
    parentDropdown?.addEventListener('click', (e) => {
        const opt = e.target.closest('.searchable-option');
        if (opt && !opt.classList.contains('empty-opt')) {
            if(parentIdHidden) parentIdHidden.value = opt.dataset.id || ''; 
            if(parentSearchInput) parentSearchInput.value = opt.dataset.name || '';
            updateParentClearBtn(); parentDropdown.classList.remove('show');
        } else if (opt && opt.classList.contains('empty-opt')) {
            if(parentIdHidden) parentIdHidden.value = ''; 
            if(parentSearchInput) parentSearchInput.value = '';
            updateParentClearBtn(); parentDropdown.classList.remove('show');
        }
    });

    // ---------------- 7. 表單送出與儲存判斷 ----------------
    container.querySelector('#btn-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        const isDomestic = document.getElementById('input-country').value === '中華民國';
        const payload = { 
            parent_id: document.getElementById('input-parent-id')?.value || '',
            country: document.getElementById('input-country')?.value || '',
            name: document.getElementById('input-name')?.value.trim() || '',
            name_translated: isDomestic ? '' : document.getElementById('input-name-translated')?.value.trim() || '',
            tax_id: isDomestic ? document.getElementById('input-tax-id')?.value.trim() || '' : '',
            overseas_tax_id: isDomestic ? '' : document.getElementById('input-overseas-tax-id')?.value.trim() || '',
            city: isDomestic ? document.getElementById('input-city')?.value || '' : '',
            industry: document.getElementById('input-industry')?.value || '',
            venue_type: document.getElementById('input-venue-type')?.value || '',
            address: document.getElementById('input-address')?.value.trim() || '',
            remarks: document.getElementById('input-remarks')?.value.trim() || '',
            history: state.currentHistory 
        };

        if(!payload.country || !payload.name || !payload.address) { alert("請填寫所有必填欄位！"); return; }
        if (isDomestic && (!payload.tax_id || !payload.city)) { alert("中華民國機構必須填寫「統一編號」與「縣市別」！"); return; }

        let hasSignificantChange = false;
        if (state.editingId && state.editingOldData) {
            if (state.editingOldData.name !== payload.name) hasSignificantChange = true;
            if (state.editingOldData.address !== payload.address) hasSignificantChange = true;
            if (isDomestic) {
                if (state.editingOldData.tax_id !== payload.tax_id) hasSignificantChange = true;
                if (state.editingOldData.city !== payload.city) hasSignificantChange = true;
            } else {
                if (state.editingOldData.overseas_tax_id !== payload.overseas_tax_id) hasSignificantChange = true;
            }
        }

        if (hasSignificantChange) {
            state.pendingPayload = payload;
            if(document.getElementById('intent-end-date')) document.getElementById('intent-end-date').value = Utils.getROCDateString(); 
            if(document.getElementById('intent-reason')) document.getElementById('intent-reason').value = '';
            document.getElementById('intent-history-fields')?.classList.add('hidden');
            const typRadio = document.querySelector('input[name="change_intent"][value="typo"]');
            if(typRadio) typRadio.checked = true;
            document.getElementById('change-intent-modal')?.classList.add('open');
            return; 
        }

        await executeSaveAction(payload, true);
    });

    const executeSaveAction = async (payload, isTypo) => {
        const btn = document.getElementById('btn-submit');
        const intentBtn = document.getElementById('btn-confirm-intent');
        if(btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...'; }
        if(intentBtn) { intentBtn.disabled = true; intentBtn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 儲存中...'; }

        try {
            const isEdit = !!state.editingId;
            await Data.executeSave(payload, isTypo);
            UI.closeModal(); 
            await Data.fetchInitialDataOnce(); 
            UI.updateBatchActionBar(); UI.buildBaseTree(); Render.renderTable(); 
            showNotification(isEdit ? "機構資料更新成功！" : "新實習機構建立成功！", "success");
        } catch (err) {
            showNotification("儲存失敗，請重試", "error");
            console.error(err);
        } finally {
            if(btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> 確認儲存變更'; }
            if(intentBtn) { intentBtn.disabled = false; intentBtn.innerHTML = '<i class="ti ti-check"></i> 確認執行儲存'; }
        }
    };

    // ---------------- 8. 批次編輯、合併、批次設定總公司 Modal ----------------
    const closeBatchEdit = () => document.getElementById('batch-edit-modal')?.classList.remove('open');
    container.querySelector('#btn-close-batch-x')?.addEventListener('click', closeBatchEdit);
    container.querySelector('#btn-cancel-batch')?.addEventListener('click', closeBatchEdit);
    
    container.querySelector('#btn-batch-edit-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        const indVal = document.getElementById('batch-input-industry').value;
        const venVal = document.getElementById('batch-input-venue').value;
        if (!confirm(`確定要批次修改這 ${state.selectedIds.length} 筆機構嗎？`)) return;

        const btn = document.getElementById('btn-batch-edit-submit');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 更新中...';
        btn.disabled = true;

        try {
            await Data.executeBatchEdit(indVal, venVal);
            closeBatchEdit();
            await Data.fetchInitialDataOnce(); 
            UI.updateBatchActionBar(); UI.buildBaseTree(); Render.renderTable();
            showNotification(`已成功批次更新 ${state.selectedIds.length} 筆機構屬性！`, "success");
        } catch(e) {
            showNotification("批次更新失敗，請重試", "error");
        } finally {
            if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        }
    });

    const closeMerge = () => document.getElementById('merge-modal')?.classList.remove('open');
    container.querySelector('#btn-close-merge-x')?.addEventListener('click', closeMerge);
    container.querySelector('#btn-cancel-merge')?.addEventListener('click', closeMerge);
    container.querySelector('#merge-options-container')?.addEventListener('change', (e) => {
        if(e.target.name === 'master_inst') {
            const ms = document.getElementById('btn-merge-submit');
            if(ms) ms.disabled = false;
        }
    });
    
    container.querySelector('#btn-merge-submit')?.addEventListener('click', async () => {
        if(state.isReadOnly) return;
        const masterId = document.querySelector('input[name="master_inst"]:checked')?.value; if(!masterId) return;
        const masterInst = state.allData.find(i => i.id === masterId);
        const instsToDelete = state.selectedIds.filter(id => id !== masterId);
        const deletedNames = state.allData.filter(i => instsToDelete.includes(i.id)).map(i => i.name);
        
        if(!confirm(`確認合併？\n\n📌 保留主體：${masterInst.name}\n🗑️ 刪除對象：${deletedNames.join('、')}`)) return;

        const btn = document.getElementById('btn-merge-submit');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 合併中...';
        btn.disabled = true;

        try {
            await Data.executeMerge(masterId, masterInst.name, instsToDelete, deletedNames);
            closeMerge();
            await Data.fetchInitialDataOnce(); 
            UI.updateBatchActionBar(); UI.buildBaseTree(); Render.renderTable();
            showNotification("機構合併與關聯移轉完成！", "success");
        } catch(e) {
            showNotification("合併失敗，請重試", "error");
        } finally {
            if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        }
    });

    // 🌟 [新增] 批次設定總公司的 Modal 內部事件
    container.querySelector('.btn-close-modal')?.addEventListener('click', (e) => {
        // 如果是批次設定總公司的關閉按鈕
        if(e.target.closest('#batch-parent-modal')) UI.closeBatchParentModal();
    });
    container.querySelector('#batch-parent-modal .btn-secondary')?.addEventListener('click', UI.closeBatchParentModal);

    // 🌟 總公司 Modal 內的搜尋過濾
    container.querySelector('#batch-parent-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const options = document.querySelectorAll('#batch-parent-dropdown-list .searchable-option');
        options.forEach(opt => {
            if(opt.classList.contains('empty-opt')) return;
            const text = (opt.dataset.name || '').toLowerCase();
            opt.style.display = text.includes(term) ? 'flex' : 'none';
        });
    });

    // 🌟 點擊清單選擇總公司
    container.querySelector('#batch-parent-dropdown-list')?.addEventListener('click', (e) => {
        const option = e.target.closest('.searchable-option');
        if (!option) return;
        document.querySelectorAll('#batch-parent-dropdown-list .searchable-option').forEach(opt => opt.classList.remove('selected', 'bg-slate-50', 'border-brand'));
        option.classList.add('selected', 'bg-slate-50', 'border-brand');
        document.getElementById('batch-parent-id-value').value = option.dataset.id || '';
    });

    // 🌟 確認送出批次設定總公司
    container.querySelector('#btn-confirm-batch-parent')?.addEventListener('click', async () => {
        if(state.isReadOnly || state.selectedIds.length === 0) return;
        
        const parentId = document.getElementById('batch-parent-id-value').value;
        const confirmMsg = parentId === '' 
            ? `確定要將這 ${state.selectedIds.length} 筆機構解除隸屬，設為「獨立機構」嗎？`
            : `確定要將這 ${state.selectedIds.length} 筆機構的總公司設定為所選項嗎？`;
            
        if (!confirm(confirmMsg)) return;

        const btn = document.getElementById('btn-confirm-batch-parent');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 設定中...';
        btn.disabled = true;

        try {
            await Data.executeBatchSetParent(parentId); // 呼叫 Data 層執行
            UI.closeBatchParentModal();
            await Data.fetchInitialDataOnce(); 
            UI.updateBatchActionBar(); 
            UI.buildBaseTree(); 
            Render.renderTable();
            showNotification(`已成功更新 ${state.selectedIds.length} 筆機構的隸屬關係！`, "success");
        } catch(e) {
            console.error(e);
            showNotification("批次設定總公司失敗，請重試", "error");
        } finally {
            if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        }
    });

    // ---------------- 9. 表格內行操作 ----------------
    container.querySelector('#institution-table-body')?.addEventListener('click', async (e) => {
        const rowChk = e.target.closest('.row-select-chk');
        const btnEdit = e.target.closest('.btn-row-edit');
        const btnDel = e.target.closest('.btn-row-delete');
        const toggleBtn = e.target.closest('.tree-toggle');
        
        if (toggleBtn) {
            e.stopPropagation();
            e.preventDefault();

            const tr = toggleBtn.closest('tr');
            if (!tr) return;
            const pId = tr.dataset.id;
            
            if (state.expandedParents.has(pId)) {
                state.expandedParents.delete(pId);
            } else {
                state.expandedParents.add(pId);
            }
            Render.renderTable();
            return;
        }
        else if (rowChk) { 
            const id = rowChk.value;
            const index = state.selectedIds.indexOf(id);
            if (index === -1) state.selectedIds.push(id); else state.selectedIds.splice(index, 1);
            UI.updateBatchActionBar(); 
            const row = rowChk.closest('tr');
            if(index === -1) row.classList.add('selected'); else row.classList.remove('selected');
        }
            
        else if (btnEdit) { 
            if(state.isReadOnly) return;
            const id = btnEdit.dataset.id;
            const docData = state.allData.find(d => d.id === id); if (!docData) return;
            state.editingId = id; 
            state.editingOldData = { ...docData }; 
            state.currentHistory = docData.history || [];
            
            if(document.getElementById('modal-tabs')) document.getElementById('modal-tabs').style.display = 'block';
            document.getElementById('tab-btn-main')?.click();

            UI.populateParentDropdown(id); 
            if(document.getElementById('input-parent-id')) document.getElementById('input-parent-id').value = docData.parent_id || '';
            if (docData.parent_id) {
                const parentObj = state.allData.find(p => p.id === docData.parent_id);
                if(document.getElementById('parent-search-input')) document.getElementById('parent-search-input').value = parentObj ? parentObj.name : '';
                if(document.getElementById('btn-clear-parent')) document.getElementById('btn-clear-parent').style.display = 'flex';
            } else {
                if(document.getElementById('parent-search-input')) document.getElementById('parent-search-input').value = '';
                if(document.getElementById('btn-clear-parent')) document.getElementById('btn-clear-parent').style.display = 'none';
            }
            
            if(document.getElementById('input-country')) document.getElementById('input-country').value = docData.country || '中華民國';
            if(document.getElementById('input-name')) document.getElementById('input-name').value = docData.name || '';
            if(document.getElementById('input-name-translated')) document.getElementById('input-name-translated').value = docData.name_translated || '';
            if(document.getElementById('input-tax-id')) document.getElementById('input-tax-id').value = docData.tax_id || '';
            if(document.getElementById('input-overseas-tax-id')) document.getElementById('input-overseas-tax-id').value = docData.overseas_tax_id || '';
            if(document.getElementById('input-city')) document.getElementById('input-city').value = docData.city || '';
            if(document.getElementById('input-industry')) document.getElementById('input-industry').value = docData.industry || '';
            if(document.getElementById('input-venue-type')) document.getElementById('input-venue-type').value = docData.venue_type || '';
            if(document.getElementById('input-address')) document.getElementById('input-address').value = docData.address || '';
            if(document.getElementById('input-remarks')) document.getElementById('input-remarks').value = docData.remarks || '';
            
            UI.handleCountryChange(); 
            const mt = document.getElementById('modal-title');
            if(mt) mt.innerHTML = '<i class="ti ti-edit text-brand" style="font-size: 20px;"></i> 編輯機構與歷史軌跡';
            document.getElementById('data-modal')?.classList.add('open');
        }
        else if (btnDel) { 
            if(state.isReadOnly) return;
            const id = btnDel.dataset.id;
            const name = btnDel.dataset.name;
            const hasChildren = state.allData.some(d => d.parent_id === id);
            
            if (hasChildren) {
                showNotification(`無法刪除！「${name}」底下還有綁定分公司 / 分部`, "error");
                return;
            }
            
            if (confirm(`確定要刪除機構「${name}」嗎？`)) {
                const originalHtml = btnDel.innerHTML;
                btnDel.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i>';
                try {
                    await Data.deleteData(id);
                    await Data.fetchInitialDataOnce(); 
                    UI.updateBatchActionBar(); UI.buildBaseTree(); Render.renderTable();
                    showNotification(`機構「${name}」已刪除成功！`, "success");
                } catch(e) {
                    showNotification("刪除失敗", "error");
                    btnDel.innerHTML = originalHtml;
                }
            }
        }
    });

    // ---------------- 10. 歷史快照相關 Modal ----------------
    // ... [這區與原本完全相同，省略文字，您原本的 code 留著]
    const tabBtnMain = container.querySelector('#tab-btn-main');
    const tabBtnHistory = container.querySelector('#tab-btn-history');
    const tabMain = container.querySelector('#data-form');
    const tabHistory = container.querySelector('#tab-history');

    tabBtnMain?.addEventListener('click', () => {
        if(tabBtnMain) { tabBtnMain.style.borderColor = 'var(--brand)'; tabBtnMain.style.color = 'var(--brand)'; }
        if(tabBtnHistory) { tabBtnHistory.style.borderColor = 'transparent'; tabBtnHistory.style.color = 'var(--text-muted)'; }
        if(tabMain) tabMain.style.display = 'flex'; 
        if(tabHistory) tabHistory.style.display = 'none';
    });

    tabBtnHistory?.addEventListener('click', () => {
        if(tabBtnHistory) { tabBtnHistory.style.borderColor = 'var(--brand)'; tabBtnHistory.style.color = 'var(--brand)'; }
        if(tabBtnMain) { tabBtnMain.style.borderColor = 'transparent'; tabBtnMain.style.color = 'var(--text-muted)'; }
        if(tabHistory) { tabHistory.style.display = 'block'; tabMain.style.display = 'none'; }
        Render.renderHistoryList();
    });

    container.querySelector('#btn-show-add-history')?.addEventListener('click', () => {
        document.getElementById('add-history-modal')?.classList.add('open');
        if(document.getElementById('hist-end-date')) document.getElementById('hist-end-date').value = Utils.getROCDateString(); 
        if(document.getElementById('hist-name')) document.getElementById('hist-name').value = document.getElementById('input-name')?.value || '';
        if(document.getElementById('hist-address')) document.getElementById('hist-address').value = document.getElementById('input-address')?.value || '';
        const taxVal = document.getElementById('input-country')?.value === '中華民國' 
            ? document.getElementById('input-tax-id')?.value || ''
            : document.getElementById('input-overseas-tax-id')?.value || '';
        if(document.getElementById('hist-tax-id')) document.getElementById('hist-tax-id').value = taxVal;
        if(document.getElementById('hist-reason')) document.getElementById('hist-reason').value = '';
    });

    container.querySelector('#btn-close-add-hist-x')?.addEventListener('click', () => document.getElementById('add-history-modal')?.classList.remove('open'));
    container.querySelector('#btn-cancel-add-hist')?.addEventListener('click', () => document.getElementById('add-history-modal')?.classList.remove('open'));

    container.querySelector('#btn-save-history')?.addEventListener('click', () => {
        let endDate = document.getElementById('hist-end-date').value.trim();
        endDate = Utils.formatROCDate(endDate);
        if(!Utils.isValidROCDate(endDate)) { alert('適用結束日期格式錯誤！請輸入 YYY/MM/DD (例如: 115/01/01)'); return; }
        document.getElementById('hist-end-date').value = endDate;

        const name = document.getElementById('hist-name').value.trim();
        const address = document.getElementById('hist-address').value.trim();
        const taxId = document.getElementById('hist-tax-id').value.trim();
        const reason = document.getElementById('hist-reason').value.trim();

        if(!name || !address) { alert('請填寫歷史機構名稱與地址！'); return; }

        state.currentHistory.push({ end_date: endDate, name: name, address: address, tax_id: taxId, reason: reason, created_at: new Date().toISOString() });
        document.getElementById('add-history-modal')?.classList.remove('open');
        Render.renderHistoryList();
        showNotification("已加入一筆歷史快照（點選最下方確認儲存後生效）", "info");
    });

    container.querySelector('#tab-history')?.addEventListener('click', (e) => {
        const btnDel = e.target.closest('.btn-del-history');
        if(btnDel && confirm('確定要刪除這筆歷史快照嗎？')) {
            const idx = Number(btnDel.dataset.idx);
            state.currentHistory.splice(idx, 1);
            Render.renderHistoryList();
            showNotification("已移除該歷史快照（點選最下方確認儲存後生效）", "info");
        }
    });

    const closeIntent = () => document.getElementById('change-intent-modal')?.classList.remove('open');
    container.querySelector('#btn-close-intent-x')?.addEventListener('click', closeIntent);
    container.querySelector('#btn-cancel-intent')?.addEventListener('click', closeIntent);
    
    container.querySelectorAll('input[name="change_intent"]').forEach(r => {
        r.addEventListener('change', (e) => {
            if(e.target.value === 'history') {
                document.getElementById('intent-history-fields')?.classList.remove('hidden');
                if(document.getElementById('intent-end-date')) document.getElementById('intent-end-date').value = Utils.getROCDateString(); 
            } else {
                document.getElementById('intent-history-fields')?.classList.add('hidden');
            }
        });
    });

    container.querySelector('#btn-confirm-intent')?.addEventListener('click', async () => {
        const intent = document.querySelector('input[name="change_intent"]:checked').value;
        const isTypo = (intent === 'typo');
        
        if (!isTypo) {
            let endDate = document.getElementById('intent-end-date').value.trim();
            endDate = Utils.formatROCDate(endDate); 
            if(!Utils.isValidROCDate(endDate)) { alert('適用結束日期格式錯誤！請輸入 YYY/MM/DD (例如: 115/01/01)'); return; }
            document.getElementById('intent-end-date').value = endDate;

            const reason = document.getElementById('intent-reason').value.trim();
            
            state.pendingPayload.history = state.pendingPayload.history || [];
            state.pendingPayload.history.push({
                end_date: endDate,
                name: state.editingOldData.name,
                address: state.editingOldData.address || '',
                tax_id: state.editingOldData.tax_id || state.editingOldData.overseas_tax_id || '',
                reason: reason,
                created_at: new Date().toISOString()
            });
        }
        
        document.getElementById('change-intent-modal')?.classList.remove('open');
        await executeSaveAction(state.pendingPayload, isTypo); 
    });
}

function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3.5 rounded-xl shadow-xl border transition-all duration-300 transform translate-y-5 opacity-0`;
    
    if (type === 'success') {
        toast.className += ' bg-emerald-50 text-emerald-800 border-emerald-200';
        toast.innerHTML = `<i class="ti ti-circle-check text-emerald-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    } else if (type === 'error') {
        toast.className += ' bg-rose-50 text-rose-800 border-rose-200';
        toast.innerHTML = `<i class="ti ti-alert-circle text-rose-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    } else {
        toast.className += ' bg-blue-50 text-blue-800 border-blue-200';
        toast.innerHTML = `<i class="ti ti-info-circle text-blue-500 text-lg"></i><span class="font-semibold text-sm">${message}</span>`;
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 50);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-5', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
