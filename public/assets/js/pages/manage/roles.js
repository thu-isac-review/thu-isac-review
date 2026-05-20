import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 模組內部全域狀態（儲存在記憶體，切換頁面後若不清空，可視需求保留）
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentEditingId = null;
let currentDb = null; // 接收主框架傳來的 db 實例

// 對主框架開放的唯一渲染入口
export async function render(containerId, context) {
    const container = document.getElementById(containerId);
    currentDb = context.db;

    // 1. 注入純 UI 結構 (完全不包含 head/body，完美融入主框架)
    container.innerHTML = `
        <div class="max-w-7xl mx-auto space-y-6 animate-fade pb-10">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-xl font-bold text-gray-900 tracking-tight">用戶權限管理</h1>
                    <p class="text-xs text-gray-400 mt-1">管理全校各系所審查助教、教師及系統管理員之核心存取權限。</p>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><div class="text-[10px] font-bold text-gray-400 uppercase">總註冊用戶</div><div class="text-2xl font-bold text-gray-900 mt-1" id="statTotal">0</div></div>
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><div class="text-[10px] font-bold text-blue-500 uppercase">系統管理員 (Admin)</div><div class="text-2xl font-bold text-blue-600 mt-1" id="statAdmin">0</div></div>
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><div class="text-[10px] font-bold text-emerald-500 uppercase">審查教師 (Teacher)</div><div class="text-2xl font-bold text-emerald-600 mt-1" id="statTeacher">0</div></div>
                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><div class="text-[10px] font-bold text-gray-400 uppercase">一般用戶 (User)</div><div class="text-2xl font-bold text-gray-700 mt-1" id="statUser">0</div></div>
            </div>

            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div class="w-full md:w-96 relative">
                    <i class="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="rolesSearchBar" placeholder="搜尋姓名、電子郵件或單位..." class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:border-blue-600 focus:outline-none transition">
                </div>
                <select id="rolesFilter" class="w-full md:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 focus:bg-white focus:outline-none transition">
                    <option value="all">所有權限角色</option>
                    <option value="admin">系統管理員</option>
                    <option value="teacher">審查教師</option>
                    <option value="user">一般用戶</option>
                </select>
            </div>

            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase">
                            <tr><th class="py-3 px-4">基本資料</th><th class="py-3 px-4">電子郵件</th><th class="py-3 px-4">單位層級</th><th class="py-3 px-4">權限角色</th><th class="py-3 px-4 text-center">操作</th></tr>
                        </thead>
                        <tbody id="userTableBody" class="divide-y divide-gray-100 text-xs text-gray-700">
                            <tr><td colspan="5" class="py-8 text-center text-blue-600"><i class="ti ti-loader icon-spin mr-2"></i>同步資料庫中...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-col sm:flex-row gap-3">
                    <div class="text-[11px] text-gray-400" id="pageInfo">顯示第 0 到 0 筆</div>
                    <div class="flex items-center gap-1" id="paginationControls"></div>
                </div>
            </div>
        </div>

        <div id="roleEditModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden opacity-0 transition-opacity duration-200">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md transform scale-95 transition-transform duration-200" id="roleModalCard">
                <div class="px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-sm font-bold text-gray-900"><i class="ti ti-shield-cog text-blue-600"></i> 編輯用戶權限</h3>
                    <button id="btnModalClose" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x text-lg"></i></button>
                </div>
                <div class="p-5 space-y-4">
                    <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg"><div class="font-bold text-xs" id="modalName"></div><div class="text-[10px] text-gray-400" id="modalEmail"></div></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-[11px] font-bold text-gray-400 mb-1">一級單位</label><input type="text" id="modalL1" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs"></div>
                        <div><label class="block text-[11px] font-bold text-gray-400 mb-1">二級單位</label><input type="text" id="modalL2" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs"></div>
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 mb-1">權限角色</label>
                        <select id="modalRole" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                            <option value="user">一般用戶 (User)</option>
                            <option value="teacher">審查教師 (Teacher)</option>
                            <option value="admin">系統管理員 (Admin)</option>
                        </select>
                    </div>
                </div>
                <div class="px-5 py-3 bg-gray-50 flex justify-end gap-2 border-t border-gray-200">
                    <button id="btnModalCancel" class="px-4 py-2 border bg-white hover:bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold">取消</button>
                    <button id="btnModalSave" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">確認儲存</button>
                </div>
            </div>
        </div>
    `;

    // 2. 綁定事件監聽器 (因為 DOM 剛注入，現在綁定才有效)
    document.getElementById('rolesSearchBar').addEventListener('input', applyFilters);
    document.getElementById('rolesFilter').addEventListener('change', applyFilters);
    document.getElementById('btnModalClose').addEventListener('click', closeModal);
    document.getElementById('btnModalCancel').addEventListener('click', closeModal);
    document.getElementById('btnModalSave').addEventListener('click', saveChanges);

    // 💡 運用事件代理 (Event Delegation) 處理動態產生的表格按鈕
    document.getElementById('userTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('.edit-btn');
        if (btn) openModal(btn.dataset.id);
    });

    // 3. 執行單次資料庫讀取
    await fetchUsersOnce();
}

// === 以下皆為內部邏輯模組化方法 ===

async function fetchUsersOnce() {
    try {
        const snapshot = await getDocs(collection(currentDb, "users"));
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 建立防呆預設管理員顯示
        if(!allUsers.some(u => u.email === 'thu.isac.review@gmail.com')) {
            allUsers.push({ id: "sys_admin", name: "預設管理者", email: "thu.isac.review@gmail.com", role: "admin", level1Unit: "實習中心" });
        }
        applyFilters();
    } catch (err) {
        document.getElementById('userTableBody').innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-500">❌ 資料讀取失敗。</td></tr>`;
    }
}

function applyFilters() {
    const query = document.getElementById('rolesSearchBar').value.toLowerCase();
    const roleF = document.getElementById('rolesFilter').value;

    filteredUsers = allUsers.filter(u => {
        const matchRole = roleF === 'all' || (u.role || 'user') === roleF;
        const matchStr = `${u.name||''} ${u.email||''} ${u.level1Unit||''}`.toLowerCase().includes(query);
        return matchRole && matchStr;
    });

    currentPage = 1;
    renderTable();
    updateStats();
}

function updateStats() {
    document.getElementById('statTotal').textContent = allUsers.length;
    document.getElementById('statAdmin').textContent = allUsers.filter(u => u.role === 'admin').length;
    document.getElementById('statTeacher').textContent = allUsers.filter(u => u.role === 'teacher').length;
    document.getElementById('statUser').textContent = allUsers.filter(u => u.role === 'user' || !u.role).length;
}

function renderTable() {
    const tbody = document.getElementById('userTableBody');
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-400">沒有符合條件的資料。</td></tr>`;
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filteredUsers.slice(start, start + rowsPerPage);

    tbody.innerHTML = pageData.map(u => {
        const r = u.role || 'user';
        const badge = r === 'admin' ? '<span class="px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">管理員</span>' :
                      r === 'teacher' ? '<span class="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold">教師</span>' :
                      '<span class="px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">一般用戶</span>';
        
        return `
            <tr class="hover:bg-gray-50 border-b border-gray-50">
                <td class="py-3 px-4 font-bold text-gray-900">${u.name || '未命名'}</td>
                <td class="py-3 px-4 text-gray-500 font-mono">${u.email || ''}</td>
                <td class="py-3 px-4 text-gray-600">${u.level1Unit || '-'} / ${u.level2Unit || '-'}</td>
                <td class="py-3 px-4">${badge}</td>
                <td class="py-3 px-4 text-center">
                    <button data-id="${u.id}" class="edit-btn p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><i class="ti ti-edit"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('pageInfo').textContent = `顯示第 ${start + 1} 到 ${Math.min(start + rowsPerPage, filteredUsers.length)} 筆，共 ${filteredUsers.length} 筆`;
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
    const container = document.getElementById('paginationControls');
    let html = '';
    
    // 簡單的上一頁下一頁按鈕渲染
    html += `<button id="btnPrev" class="p-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" ${currentPage === 1 ? 'disabled style="opacity:0.5"' : ''}><i class="ti ti-chevron-left text-sm"></i></button>`;
    html += `<span class="text-xs font-bold text-gray-600 mx-2">${currentPage} / ${totalPages || 1}</span>`;
    html += `<button id="btnNext" class="p-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" ${currentPage >= totalPages ? 'disabled style="opacity:0.5"' : ''}><i class="ti ti-chevron-right text-sm"></i></button>`;
    
    container.innerHTML = html;

    // 重新綁定分頁按鈕事件
    const prev = document.getElementById('btnPrev');
    const next = document.getElementById('btnNext');
    if(prev && !prev.disabled) prev.onclick = () => { currentPage--; renderTable(); };
    if(next && !next.disabled) next.onclick = () => { currentPage++; renderTable(); };
}

function openModal(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    currentEditingId = id;
    
    document.getElementById('modalName').textContent = user.name || '未命名';
    document.getElementById('modalEmail').textContent = user.email;
    document.getElementById('modalL1').value = user.level1Unit || '';
    document.getElementById('modalL2').value = user.level2Unit || '';
    document.getElementById('modalRole').value = user.role || 'user';

    const modal = document.getElementById('roleEditModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('roleModalCard').classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('roleEditModal');
    modal.classList.add('opacity-0');
    document.getElementById('roleModalCard').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

async function saveChanges() {
    if (!currentEditingId) return;
    const btn = document.getElementById('btnModalSave');
    btn.disabled = true; btn.innerHTML = '儲存中...';

    const payload = {
        level1Unit: document.getElementById('modalL1').value.trim(),
        level2Unit: document.getElementById('modalL2').value.trim(),
        role: document.getElementById('modalRole').value
    };

    try {
        if (currentEditingId !== 'sys_admin') {
            await updateDoc(doc(currentDb, "users", currentEditingId), payload);
        }
        
        // 💡 0 消耗秘訣：直接修改記憶體，不呼叫 getDocs
        const idx = allUsers.findIndex(u => u.id === currentEditingId);
        if (idx > -1) allUsers[idx] = { ...allUsers[idx], ...payload };

        applyFilters(); // 重新渲染畫面
        closeModal();
    } catch (err) {
        alert('儲存失敗，請檢查網路或權限。');
    } finally {
        btn.disabled = false; btn.innerHTML = '確認儲存';
    }
}
