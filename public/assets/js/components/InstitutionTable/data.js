import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { buildBaseTree, renderTable } from './render.js';

export async function fetchInstitutions() {
    try {
        const snap = await getDocs(collection(state.db, "internship_institutions"));
        state.allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        buildBaseTree();
        renderTable();
        
        if (!state.isReadOnly) await preloadRecords();
    } catch (error) {
        console.error("雲端資料同步失敗:", error);
        state.viewContainer.querySelector('#table-body').innerHTML = `<tr><td colspan="9" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger)"></i><div class="empty-text">雲端資料同步失敗，請重新整理頁面。</div></td></tr>`;
    }
}

export async function preloadRecords() {
    try {
        const recordsCol = collection(state.db, "internship_records");
        const recordSnap = await getDocs(recordsCol);
        state.allRecords = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("歷史紀錄預載未完成", e);
    }
}

export async function submitInstitutionForm(container) {
    const payload = {
        country: container.querySelector('#input-country').value,
        name: container.querySelector('#input-name').value.trim(),
        tax_id: container.querySelector('#input-tax-id').value.trim(),
        city: container.querySelector('#input-city').value,
        industry: container.querySelector('#input-industry').value,
        venue_type: container.querySelector('#input-venue-type').value,
        address: container.querySelector('#input-address').value.trim(),
        remarks: container.querySelector('#input-remarks').value.trim()
    };

    if (!payload.country || !payload.name || !payload.address) {
        alert("請填寫所有必填欄位！"); return;
    }

    try {
        if (state.editingId) {
            await updateDoc(doc(state.db, "internship_institutions", state.editingId), { ...payload, updated_at: serverTimestamp() });
        } else {
            await addDoc(collection(state.db, "internship_institutions"), { ...payload, parent_id: '', history: [], created_at: serverTimestamp() });
        }
        container.querySelector('#data-modal').classList.remove('open');
        await fetchInstitutions();
    } catch (err) {
        console.error(err); alert("儲存失敗！");
    }
}

export async function deleteInstitution(id) {
    try {
        await deleteDoc(doc(state.db, "internship_institutions", id));
        await fetchInstitutions();
    } catch (err) {
        console.error(err); alert("刪除失敗");
    }
}

export async function batchDelete() {
    if (!confirm(`確定刪除這 ${state.selectedIds.length} 筆機構嗎？`)) return;
    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => batch.delete(doc(state.db, "internship_institutions", id)));
    await batch.commit();
    state.selectedIds = [];
    await fetchInstitutions();
}

export async function executeBatchEdit(container) {
    const indVal = container.querySelector('#batch-input-industry').value;
    const venVal = container.querySelector('#batch-input-venue').value;

    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => {
        const updates = { updated_at: serverTimestamp() };
        if (indVal !== 'NO_CHANGE') updates.industry = indVal;
        if (venVal !== 'NO_CHANGE') updates.venue_type = venVal;
        batch.update(doc(state.db, "internship_institutions", id), updates);
    });

    await batch.commit();
    state.selectedIds = [];
    container.querySelector('#batch-edit-modal').classList.remove('open');
    await fetchInstitutions();
}
