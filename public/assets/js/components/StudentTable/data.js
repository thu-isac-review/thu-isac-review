import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';

export async function fetchSettingsOnce() {
    try {
        const collegeSnap = await getDoc(doc(state.db, "settings", "colleges"));
        if (collegeSnap.exists()) {
            const rawList = collegeSnap.data().list || [];
            state.orderedColleges = rawList.map(c => typeof c === 'string' ? { name: c, shortName: c } : c);
        }

        const deptSnap = await getDocs(collection(state.db, "departments"));
        state.globalDepts = deptSnap.docs.map(d => d.data());
        state.globalDepts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
    } catch (e) {
        console.error("Failed to load settings:", e);
    }
}

export async function fetchInitialDataOnce() {
    const dataSnap = await getDocs(collection(state.db, "internship_students"));
    state.allData = dataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.selectedIds = [];
}

export async function executeSave(payload) {
    if (state.editingId) {
        await updateDoc(doc(state.db, "internship_students", state.editingId), { ...payload, updated_at: serverTimestamp() });
    } else {
        await addDoc(collection(state.db, "internship_students"), { ...payload, created_at: serverTimestamp() });
    }
}

export async function deleteData(id) {
    await deleteDoc(doc(state.db, "internship_students", id));
}

export async function batchDelete() {
    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => batch.delete(doc(state.db, "internship_students", id)));
    await batch.commit(); 
}

export async function batchImport(parsedRows) {
    let addedCount = 0;
    const colRef = collection(state.db, "internship_students");
    for (let payload of parsedRows) { 
        await addDoc(colRef, payload); 
        addedCount++; 
    }
    return addedCount;
}
