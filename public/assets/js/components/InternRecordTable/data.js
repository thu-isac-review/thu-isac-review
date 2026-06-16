import { state } from './state.js';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function initDataSubscriptions(onDataUpdated) {
    const db = state.db;
    if (!db) return;

    onSnapshot(collection(db, "internship_students"), (snap) => { state.allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() })); onDataUpdated(); });
    onSnapshot(collection(db, "internship_institutions"), (snap) => { state.allInsts = snap.docs.map(d => ({ id: d.id, ...d.data() })); onDataUpdated(); });
    onSnapshot(collection(db, "internship_courses"), (snap) => { 
        state.allCourses = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
        state.allCourses.sort((a, b) => (b.academic_year + b.term).localeCompare(a.academic_year + a.term));
        onDataUpdated(); 
    });

    const colSnap = await getDoc(doc(db, "settings", "colleges"));
    if (colSnap.exists() && colSnap.data().list) state.orderedColleges = colSnap.data().list.map(c => typeof c === 'string' ? { name: c, shortName: c } : c);

    const deptSnap = await getDocs(collection(db, "departments"));
    state.globalDepts = deptSnap.docs.map(d => d.data()).sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
    onDataUpdated();
}

export function subscribeToRecords(onUpdate) {
    if (!state.db) return;
    return onSnapshot(collection(state.db, "internship_records"), (snap) => {
        state.allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate();
    });
}

export async function addRecord(payload) { return await addDoc(collection(state.db, "internship_records"), { ...payload, created_at: serverTimestamp() }); }
export async function updateRecord(id, payload) { return await updateDoc(doc(state.db, "internship_records", id), { ...payload, updated_at: serverTimestamp() }); }
export async function deleteRecord(id) { return await deleteDoc(doc(state.db, "internship_records", id)); }
export async function batchDeleteRecords(ids) { for (const id of ids) await deleteDoc(doc(state.db, "internship_records", id)); }
