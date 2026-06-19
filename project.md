# 📁 PROJECT.md — How Every File Works

> Complete technical guide of all files in the AI Counsellor Intelligence & Lead Performance Platform.
> Har file kya karti hai, kaun si functions hain, aur sab kuch kaise ek saath kaam karta hai.

---

## 🗂️ File Load Order (Browser mein yahi sequence hai)

```
index.html  →  loads in order:
  1. mock-data.js          (window.MOCK_DATA available)
  2. data-processor.js     (window.DataProcessor available)
  3. analytics-engine.js   (window.AnalyticsEngine available)
  4. charts.js             (window.ChartingEngine available)
  5. exporter.js           (window.ReportExporter available)
  6. app.js                (runs last — connects everything)
```

---

## 📄 FILE 1: `index.html`
**Role**: Poora app ka skeleton / layout

### Kya hai isme:
- **9 Dashboard Views** — har ek `<section id="view-XXX">` ke andar:
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
  - `#multi-sheet-modal` — Multi-sheet selector (jab Excel mein multiple sheets hon)
  - `#upload-prompt-overlay` — First screen jab koi data nahi
  - `#access-denied-overlay` — Role restriction watermark

- **Profile Drawer** (`#profile-drawer`) — Slide-in 360° profile panel (separate from main views)

- **Exports Bar** (`#exports-bar`) — CSV / Excel / PDF buttons har page pe

- **Top Header** — Date filter, Manager/TL/Campaign dropdowns, Role selector

- **Sidebar** — Navigation links + file upload button

### Important IDs (JS inhe use karta hai):
| Element ID | Kya hai |
|---|---|
| `excel-file-input` | File upload input |
| `data-status-dot` | Green/Red dot status |
| `filter-start-date` / `filter-end-date` | Date range |
| `filter-manager` / `filter-team-lead` / `filter-campaign` | Dropdowns |
| `role-selector` | Manager/TL/Counsellor toggle |
| `metrics-table-body` | Counsellor Metrics table body |
| `rankings-table-body` | Leaderboard table body |
| `risk-predictions-table-body` | Risk table body |
| `insights-feed-container` | AI ticker text area |

---

## 📄 FILE 2: `data-processor.js`
**Role**: Excel padhna, data saaf karna, filter karna, localStorage mein save karna

### Global Variable:
```js
window.DataProcessor  // single instance used everywhere
```

### Main Functions:

#### `parseExcelFile(file, callback)`
- Browser mein Excel file padhta hai using `FileReader`
- SheetJS (`XLSX.read`) se JSON mein convert karta hai
- Agar **1 sheet** → seedha `loadDataset()` call
- Agar **multiple sheets** → `callback(null, { isMultiSheet: true, sheetNames })` return karta hai
- `app.js` callback mein check karta hai aur multi-sheet modal kholta hai

#### `loadSheets(sheetNames, callback)`
- Multiple sheets ko merge karta hai ek array mein
- `loadDataset()` call karta hai merged data ke saath

#### `cleanRow(row)`
- Ek raw Excel row leta hai
- **30+ column name variants** check karta hai (case-insensitive)
- Email auto-detect: agar koi column match nahi → sab columns scan karta hai `@` ke liye
- Dates convert karta hai (Excel serial, DD-MM-YYYY, YYYY-MM-DD sab handle karta hai)
- Numbers `parseInt/parseFloat` se clean karta hai

#### `loadDataset(data)`
- `cleanRow()` har row pe chalata hai
- Rows drop karta hai jahan `Counselor Email` empty ho
- `masterData` (global) mein store karta hai
- `updateMetadata()` aur `applyDashboardFilters()` call karta hai

#### `applyDashboardFilters()`
- `masterData` pe saare active filters laagata hai
- Result `filteredData` (global) mein store karta hai
- Filters: startDate, endDate, month, daysLimit, counsellorEmail, teamLead, manager, campaign, band, status

#### `getCounsellorBreakdown()`
- `filteredData` ko counsellor-wise group karta hai
- Har counsellor ke liye `getAggregates()` call karta hai
- Returns array of counsellor objects (ye sabse zyada use hota hai `app.js` mein)

#### `getAggregates(dataset)`
- Sum of: dials, connected, effective, admissions, talktime, discounts
- Count of: present/halfday/absent
- Calculates: conversionPercentage, targetAchievement, effectiveRatio
- Financial: grossRevenue, netRevenue, operationalBurn, grossMargin

#### `getDailyTrend()`
- Date-wise grouped totals return karta hai (for charts)

#### `getHourByHourData(email, date)` ⚠️ SIMULATED
- Real data nahi hai — email+date se hash banata hai
- Hash se deterministic fake hourly pattern generate karta hai
- Hours: 9AM to 5PM, 9 slots

#### `saveStateToLocalStorage()` / `loadStateFromLocalStorage()`
- Active filters aur sort settings save/load karta hai browser mein
- Page refresh ke baad bhi filters intact rehte hain

---

## 📄 FILE 3: `analytics-engine.js`
**Role**: Saari calculations, AI scoring, predictions, recommendations

### Global Variable:
```js
window.AnalyticsEngine  // single instance
```

### Main Functions:

#### `calculateRiskScore(counsellorData)`
- Inputs: `totalAdmissions`, `totalTarget`, `rawRecords`, `attendance`
- Calls `calculateLeadQuality()` → `calculateFairScore()` → `predictTargetAchievement()`
- **Risk Score = P_miss** (Target Miss Probability)
- **Zone Logic**:
  - Green: FPI ≥ 1.0 AND P_miss < 15%
  - Red: FPI < 0.85 OR P_miss > 40%
  - Yellow: baaki sab
- Returns: `{ score, category, fpi, contributors }`

#### `getDaysElapsed(records)`
- Records ki dates mein se latest date ka `getDate()` return karta hai
- E.g. "2026-06-17" → returns `17`
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
- LQS formula → category (Hot/Warm/Cold) → attribution text
- Returns: `{ hotLeads, warmLeads, coldLeads, score, category, attribution }`

#### `calculateFairScore(counsellorData, leadQualityStats)`
- Expected Rate = `(0.20×Hot + 0.10×Warm + 0.05×Cold) ÷ Connected × 100`
- FPI = Actual Conv ÷ Expected Rate
- FPI ≥ 1.10 → "Highly efficient" (Green)
- FPI < 0.90 → "Underperforming" (Red)
- Returns: `{ expectedRate, actualRate, fpi, difference, rating, color }`

#### `diagnosePerformance(counsellorData)`
- 3 diagnostic cases check karta hai:
  - **Case 1 Effort Gap**: Dials < 60/day AND Talktime < 180s AND Admissions < 2
  - **Case 2 Lead Quality Gap**: Dials ≥ 60/day AND Connect Rate < 40%
  - **Case 3 Skill Gap**: Connected > 15 AND Talktime ≥ 200s AND Admissions < 2
- Fallback: "Optimal Performance" if nothing triggered
- Returns: array of issue objects with `{ type, severity, reason, explanation, action }`

#### `calculateFunnelDropoff(counsellorData)`
- 5 funnel stages calculate karta hai:
  - Stage 1: Dialled (always 100%)
  - Stage 2: Connected Rate = Connected ÷ Dialled × 100
  - Stage 3: Effective Rate = Effective ÷ Connected × 100
  - Stage 4: Form Rate = Form Filled ÷ Effective × 100
  - Stage 5: Admission Rate = Admissions ÷ Form Filled × 100
- Finds the stage with **lowest %** → flagged as bottleneck
- Returns: `{ stages, dropoffStage, advice }`

#### `generateRecommendations(breakdown, filters)`
- Har counsellor ke liye 5 rules check karta hai:
  - A: High effective ratio + low conversion → "Sales Coaching"
  - B: High LQS + Underperforming FPI → "Lead Reallocation"
  - C: P_miss > 70% → "Target Recovery Discount"
  - D: Avg dials < 60 → "Enable Auto-Dial"
  - E: LQS < 30 + low conversion → "Lead Quality Escalation"
- Sort by priority: High > Medium > Low

#### `calculateStatisticalSignificance(cohortA, cohortB)`
- Z-test: `Z = (p_A - p_B) ÷ SE`
- `SE = √[p_pooled × (1-p_pooled) × (1/nA + 1/nB)]`
- Abramowitz & Stegun CDF approximation for p-value
- Significant if p < 0.05
- Used in: Team Comparison page (bottom panel)

---

## 📄 FILE 4: `charts.js`
**Role**: Canvas charts banana aur puraane charts destroy karna

### Global Variable:
```js
window.ChartingEngine  // single instance
```

### Chart Registry System:
- `this.chartRegistry` — object jisme canvas ID → Chart instance store hota hai
- `destroyChart(canvasId)` — purana chart destroy karta hai before re-rendering
- Iske bina Chart.js duplicate charts pe crash karta

### Functions:

| Function | Chart Type | Used In |
|---|---|---|
| `renderCallActivityTrend(id, data)` | Line Chart | Exec Dashboard, Profile Trend, Drawer |
| `renderTargetProgress(id, data, target)` | Bar + Line Combo | Exec Dashboard |
| `renderTeamComparison(id, labels, adm, conv)` | Grouped Bar | Team Compare |
| `renderCounsellorRadar(id, name, scores, avg)` | Radar | Profile, Drawer |
| `renderRiskGauge(id, score)` | Half-Doughnut | Profile, Drawer |

### Radar Normalization Benchmarks (in app.js):
```js
Dials          → benchmark 80/day   → score = (avgDials ÷ 80) × 100
Reachability   → benchmark 50%      → score = (connectRate ÷ 0.50) × 100
Engagement     → benchmark 100%     → score = effectiveRatio
Closing Power  → benchmark 10%      → score = (convPct ÷ 10) × 100  [Adjusted to realistic 10%]
Attendance     → benchmark 100%     → score = attendanceRate
Talktime       → benchmark 240s     → score = (avgTalktime ÷ 240) × 100
```

---

## 📄 FILE 5: `exporter.js`
**Role**: Data download karna (CSV, Excel, PDF)

### Global Variable:
```js
window.ReportExporter  // single instance
```

### Functions:

#### `exportToCSV(data, filename)`
- Data array ke headers se CSV string banata hai
- Blob create karta hai → `<a>` element ke through download trigger karta hai
- Always exports **filtered data** (jo `dp.filteredDataset` se aata hai)

#### `exportToExcel(data, filename)`
- SheetJS `XLSX.utils.json_to_sheet()` use karta hai
- Auto-fit column widths (max 30 chars)
- Agar XLSX library load nahi → CSV pe fallback

#### `exportToPDF(viewId, title)`
- `document.title` temporarily change karta hai (PDF filename ke liye)
- `window.print()` trigger karta hai → browser print dialog khulta hai
- `styles.css` mein `@media print` rules apply hoti hain

---

## 📄 FILE 6: `mock-data.js`
**Role**: Demo data generate karna jab real Excel file na ho

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
- Har counsellor ke liye har din ek row banata hai
- Attendance random: weekends pe mostly Absent
- Calls formula: `baseDialled = (70 + random×30) × dialledMultiplier × attendanceMultiplier`
- Admissions formula: `Poisson-like` = `floor(connected × closingRate + (random - 0.35) × 1.5)`
- EMI = 60% of admissions, Full Payment = 40%

---

## 📄 FILE 7: `app.js`
**Role**: Sab kuch connect karta hai — routing, events, rendering

### Global Variables used:
```js
const dp = window.DataProcessor;
const ae = window.AnalyticsEngine;
const ce = window.ChartingEngine;
const exp = window.ReportExporter;
```

### App State Variables:
```js
let activeView = "view-executive";  // current page
let activeRole = "manager";         // role permission level
let activeCounsellorEmail = "";     // currently selected counsellor
let insightsInterval = null;        // ticker interval handle
```

### Key Functions:

#### `init()`
- Upload overlay dikhata hai
- "Or Load Demo Mock Data" button inject karta hai
- `bindEvents()` call karta hai

#### `finishInit()`
- Data load hone ke baad call hota hai
- Date filters set karta hai (min/max of data)
- Dropdowns populate karta hai
- `renderActiveView()` call karta hai

#### `bindEvents()`
- Sab HTML elements ke saath event listeners connect karta hai:
  - Sidebar nav links → `switchView()`
  - Date/filter dropdowns → `dp.setFilter()` → `onFiltersChanged()`
  - File input → `dp.parseExcelFile()`
  - Export buttons → `exp.exportToCSV/Excel/PDF()`
  - Sheet modal buttons → `dp.loadSheets()`

#### `switchView(targetView)`
- Active section show/hide karta hai
- Sidebar active class toggle karta hai
- Role restriction check karta hai
- `renderActiveView()` call karta hai

#### `renderActiveView()`
- Switch statement se sahi render function call karta hai

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
- Radar ke liye 6 metrics ko 0-100 scale pe normalize karta hai
- Benchmarks: Dials=80, Reachability=50%, Engagement=100%, Closing=10%, Attendance=100%, Talktime=240s

#### `generateAISummaryText(c, risk, diagnostics, predictor)`
- Green risk → positive summary with targets
- Red/Yellow risk → bottleneck + action plan text

#### `generateAIInsightsList()`
- 4 types ke insights:
  1. High risk count alert
  2. Best vs 2nd best campaign comparison
  3. Reachability alert (if < 45%)
  4. Underperforming counsellors with premium leads

#### `openProfileDrawer(email)`
- 360° slide-in drawer populate karta hai
- Risk gauge render karta hai
- Diagnostics cards build karta hai
- `renderDrawerTrendChart()` call karta hai

#### `renderDrawerTrendChart()`
- `drawerChartType === "daily"` → real daily records show
- `drawerChartType === "hourly"` → `dp.getHourByHourData()` (SIMULATED) call karta hai

---

## 📄 FILE 8: `styles.css`
**Role**: Poora dark mode UI design

### CSS Custom Properties (Variables):
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

## 📄 FILE 9: `mock-data.js` → Already covered in FILE 6 above

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

---

## ⚡ Quick Reference: Which File to Edit for What

| I want to change... | Edit this file |
|---|---|
| Colors, fonts, layout | `styles.css` |
| A dashboard view HTML | `index.html` |
| How Excel columns are read | `data-processor.js` → `cleanRow()` |
| A calculation / formula | `analytics-engine.js` |
| A chart appearance | `charts.js` |
| Which views appear / routing | `app.js` → `switchView()` |
| Export file name | `exporter.js` |
| Demo data profiles | `mock-data.js` → `MOCK_COUNSELLORS` |
