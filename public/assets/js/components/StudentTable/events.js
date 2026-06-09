import { state, resetSelection } from './state.js';
import { ui } from './ui.js';
import { renderTable, updateSelectionUI } from './render.js';
import { fetchData, addData, updateData, deleteData, batchDeleteData } from './data.js';

export const bindEvents = () => {
    if (ui.searchInput) {
        ui.searchInput.addEventListener('input', () => {
            state.currentPage = 1;
            renderTable();
        });
    }

    if (state.viewMode === 'manage') {
        if (ui.btnAdd) {
            ui.btnAdd.addEventListener('click', () => {
                state.editingId = null;
                ui.openModal(false);
            });
        }

        if (ui.modalClose) ui.modalClose.addEventListener('click', () => ui.closeModal());
        if (ui.btnCancel) ui.btnCancel.addEventListener('click', () => ui.closeModal());

        if (ui.form) {
            ui.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    student_id: ui.fStudentId.value.trim().toUpperCase(),
                    name: ui.fName.value.trim(),
                    gender: ui.fGender.value,
                    nationality: ui.fNationality.value.trim(),
                    college: ui.fCollege.value.trim(),
                    department: ui.fDepartment.value.trim()
                };

                // 檢查學號是否重複
                if (!state.editingId) {
                    const isExist = state.allData.some(d => d.student_id === payload.student_id);
                    if (isExist) {
                        alert('此學號已存在！');
                        return;
                    }
                }

                ui.setLoading('btn-save', true, '儲存');
                try {
                    if (state.editingId) {
                        await updateData(state.editingId, payload);
                    } else {
                        await addData(payload);
                    }
                    ui.closeModal();
                    await refreshData();
                } catch (error) {
                    alert('儲存失敗：' + error.message);
                } finally {
                    ui.setLoading('btn-save', false, '儲存');
                }
            });
        }

        if (ui.selectAllCheckbox) {
            ui.selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const currentRows = Array.from(ui.tableBody.querySelectorAll('.row-checkbox'));
                currentRows.forEach(cb => {
                    cb.checked = isChecked;
                    if (isChecked) state.selectedIds.add(cb.dataset.id);
                    else state.selectedIds.delete(cb.dataset.id);
                });
                updateSelectionUI();
            });
        }

        if (ui.tableBody) {
            ui.tableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('row-checkbox')) {
                    const id = e.target.dataset.id;
                    if (e.target.checked) state.selectedIds.add(id);
                    else state.selectedIds.delete(id);
                    updateSelectionUI();
                }
            });

            ui.tableBody.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('.btn-edit');
                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const item = state.allData.find(d => d.id === id);
                    if (item) {
                        state.editingId = id;
                        ui.fStudentId.value = item.student_id || '';
                        ui.fName.value = item.name || '';
                        ui.fGender.value = item.gender || '男';
                        ui.fNationality.value = item.nationality || '本國籍';
                        ui.fCollege.value = item.college || '';
                        ui.fDepartment.value = item.department || '';
                        ui.openModal(true);
                    }
                    return;
                }

                const deleteBtn = e.target.closest('.btn-delete');
                if (deleteBtn) {
                    if (confirm('確定要刪除此學生資料嗎？')) {
                        try {
                            await deleteData(deleteBtn.dataset.id);
                            await refreshData();
                        } catch (error) {
                            alert('刪除失敗');
                        }
                    }
                }
            });
        }

        if (ui.btnBatchDelete) {
            ui.btnBatchDelete.addEventListener('click', async () => {
                if (state.selectedIds.size === 0) return;
                if (confirm(`確定要刪除選取的 ${state.selectedIds.size} 筆資料嗎？`)) {
                    ui.setLoading('btn-batch-delete', true, '<i class="ti ti-trash"></i> 批次刪除');
                    try {
                        await batchDeleteData(Array.from(state.selectedIds));
                        resetSelection();
                        await refreshData();
                    } catch (error) {
                        alert('批次刪除失敗');
                    } finally {
                        ui.setLoading('btn-batch-delete', false, '<i class="ti ti-trash"></i> 批次刪除');
                    }
                }
            });
        }

        if (ui.btnExport) {
            ui.btnExport.addEventListener('click', () => {
                const dataToExport = state.selectedIds.size > 0 
                    ? state.allData.filter(d => state.selectedIds.has(d.id))
                    : state.filteredData;
                
                if (dataToExport.length === 0) return alert('沒有資料可匯出');
                
                const csvContent = "\uFEFF" + 
                    "學院,系所,學號,姓名,性別,國籍\n" +
                    dataToExport.map(d => `${d.college||''},${d.department||''},${d.student_id||''},${d.name||''},${d.gender||''},${d.nationality||''}`).join("\n");
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `學生資料_${new Date().getTime()}.csv`;
                link.click();
            });
        }

        if (ui.importCsv) {
            ui.importCsv.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const btnHtml = ui.btnImport.innerHTML;
                ui.setLoading('btn-import', true, btnHtml);

                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const text = event.target.result;
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                        if (lines.length <= 1) throw new Error('檔案內容為空或無有效資料');

                        let addedCount = 0;
                        let skippedCount = 0;

                        for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split(',').map(c => c.trim());
                            if (cols.length < 4) continue;

                            const studentId = (cols[2] || '').toUpperCase().trim();
                            const isExist = state.allData.some(d => d.student_id === studentId);
                            if (isExist) { skippedCount++; continue; }

                            const payload = {
                                college: cols[0], 
                                department: cols[1], 
                                student_id: studentId,
                                name: cols[3], 
                                gender: cols[4] || '男', 
                                nationality: cols[5] || '本國籍'
                            };
                            
                            if (!payload.college || !payload.department || !payload.student_id || !payload.name) continue;
                            await addData(payload);
                            addedCount++;
                        }

                        let finishMessage = `✅ 成功匯入 ${addedCount} 筆學生資料！`;
                        if (skippedCount > 0) finishMessage += `\n⚠️ 另有 ${skippedCount} 筆因「學號已存在」已跳過。`;
                        alert(finishMessage);
                        await refreshData();
                    } catch (error) {
                        alert("匯入失敗，請確認 CSV 檔案格式是否正確。\n" + error.message);
                    } finally {
                        ui.setLoading('btn-import', false, btnHtml);
                        e.target.value = '';
                    }
                };
                reader.readAsText(file);
            });
        }
    }
};

const refreshData = async () => {
    await fetchData();
    renderTable();
};
