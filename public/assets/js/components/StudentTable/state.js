export const state = {
    allData: [],
    filteredData: [],
    currentPage: 1,
    itemsPerPage: 10,
    selectedIds: new Set(),
    editingId: null,
    isSelectAll: false,
    viewMode: 'manage' // 可為 'manage' 或 'view'
};

export const resetSelection = () => {
    state.selectedIds.clear();
    state.isSelectAll = false;
};
