import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';

export async function fetchInitialDataOnce() {
    const dataSnap = await getDocs(collection(state.db, "internship_institutions"));
    state.allData = dataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.selectedIds = [];
}

export async function handleInitialLoadEngine() {
    try {
        const recordsCol = collection(state.db, "internship_records");
        const recordSnap = await getDocs(recordsCol);
        state.allRecords = recordSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) { console.warn("歷史名單預載未完成", e); }
}

export async function executeSave(payload, isTypo = true) {
    if (state.editingId) {
        const batch = writeBatch(state.db);
        batch.update(doc(state.db, "internship_institutions", state.editingId), { ...payload, updated_at: serverTimestamp() });
        
        if (isTypo && state.editingOldData && state.editingOldData.name !== payload.name) {
            state.allRecords.forEach(record => {
                if (record.inst_id === state.editingId || (!record.inst_id && record.inst_raw === state.editingOldData.name)) {
                    batch.update(doc(state.db, "internship_records", record.id), { inst_raw: payload.name, updated_at: serverTimestamp() });
                }
            });
        }
        await batch.commit();
    } else {
        await addDoc(collection(state.db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
    }
}

export async function createInstitutionRaw(payload) {
    const docRef = await addDoc(collection(state.db, "internship_institutions"), { ...payload, created_at: serverTimestamp() });
    state.allData.unshift({ id: docRef.id, ...payload });
}

export async function deleteData(id) {
    await deleteDoc(doc(state.db, "internship_institutions", id));
}

export async function executeBatchEdit(indVal, venVal) {
    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => {
        const updates = { updated_at: serverTimestamp() };
        if (indVal !== 'NO_CHANGE') updates.industry = indVal;
        if (venVal !== 'NO_CHANGE') updates.venue_type = venVal;
        batch.update(doc(state.db, "internship_institutions", id), updates);
    });
    await batch.commit();
}

export async function executeMerge(masterId, masterInstName, instsToDelete, deletedNames) {
    const batch = writeBatch(state.db);
    state.allRecords.forEach(record => {
        if (instsToDelete.includes(record.inst_id) || (!record.inst_id && deletedNames.includes(record.inst_raw))) {
            batch.update(doc(state.db, "internship_records", record.id), { inst_id: masterId, updated_at: serverTimestamp() });
        }
    });
    state.allData.forEach(d => {
        if (instsToDelete.includes(d.parent_id)) { batch.update(doc(state.db, "internship_institutions", d.id), { parent_id: masterId }); }
    });
    instsToDelete.forEach(id => batch.delete(doc(state.db, "internship_institutions", id)));
    await batch.commit();
}

export async function batchDelete() {
    const batch = writeBatch(state.db);
    state.selectedIds.forEach(id => batch.delete(doc(state.db, "internship_institutions", id)));
    await batch.commit(); 
}

// 🌟 [新增] 執行批次設定總公司的資料庫寫入邏輯
export async function executeBatchSetParent(parentId) {
    if (!state.selectedIds || state.selectedIds.length === 0) return;
    
    const batch = writeBatch(state.db);
    
    state.selectedIds.forEach(id => {
        const instRef = doc(state.db, "internship_institutions", id);
        // 將 parent_id 指向目標總公司的 ID (若為空字串，則代表解除隸屬，變回獨立機構)
        batch.update(instRef, { 
            parent_id: parentId, 
            updated_at: serverTimestamp() 
        });
    });

    await batch.commit();
    state.selectedIds = []; // 批次執行完畢後清空選取
}


/**
 * 依統一編號查詢公司或商業登記資料
 * 優先使用支援 CORS 的 g0v 商工開放資料庫，失敗時透過 CORS Proxy 備援請求經濟部 API
 * 
 * @param {string} taxId - 8 碼統一編號
 * @returns {Promise<{name: string, city: string, address: string, type: string}|null>}
 */
export async function fetchCompanyInfoByTaxId(taxId) {
  const cleanTaxId = (taxId || '').trim();
  if (!/^\d{8}$/.test(cleanTaxId)) return null;

  // 1. 主要線路：g0v 開放商工 API（支援前端 CORS，同時包含公司登記與商業登記）
  try {
    const g0vUrl = `https://company.g0v.ronny.tw/api/show/${cleanTaxId}`;
    const resp = await fetch(g0vUrl);
    if (resp.ok) {
      const resData = await resp.json();
      if (resData && resData.data) {
        const item = resData.data;
        const name = item['公司名稱'] || item['商業名稱'] || item['營業人名稱'] || item.Company_Name || item.Busi_Name;
        const address = item['公司所在地'] || item['商業所在地'] || item['營業地址'] || item['地址'] || item.Company_Location || item.Busi_Address;
        const type = item['公司名稱'] ? '公司' : (item['商業名稱'] ? '商業登記' : '登記機構');

        if (name) {
          return parseCompanyData(name, address, type);
        }
      }
    }
  } catch (err) {
    console.warn('[AutoFill] g0v API 連線受阻，嘗試備援線路...', err);
  }

  // 2. 備援線路：透過 CORS 反向代理請求經濟部官方 API
  try {
    // 查詢公司登記
    const compApi = `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC10F8?$format=json&$filter=Business_Accounting_NO eq ${cleanTaxId}`;
    const compProxy = `https://corsproxy.io/?url=${encodeURIComponent(compApi)}`;
    const compResp = await fetch(compProxy);
    if (compResp.ok) {
      const compData = await compResp.json();
      if (Array.isArray(compData) && compData.length > 0) {
        return parseCompanyData(compData[0].Company_Name, compData[0].Company_Location, '公司');
      }
    }

    // 查詢商業登記（獨資/合夥）
    const busiApi = `https://data.gcis.nat.gov.tw/od/data/api/236EE382-4942-41A9-BD3A-169488B73E6E?$format=json&$filter=President_No eq ${cleanTaxId}`;
    const busiProxy = `https://corsproxy.io/?url=${encodeURIComponent(busiApi)}`;
    const busiResp = await fetch(busiProxy);
    if (busiResp.ok) {
      const busiData = await busiResp.json();
      if (Array.isArray(busiData) && busiData.length > 0) {
        return parseCompanyData(busiData[0].Busi_Name, busiData[0].Busi_Address, '商業登記');
      }
    }
  } catch (proxyErr) {
    console.error('[AutoFill] 備援代理請求失敗:', proxyErr);
  }

  return null;
}

/**
 * 解析地址與縣市
 */
function parseCompanyData(rawName, rawAddress, type) {
  const name = (rawName || '').trim();
  const cleanAddr = (rawAddress || '').replace(/^\d{3,5}\s*/, '').trim();
  const match = cleanAddr.match(/^(.{2}[縣市])/);
  const city = match ? match[1] : '';

  return {
    name,
    city,
    address: cleanAddr,
    type: type || '登記機構'
  };
}
