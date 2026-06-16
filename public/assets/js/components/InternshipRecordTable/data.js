import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from "./state.js";

const db = getFirestore();

export const formatCourseInfo = (c) => c ? `${c.academic_year}-${c.term}_${c.course_code}：${c.course_name}` : '';
export const getTime = (ts) => ts ? (ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime() || 0)) : 0;
export const getColShort = (n) => { const c = state.orderedColleges.find(x => x.name === n); return c && c.shortName ? c.shortName : (n || '未知學院'); };
export const getDeptShort = (n) => { const d = state.globalDepts.find(x => x.name === n); return d && d.shortName ? d.shortName : (n || '未知學系'); };

export async function submitRecord(payload) {
    if (state.editingId) {
        await updateDoc(doc(db, "internship_records", state.editingId), { ...payload, updated_at: serverTimestamp() });
    } else {
        await addDoc(collection(db, "internship_records"), { ...payload, created_at: serverTimestamp() });
    }
}

export async function deleteRecord(id) {
    await deleteDoc(doc(db, "internship_records", id));
}
