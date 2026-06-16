<div id="main-view" style="display: flex; flex-direction: column; height: 100%;">
    <div class="toolbar">
        <div class="search-wrap">
            <i class="ti ti-search"></i>
            <input type="text" id="search-input" placeholder="搜尋學號、姓名、機構..." class="search-input">
        </div>
        <div class="flex-spacer"></div>
        <div class="toolbar-actions">
            <button id="btn-export" class="btn btn-success-solid"><i class="ti ti-file-export"></i> <span class="btn-text">匯出清單</span></button>
            <button id="btn-import-trigger" class="btn btn-indigo-solid"><i class="ti ti-file-import"></i> <span class="btn-text">批次匯入</span></button>
            <input type="file" id="import-file" accept=".csv" style="display:none;">
            <div class="v-divider"></div>
            <button id="btn-add-record" class="btn btn-primary"><i class="ti ti-plus"></i> <span class="btn-text">新增紀錄</span></button>
        </div>
    </div>

    <div class="filter-row" id="filter-container">
        <div id="batch-bar">
            <div class="batch-info"><i class="ti ti-checks" style="font-size:18px;"></i> 已選 <span id="selected-count">0</span> 筆紀錄</div>
            <button id="btn-select-all-filtered" class="btn btn-sm btn-secondary">選取全部符合條件</button>
            <button id="btn-clear-selection" class="btn btn-sm btn-secondary">取消選取</button>
            <div class="flex-spacer"></div>
            <button id="btn-batch-delete" class="btn btn-sm btn-danger"><i class="ti ti-trash"></i> 批次刪除</button>
        </div>
    </div>

    <div class="table-wrap">
        <div class="table-scroll custom-scroll">
            <table>
                <thead>
                    <tr>
                        <th class="col-checkbox" style="width: 3%;"><input type="checkbox" id="selectAll" style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;"></th>
                        <th data-sort="student_id" data-col="1" style="width: 7%;">學號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="student_name" data-col="2" style="width: 6%;">姓名 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th class="col-actions" style="width: 5%;">操作</th>
                    </tr>
                </thead>
                <tbody id="table-body"></tbody>
            </table>
        </div>
        <div class="pagination-bar">
            <div class="pagination-info" id="pagination-info">共 0 筆</div>
            <div class="pagination-bar-right">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:11px; color:var(--text-muted)">每頁顯示</span>
                    <select class="per-page-select" id="per-page-select">
                        <option value="15">15 筆</option><option value="25">25 筆</option><option value="50">50 筆</option>
                    </select>
                </div>
                <div class="pagination-controls" id="pagination-controls"></div>
            </div>
        </div>
    </div>
</div>

<div id="data-modal" class="fs-modal">...</div>
<div id="info-popup" class="info-modal-overlay">...</div>
<div id="import-report-modal" class="dialog-overlay">...</div>
