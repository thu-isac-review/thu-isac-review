import { state, setReadOnly } from './state.js';
import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { fetchCourses, fetchCollegesAndDepts } from './data.js';

export async function render(containerId, context) {
    // 1. 初始化資料庫連線與設定模式
    state.db = context.db;
    
    // 🌟 接收並設定當前是否為唯讀模式 (true 代表前台瀏覽，false 代表後台管理)
    setReadOnly(context.isReadOnly === true);

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`找不到容器 ID: ${containerId}`);
        return;
    }
    
    // 2. 狀態重設 (非常重要！)
    // 因為 SPA 單頁應用程式切換頁面時，變數還會活在記憶體裡
    // 所以每次重新進入這個畫面，都要把頁碼、勾選項、篩選器清空
    state.selectedIds = [];
    state.currentPage = 1;
    state.editingId = null;
    
    // 清空所有篩選器 Set
    Object.values(state.filters).forEach(set => set.clear());
    
    // 預設排序：依據學年度由新到舊
    state.sortCol = 'academic_year';
    state.sortDir = 'desc';

    try {
        // 3. 依序執行初始化流程 (順序不能錯)
        
        // 步驟 A: 載入 HTML 模板，如果是唯讀模式，會在這邊把新增/編輯按鈕藏起來
        await injectUI(container);
        
        // 步驟 B: 獲取「學院」與「學系」的基礎資料，用來給篩選器的下拉選單使用
        await fetchCollegesAndDepts();
        
        // 步驟 C: 綁定所有的點擊、輸入等 DOM 事件
        bindEvents(container);
        
        // 步驟 D: 載入真正的實習課程資料，並畫出表格
        await fetchCourses();

    } catch (error) {
        console.error("CourseTable 模組初始化失敗:", error);
        container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--danger);">載入課程模組時發生錯誤，請重新整理頁面。</div>`;
    }
}
