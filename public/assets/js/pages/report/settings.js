import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function render(containerId, context) {
    const db = context.db;
    const container = document.getElementById(containerId);

    // 1. 渲染畫面 UI (沿用系統的 Tailwind CSS 與 Tabler Icons 風格)
    container.innerHTML = `
    <div class="p-6 space-y-6 h-full custom-scroll overflow-y-auto" style="background: var(--bg);">
        <!-- 頁面標題 -->
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

        <!-- 設定卡片 -->
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
                        <input type="text" id="input-default-year" placeholder="例如: 114" required
                            class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all max-w-xs" />
                        <p class="text-xs text-gray-400 mt-1">此設定將作為「學2、學10資料匯出」及「填報進度」時的系統預設學年度。</p>
                    </div>
                    
                    <div class="pt-4 flex items-center gap-3">
                        <button type="submit" id="btn-save-settings" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm active:scale-95">
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

    // 3. 載入目前設定
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            inputYear.value = data.default_academic_year || '';
        }
    } catch (error) {
        console.error("載入設定失敗:", error);
        showStatus("載入失敗，請檢查網路狀態或重新整理", "error");
    }

    // 4. 表單提交儲存邏輯
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const yearVal = inputYear.value.trim();

        if (!yearVal) {
            showStatus("請輸入學年度", "error");
            return;
        }

        // 鎖定按鈕並顯示 Loading
        btnSave.disabled = true;
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = `<i class="ti ti-loader-2 ti-spin"></i> 儲存中...`;

        try {
            // 使用 merge: true 以避免覆蓋未來可能新增的其他設定欄位
            await setDoc(docRef, {
                default_academic_year: yearVal,
                updated_at: new Date()
            }, { merge: true });
            
            showStatus("設定已成功儲存！", "success");
        } catch (error) {
            console.error("儲存設定失敗:", error);
            showStatus("儲存失敗: " + error.message, "error");
        } finally {
            // 恢復按鈕狀態
            btnSave.disabled = false;
            btnSave.innerHTML = originalText;
        }
    });

    // 5. 提示訊息顯示函式
    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `text-xs font-bold transition-opacity duration-300 opacity-100 ${type === 'success' ? 'text-emerald-600' : 'text-red-600'}`;
        
        // 3 秒後自動隱藏
        setTimeout(() => {
            statusMsg.classList.remove('opacity-100');
            statusMsg.classList.add('opacity-0');
        }, 3000);
    }
}
