import { collection, onSnapshot, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { renderTable, populateCollegesUI } from './render.js';

export function setupDataListener(containerId) {
    const db = state.db;
    
    // 監聽主 Collection
    const dataCollection = collection(db, "internship_students");
    const unsubscribe = onSnapshot(dataCollection, async (snapshot) => {
        // 阻斷閥門：如果當前頁面已被 SPA 清空，不執行後續處理
        if (!document.getElementById('student-table-body')) return;

        // 加載設定檔資料
        if (state.orderedColleges.length === 0) {
            const collegeSnap = await getDoc(doc(db, "settings", "colleges"));
            if (collegeSnap.exists()) {
                const rawList = collegeSnap.data().list || [];
                state.orderedColleges = rawList.map(c => typeof c === 'string' ? { name: c, shortName: c } : c);
            }
        }

        if (state.globalDepts.length === 0) {
            const deptSnap = await getDocs(collection(db, "departments"));
            state.globalDepts = deptSnap.docs.map(d => d.data());
            state.globalDepts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
        }

        populateCollegesUI();

        state.allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        state.selectedIds = [];
        
        // 更新批次操作列介面
        const bar = document.getElementById('batch-bar');
        if (bar) bar.classList.remove('visible');
        
        renderTable();
    }, (error) => {
        const tbody = document.getElementById('student-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="ti ti-lock empty-icon" style="color:var(--danger); opacity:1;"></i><div class="empty-text">資料讀取失敗，權限不足。</div></td></tr>`;
        }
    });

    return unsubscribe;
}
