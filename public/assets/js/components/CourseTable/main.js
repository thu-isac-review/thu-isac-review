import { auth, fetchCollegesAndDepts, subscribeCourses } from '../../../components/CourseTable/data.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { bindEvents } from '../../../components/CourseTable/events.js';
import { state } from '../../../components/CourseTable/state.js';
import { populateAllFiltersUI, updateBatchActionBar, renderTable } from '../../../components/CourseTable/ui.js';
import { renderEmptyState } from '../../../components/CourseTable/render.js';

document.addEventListener('DOMContentLoaded', () => {
    // 綁定所有事件與 Global Window Functions，讓 HTML 的 onclick 可以繼續運作
    bindEvents();

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
