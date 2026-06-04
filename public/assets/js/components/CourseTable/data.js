import { state } from './state.js';

// TODO: 將下方替換為實際的 API 或 Firebase 讀取邏輯
export async function fetchCourses() {
    console.log('正在獲取課程資料...');
    // 模擬非同步請求
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                // 模擬預設資料
                { id: '1', courseCode: 'CS101', name: '計算機概論', department: '資訊工程系', teacher: '王大明' }
            ]);
        }, 500);
    });
}

// TODO: 將下方替換為實際的 API 或 Firebase 儲存邏輯 (包含新增與更新)
export async function saveCourse(courseData) {
    console.log('正在儲存課程資料...', courseData);
    return new Promise((resolve) => setTimeout(resolve, 500));
}

// TODO: 將下方替換為實際的 API 或 Firebase 刪除邏輯
export async function deleteCourse(id) {
    console.log('正在刪除課程...', id);
    return new Promise((resolve) => setTimeout(resolve, 500));
}
