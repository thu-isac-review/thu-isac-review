/**
 * 實習紀錄模組 - Firebase 數據操作器 (Data.js)
 * 負責所有 Firebase 與 Firestore 的即時同步監聽與 CRUD 資料操作。
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

// 初始化 Firebase 連線 (防止重複初始化衝突)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app); 
export const db = getFirestore(app);

// 將 onAuthStateChanged 匯出，供 main.js 呼叫使用
export { onAuthStateChanged };

// 定義主要集合參照
export const recordsCol = collection(db, "internship_records");
export const studentsCol = collection(db, "internship_students");
export const instsCol = collection(db, "internship_institutions");
export const coursesCol = collection(db, "internship_courses");

/**
 * 即時載入並監聽必要的關聯資料主檔 (包含完整的錯誤防禦)
 */
export function initDataSubscriptions(callbacks) {
    // 1. 監聽學生主檔
    onSnapshot(studentsCol, (snap) => {
        const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (callbacks.onStudentsUpdate) callbacks.onStudentsUpdate(students);
    }, (error) => {
        console.error("學生主檔監聽失敗，採用空資料載入:", error);
        if (callbacks.onStudentsUpdate) callbacks.onStudentsUpdate([]);
    });

    // 2. 監聽實習機構主檔
    onSnapshot(instsCol, (snap) => {
        const insts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (callbacks.onInstsUpdate) callbacks.onInstsUpdate(insts);
    }, (error) => {
        console.error("機構主檔監聽失敗，採用空資料載入:", error);
        if (callbacks.onInstsUpdate) callbacks.onInstsUpdate([]);
    });

    // 3. 監聽課程主檔並自動按學年/學期倒序
    onSnapshot(coursesCol, (snap) => {
        const courses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        courses.sort((a, b) => (b.academic_year + b.term).localeCompare(a.academic_year + a.term));
        if (callbacks.onCoursesUpdate) callbacks.onCoursesUpdate(courses);
    }, (error) => {
        console.error("課程主檔監聽失敗，採用空資料載入:", error);
        if (callbacks.onCoursesUpdate) callbacks.onCoursesUpdate([]);
    });

    // 4. 取得系統設定：學院排序與簡稱
    getDoc(doc(db, "settings", "colleges")).then(snap => {
        if (snap.exists() && snap.data().list) {
            const list = snap.data().list.map(c => typeof c === 'string' ? { name: c, shortName: c } : c);
            if (callbacks.onCollegesLoaded) callbacks.onCollegesLoaded(list);
        } else {
            if (callbacks.onCollegesLoaded) callbacks.onCollegesLoaded([]);
        }
    }).catch(error => {
        console.error("學院排序設定檔載入失敗，採用空資料:", error);
        if (callbacks.onCollegesLoaded) callbacks.onCollegesLoaded([]);
    });

    // 5. 取得系所基礎對照清單
    getDocs(collection(db, "departments")).then(snap => {
        const depts = snap.docs.map(d => d.data());
        depts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
        if (callbacks.onDeptsLoaded) callbacks.onDeptsLoaded(depts);
    }).catch(error => {
        console.error("系所對照清單載入失敗，採用空資料:", error);
        if (callbacks.onDeptsLoaded) callbacks.onDeptsLoaded([]);
    });
}

/**
 * 即時訂閱實習紀錄主表變更 (加入 Error Callback 防止載入卡死)
 */
export function subscribeToRecords(onUpdate) {
    return onSnapshot(recordsCol, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate(records);
    }, (error) => {
        console.error("實習紀錄主表監聽失敗 (請確認安全規則)，採用空資料載入:", error);
        onUpdate([]); // 仍傳送空陣列，讓渲染能繼續執行以清除加載狀態
    });
}

/**
 * 單筆新增實習紀錄
 */
export async function addRecord(payload) {
    return await addDoc(recordsCol, {
        ...payload,
        created_at: serverTimestamp()
    });
}

/**
 * 單筆更新實習紀錄
 */
export async function updateRecord(id, payload) {
    return await updateDoc(doc(db, "internship_records", id), {
        ...payload,
        updated_at: serverTimestamp()
    });
}

/**
 * 單筆刪除實習紀錄
 */
export async function deleteRecord(id) {
    return await deleteDoc(doc(db, "internship_records", id));
}

/**
 * 批次刪除實習紀錄
 */
export async function batchDeleteRecords(ids) {
    for (const id of ids) {
        await deleteDoc(doc(db, "internship_records", id));
    }
}
