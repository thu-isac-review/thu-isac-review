import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { state, filterDefinitions, tableColumns } from "./state.js";
import { renderTable, renderFilterDropdowns, updateColumnVisibility } from "./render.js";
import { updateBatchActionBar, handleBatchDelete, updateFilterVisibility } from "./events.js";
import { updateRespDeptOptions, renderStudentDropdown } from "./ui.js";

// 註冊全局對象以便 HTML onclick 直接存取
window.state = state;
window.renderTable = renderTable;
window.updateBatchActionBar = updateBatchActionBar;
window.updateFilterVisibility = updateFilterVisibility;

export function initInternshipRecords(firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app); 
    const db = getFirestore(app);
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onSnapshot(collection(db, "internship_students"), (snap) => state.allStudents = snap.docs.map(d => ({id: d.id, ...d.data()})));
            onSnapshot(collection(db, "internship_institutions"), (snap) => state.allInsts = snap.docs.map(d => ({id: d.id, ...d.data()})));
            onSnapshot(collection(db, "internship_courses"), (snap) => { 
                state.allCourses = snap.docs.map(d => ({id: d.id, ...d.data()})); 
                state.allCourses.sort((a,b) => (b.academic_year+b.term).localeCompare(a.academic_year+a.term)); 
            });
            getDoc(doc(db, "settings", "colleges")).then(snap => { if (snap.exists()) state.orderedColleges = snap.data().list.map(c => typeof c === 'string' ? { name: c, shortName: c } : c); });
            getDocs(collection(db, "departments")).then(snap => {
                state.globalDepts = snap.docs.map(d => d.data());
                state.globalDepts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
            });

            onSnapshot(collection(db, "internship_records"), (snapshot) => {
                state.allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderFilterDropdowns(); 
                state.selectedIds = []; 
                updateBatchActionBar(); 
                renderTable();
            });
            setupListeners();
        }
    });
}

function setupListeners() {
    document.getElementById('search-input')?.addEventListener('input', () => {
        state.currentPage = 1;
        renderTable();
    });
}
