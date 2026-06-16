/**
 * 實習紀錄模組 - Firebase 數據操作器 (Data.js)
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, 
    deleteDoc, addDoc, serverTimestamp, getDocs, getDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDcsGfvVKnGmCzWfK5F03saydFpNc1ReYY", 
    authDomain: "thu-isac-review.firebaseapp.com", 
    projectId: "thu-isac-review", 
    storageBucket: "thu-isac-review.firebasestorage.app", 
    messagingSenderId: "453299876735", 
    appId: "1:453299876735:web:1d8babca3315423161a04a" 
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app); 
export const db = getFirestore(app);

export { onAuthStateChanged };

export const recordsCol = collection(db, "internship_records");
export const studentsCol = collection(db, "internship_students");
export const instsCol = collection(db, "internship_institutions");
export const coursesCol = collection(db, "internship_courses");

export function initDataSubscriptions(callbacks) {
    onSnapshot(studentsCol, (snap) => {
        const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (callbacks.onStudentsUpdate) callbacks.onStudentsUpdate(students);
    }, (err) => {
        console.error("學生主檔監聽失敗:", err);
        if (callbacks.onStudentsUpdate) callbacks.onStudentsUpdate([]);
    });

    onSnapshot(instsCol, (snap) => {
        const insts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (callbacks.onInstsUpdate) callbacks.onInstsUpdate(insts);
    }, (err) => {
        console.error("機構主檔監聽失敗:", err);
        if (callbacks.onInstsUpdate) callbacks.onInstsUpdate([]);
    });

    onSnapshot(coursesCol, (snap) => {
        const courses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        courses.sort((a, b) => (b.academic_year + b.term).localeCompare(a.academic_year + a.term));
        if (callbacks.onCoursesUpdate) callbacks.onCoursesUpdate(courses);
    }, (err) => {
        console.error("課程主檔監聽失敗:", err);
        if (callbacks.onCoursesUpdate) callbacks.onCoursesUpdate([]);
    });

    getDoc(doc(db, "settings", "colleges")).then(snap => {
        if (snap.exists() && snap.data().list) {
            const list = snap.data().list.map(c => typeof c === 'string' ? { name: c, shortName: c } : c);
            if (callbacks.onCollegesLoaded) callbacks.onCollegesLoaded(list);
        } else {
            if (callbacks.onCollegesLoaded) callbacks.onCollegesLoaded([]);
        }
    }).catch(err => {
        console.error("學院排序設定檔載入失敗:", err);
        if (callbacks.onCollegesLoaded) callbacks.onCollegesLoaded([]);
    });

    getDocs(collection(db, "departments")).then(snap => {
        const depts = snap.docs.map(d => d.data());
        depts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
        if (callbacks.onDeptsLoaded) callbacks.onDeptsLoaded(depts);
    }).catch(err => {
        console.error("系所清單載入失敗:", err);
        if (callbacks.onDeptsLoaded) callbacks.onDeptsLoaded([]);
    });
}

export function subscribeToRecords(onUpdate) {
    return onSnapshot(recordsCol, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate(records);
    }, (err) => {
        console.error("實習紀錄監聽失敗:", err);
        onUpdate([]); 
    });
}

export async function addRecord(payload) { return await addDoc(recordsCol, { ...payload, created_at: serverTimestamp() }); }
export async function updateRecord(id, payload) { return await updateDoc(doc(db, "internship_records", id), { ...payload, updated_at: serverTimestamp() }); }
export async function deleteRecord(id) { return await deleteDoc(doc(db, "internship_records", id)); }
export async function batchDeleteRecords(ids) { for (const id of ids) await deleteDoc(doc(db, "internship_records", id)); }
