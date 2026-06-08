// 模組主入口：整合各個子模組
import { state } from './state.js';
import { renderTable, updateUIPermissions } from './render.js';
import { bindEvents } from './events.js';
import { fetchStudentsData, saveStudentData, deleteStudentData } from './data.js';
import { hideModal } from './ui.js';

export async function initStudentTable(config = {}) {
    // 初始化設定 (例如是否為管理員)
    state.isManageMode = config.isManageMode || false;
    
    updateUIPermissions();
    bindEvents();
    
    // 首次載入資料
    await loadAndRenderStudents();
}

export async function loadAndRenderStudents() {
    try {
        state.students = await fetchStudentsData();
        renderTable();
    } catch (error) {
        console.error('載入學生資料失敗:', error);
    }
}

export async function handleSaveStudent(studentData) {
    try {
        await saveStudentData(studentData);
        hideModal();
        await loadAndRenderStudents(); // 重新整理表格
    } catch (error) {
        console.error('儲存失敗:', error);
    }
}

export async function handleDeleteStudent(id) {
    try {
        await deleteStudentData(id);
        await loadAndRenderStudents(); // 重新整理表格
    } catch (error) {
        console.error('刪除失敗:', error);
    }
}
