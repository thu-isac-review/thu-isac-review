// public/assets/js/pages/intern_manage/course/main.js
import { initCourseTable } from '../../../components/CourseTable/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // 從全域變數或獨立模組獲取 db 實例 (這裡假設已在全域定義 firebase 和 db)
    // 依據您的專案結構，可能需要 import db from '你的_firebase_設定檔.js';
    
    // 假設 db 在這裡已經可以被取得
    const db = firebase.firestore();

    // 初始化課程表格模組，設定角色為 'intern_manage' (具有編輯/刪除權限)
    initCourseTable(db, 'intern_manage');
});
