// public/assets/js/components/CourseTable/data.js
import { state, updateState } from './state.js';
import { renderTable } from './render.js';
import { updateFilters } from './events.js';

export async function fetchCourses(db) {
    try {
        const querySnapshot = await db.collection("intern_courses").get();
        const courses = [];
        querySnapshot.forEach((doc) => {
            courses.push({ id: doc.id, ...doc.data() });
        });

        // 預設以學年度降序排列
        courses.sort((a, b) => {
            return (b.academic_year || '').localeCompare(a.academic_year || '');
        });

        updateState({ allCourses: courses, filteredCourses: courses });
        renderTable();
        updateFilters(); // 初始化過濾器選項
    } catch (error) {
        console.error("Error fetching courses:", error);
        alert("載入課程資料失敗，請稍後再試。");
    }
}

export async function saveCourse(db, courseId, data) {
    try {
        if (courseId) {
            // 更新現有課程
            await db.collection("intern_courses").doc(courseId).update(data);
            console.log("Course updated successfully");
        } else {
            // 新增課程
            await db.collection("intern_courses").add(data);
            console.log("Course added successfully");
        }
        await fetchCourses(db); // 重新載入資料
        return true;
    } catch (error) {
        console.error("Error saving course: ", error);
        alert("儲存失敗: " + error.message);
        return false;
    }
}

export async function deleteCourse(db, id) {
    try {
        await db.collection("intern_courses").doc(id).delete();
        console.log("Course successfully deleted!");
        await fetchCourses(db); // 重新載入資料
    } catch (error) {
        console.error("Error removing course: ", error);
        alert("刪除失敗，請稍後再試。");
    }
}
