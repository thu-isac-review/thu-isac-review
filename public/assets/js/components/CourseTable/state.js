// 管理課程表格的全域狀態
export const state = {
    courses: [],          // 課程列表資料
    currentEditId: null,  // 當前正在編輯的課程 ID
    isSubmitting: false,  // 防止重複提交表單的狀態
    searchQuery: ''       // 搜尋關鍵字
};
