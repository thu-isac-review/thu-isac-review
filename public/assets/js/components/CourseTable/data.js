import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';

// 初始化 Firebase
const firebaseConfig = { apiKey: "AIzaSyDcsGfvVKnGmCzWfK5F03saydFpNc1ReYY", authDomain: "thu-isac-review.firebaseapp.com", projectId: "thu-isac-review", storageBucket: "thu-isac-review.firebasestorage.app", messagingSenderId: "453299876735", appId: "1:453299876735:web:1d8babca3315423161a04a" };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 
export const db = getFirestore(app);
export const dataCollection = collection(db, "internship_courses");

// 讀取學院與系所設定
export async function fetchCollegesAndDepts() {
    const collegeSnap = await getDoc(doc(db, "settings", "colleges"));
    if (collegeSnap.exists()) {
        const rawList = collegeSnap.data().list || [];
        state.orderedColleges = rawList.map(c => typeof c === 'string' ? { name: c, shortName: c } : c);
    }

    const deptSnap = await getDocs(collection(db, "departments"));
    state.globalDepts = deptSnap.docs.map(d => d.data());
    state.globalDepts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
}

// 訂閱課程資料變更
export function subscribeCourses(onData, onError) {
    return onSnapshot(dataCollection, (snapshot) => {
        state.allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onData();
    }, onError);
}

// 儲存（新增/更新）課程資料
export async function saveCourse(payload, id = null) {
    if (id) {
        return await updateDoc(doc(db, "internship_courses", id), { ...payload, updated_at: serverTimestamp() });
    } else {
        return await addDoc(dataCollection, { ...payload, created_at: serverTimestamp() });
    }
}

// 刪除單筆課程
export async function deleteCourse(id) {
    return await deleteDoc(doc(db, "internship_courses", id));
}
