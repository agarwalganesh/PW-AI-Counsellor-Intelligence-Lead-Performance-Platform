# 📁 PROJECT.md — How Every File Works

> Complete technical guide for all files in the **AI Counsellor Intelligence & Lead Performance Platform**.
> What each file does, its key functions, and how everything connects together.

---

## 🗂️ File Load Order (Browser)

```
index.html  →  loads in this order:
  1. mock-data.js          (window.MOCK_DATA available)
  2. data-processor.js     (window.DataProcessor available)
  3. analytics-engine.js   (window.AnalyticsEngine available)
  4. charts.js             (window.ChartingEngine available)
  5. exporter.js           (window.ReportExporter available)
  6. app.js                (runs last — connects everything)
```

---

## 📄 FILE 1: `index.html`
**Role**: Full app skeleton / layout

### What's inside:
- **9 Dashboard Views** — each inside `<section id="view-XXX">`:
  - `view-executive` — Executive Dashboard
  - `view-performance` — Counsellor Metrics Table
  - `view-rankings` — Leaderboards
  - `view-profile` — Counsellor Profile
  - `view-team-compare` — Team Comparison
  - `view-risk` — Risk Prediction Engine
  - `view-lead-quality` — Lead Intelligence
  - `view-funnel` — Funnel Analysis
  - `view-recommendations` — AI Recommendations

- **Modals**:
  - `#multi-sheet-modal` — Multi-sheet selector (when Excel has multiple sheets)
  - `#upload-prompt-overlay` — First screen when no data is loaded
  - `#access-denied-overlay` — Role restriction watermark

- **Profile Drawer** (`#profile-drawer`) — Slide-in 360° profile panel

- **Exports Bar** (`#exports-bar`) — CSV / Excel / PDF buttons on every page

- **Top Header** — Date filter, Manager/TL/Campaign dropdowns, Role selector

- **Sidebar** — Navigation links + file upload button

### Important IDs Used by JavaScript:
| Element ID | Purpose |
|---|---|
| `excel-file-input` | File upload input |
| `data-status-dot` | Green/Red status dot |
| `filter-start-date` / `filter-end-date` | Date range |
| `filter-manager` / `filter-team-lead` / `filter-campaign` | Dropdowns |
| `role-selector` | Manager/TL/Counsellor toggle |
| `metrics-table-body` | Counsellor Metrics table body |
| `rankings-table-body` | Leaderboard table body |
| `risk-predictions-table-body` | Risk table body |
| `insights-feed-container` | AI ticker text area |

---

## 📄 FILE 2: `data-processor.js`
**Role**: Read Excel, clean data, apply filters, save to LocalStorage

### Global Variable:
```js
window.DataProcessor  // single instance used everywhere
```

### Main Functions:

#### `parseExcelFile(file, callback)`
- Reads Excel file in the browser using `FileReader`
- Converts to JSON using SheetJS (`XLSX.read`)
- If **1 sheet** → directly calls `loadDataset()`
- If **multiple sheets** → returns `callback(null, { isMultiSheet: true, sheetNames })`
- `app.js` catches this callback and opens the multi-sheet modal

#### `loadSheets(sheetNames, callback)`
- Merges multiple sheets into a single array
- Calls `loadDataset()` with merged data

#### `cleanRow(row)`
- Takes a raw Excel row
- Checks **30+ column name variants** (case-insensitive)
- Email auto-detect: if no column matches → scans all columns for any `@` value
- Converts dates (Excel serial, DD-MM-YYYY, YYYY-MM-DD all handled)
- Cleans numbers with `parseInt`/`parseFloat`

#### `loadDataset(data)`
- Runs `cleanRow()` on every row
- Drops rows where `Counselor Email` is empty
- Stores in global `masterData`
- Calls `updateMetadata()` and `applyDashboardFilters()`

#### `applyDashboardFilters()`
- Applies all active filters to `masterData`
- Stores result in global `filteredData`
- Filters: startDate, endDate, month, daysLimit, counsellorEmail, teamLead, manager, campaign, band, status

#### `getCounsellorBreakdown()`
- Groups `filteredData` by counsellor
- Calls `getAggregates()` for each counsellor
- Returns array of counsellor objects (most-used function in `app.js`)

#### `getAggregates(dataset)`
- Sums: dials, connected, effective, admissions, talktime, discounts
- Counts: present/halfday/absent
- Calculates: conversionPercentage, targetAchievement, effectiveRatio
- Financial: grossRevenue, netRevenue, operationalBurn, grossMargin

#### `getDailyTrend()`
- Returns date-grouped totals for chart rendering

#### `getHourByHourData(email, date)` ⚠️ SIMULATED
- No real data — generates a deterministic fake hourly pattern from email+date hash
- Hours: 9 AM to 5 PM, 9 slots

#### `saveStateToLocalStorage()` / `loadStateFromLocalStorage()`
- Saves/loads active filters and sort settings in the browser
- Filters remain intact after page refresh

---

## 📄 FILE 3: `analytics-engine.js`
**Role**: All calculations, AI scoring, predictions, recommendations

### Global Variable:
```js
window.AnalyticsEngine  // single instance
```

### Main Functions:

#### `calculateRiskScore(counsellorData)`
- Inputs: `totalAdmissions`, `totalTarget`, `rawRecords`, `attendance`
- Calls `calculateLeadQuality()` → `calculateFairScore()` → `predictTargetAchievement()`
- **Risk Score = P_miss** (Target Miss Probability)
- **Zone Logic**: Green (FPI ≥ 1.0 AND P_miss < 15%) | Red (FPI < 0.85 OR P_miss > 40%) | Yellow (everything else)
- Returns: `{ score, category, fpi, contributors }`

#### `getDaysElapsed(records)`
- Returns `getDate()` of the latest date found in records
- Fallback: `18` (anchor date)

#### `predictTargetAchievement(counsellorData)`
- `V_c = Admissions ÷ Days Worked`
- `P_m = Admissions + (V_c × Days Remaining)`
- `P_miss = Max(0, (G_t ÷ Target) × 100)`
- Returns: `{ currentAdmissions, target, predictedAdmissions, gap, missProbability, daysElapsed, daysRemaining }`

#### `calculateLeadQuality(counsellorData)`
- Hot = EMI Paid + Full Payment On Spot
- Warm = Max(0, Form Filled − Hot)
- Cold = Max(0, Connected − Hot − Warm)
- Computes LQS → category (Hot/Warm/Cold) → attribution text
- Returns: `{ hotLeads, warmLeads, coldLeads, score, category, attribution }`

#### `calculateFairScore(counsellorData, leadQualityStats)`
- Expected Rate = `(0.20×Hot + 0.10×Warm + 0.05×Cold) ÷ Connected × 100`
- FPI = Actual Conv % ÷ Expected Rate
- FPI ≥ 1.10 → "Highly Efficient" (Green) | FPI < 0.90 → "Underperforming" (Red)
- Returns: `{ expectedRate, actualRate, fpi, difference, rating, color }`

#### `diagnosePerformance(counsellorData)`
- Checks 3 diagnostic cases:
  - **Case 1 Effort Gap**: Dials < 60/day AND Talktime < 180s AND Admissions < 2
  - **Case 2 Lead Quality Gap**: Dials ≥ 60/day AND Connect Rate < 40%
  - **Case 3 Skill Gap**: Connected > 15 AND Talktime ≥ 200s AND Admissions < 2
- Fallback: "Optimal Performance"
- Returns: array of `{ type, severity, reason, explanation, action }`

#### `calculateFunnelDropoff(counsellorData)`
- Stage 1: Dialled (100%) → Stage 2: Connected → Stage 3: Effective → Stage 4: Form → Stage 5: Admissions
- Flags stage with lowest % as bottleneck
- Returns: `{ stages, dropoffStage, advice }`

#### `generateRecommendations(breakdown, filters)`
- 5 rules per counsellor:
  - A: High effective ratio + low conversion → "Sales Coaching"
  - B: High LQS + Underperforming FPI → "Lead Reallocation"
  - C: P_miss > 70% → "Target Recovery Discount"
  - D: Avg dials < 60 → "Enable Auto-Dial"
  - E: LQS < 30 + low conversion → "Lead Quality Escalation"
- Sorted by priority: High > Medium > Low

#### `calculateStatisticalSignificance(cohortA, cohortB)`
- Z-test: `Z = (p_A - p_B) ÷ SE`
- `SE = √[p_pooled × (1-p_pooled) × (1/nA + 1/nB)]`
- Abramowitz & Stegun CDF approximation for p-value
- Significant if p < 0.05
- Used in: Team Comparison page

---

## 📄 FILE 4: `charts.js`
**Role**: Create and destroy canvas charts

### Global Variable:
```js
window.ChartingEngine  // single instance
```

### Chart Registry System:
- `this.chartRegistry` — object: canvas ID → Chart instance
- `destroyChart(canvasId)` — destroys old chart before re-rendering (prevents Chart.js crash on duplicate canvases)

### Functions:

| Function | Chart Type | Used In |
|---|---|---|
| `renderCallActivityTrend(id, data)` | Line Chart | Exec Dashboard, Profile Trend, Drawer |
| `renderTargetProgress(id, data, target)` | Bar + Line Combo | Exec Dashboard |
| `renderTeamComparison(id, labels, adm, conv)` | Grouped Bar | Team Compare |
| `renderCounsellorRadar(id, name, scores, avg)` | Radar | Profile, Drawer |
| `renderRiskGauge(id, score)` | Half-Doughnut | Profile, Drawer |

### Radar Normalization Benchmarks (set in `app.js`):
```js
Dials          → benchmark 80/day   → score = (avgDials ÷ 80) × 100
Reachability   → benchmark 50%      → score = (connectRate ÷ 0.50) × 100
Engagement     → benchmark 100%     → score = effectiveRatio
Closing Power  → benchmark 10%      → score = (convPct ÷ 10) × 100
Attendance     → benchmark 100%     → score = attendanceRate
Talktime       → benchmark 240s     → score = (avgTalktime ÷ 240) × 100
```

---

## 📄 FILE 5: `exporter.js`
**Role**: Download data as CSV, Excel, or PDF

### Global Variable:
```js
window.ReportExporter  // single instance
```

### Functions:

#### `exportToCSV(data, filename)`
- Builds CSV string from data array headers
- Creates Blob → triggers download via `<a>` element
- Always exports **filtered data** from `dp.filteredDataset`

#### `exportToExcel(data, filename)`
- Uses SheetJS `XLSX.utils.json_to_sheet()`
- Auto-fits column widths (max 30 chars)
- Falls back to CSV if XLSX library not loaded

#### `exportToPDF(viewId, title)`
- Temporarily changes `document.title` (becomes the PDF filename)
- Triggers `window.print()` → browser print dialog
- `@media print` rules in `styles.css` apply

---

## 📄 FILE 6: `mock-data.js`
**Role**: Generate demo data when no real Excel file is loaded

### Global Variables:
```js
window.MOCK_DATA          // generated dataset array
window.MOCK_COUNSELLORS   // counsellor profiles array
```

### Counsellors in Mock Data (10 profiles):
| Email | Band | Campaign | Characteristic |
|---|---|---|---|
| sneha.sharma@edu.com | A | FY26 | Top performer, 18% closing |
| rahul.verma@edu.com | C | FY27 | Low activity (0.6x multiplier) |
| priya.nair@edu.com | B | FY26 | High dials, poor closing (4%) |
| amit.patel@edu.com | B | CJR | Low connections (lead quality issue) |
| vikas.singh@edu.com | B | FY27 | Average performer |
| pooja.rao@edu.com | A | FY26 | Exceptional closer (20%) |
| anil.mehta@edu.com | C | CJR | High risk, 72% attendance |
| deepa.sen@edu.com | B | FY27 | High talktime, can't close |
| rohit.das@edu.com | A | FY26 | Top performer, 16% closing |
| divya.joshi@edu.com | C | FY27 | **Inactive**, 60% attendance |

### `generateMockData(startDate, endDate)`
- Default: June 1–17, 2026
- One row per counsellor per day
- Attendance random (weekends mostly Absent)
- Calls: `baseDialled = (70 + random×30) × dialledMultiplier × attendanceMultiplier`
- Admissions: Poisson-like = `floor(connected × closingRate + (random - 0.35) × 1.5)`
- EMI = 60% of admissions, Full Payment = 40%

---

## 📄 FILE 7: `app.js`
**Role**: Connects everything — routing, events, rendering

### Global Variables Used:
```js
const dp  = window.DataProcessor;
const ae  = window.AnalyticsEngine;
const ce  = window.ChartingEngine;
const exp = window.ReportExporter;
```

### App State:
```js
let activeView           = "view-executive";  // current page
let activeRole           = "manager";         // role permission level
let activeCounsellorEmail = "";               // currently selected counsellor
let insightsInterval     = null;              // ticker interval handle
```

### Key Functions:

#### `init()`
- Shows upload overlay
- Injects "Or Load Demo Mock Data" button
- Calls `bindEvents()`

#### `finishInit()`
- Called after data loads
- Sets date filter min/max from data
- Populates dropdowns
- Calls `renderActiveView()`

#### `bindEvents()`
- Connects all HTML elements to event listeners:
  - Sidebar nav links → `switchView()`
  - Date/filter dropdowns → `dp.setFilter()` → `onFiltersChanged()`
  - File input → `dp.parseExcelFile()`
  - Export buttons → `exp.exportToCSV/Excel/PDF()`
  - Sheet modal buttons → `dp.loadSheets()`

#### `switchView(targetView)`
- Shows/hides active section
- Toggles sidebar active class
- Checks role restriction
- Calls `renderActiveView()`

#### View Render Functions:
| Function | View | Key Logic |
|---|---|---|
| `renderExecutiveView()` | Executive Dashboard | KPI cards, systemic trend alert, mini lists |
| `renderPerformanceView()` | Counsellor Metrics | Table with search/filter/sort |
| `renderRankingsView(category)` | Leaderboards | 5 categories, AVG daily dials fix |
| `renderProfileView()` | Counsellor Profile | Radar chart, AI summary, diagnostics |
| `renderTeamCompareView(category)` | Team Compare | Groups by TL/Manager/Campaign/Band, Z-test |
| `renderRiskView()` | Risk Predictions | Individual + Team-level risk tables |
| `renderLeadQualityView()` | Lead Intelligence | LQS table, Fair scoring, Disparity monitor |
| `renderFunnelView()` | Funnel Analysis | Horizontal bars with drop-off % labels |
| `renderRecommendationsView()` | Recommendations | Prioritized action cards |

#### `normalizeCounsellorDimensions(c)`
- Normalizes 6 metrics to 0–100 scale for radar chart
- Benchmarks: Dials=80, Reachability=50%, Engagement=100%, Closing=10%, Attendance=100%, Talktime=240s

#### `generateAISummaryText(c, risk, diagnostics, predictor)`
- Green risk → positive summary with targets
- Red/Yellow risk → bottleneck + action plan

#### `generateAIInsightsList()`
- 4 types of insights: high risk count, campaign comparison, reachability alert, underperforming with premium leads

#### `openProfileDrawer(email)`
- Populates the 360° slide-in drawer
- Renders risk gauge
- Builds diagnostics cards
- Calls `renderDrawerTrendChart()`

#### `renderDrawerTrendChart()`
- `drawerChartType === "daily"` → shows real daily records
- `drawerChartType === "hourly"` → calls `dp.getHourByHourData()` (**SIMULATED**)

---

## 📄 FILE 8: `styles.css`
**Role**: Complete dark mode UI design

### CSS Custom Properties:
```css
--bg-primary        /* dark background */
--bg-secondary      /* card background */
--accent-info       /* blue — info */
--accent-safe       /* green — success */
--accent-warning    /* yellow — caution */
--accent-critical   /* red — danger */
--text-primary      /* white */
--text-secondary    /* light gray */
--text-muted        /* dimmed */
--border-color      /* subtle borders */
--glow-shadow-*     /* colored glow effects */
```

### Key CSS Classes:
| Class | What it styles |
|---|---|
| `.kpi-card` | Executive dashboard KPI boxes |
| `.status-pill` | Green/Yellow/Red badges |
| `.data-table` | Dark mode tables |
| `.sidebar-nav-link` | Navigation items |
| `.profile-drawer` | Slide-in drawer (right side) |
| `.diagnostic-card` | Root cause analysis cards |
| `.funnel-bar` | Horizontal funnel bars |
| `.recommendation-item` | AI recommendation cards |
| `@media print` | PDF export styling |

---

## 🐍 FILE 9: `clean_dod_data.py`
**Role**: Production-grade in-memory data cleaning pipeline for `May dod data .xlsx`

### Version: `v2.0`

### Strict Guarantees:
- ✅ **NO DISK WRITES** — Excel file is never touched or overwritten
- ✅ **NO DATA LOSS** — 0 rows dropped; `dropna()` never called on rows
- ✅ **IN-MEMORY ONLY** — all transforms in RAM
- ✅ **SAFE NUMERICS** — `pd.to_numeric(errors='coerce').fillna(0)`
- ✅ **SAFE DATES** — `pd.to_datetime(errors='coerce')` → NaT on bad cells
- ✅ **GHOST TIMELINE FIX** — date axis clamped to `2026-04-01 → 2026-05-31`

### Pipeline Order (per sheet):
```
1. _clean_column_names()          Strip spaces + embedded \n from headers
2. _drop_fully_empty_unnamed_columns()  Remove structural padding cols
3. _deduplicate_columns()         Rename duplicate column names with suffix
4. _normalise_date_column()       Auto-detect + rename date alias → 'Date'
5. _normalise_email()             Lowercase + strip; handle 'Counsellor Email' variant
6. _clean_text_columns()          Strip + collapse whitespace on text cols
7. _clean_numeric_columns()       Coerce to float64, fillna(0)
8. _clean_date_columns()          Parse date cols, bad values → NaT
9. apply_date_window_clamp()      Add __date_in_window__ + __axis_date__
10. Header-bleed guard            Remove rows where Manager == 'Manager'
11. Tag __source_sheet__          Provenance column added
```

### Sheet Loading Strategy:
| Sheet | Method |
|---|---|
| **Sheet1** | Has header row → `header=0`, normal load |
| **Sheet2** | No header row → `header=None`, columns assigned from `CANONICAL_COLUMNS` by position |

### Public API Functions:
| Function | Description |
|---|---|
| `load_and_clean_dod_data(file_path)` | Returns `Dict[sheet_name → cleaned_DataFrame]` |
| `get_merged_dataframe(file_path)` | Loads + merges all sheets into one DataFrame |
| `get_all_managers(df)` | Sorted list of unique manager names |
| `get_counselors_by_manager(df, manager)` | Cascading filter — counsellors under a manager |
| `get_counselors_by_team_lead(df, tl)` | Cascading filter — counsellors under a TL |
| `build_cascade_map(df)` | Pre-computes full Manager → [emails] dict for O(1) lookups |
| `apply_date_window_clamp(df)` | Adds clamped date columns for Ghost Timeline fix |
| `get_date_axis_bounds(df)` | Returns safe (min, max) for chart x-axis |
| `get_render_ready_aggregates(df)` | Pre-computed KPI dict for dashboard widgets |
| `get_daily_trend(df)` | Date-aggregated trend DataFrame for chart rendering |
| `get_pipeline_quality_report(sheets)` | Data health dict: null counts, row counts per sheet |

---

## 🐍 FILE 10: `dashboard_intelligence.py`
**Role**: 4-feature Python analytics engine for offline reporting

### Column Consolidation Helpers:
| Function | Description |
|---|---|
| `pick_col(df, *candidates)` | Returns first matching column (case-insensitive) |
| `consolidate_column(df, target, aliases)` | Sums aliased columns row-wise; returns zeros if none found |
| `get_standardized_df(df)` | Returns standardized DataFrame with resolved KPI columns |

### Core Features:

#### Feature 1: `mom_comparison(current_df, previous_df)`
- Aggregates both months by counsellor
- Outer join to capture all counsellors from either month
- Calculates MoM % change for: Total Adm, Talktime, Dialled Calls
- Returns growth labels: `▲ +X%` / `▼ -X%` / `■ 0.0%`

#### Feature 2: `generate_coaching_recommendations(df)`
- Rules applied per row:
  - Talktime < 3h AND Dials > 100 → "Focus on Call Efficiency"
  - Admissions == 0 AND Effective > 50 → "Focus on Closing Techniques"
  - Else → "Maintain consistency & monitor progress"
- Auto-scales Talktime: detects seconds (>1000) or minutes (>24) and converts to hours
- Returns copy of df with new `Coaching_Tip` column

#### Feature 3: `forecast_admissions_and_revenue(df)`
- Aggregates daily team admissions
- Fills timeline calendar gaps with 0
- Computes 15-day Simple Moving Average (SMA)
- Projects next 7 days at that constant rate
- Returns `{ Date, Forecasted_Admissions, Forecasted_Revenue_Potential }`

#### Feature 4: `compare_counsellors(email1, email2, df)`
- Loads `clean_data.json` if no df passed
- Sums all KPIs for each counsellor
- Computes ratios: Connect Rate %, Effective Ratio %, Conversion Rate %, Revenue Potential
- Returns delta report: `{ KPI, C1_Value, C2_Value, Absolute Delta, Percentage Delta (%) }`

#### Helper: `style_growth_report(df)`
- Pandas Styler with green/red color coding for growth labels
- Useful in Jupyter notebooks or Streamlit dashboards

---

## 🐍 FILE 11: `generate_clean_json.py`
**Role**: CLI script to generate `clean_data.json` from Excel

### What it does:
1. Checks for `May dod data .xlsx`
2. Calls `get_merged_dataframe()` from `clean_dod_data.py`
3. Converts date columns to `%Y-%m-%d` string format for JSON serialization
4. Writes `clean_data.json` with `orient="records"`, indent=2

### Usage:
```bash
python generate_clean_json.py
```

---

## 🔗 How All Files Connect — Data Flow

```
User uploads Excel
       ↓
index.html (file input)
       ↓
app.js bindEvents() catches the change
       ↓
data-processor.js parseExcelFile()
  → cleanRow() per row
  → loadDataset()
  → applyDashboardFilters()
  → filteredData updated
       ↓
app.js finishInit()
  → populateFilterDropdowns()
  → renderActiveView()
       ↓
renderExecutiveView() / renderRankingsView() / etc.
  → dp.getCounsellorBreakdown()     (data)
  → ae.calculateRiskScore()          (analytics)
  → ce.renderCallActivityTrend()     (charts)
       ↓
User sees dashboard
       ↓
User clicks counsellor name
  → app.js openProfileDrawer()
  → ae.diagnosePerformance()
  → ce.renderCounsellorRadar()
       ↓
User clicks Export CSV
  → exp.exportToCSV(dp.filteredDataset)
```

### Python Pipeline Flow:
```
May dod data .xlsx
       ↓
generate_clean_json.py
  → clean_dod_data.get_merged_dataframe()
  → _load_sheet_raw() per sheet
  → _clean_sheet() per sheet (10-step pipeline)
  → pd.concat() all sheets
       ↓
clean_data.json (~7.8 MB)
       ↓
dashboard_intelligence.py (reads clean_data.json)
  → mom_comparison()           (MoM analysis)
  → generate_coaching_recommendations()
  → forecast_admissions_and_revenue()
  → compare_counsellors()
```

---

## ⚡ Quick Reference: Which File to Edit for What

| I want to change... | Edit this file |
|---|---|
| Colors, fonts, layout | `styles.css` |
| A dashboard view HTML | `index.html` |
| How Excel columns are read (browser) | `data-processor.js` → `cleanRow()` |
| A calculation / formula (browser) | `analytics-engine.js` |
| A chart appearance | `charts.js` |
| Which views appear / routing | `app.js` → `switchView()` |
| Export file name | `exporter.js` |
| Demo data profiles | `mock-data.js` → `MOCK_COUNSELLORS` |
| How Excel sheets are cleaned (Python) | `clean_dod_data.py` → `_clean_sheet()` |
| Python analytics / MoM / Forecast | `dashboard_intelligence.py` |
| Regenerate clean_data.json | Run `python generate_clean_json.py` |
