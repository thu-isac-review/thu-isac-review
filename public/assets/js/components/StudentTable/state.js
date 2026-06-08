// 狀態管理模組：負責儲存與維護元件狀態
export const state = {
    students: [],
    filters: {
        keyword: '',
        status: ''
    },
    isManageMode: false // 判斷是否為管理員視角（影響編輯/刪除按鈕與新增功能）
};
