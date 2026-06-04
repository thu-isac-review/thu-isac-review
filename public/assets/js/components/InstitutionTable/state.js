export const state = {
    db: null,
    isReadOnly: false, // 決定當前是否為唯讀模式
    viewContainer: null, // 綁定當前渲染的 DOM 容器，避免 ID 衝突
    
    allData: [],
    allRecords: [],
    baseTree: [],
    filteredInstitutions: [],
    
    editingId: null,
    editingOldData: null,
    currentHistory: [],
    
    currentPage: 1,
    itemsPerPage: 15,
    selectedIds: [],
    
    sortCol: '',
    sortDir: '',
    isTreeMode: true,
    expandedParents: new Set(),
    isSearchAutoExpand: false,
    isAllExpanded: false,
    
    colVis: { tax_id: true, industry: true, venue_type: true, country: true, city: true, address: true },
    
    filterCountrySet: new Set(),
    filterCitySet: new Set(),
    filterIndustrySet: new Set(),
    filterVenueSet: new Set(),
    
    searchDebounceTimer: null
};

export function setReadOnly(status) {
    state.isReadOnly = status;
}

export const LIST_COUNTRIES = ["中華民國","大陸地區","日本","美國","越南","泰國","澳大利亞","香港","澳門","馬來西亞","菲律賓","印尼","印度","孟加拉","緬甸","柬埔寨","黎巴嫩","蒙古","巴西","巴拉圭","秘魯"];
export const LIST_CITIES = ["臺北市","新北市","基隆市","桃園市","新竹縣","新竹市","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義縣","嘉義市","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
export const LIST_INDUSTRIES = ["農、林、漁、牧業","礦業及土石採取業","製造業","電力及燃氣供應業","用水供應及污染整治業","營建工程業","批發及零售業","運輸及倉儲業","住宿及餐飲業","出版及影音等內容傳播業","電信及資訊服務業","金融及保險業","不動產業","專業、科學及技術服務業","支援服務業","公共行政及國防；強制性社會安全","教育業","醫療保健及社會工作服務業","藝術、運動及休閒服務業","其他服務業"];
export const LIST_VENUES = ["企業機構","其他機構","政府機構","就讀學校附屬機構"];
