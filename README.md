
# AI Counsellor Intelligence & Lead Performance Platform

> **Version 1.0** · Built for PW (Physics Wallah) · Client-Side SPA + Python Data Pipeline

An AI-powered analytics and optimization platform for managers, team leads, and counsellors. The platform ingests counsellor performance Excel spreadsheets (daily call logs, attendance, targets, admissions, payments), evaluates conversion bottlenecks, predicts month-end target achievements, grades lead quality, and prescribes actionable coaching plans.

- **Frontend**: Fully client-side Single Page Application (SPA) — zero backend or database dependencies.
- **Backend Pipeline**: Python data pipeline (`clean_dod_data.py`, `dashboard_intelligence.py`) for offline analytics and JSON generation.

---

## 🌟 Features

### 1. 📊 Executive Dashboard
The home screen — live pulse on the entire team.
- **6 KPI Cards**: Total Active Counsellors, Total Admissions, Overall Conversion %, High Risk Staff Count, Gross Revenue Margin, Operational Burn Cost.
- **Systemic Trend Alert Banner**: Auto-detects if macro conversion rate dropped >5% between first and second half of the selected date range.
- **AI Insights Slideshow**: Rotating feed of AI-generated contextual insights (top performer callout, risk alerts, conversion trends, attendance dips).
- **Daily Calling & Engagement Trend Chart**: Line chart of Dials, Connected Calls, Effective Calls over time.
- **Target Progress Run-rate Chart**: Cumulative admissions vs. pro-rata target path.
- **Top 3 Performers** (by Fair Performance Index), **Top 3 High-Risk Alerts**, **Top 3 AI Recommendations**.

---

### 2. 📋 Counsellor Metrics Table
Detailed sortable data table of every counsellor in the dataset.
- **Multi-Column Sorting**: Click any header to sort; hold `Shift` + click for multi-column sort.
- **Search Bar**: Filter by name or email. Supports **Regex mode**.
- **Band Filter**: Filter by Band A / B / C.
- **Columns**: Name, TL/Manager, Campaign, Attendance %, Target, Admissions, Conversion %, Total Dials, Connects, Effective Calls, Avg Talktime, Fair Score, Risk Level.
- **Click any row** → opens the 360° Counsellor Profile Drawer.

---

### 3. 🏆 Leaderboards & Rankings (5 Categories)

| Tab | Ranking Basis |
|---|---|
| **Top Performers** | Total Admissions (metric: Avg Daily Dials) |
| **Most Improved** | Fair Performance Index (FPI) score |
| **Best Closers** | Closing Velocity (simulated days to close) |
| **High Risk** | AI Risk Score (highest risk first) |
| **Low Activity** | MoM Performance Velocity (conversion delta: first vs second half) |

---

### 4. 👤 Counsellor Profile Intelligence
Deep-dive individual profile view.
- **Profile Card**: Name, Email, Team Lead, Manager, Campaign, Band/Status, Risk Pill.
- **Target Prediction Indicator**: Mini gauge showing Risk Score and prediction verdict.
- **Competency Radar Chart**: Counsellor vs Team Average — Conversion, Dials, Effective Ratio, Talktime, Attendance.
- **AI Performance Summary**: Auto-generated narrative of strengths, weaknesses, and action items.
- **Root Cause Diagnostics**: Cards for specific failure modes (Low Talktime, High Absenteeism, Poor Effective Ratio).
- **Personal Calling & Conversion Trend Chart**: Daily line chart of dials and admissions.

---

### 5. 🔁 360° Counsellor Profile Drawer (Slide-In Panel)
Side drawer slides in when clicking any counsellor name in any table or list.
- **Tabs**: Overview | Daily Trend | Hourly Breakdown
- **Daily Trend Chart**: Multi-line chart of dials, connects, effective calls by day.
- **Hourly Breakdown Chart**: ⚠️ Simulated hour-by-hour (9 AM – 5 PM) calling pattern.
- **Risk Pill, Fair Score, Conversion %, Target Achievement, Talktime** as summary stats.

---

### 6. 🏢 Team Comparison Dashboard
Side-by-side performance comparison (Manager role only).
- **4 Comparison Modes**: Compare Team Leads | Compare Managers | Compare Campaigns | Compare Bands.
- **Bar Chart**: Admissions and conversion rates by group.
- **Statistical Z-Test**: Highlights statistically significant differences (p < 0.05).

---

### 7. ⚠️ AI Risk Prediction Engine
Proactive risk detection before month-end.
- **Risk Scoring Methodology Card**: Full 5-factor weighted model explanation.
- **Month-End Prediction Table**: Per counsellor — Current Admissions, Target, Projected EOM Admissions, Gap, Miss Probability %, Risk Level (Green / Yellow / Red).

---

### 8. 🎯 Lead Quality Intelligence (3 Panels)
Evaluates whether poor performance is due to the counsellor or the lead quality they received.

**Panel 1 — Lead Pipeline Quality Breakdown**
- Classifies leads as: 🔥 Hot (EMI Paid + Full Payment On Spot) · ⚡ Warm (Form Filled, not paid) · ❄️ Cold (Connected but no progress)
- Shows Lead Quality Score (LQS), Conversion %, Attribution Diagnosis.

**Panel 2 — Fair Performance Scoring**
- Expected Conversion Rate adjusted for lead quality mix.
- Tags counsellors: `HIGHLY EFFICIENT` | `PARITY` | `UNDERPERFORMING`
- **Fair Performance Index (FPI)** = Actual Conv % ÷ Expected Conv %.

**Panel 3 — Structural Lead Disparity & Routing Monitor**
- Compares avg LQS per Team Lead.
- Flags teams whose avg LQS is >10% below org average as **OVERLOADED**.

---

### 9. 🔽 Funnel Drop-Off Analysis
Visualizes the sales pipeline as a horizontal funnel:
> Dials → Connected → Effective → Form Filled → Admissions → EMI Paid

- **Funnel Chart**: Each stage as a colored horizontal bar with drop-off % between stages.
- **Biggest Bottleneck Auto-Detected**.
- **AI Funnel Optimization Recommendation**: Context-aware prescription based on the biggest drop.

---

### 10. 💡 AI Recommendations Engine
Prioritized action plan list for the entire team.
- Coaching recommendations per counsellor (e.g., "Refresher training", "Dialer mode shift", "List re-scrub", "Discount link follow-up").
- Sorted by priority: **High → Medium → Low**.
- Click any recommendation → navigates to that counsellor's profile.

---

### 11. 📤 Report Exporter (Floating Bar)
Always-visible export buttons at the bottom of every view.
- **Export CSV**: Downloads filtered dataset as `.csv`.
- **Export Excel**: Downloads filtered dataset as `.xlsx`.
- **Export PDF**: Triggers browser print-to-PDF of the active view.

---

### 12. 🔐 Role-Based Access Control

| Role | Access |
|---|---|
| **Manager** | All views |
| **Team Lead** | All views except Team Comparison |
| **Counsellor** | Only their own Profile, Lead Quality, Funnel, Recommendations |

---

### 13. 🗂️ Multi-Sheet Excel Upload Support
- **Sheet selector modal** appears when uploading a multi-sheet Excel file.
- Select any combination of sheets (or all).
- All selected sheets are **merged** into a single unified dataset.

---

### 14. 🔍 Global Filters (Applied Across All Views)
- **Date Range Picker**: From / To date selectors
- **Month Dropdown**: Filter by available months in dataset
- **Days Dropdown**: Last 7 Days / Last 30 Days / All Days
- **Manager / Team Lead / Campaign Dropdowns**

All filters persist across page navigation via **LocalStorage state preservation**.

---

### 15. ⚙️ Custom Financial Settings Panel
Configure operational margin variables directly in the UI:
- **Course Price** (default: ₹25,000)
- **Dialed Call Cost** (default: ₹0.50/call)
- **Daily Salary** (default: ₹1,200/day)

Updates persist in LocalStorage and trigger instant recalculation of all financial KPIs.

---

## 🛠️ Technical Stack

### Frontend (SPA)
| Layer | Technology |
|---|---|
| **UI Structure** | HTML5 Semantic SPA |
| **Logic** | Vanilla JavaScript ES6+ |
| **Styling** | Vanilla CSS3 (Dark mode, glassmorphism, keyframe animations) |
| **Excel Parsing** | SheetJS (XLSX) v0.18.5 via CDN |
| **Charts** | Chart.js via CDN |
| **Data Storage** | Browser LocalStorage (no backend) |
| **Dev Server** | http-server (Node.js) |

### Backend Pipeline (Python)
| Layer | Technology |
|---|---|
| **Data Cleaning** | `clean_dod_data.py` — pandas in-memory pipeline |
| **Analytics Engine** | `dashboard_intelligence.py` — MoM, Forecasting, Coaching, Comparison |
| **JSON Generation** | `generate_clean_json.py` — Excel → `clean_data.json` |
| **Dependencies** | `pandas`, `openpyxl`, `numpy` |

---

## 📐 Mathematical Models

> ✅ All formulas verified directly from `analytics-engine.js` and `dashboard_intelligence.py`.

### 1. AI Risk Score & Zone Classification
```
Step 1 — Current Daily Velocity:
  V_c = Total Admissions ÷ Days Worked
  (Days Worked = Present Days + Half Days × 0.5)

Step 2 — Predicted Month-End Admissions:
  P_m = Total Admissions + (V_c × Days Remaining)
  Days Remaining = 30 − Days Worked

Step 3 — Target Gap:
  G_t = Target − P_m

Step 4 — Miss Probability = Risk Score:
  P_miss = Max(0, (G_t ÷ Target) × 100)
  Risk Score = Min(100, Round(P_miss))
```

**Risk Zone (uses BOTH FPI and P_miss):**
```
Green  (Safe)    : FPI ≥ 1.0  AND  P_miss < 15%
Yellow (Warning) : 0.85 ≤ FPI < 1.0  OR  15% ≤ P_miss ≤ 40%
Red    (Critical): FPI < 0.85  OR  P_miss > 40%
```

### 2. Lead Categorization & LQS
```
Hot Leads  = EMI Paid + Full Payment On Spot
Warm Leads = Max(0, Form Filled − Hot Leads)
Cold Leads = Max(0, Total Connected − Hot Leads − Warm Leads)

LQS = [ (3.0 × Hot) + (1.5 × Warm) + (0.5 × Cold) ] ÷ Total Connected × 100
      (Capped at 100)

LQS Categories:  Cold: LQS < 30 | Warm: 30 ≤ LQS < 60 | Hot: LQS ≥ 60
```

### 3. Fair Performance Index (FPI)
```
Expected Conversion Rate % =
  [ (0.20 × Hot) + (0.10 × Warm) + (0.05 × Cold) ] ÷ Connected × 100

FPI = Actual Conversion % ÷ Expected Conversion %

FPI ≥ 1.10        → "Highly Efficient"   (Green)
0.90 ≤ FPI < 1.10 → "Parity"             (Yellow)
FPI < 0.90        → "Underperforming"    (Red)
```

### 4. Root Cause Diagnostic Triggers
```
Case 1 — Effort Gap (Critical):
  IF: Avg Dials/day < 60 AND Avg Talktime < 180s AND Admissions < 2

Case 2 — Lead Quality Gap (High):
  IF: Avg Dials/day ≥ 60 AND (Connected ÷ Dialled) < 0.40

Case 3 — Skill Gap (Critical):
  IF: Connected > 15 AND Avg Talktime ≥ 200s AND Admissions < 2
```

### 5. Revenue Forecast (Python — SMA)
```
Daily Admissions series → 15-day Simple Moving Average
Forecast Value = Mean of last 15 available days
Forecasted Revenue = Forecast Value × avg_admission_value (default ₹5,000)
Next 7 days are projected using this constant rate.
```

### 6. Gross Revenue & Operational Margin
```
Gross Revenue    = Total Admissions × Course Price (₹25,000)
Net Revenue      = Gross Revenue − Total Discounts
Operational Burn = (Total Dials × ₹0.50) + (Active Days × ₹1,200)
Gross Margin     = Net Revenue − Operational Burn
Gross Margin %   = (Gross Margin ÷ Net Revenue) × 100
```

### 7. Statistical Z-Test (Team Comparison)
```
p_A = Admissions_A ÷ Connected_A
p_B = Admissions_B ÷ Connected_B
p_pooled = (Admissions_A + Admissions_B) ÷ (Connected_A + Connected_B)

SE = √[ p_pooled × (1 − p_pooled) × (1/n_A + 1/n_B) ]
Z  = (p_A − p_B) ÷ SE

Significant if p-value < 0.05
(Uses Abramowitz & Stegun normal CDF approximation)
```

---

## 📁 File Structure

```
AI Counsellor Intelligence & Lead Performance Platform/
│
├── index.html                  # SPA layout — all 9 views + modals + drawer
├── styles.css                  # Dark mode design system, glassmorphism, animations
├── app.js                      # Router, event binders, render functions, role control
├── data-processor.js           # Excel parser, column mapper, filters, LocalStorage
├── analytics-engine.js         # Risk, FPI, LQS, predictions, recommendations engine
├── charts.js                   # Canvas renderers: line, bar, radar, gauge, funnel
├── exporter.js                 # CSV, XLSX, and PDF export handlers
├── mock-data.js                # Seed data generator for demo / offline testing
│
├── clean_dod_data.py           # Python in-memory data cleaning pipeline (v2.0)
├── dashboard_intelligence.py   # Python analytics engine (MoM, Forecast, Coaching, Comparison)
├── generate_clean_json.py      # Runs pipeline → outputs clean_data.json
│
├── clean_data.json             # Pre-generated output from Python pipeline (~7.8 MB)
├── May dod data .xlsx          # Real May counsellor performance data (2 sheets)
│
├── package.json                # npm scripts (dev server)
└── package-lock.json
```

---

## 📊 Excel Column Mapping (Accepted Formats)

The data processor accepts all column name variants (case-insensitive):

| Field | Accepted Column Names |
|---|---|
| **Date** | `Date`, `date`, `Reporting Date`, `Report Date`, `Day`, `Working Date`, `Dated` |
| **Counsellor Email** | `Counselor Email`, `Counsellor Email`, `Email`, `Emp Email`, `Mail ID` |
| **Joining Date** | `Joining date`, `Joining Date`, `DOJ`, `Date of Joining` |
| **Team Lead** | `Team Lead`, `TL`, `TL Name` |
| **Manager** | `Manager`, `manager` |
| **Dialled Calls** | `Dialled Calls` |
| **Connected Calls** | `Connected Calls`, `Connected calls` |
| **Effective Calls** | `Effective Calls`, `Effective calls` |
| **Total Admissions** | `Total Admissions`, `Total admissions`, `Total Adm` |
| **Form Filled** | `Total Adm(form Filled)`, `Total Admissions Form Filled` |
| **EMI Paid** | `EMI Paid`, `EMI paid` |
| **Full Payment** | `Full Payment On Spot`, `Full Payment On spot` |
| **Talktime** | `Talktime (In hours)`, `Talktime`, `Talk Time` |
| **Target** | `Target` |
| **Attendance** | `Attendance` — values: `Present`, `Half Day`, `Absent` |
| **Band** | `Band` — values: `Band A`, `Band B`, `Band C` |
| **Status** | `Status` — values: `Active`, `Inactive` |
| **Campaign** | `Campaign` |
| **Discounts** | `Counsellor discount`, `Manager discount`, `Other Discount` |
| **Campaign Flags** | `FY 26`, `FY 27`, `CJR`, `AI`, `Auto Dial`, `Manual Dial` |

> **Auto Email Detect**: If no email column matches, the parser scans ALL columns for any `@` value as fallback — no data is silently lost.

---

## 🐍 Python Pipeline (Offline Analytics)

The Python pipeline provides additional analytics capabilities independent of the browser dashboard.

### Setup
```bash
pip install pandas openpyxl numpy
```

### Step 1: Generate clean_data.json
```bash
python generate_clean_json.py
```
Reads `May dod data .xlsx`, cleans both sheets via `clean_dod_data.py`, and writes `clean_data.json`.

### Step 2: Run Intelligence Engine (Smoke Test)
```bash
python dashboard_intelligence.py
```
Runs all 4 intelligence features against `clean_data.json`:
1. **Month-over-Month (MoM) Comparison** — Apr vs May per counsellor
2. **Automated Coaching Recommendations** — Rule-based diagnostic engine
3. **Revenue Forecast** — 7-day SMA-based forecast
4. **Counsellor Comparison Tool** — Side-by-side delta report

### Python Module: `clean_dod_data.py`
Production-grade in-memory data pipeline. Key guarantees:
- ✅ **NO DISK WRITES** — Excel file is never modified
- ✅ **NO DATA LOSS** — Zero rows dropped; `dropna()` never called on rows
- ✅ **IN-MEMORY ONLY** — All transforms happen in RAM
- ✅ **SAFE NUMERICS** — `pd.to_numeric(errors='coerce').fillna(0)`
- ✅ **SAFE DATES** — `pd.to_datetime(errors='coerce')` → NaT on bad cells
- ✅ **GHOST TIMELINE FIX** — Date axis hard-clamped to `2026-04-01 → 2026-05-31`
- ✅ **HEADER-BLEED GUARD** — Removes spurious repeated header rows from Sheet2

### Python Module: `dashboard_intelligence.py`
| Function | Description |
|---|---|
| `mom_comparison(current_df, previous_df)` | MoM % change per counsellor for Admissions, Talktime, Dials |
| `generate_coaching_recommendations(df)` | Rule-based coaching tip per row |
| `forecast_admissions_and_revenue(df)` | SMA-based 7-day forecast |
| `compare_counsellors(email1, email2, df)` | Side-by-side delta report for 2 counsellors |

---

## 🚀 Setup & Running Locally

### Option A: Direct Browser Open
Double-click `index.html` to open the dashboard directly in your browser.

### Option B: Local Server (Recommended — No Cache Issues)
```bash
# Install dependencies
npm install

# Start with no-cache server (recommended for development)
npx http-server -p 8081 -c-1

# Or use the npm dev command
npm run dev
```

Open: **`http://127.0.0.1:8081/`**

> **Port**: Server runs on **8081** (not 8080). JS files versioned with `?v=4` to bust browser cache.

---

## 🐛 Bugs Fixed (Changelog)

| # | Issue | Fix Applied |
|---|---|---|
| 1 | Rows with `Counsellor Email` (double-l) being dropped | Added British spelling variant + 6 more email column name fallbacks |
| 2 | Rows silently dropped when `Date` column missing | Filter now only requires email; date-less rows are kept |
| 3 | Auto email detection when column name is custom | Scans all columns for any `@` value as fallback |
| 4 | AVG DAILY DIALS showing admission count instead of calls | Fixed formula: `Total Dials ÷ Unique Working Days` |
| 5 | Browser serving stale cached JS after code updates | JS files versioned (`?v=4`), server started with `-c-1` (no cache) |
| 6 | `Reporting Date`, `Report Date`, `Day` columns not parsed | Added 6 more date column name variants |
| 7 | `TL Name`, `TL` column not recognized for Team Lead | Added TL column variants to parser |
| 8 | Lowercase email addresses displayed in tables | Added `toTitleCase` helper: strips domain, replaces delimiters, capitalizes |
| 9 | Target miss projections incorrect on custom date ranges | Replaced `latestDate.getDate()` with range calendar span diff math |
| 10 | Last 7/30 days filters displaying 0 rows on historical data | Changed anchor date from system today to max date in dataset |
| 11 | Closing Power competency normalized to unrealistic 18% | Adjusted normalization benchmark to realistic 10% |
| 12 | Financial constants hardcoded in JavaScript | Added Financial Settings modal with localStorage persistence |
| 13 | Simulated hourly data unflagged in drawer view | Added visual disclaimer alerts on simulated hourly charts |
| 14 | Application vulnerable to crashes from invalid data or unexpected states | Added comprehensive error handling with try/catch blocks, input validation, and graceful fallbacks across all JavaScript modules (data-processor.js, analytics-engine.js, charts.js, app.js, exporter.js) |
| 15 | Potential null/reference errors in data processing functions | Added null/undefined checks and default values throughout data processing pipeline |
| 16 | Chart rendering failures breaking the UI | Implemented error boundaries in chart rendering functions with console error logging and graceful degradation |
| 17 | View rendering crashes leaving blank screens | Added try/catch blocks around view rendering functions with fallback error messages |
