import { doc, getDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);

    // 1. 渲染 UI 
    container.innerHTML = `
    <div class="p-6 space-y-6 h-full custom-scroll overflow-y-auto" style="background: var(--bg);">
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                    <i class="ti ti-users-plus"></i>
                </div>
                <div>
                    <h1 class="text-sm font-bold text-gray-900">修課名單匯入</h1>
                    <p class="text-[11px] text-gray-400 mt-0.5">上傳教務處修課明細，自動建立名單並連動填報進度</p>
                </div>
            </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fade">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 class="text-[13px] font-bold text-gray-800 flex items-center gap-2">
                    <i class="ti ti-upload text-blue-600"></i> 上傳修課明細 CSV 檔
                </h3>
            </div>
            <div class="p-6 space-y-4">
                <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800 leading-relaxed">
                    <span class="font-bold">欄位順序要求 (請包含標題列)：</span><br>
                    學年, 學期, 開課學制, 開課學院, 開課學系, 選課代號, 課程名稱, 實習課程屬性, 實習學分數, 學院, 學系, 學號, 姓名, 學生年級, 性別
                    <br><br>
                    <span class="text-gray-500">* 若遇退選學生，請上傳最新版名單，系統會自動覆蓋並重新計算該課程的應填報人次。</span>
                </div>

                <div class="flex items-center gap-3">
                    <input type="file" id="input-roster-file" accept=".csv" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-md cursor-pointer" />
                    <button id="btn-parse-file" class="btn btn-primary whitespace-nowrap px-6 py-2.5 rounded-md font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition">
                        <i class="ti ti-file-analytics"></i> 解析檔案
                    </button>
                </div>
            </div>
        </div>

        <div id="preview-section" class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hidden">
            <div class="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 class="text-[13px] font-bold text-gray-800">資料解析預覽 (以課程為單位彙整)</h3>
                <button id="btn-confirm-import" class="btn btn-success-solid px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition hidden">
                    <i class="ti ti-device-floppy"></i> 確認匯入並更新進度
                </button>
            </div>
            <div class="overflow-x-auto max-h-[400px] custom-scroll">
                <table class="w-full text-left border-collapse">
                    <thead class="sticky top-0 bg-gray-50 shadow-sm">
                        <tr class="text-[12px] font-bold text-gray-600 tracking-wider border-b border-gray-200">
                            <th class="py-3 px-6">學年/學期</th>
                            <th class="py-3 px-6">開課系所</th>
                            <th class="py-3 px-6">課程代號 / 名稱</th>
                            <th class="py-3 px-6">修課人數</th>
                        </tr>
                    </thead>
                    <tbody id="preview-tbody" class="divide-y divide-gray-100 text-[13px]"></tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    // 2. DOM 綁定與變數
    const fileInput = document.getElementById('input-roster-file');
    const btnParse = document.getElementById('btn-parse-file');
    const btnConfirm = document.getElementById('btn-confirm-import');
    const previewSection = document.getElementById('preview-section');
    const previewTbody = document.getElementById('preview-tbody');
    
    let parsedCoursesMap = {}; // 存放分群後的課程資料
    let parsedAcademicYear = ""; // 記錄這批資料是哪個學年度的 (用來更新進度表)

    // 3. 檔案解析事件
    btnParse.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) { alert("請先選擇 CSV 檔案！"); return; }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            // 簡易 CSV 解析 (考慮到有時會夾帶引號，使用較穩定的切分法)
            const rows = text.split('\n').filter(r => r.trim() !== '');
            if (rows.length <= 1) { alert("檔案內容為空或只有標題列！"); return; }

            parsedCoursesMap = {}; // 重置
            
            // 從第 2 列開始跑 (略過標題列)
            for (let i = 1; i < rows.length; i++) {
                let cols = []; let inQuotes = false; let currentVal = '';
                for (let char of rows[i]) {
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { cols.push(currentVal.trim()); currentVal = ''; }
                    else currentVal += char;
                }
                cols.push(currentVal.trim());

                if (cols.length >= 15) {
                    const year = cols[0]; const term = cols[1];
                    const courseDept = cols[4]; const courseCode = cols[5]; const courseName = cols[6];
                    
                    if (!year || !courseCode || !cols[11]) continue; // 略過無學年、無代碼、無學號的空行
                    
                    parsedAcademicYear = year; // 記錄學年度

                    // 產生 Document ID：114_1_CSIE101
                    const docId = `${year}_${term}_${courseCode}`;

                    // 若該門課還沒建立，先初始化
                    if (!parsedCoursesMap[docId]) {
                        parsedCoursesMap[docId] = {
                            doc_id: docId,
                            academic_year: year,
                            term: term,
                            course_dept: courseDept,
                            course_code: courseCode,
                            course_name: courseName,
                            students: []
                        };
                    }

                    // 把學生塞進這門課的陣列裡
                    parsedCoursesMap[docId].students.push({
                        student_college: cols[9],
                        student_dept: cols[10],
                        student_id: cols[11],
                        student_name: cols[12],
                        student_grade: cols[13],
                        gender: cols[14]
                    });
                }
            }

            // 渲染預覽表格
            previewTbody.innerHTML = '';
            const coursesArray = Object.values(parsedCoursesMap);
            
            if(coursesArray.length === 0) {
                alert("無法解析有效資料，請檢查欄位格式是否正確。");
                return;
            }

            coursesArray.forEach(c => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50/50";
                tr.innerHTML = `
                    <td class="py-3 px-6">${c.academic_year} - ${c.term}</td>
                    <td class="py-3 px-6 font-medium">${c.course_dept}</td>
                    <td class="py-3 px-6"><span class="text-xs text-gray-400 mr-2">${c.course_code}</span> ${c.course_name}</td>
                    <td class="py-3 px-6 font-bold text-blue-600">${c.students.length} 人</td>
                `;
                previewTbody.appendChild(tr);
            });

            previewSection.classList.remove('hidden');
            btnConfirm.classList.remove('hidden');
        };
        reader.readAsText(file, 'UTF-8'); // 預設讀取 UTF-8
    });

    // 4. 確認寫入事件 (使用 Batch 批次寫入節省效能與保證一致性)
    btnConfirm.addEventListener('click', async () => {
        if (Object.keys(parsedCoursesMap).length === 0) return;
        if (!confirm(`系統將寫入 ${Object.keys(parsedCoursesMap).length} 門課程的名單，並自動更新 ${parsedAcademicYear} 學年度填報進度。\n（若課程已存在，將以本次名單完全覆蓋），確定要繼續嗎？`)) return;

        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> 寫入中...';

        try {
            const batch = writeBatch(db);
            const deptCountMap = {}; // 用來統計各系所總應填報人次
            
            // 準備寫入名單資料表 course_rosters
            Object.values(parsedCoursesMap).forEach(course => {
                const docRef = doc(db, "course_rosters", course.doc_id);
                batch.set(docRef, {
                    academic_year: course.academic_year,
                    term: course.term,
                    course_dept: course.course_dept,
                    course_code: course.course_code,
                    course_name: course.course_name,
                    enroll_count: course.students.length, // 計算最新人數
                    students: course.students,
                    updated_at: new Date()
                });

                // 累計各系所人次 (為了連動更新 Progress)
                if(!deptCountMap[course.course_dept]) deptCountMap[course.course_dept] = 0;
                deptCountMap[course.course_dept] += course.students.length;
            });

            // 執行 Batch 寫入名單
            await batch.commit();

            // 🌟 核心連動：讀取並更新 report_progress
            const progressRef = doc(db, "report_progress", parsedAcademicYear);
            const progressSnap = await getDoc(progressRef);
            let currentTargets = progressSnap.exists() ? (progressSnap.data().targets || {}) : {};

            // 將剛剛算出來的新名單人數，無情覆蓋進去
            Object.keys(deptCountMap).forEach(dept => {
                currentTargets[dept] = deptCountMap[dept];
            });

            // 存回進度表
            await setDoc(progressRef, {
                targets: currentTargets,
                updated_at: new Date(),
                last_import_time: new Date() // 記錄最後匯入時間
            }, { merge: true });

            alert(`✅ 成功匯入 ${Object.keys(parsedCoursesMap).length} 門課程！\n${parsedAcademicYear} 學年度的各系所「應填報目標人次」已自動更新完畢。`);
            
            // 清空畫面狀態
            fileInput.value = '';
            previewSection.classList.add('hidden');
            btnConfirm.classList.add('hidden');
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = '<i class="ti ti-device-floppy"></i> 確認匯入並更新進度';
            
        } catch (error) {
            console.error("匯入失敗:", error);
            alert("匯入失敗: " + error.message);
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = '<i class="ti ti-alert-triangle"></i> 重試匯入';
        }
    });
}
