import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);

    // 1. 渲染畫面 UI
    container.innerHTML = `
    <div class="p-6 space-y-6 h-full custom-scroll overflow-y-auto" style="background: var(--bg);">
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                    <i class="ti ti-settings"></i>
                </div>
                <div>
                    <h1 class="text-sm font-bold text-gray-900">填報格式設定</h1>
                    <p class="text-[11px] text-gray-400 mt-0.5">管理校庫填報作業的各項預設參數</p>
                </div>
            </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-2xl animate-fade">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <i class="ti ti-calendar-stats text-blue-600"></i> 預設學年度設定
                </h3>
            </div>
            <div class="p-6">
                <form id="report-settings-form" class="space-y-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            預設學年度 <span class="text-red-500">*</span>
                        </label>
                        <select id="input-default-year" required disabled
                            class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all max-w-xs bg-gray-50 cursor-wait">
                            <option value="" disabled selected>系統資料讀取中...</option>
                        </select>
                        <p class="text-xs text-gray-400 mt-1">此學年度將作為「學2、學10資料匯出」及「填報進度追蹤」時的系統預設值（僅顯示系統內已建立過課程的學年度）。</p>
                    </div>
                    
                    <div class="pt-4 flex items-center gap-3">
                        <button type="submit" id="btn-save-settings" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="ti ti-device-floppy"></i> 儲存設定
                        </button>
                        <span id="save-status-msg" class="text-xs font-bold opacity-0 transition-opacity duration-300"></span>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    // 2. DOM 元素綁定
    const inputYear = document.getElementById('input-default-year');
    const form = document.getElementById('report-settings-form');
    const btnSave = document.getElementById('btn-save-settings');
    const statusMsg = document.getElementById('save-status-msg');

    // 定義 Firestore 的存取路徑
    const docRef = doc(db, "settings", "report");

    // 3. 從資料庫抓取系統現有學年度並生成選項
    try {
        // 去抓取 courses 集合 (您也可以改成 intern_records 集合)
        const coursesSnap = await getDocs(collection(db, "courses"));
        const yearSet = new Set();
        
        coursesSnap.forEach(doc => {
            const data = doc.data();
            if (data.academic_year) {
                // 將抓到的學年度加入 Set 自動去除重複
                yearSet.add(data.academic_year.toString());
            }
        });

        // 轉回陣列並由大到小排序 (越新的學年度排越上面)
        const sortedYears = Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));

        // 清空選項並重新放入
        inputYear.innerHTML = `<option value="" disabled selected>請選擇學年度...</option>`;
        
        if (sortedYears.length > 0) {
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `${y} 學年度`;
                inputYear.appendChild(opt);
            });
        } else {
            // 防呆：如果系統裡一筆資料都沒有
            inputYear.innerHTML = `<option value="" disabled selected>系統內尚無任何學年度資料</option>`;
        }

        // 解除 disabled 狀態
        inputYear.disabled = false;
        inputYear.classList.remove('bg-gray-50', 'cursor-wait');
        inputYear.classList.add('bg-white', 'cursor-pointer');

        // 4. 載入目前的設定值 (如果有存過的話，自動選取它)
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.default_academic_year && sortedYears.includes(data.default_academic_year)) {
                inputYear.value = data.default_academic_year;
            }
        }
    } catch (error) {
        console.error("載入系統學年度失敗:", error);
        showStatus("資料庫讀取失敗，請檢查網路連線", "error");
        inputYear.innerHTML = `<option value="" disabled selected>資料載入失敗</option>`;
    }

    // 5. 表單提交儲存邏輯
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const yearVal = inputYear.value;

        if (!yearVal) {
            showStatus("請選擇學年度", "error");
            return;
        }

        btnSave.disabled = true;
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = `<i class="ti ti-loader-2 ti-spin"></i> 儲存中...`;

        try {
            await setDoc(docRef, {
                default_academic_year: yearVal,
                updated_at: new Date()
            }, { merge: true });
            
            showStatus("設定已成功儲存！", "success");
        } catch (error) {
            console.error("儲存設定失敗:", error);
            showStatus("儲存失敗: " + error.message, "error");
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = originalText;
        }
    });

    // 6. 狀態訊息顯示函式
    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `text-xs font-bold transition-opacity duration-300 opacity-100 ${type === 'success' ? 'text-emerald-600' : 'text-red-600'}`;
        
        setTimeout(() => {
            statusMsg.classList.remove('opacity-100');
            statusMsg.classList.add('opacity-0');
        }, 3000);
    }
}
