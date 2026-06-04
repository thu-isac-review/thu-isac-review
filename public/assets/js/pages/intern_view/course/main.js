import { auth, fetchCollegesAndDepts, subscribeCourses } from '../../../components/CourseTable/data.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { bindEvents } from '../../../components/CourseTable/events.js';
import { state } from '../../../components/CourseTable/state.js';
import { populateAllFiltersUI, updateBatchActionBar, renderTable } from '../../../components/CourseTable/ui.js';
import { renderEmptyState } from '../../../components/CourseTable/render.js';

// 【檢視端入口】 - 僅供學生或一般人員檢視，無修改權限
document.addEventListener('DOMContentLoaded', () => {
    // 依然需要綁定 UI 互動事件 (搜尋、Dropdown篩選、分頁等)
    bindEvents();

    // 針對檢視端，動態隱藏具有破壞性操作的 UI (防呆)
    // 實務上您也可能會有另一份乾淨的 public/intern_view/course.html，那就不需要下面這些隱藏邏輯
    const toolbarActions = document.querySelector('.toolbar-actions');
    if (toolbarActions) toolbarActions.style.display = 'none'; // 隱藏新增、匯出、匯入按鈕
    
    // 監聽 Firebase Auth 狀態
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                await fetchCollegesAndDepts();
                subscribeCourses(
                    // onData
                    () => {
                        populateAllFiltersUI();
                        state.selectedIds = [];
                        updateBatchActionBar();
                        renderTable();
                        
                        // 渲染完表格後，隱藏每列的編輯與刪除按鈕
                        document.querySelectorAll('.row-actions').forEach(el => el.style.display = 'none');
                        // 隱藏 Checkbox 欄位 (如果不需要批次操作)
                        document.querySelectorAll('.col-checkbox').forEach(el => el.style.display = 'none');
                    },
                    // onError
                    (error) => {
                        document.getElementById('table-body').innerHTML = renderEmptyState('error');
                        console.error(error);
                    }
                );
            } catch (err) {
                console.error("載入初始化資料失敗:", err);
                document.getElementById('table-body').innerHTML = renderEmptyState('error');
            }
        } else {
            document.getElementById('table-body').innerHTML = renderEmptyState('unauth');
        }
    });
});
