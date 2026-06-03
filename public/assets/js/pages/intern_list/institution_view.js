<link rel="stylesheet" href="./assets/css/institution.css">
<style id="dynamic-col-styles"></style>

<div id="institution-page-wrapper" style="height: 100%; display: flex; flex-direction: column;">
    <!-- 工具列：只保留搜尋框 -->
    <div class="toolbar">
        <div class="search-wrap">
            <i class="ti ti-search"></i>
            <input type="text" id="search-input" placeholder="搜尋機構名稱、統編或地址..." class="search-input">
        </div>
        <div class="flex-spacer"></div>
        <!-- 移除了匯入、新增等按鈕，若需要讓學生匯出，可以保留匯出按鈕 -->
    </div>

    <!-- 篩選列：保留完整的國別、縣市、行業別、場所篩選 -->
    <div class="filter-row">
        <div class="filters-scroll-area custom-scroll">
            <div class="filter-pill-wrap" id="pill-wrap-country">
                <button class="filter-pill" id="pill-country">全部國別 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-country">
                    <div class="filter-dropdown-search">
                        <input type="text" id="search-country-input" placeholder="搜尋國別...">
                        <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                            <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="country" data-state="none">全選 / 全不選</button>
                        </div>
                    </div>
                    <div class="filter-dropdown-list" id="country-options-container"></div>
                </div>
            </div>
            
            <div class="filter-pill-wrap" id="pill-wrap-city">
                <button class="filter-pill" id="pill-city">全部縣市 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-city">
                    <div class="filter-dropdown-search">
                        <input type="text" id="search-city-input" placeholder="搜尋縣市...">
                        <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                            <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="city" data-state="none">全選 / 全不選</button>
                        </div>
                    </div>
                    <div class="filter-dropdown-list" id="city-options-container"></div>
                </div>
            </div>

            <div class="filter-pill-wrap" id="pill-wrap-industry">
                <button class="filter-pill" id="pill-industry">全部行業別 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-industry">
                    <div class="filter-dropdown-search">
                        <input type="text" id="search-industry-input" placeholder="搜尋行業別...">
                        <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                            <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="industry" data-state="none">全選 / 全不選</button>
                        </div>
                    </div>
                    <div class="filter-dropdown-list" id="industry-options-container"></div>
                </div>
            </div>

            <div class="filter-pill-wrap" id="pill-wrap-venue">
                <button class="filter-pill" id="pill-venue">全部場所 <i class="ti ti-chevron-down"></i></button>
                <div class="filter-dropdown" id="drop-venue">
                    <div class="filter-dropdown-search">
                        <input type="text" id="search-venue-input" placeholder="搜尋場所...">
                        <div style="display:flex; justify-content:flex-end; margin-top:8px; padding:0 4px;">
                            <button type="button" style="font-size:12px; color:var(--brand); background:none; border:none; cursor:pointer;" class="btn-filter-toggle" data-type="venue" data-state="none">全選 / 全不選</button>
                        </div>
                    </div>
                    <div class="filter-dropdown-list" id="venue-options-container"></div>
                </div>
            </div>
        </div>

        <div class="relative inline-block text-left" id="display-settings-wrap">
            <button id="btn-display-settings" class="btn btn-secondary btn-sm" style="font-weight: 500;"><i class="ti ti-settings"></i> 顯示設定</button>
            <div id="display-settings-menu" style="position:absolute; right:0; top:calc(100% + 4px); width:200px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-md); padding:8px; z-index:100; display:none;" class="menu-popup">
                <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:flex-start; border:none; margin-bottom:4px;" id="btn-toggle-tree"><i class="ti ti-list-tree" style="color:var(--brand); margin-right:4px;"></i> <span>切換為扁平列表</span></button>
                <div style="height:1px; background:var(--border); margin:4px 0;"></div>
                <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:flex-start; border:none; margin-bottom:4px;" id="btn-toggle-expand"><i class="ti ti-arrows-maximize" style="color:var(--brand); margin-right:4px;"></i> <span>展開所有分支</span></button>
                
                <div style="height:1px; background:var(--border); margin:4px 0;"></div>
                <div style="font-size:11px; font-weight:700; color:var(--text-muted); padding:4px 8px;">顯示欄位設定</div>
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="tax_id" checked> 統一編號</label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="industry" checked> 行業別</label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="venue_type" checked> 實習場所</label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="country" checked> 國別</label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="city" checked> 縣市別</label>
                <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:13px; cursor:pointer;"><input type="checkbox" class="col-toggle-chk" value="address" checked> 實習場所地址</label>
            </div>
        </div>
        <!-- 移除 Batch Bar (批次操作列) -->
    </div>

    <!-- 表格區塊：移除 Checkbox 欄位與操作按鈕欄位 -->
    <div class="table-wrap">
        <div class="table-scroll custom-scroll">
            <table>
                <thead>
                    <tr id="inst-table-head">
                        <th class="col-name" data-sort="name" style="text-align: left; padding-left: 24px;">實習機構名稱 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="tax_id" class="col-tax_id">統一編號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="industry" class="col-industry">行業別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="venue_type" class="col-venue_type">實習場所 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="country" class="col-country">國別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="city" class="col-city">縣市別 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="address" class="col-address" style="text-align: left;">實習場所地址 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <!-- 移除 col-actions -->
                    </tr>
                </thead>
                <tbody id="table-body">
                    <tr><td colspan="7" class="empty-state"><i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i><div class="empty-text">資料載入中...</div></td></tr>
                </tbody>
            </table>
        </div>
        
        <div class="pagination-bar">
            <div class="pagination-info" id="pagination-info">共 0 間實習機構</div>
            <div class="pagination-bar-right">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:12px; color:var(--text-muted)">每頁顯示</span>
                    <select class="per-page-select" id="per-page-select">
                        <option value="15">15 筆</option>
                        <option value="25">25 筆</option>
                        <option value="50">50 筆</option>
                    </select>
                </div>
                <div class="pagination-controls" id="pagination-controls"></div>
            </div>
        </div>
    </div>
</div>