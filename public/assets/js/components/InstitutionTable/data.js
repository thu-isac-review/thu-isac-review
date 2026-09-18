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
 * 依統一編號向經濟部商工行政 API 查詢登記資料
 * 查詢策略：先查「公司登記」，若查無資料或回傳空值，則改查「商業登記」
 * 
 * @param {string} taxId - 8 碼統一編號
 * @returns {Promise<{name: string, city: string, address: string, type: string}|null>}
 */
export async function fetchCompanyInfoByTaxId(taxId) {
  const cleanTaxId = (taxId || '').trim();
  if (!/^\d{8}$/.test(cleanTaxId)) {
    return null;
  }

  try {
    // -------------------------------------------------------------
    // 1. 優先查詢：經濟部【公司登記基本資料】API
    // -------------------------------------------------------------
    const companyApiUrl = `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC10F8?$format=json&$filter=Business_Accounting_NO eq ${cleanTaxId}`;
    
    const companyResp = await fetch(companyApiUrl);
    if (companyResp.ok) {
      const companyData = await companyResp.json();
      if (Array.isArray(companyData) && companyData.length > 0) {
        const item = companyData[0];
        return parseCompanyData(item.Company_Name, item.Company_Location, '公司');
      }
    }

    // -------------------------------------------------------------
    // 2. 次要查詢：經濟部【商業登記基本資料】API（獨資、合夥、商號、行號）
    // -------------------------------------------------------------
    const busiApiUrl = `https://data.gcis.nat.gov.tw/od/data/api/236EE382-4942-41A9-BD3A-169488B73E6E?$format=json&$filter=President_No eq ${cleanTaxId}`;
    
    const busiResp = await fetch(busiApiUrl);
    if (busiResp.ok) {
      const busiData = await busiResp.json();
      if (Array.isArray(busiData) && busiData.length > 0) {
        const item = busiData[0];
        return parseCompanyData(item.Busi_Name, item.Busi_Address, '商業登記');
      }
    }

    return null; // 兩邊皆查無資料
  } catch (err) {
    console.error('[GCIS API Error] 經濟部 API 查詢失敗:', err);
    throw err;
  }
}

/**
 * 地址解析與格式標準化（拆解縣市與完整地址、過濾郵遞區號）
 */
function parseCompanyData(rawName, rawAddress, type) {
  const name = (rawName || '').trim();
  // 移除可能帶在前方的 3~5 碼郵遞區號
  const cleanAddr = (rawAddress || '').replace(/^\d{3,5}\s*/, '').trim();

  // 擷取前 3 個字的縣市（如：臺北市、新北市、彰化縣）
  const match = cleanAddr.match(/^(.{2}[縣市])/);
  const city = match ? match[1] : '';

  return {
    name,
    city,
    address: cleanAddr,
    type
  };
}
