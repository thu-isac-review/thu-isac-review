<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>實習課程管理</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<!-- Tabler Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">
<!-- 將原先龐大的 Style 抽出，改以外部檔案引入 -->
<link rel="stylesheet" href="/assets/css/course.css">

</head>
<body>

    <!-- ─── TOOLBAR ─── -->
    <div class="toolbar">
        <div class="search-wrap">
            <i class="ti ti-search"></i>
            <input type="text" id="search-input" placeholder="搜尋選課代號或課程名稱..." class="search-input">
        </div>
        
        <div class="flex-spacer"></div>
        
        <div class="toolbar-actions">
            <button onclick="exportToCSV()" class="btn btn-success-solid">
                <i class="ti ti-file-export"></i> <span class="btn-text">匯出清單</span>
            </button>
            <button id="btn-import" onclick="document.getElementById('import-file').click()" class="btn btn-indigo-solid">
                <i class="ti ti-file-import"></i> <span class="btn-text">批次匯入</span>
            </button>
            <div class="v-divider"></div>
            <button onclick="openModal()" class="btn btn-primary">
                <i class="ti ti-plus"></i> <span class="btn-text">新增課程</span>
            </button>
        </div>
        <input type="file" id="import-file" accept=".csv" style="display:none;" onchange="handleImport(event)">
    </div>

    <!-- ─── FILTER ROW & BATCH BAR ─── -->
    <div class="filter-row">
        
        <!-- 學年度 (無搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-year">
            <button class="filter-pill" id="pill-year" onclick="toggleDropdown('year')">
                全部學年度 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-year">
                <div class="filter-dropdown-list" id="year-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('year')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 學期 (無搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-term">
            <button class="filter-pill" id="pill-term" onclick="toggleDropdown('term')">
                全部學期 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-term">
                <div class="filter-dropdown-list" id="term-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('term')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 學制 (無搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-edu">
            <button class="filter-pill" id="pill-edu" onclick="toggleDropdown('edu')">
                全部學制 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-edu">
                <div class="filter-dropdown-list" id="edu-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('edu')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 學院 (有搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-college">
            <button class="filter-pill" id="pill-college" onclick="toggleDropdown('college')">
                全部學院 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-college">
                <div class="filter-dropdown-search">
                    <input type="text" id="search-college-input" placeholder="搜尋學院..." onkeyup="filterDropdownItems(this, 'college-options-container')">
                </div>
                <div class="filter-dropdown-list" id="college-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('college')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 學系 (有搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-dept">
            <button class="filter-pill" id="pill-dept" onclick="toggleDropdown('dept')">
                全部學系 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-dept">
                <div class="filter-dropdown-search">
                    <input type="text" id="search-dept-input" placeholder="搜尋學系..." onkeyup="filterDropdownItems(this, 'dept-options-container')">
                </div>
                <div class="filter-dropdown-list" id="dept-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('dept')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 選課代號 (有搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-code">
            <button class="filter-pill" id="pill-code" onclick="toggleDropdown('code')">
                全部代號 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-code">
                <div class="filter-dropdown-search">
                    <input type="text" id="search-code-input" placeholder="搜尋代號..." onkeyup="filterDropdownItems(this, 'code-options-container')">
                </div>
                <div class="filter-dropdown-list" id="code-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('code')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 課程名稱 (有搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-name">
            <button class="filter-pill" id="pill-name" onclick="toggleDropdown('name')">
                全部名稱 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-name">
                <div class="filter-dropdown-search">
                    <input type="text" id="search-name-input" placeholder="搜尋名稱..." onkeyup="filterDropdownItems(this, 'name-options-container')">
                </div>
                <div class="filter-dropdown-list" id="name-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('name')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 課程屬性 (無搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-type">
            <button class="filter-pill" id="pill-type" onclick="toggleDropdown('type')">
                全部屬性 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-type">
                <div class="filter-dropdown-list" id="type-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('type')">清除此篩選</button>
                </div>
            </div>
        </div>

        <!-- 學分數 (無搜尋框) -->
        <div class="filter-pill-wrap" id="pill-wrap-credit">
            <button class="filter-pill" id="pill-credit" onclick="toggleDropdown('credit')">
                全部學分 <i class="ti ti-chevron-down"></i>
            </button>
            <div class="filter-dropdown" id="drop-credit">
                <div class="filter-dropdown-list" id="credit-options-container"></div>
                <div class="filter-dropdown-footer">
                    <button onclick="clearFilter('credit')">清除此篩選</button>
                </div>
            </div>
        </div>
        
        <!-- 批次操作列 (選取後覆蓋顯示) -->
        <div id="batch-bar">
            <div class="batch-info">
                <i class="ti ti-checks" style="font-size:18px;"></i> 已選 <span id="selected-count">0</span> 筆課程
            </div>
            <button id="btn-select-all-filtered" class="btn btn-sm btn-secondary" onclick="selectAllFiltered()">選取全部符合條件</button>
            <button class="btn btn-sm btn-secondary" onclick="clearSelection()">取消選取</button>
            
            <div class="flex-spacer"></div>
            
            <button class="btn btn-sm btn-danger" onclick="batchDelete()"><i class="ti ti-trash"></i> 批次刪除</button>
        </div>
    </div>

    <!-- ─── TABLE AREA ─── -->
    <div class="table-wrap">
        <div class="table-scroll custom-scroll">
            <table>
                <thead>
                    <tr>
                        <th class="col-checkbox" style="width: 4%;">
                            <div style="display:flex; justify-content:center; align-items:center;">
                                <input type="checkbox" id="selectAll" onchange="toggleSelectPage(event)" style="accent-color: var(--brand); cursor: pointer; width: 14px; height: 14px; margin: 0;">
                            </div>
                        </th>
                        <!-- 壓縮學年度、學期、學制、學院、學系的寬度比例，保留給課程名稱 -->
                        <th data-sort="academic_year" style="width: 6%;">學年度 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="term" style="width: 5%;">學期 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="edu_system" style="width: 8%;">開課學制 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="college" style="width: 10%;">開課學院 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="department" style="width: 10%;">開課學系 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="course_code" style="width: 10%;">選課代號 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="course_name" style="width: 26%;">課程名稱 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="course_type" style="width: 7%;">課程屬性 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th data-sort="credits" style="width: 5%;">學分數 <i class="ti ti-arrows-sort sort-icon"></i></th>
                        <th style="width: 9%;">操作</th>
                    </tr>
                </thead>
                <tbody id="table-body">
                    <tr>
                        <td colspan="11" class="empty-state">
                            <i class="ti ti-loader-2 ti-spin empty-icon" style="color:var(--brand); opacity:1;"></i>
                            <div class="empty-text">資料載入中...</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- 分頁列 -->
        <div class="pagination-bar">
            <div class="pagination-info" id="pagination-info">共 0 筆</div>
            <div class="pagination-bar-right">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:12px; color:var(--text-muted)">每頁顯示</span>
                    <select class="per-page-select" id="per-page-select" onchange="window.changePerPage(this.value)">
                        <option value="15">15 筆</option>
                        <option value="25">25 筆</option>
                        <option value="50">50 筆</option>
                    </select>
                </div>
                <div class="pagination-controls" id="pagination-controls"></div>
            </div>
        </div>
    </div>

    <!-- ─── UNIFIED DIALOG MODAL: 新增/編輯課程 ─── -->
    <div id="data-modal" class="dialog-overlay">
        <div class="dialog-box" style="max-width: 650px;">
            <div class="dialog-header">
                <h3 id="modal-title"><i class="ti ti-book"></i> 新增實習課程</h3>
                <button type="button" class="dialog-close" onclick="closeModal()"><i class="ti ti-x"></i></button>
            </div>
            <form id="data-form" class="dialog-body custom-scroll">
                <div class="form-section-title"><i class="ti ti-info-circle"></i> 課程基本資料</div>
                
                <div class="form-grid">
                    <div class="field">
                        <label class="field-label">學年度 <span class="req">*</span></label>
                        <input type="text" id="input-academic-year" required placeholder="例如：114" class="field-input">
                    </div>
                    <div class="field">
                        <label class="field-label">學期 <span class="req">*</span></label>
                        <input type="text" id="input-term" required placeholder="如: 1, 2, 暑期" class="field-input">
                    </div>
                </div>

                <div class="form-grid">
                    <div class="field">
                        <label class="field-label">開課學院 <span class="req">*</span></label>
                        <select id="input-college" required onchange="updateFormDepts()" class="field-select">
                            <option value="">請選擇學院...</option>
                        </select>
                    </div>
                    <div class="field">
                        <label class="field-label">開課學系 <span class="req">*</span></label>
                        <select id="input-department" required class="field-select">
                            <option value="">請先選擇學院...</option>
                        </select>
                    </div>
                </div>

                <div class="form-grid" style="grid-template-columns: 1fr 2fr;">
                    <div class="field">
                        <label class="field-label">選課代號 <span class="req">*</span></label>
                        <input type="text" id="input-course-code" required placeholder="如: 1234" class="field-input">
                    </div>
                    <div class="field">
                        <label class="field-label">課程名稱 <span class="req">*</span></label>
                        <input type="text" id="input-course-name" required placeholder="例如：企業實習(一)" class="field-input">
                    </div>
                </div>

                <div class="form-grid-3">
                    <div class="field">
                        <label class="field-label">開課學制 <span class="req">*</span></label>
                        <select id="input-edu-system" required class="field-select">
                            <option value="日間學士班" selected>日間學士班</option>
                            <option value="研究所">研究所</option>
                            <option value="進修學士班">進修學士班</option>
                        </select>
                    </div>
                    <div class="field">
                        <label class="field-label">實習課程屬性 <span class="req">*</span></label>
                        <select id="input-course-type" required class="field-select">
                            <option value="必修" selected>必修</option>
                            <option value="選修">選修</option>
                            <option value="必選">必選</option>
                            <option value="畢業條件">畢業條件</option>
                        </select>
                    </div>
                    <div class="field">
                        <label class="field-label">實習學分數 <span class="req">*</span></label>
                        <input type="number" id="input-credits" min="0" step="0.5" required placeholder="如: 3" class="field-input">
                    </div>
                </div>
            </form>
            <div class="dialog-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button type="button" id="btn-submit" class="btn btn-primary" onclick="submitForm()">
                    <i class="ti ti-check"></i> 確認儲存
                </button>
            </div>
        </div>
    </div>

    <!-- 模組化改寫後的程式碼核心入口 -->
    <script type="module" src="/assets/js/pages/intern_manage/course/main.js"></script>
</body>
</html>
