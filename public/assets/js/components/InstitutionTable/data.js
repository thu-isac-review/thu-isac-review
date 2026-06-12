import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';

export async function fetchInitialDataOnce() {
    const dataSnap = await getDocs(collection(state.db, "internship_institutions"));
    state.allData = dataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.selectedIds = [];
}

export async function handleInitialLoadEngine() {
    try {
        const recordsCol = collection(state.db, "internship_records");
        const recordSnap = await getDocs(recordsCol);
        state.allRecords = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) { console.warn("歷史名單預載未完成", e); }
}

export async function executeSave(payload, isTypo = true) {
    if (state.editingId) {
        const batch = writeBatch(state.db);
        batch.update(doc(state.db, "internship_institutions", state.editingId), { ...payload, updated_at: serverTimestamp() });
        
        if (isTypo && state.editingOldData && state.editingOldData.name !== payload.name) {
            state.allRecords.forEach(record => {
                if (record.inst_id === state.editingId || (!record.inst_id && record.inst_raw === state.editingOldData.name)) {
                    batch.update(doc(state.db, "internship_records", record.id), { inst_raw: payload.name, updated_at: serverTimestamp() });
                }
            });
        }
        await batch.commit();
    } else {
        await addDoc(collection(state.db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
    }
}

export async function createInstitutionRaw(payload) {
    const docRef = await addDoc(collection(state.db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
    state.allData.unshift({ id: docRef.id, ...payload });
}

export async function deleteData(id) {
    await deleteDoc(doc(state.db, "internship_institutions", id));
}

export async function executeBatchEdit(indVal, venVal) {
    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => {
        const updates = { updated_at: serverTimestamp() };
        if (indVal !== 'NO_CHANGE') updates.industry = indVal;
        if (venVal !== 'NO_CHANGE') updates.venue_type = venVal;
        batch.update(doc(state.db, "internship_institutions", id), updates);
    });
    await batch.commit();
}

export async function executeMerge(masterId, masterInstName, instsToDelete, deletedNames) {
    const batch = writeBatch(state.db);
    state.allRecords.forEach(record => {
        if (instsToDelete.includes(record.inst_id) || (!record.inst_id && deletedNames.includes(record.inst_raw))) {
            batch.update(doc(state.db, "internship_records", record.id), { inst_id: masterId, updated_at: serverTimestamp() });
        }
    });
    state.allData.forEach(d => {
        if (instsToDelete.includes(d.parent_id)) { batch.update(doc(state.db, "internship_institutions", d.id), { parent_id: masterId }); }
    });
    instsToDelete.forEach(id => batch.delete(doc(state.db, "internship_institutions", id)));
    await batch.commit();
}

export async function batchDelete() {
    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => batch.delete(doc(state.db, "internship_institutions", id)));
    await batch.commit(); 
}

// 🌟 [新增] 執行批次設定總公司的資料庫寫入邏輯
export async function executeBatchSetParent(parentId) {
    if (!state.selectedIds || state.selectedIds.length === 0) return;
    
    const batch = writeBatch(state.db);
    
    state.selectedIds.forEach(id => {
        const instRef = doc(state.db, "internship_institutions", id);
        // 將 parent_id 指向目標總公司的 ID (若為空字串，則代表解除隸屬，變回獨立機構)
        batch.update(instRef, { 
            parent_id: parentId, 
            updated_at: serverTimestamp() 
        });
    });

    await batch.commit();
    state.selectedIds = []; // 批次執行完畢後清空選取
}
