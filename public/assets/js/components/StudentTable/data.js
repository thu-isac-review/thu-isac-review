// 資料模組：負責與後端/Firebase進行資料互動
import { state } from './state.js';

export async function fetchStudentsData() {
    // 模擬 API 延遲與假資料，未來可替換為 Firebase 呼叫
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockData = [
                { id: '1', number: 's1090001', name: '王小明', department: '資工系', company: 'Google', status: 'active' },
                { id: '2', number: 's1090002', name: '李大華', department: '資管系', company: '', status: 'pending' },
                { id: '3', number: 's1080003', name: '張小芬', department: '電機系', company: '台積電', status: 'completed' }
            ];
            
            // 基礎本地過濾邏輯
            let filtered = mockData.filter(student => {
                const matchKeyword = student.name.includes(state.filters.keyword) || 
                                     student.number.includes(state.filters.keyword) ||
                                     student.department.includes(state.filters.keyword);
                const matchStatus = state.filters.status === '' || student.status === state.filters.status;
                return matchKeyword && matchStatus;
            });
            
            resolve(filtered);
        }, 300);
    });
}

export async function saveStudentData(studentData) {
    // 模擬儲存資料
    console.log('Saving student data:', studentData);
    return Promise.resolve({ success: true, data: studentData });
}

export async function deleteStudentData(studentId) {
    // 模擬刪除資料
    console.log('Deleting student ID:', studentId);
    return Promise.resolve({ success: true });
}
