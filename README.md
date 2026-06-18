# AI Counsellor Intelligence & Lead Performance Platform

An AI-powered analytics and optimization platform designed for managers, team leads, and counsellors at PW (Physics Wallah). The platform automatically ingests counsellor performance Excel spreadsheets (daily call logs, attendance, targets, admissions, payments), evaluates conversion bottlenecks, predicts month-end target achievements, grades lead quality, and prescribes actionable recommendation plans.

Developed as a highly responsive, client-side **Single Page Application (SPA)**. Operates entirely in the browser with **zero backend or database dependencies**.

---

## 🌟 All Features (Complete List)

### 1. 📊 Executive Dashboard
The home screen — gives management a live, real-time pulse on the entire team.
- **6 KPI Cards**: Total Active Counsellors, Total Admissions, Overall Conversion %, High Risk Staff Count, Gross Revenue Margin, and Operational Burn Cost.
- **Systemic Trend Alert Banner**: Auto-detects if macro conversion rate dropped by >5% between first and second half of the selected date range and shows a red warning banner.
- **AI Insights Slideshow**: Rotating feed of AI-generated contextual insights (top performer callout, risk alerts, conversion trends, attendance dips).
- **Daily Calling & Engagement Trend Chart**: Line chart of Dials, Connected Calls, Effective Calls over time.
- **Target Progress Run-rate Chart**: Cumulative admissions vs. pro-rata target path.
- **Top 3 Performers List** (by Fair Performance Index).
- **Top 3 High-Risk Alerts** (counsellors most likely to miss target).
- **Top 3 Instant AI Recommendations**.

---

### 2. 📋 Counsellor Metrics Table
Detailed sortable data table of every counsellor in the dataset.
- **Multi-Column Sorting**: Click any column header to sort. Hold `Shift` and click another column to sort by multiple columns simultaneously.
- **Search Bar**: Filter by counsellor name or email. Supports **Regex mode** (toggle checkbox).
- **Band Filter**: Filter table by Band A / Band B / Band C.
- **Columns**: Name, TL/Manager, Campaign, Attendance %, Target, Admissions, Conversion %, Total Dials, Connects, Effective Calls, Avg Talktime, Fair Score, Risk Level.
- **Click any row** to open the 360° Counsellor Profile Drawer.

---

### 3. 🏆 Leaderboards & Rankings (5 Categories)
Ranked views across different performance dimensions:

| Tab | Ranking Basis |
|---|---|
| **Top Performers** | Sorted by Total Admissions. Shows Avg Daily Dials (calls/day) in metric column. |
| **Most Improved** | Sorted by Fair Performance Index (FPI) score — normalized for lead quality. |
| **Best Closers** | Sorted by Closing Velocity (simulated days to close a lead — lower is better). |
| **High Risk** | Sorted by AI Risk Score (highest risk first). |
| **Low Activity** | Sorted by MoM Performance Velocity (conversion delta between first and second half). |

> **Bug Fixed**: AVG DAILY DIALS column now correctly shows `calls/day` (Total Dials ÷ Unique Working Days), not admissions count.

---

### 4. 👤 Counsellor Profile Intelligence
Deep-dive individual profile view.
- **Profile Card**: Name, Email, Team Lead, Manager, Campaign, Band/Status, Risk Pill.
- **Target Prediction Indicator**: Mini gauge showing Risk Score with prediction verdict.
- **Competency Radar Chart**: Counsellor vs Team Average across 5 axes — Conversion, Dials, Effective Ratio, Talktime, Attendance.
- **AI Performance Summary**: Auto-generated narrative summarizing the counsellor's strengths, weaknesses, and action items.
- **Root Cause Diagnostics**: Auto-triggered cards highlighting specific failure modes (e.g., "Low Talktime", "High Absenteeism", "Poor Effective Ratio").
- **Personal Calling & Conversion Trend Chart**: Daily line chart of that counsellor's dials and admissions.
- **Profile Selector Dropdown**: Switch between any counsellor in the dataset.

---

### 5. 🔁 360° Counsellor Profile Drawer (Slide-In Panel)
When clicking any counsellor name in any table or list, a full-featured side drawer slides in:
- **Tabs**: Overview | Daily Trend | Hourly Breakdown
- **Daily Trend Chart**: Multi-line chart of dials, connects, effective calls by day.
- **Hourly Breakdown Chart**: Simulated hour-by-hour (9 AM to 5 PM) calling pattern for any selected date.
- **Risk Pill**, **Fair Score Pill**, **Conversion %, Target Achievement, Talktime** shown as summary stats.

---

### 6. 🏢 Team Comparison Dashboard
Side-by-side performance comparison (restricted to Manager role).
- **4 Comparison Modes**: Compare Team Leads | Compare Managers | Compare Campaigns | Compare Bands.
- **Bar Chart**: Admissions and conversion rates by group.
- **Comparative Statistics Table**: Admissions, Avg Conversion %, Avg Risk Score per group.

---

### 7. ⚠️ AI Risk Prediction Engine
Proactive risk detection before month-end.
- **Risk Scoring Methodology Card**: Full explanation of the 5-factor weighted model.
- **Month-End Prediction Table**: Per counsellor — Current Admissions, Target, Projected End-of-Month Admissions, Gap, Miss Probability %, Risk Level (Green / Yellow / Red).

---

### 8. 🎯 Lead Quality Intelligence (3 Panels)
Evaluates whether poor performance is due to the counsellor or the lead quality they received.

**Panel 1 — Lead Pipeline Quality Breakdown**
- Classifies each counsellor's leads as:
  - 🔥 **Hot Leads**: EMI Paid + Full Payment On Spot (high closing potential)
  - ⚡ **Warm Leads**: Form Filled but not paid
  - ❄️ **Cold Leads**: Connected but no further progression
- Shows Lead Quality Score (LQS), Conversion %, and Attribution Diagnosis.

**Panel 2 — Fair Performance Scoring**
- Calculates Expected Conversion Rate (adjusted for lead quality mix).
- Tags each counsellor as: `HIGHLY EFFICIENT` | `OVERPERFORMING` | `PARITY` | `UNDERPERFORMING`.
- The **Fair Performance Index (FPI)** = Actual Conv / Expected Conv.

**Panel 3 — Structural Lead Disparity & Routing Monitor**
- Compares average LQS per Team Lead.
- Flags teams whose avg LQS is >10% below org average as **OVERLOADED** — protecting those counsellors from unfair evaluations.

---

### 9. 🔽 Funnel Drop-Off Analysis
Visualizes the sales pipeline as a horizontal funnel:
> Dials → Connected → Effective → Form Filled → Admissions → EMI Paid

- **Funnel Chart**: Each stage shown as a colored horizontal bar with drop-off % between stages.
- **Biggest Bottleneck Auto-Detected**: Identifies which stage has the largest percentage drop.
- **AI Funnel Optimization Recommendation**: Context-aware prescription based on where the biggest drop occurs.

---

### 10. 💡 AI Recommendations Engine
Prioritized action plan list for the entire team.
- Generates coaching recommendations per counsellor (e.g., "Refresher training", "Dialer mode shift", "List re-scrub", "Discount link follow-up").
- Sorted by priority: **High → Medium → Low**.
- Click any recommendation to navigate to that counsellor's profile.

---

### 11. 📤 Report Exporter (Floating Bar)
Always-visible export buttons at the bottom of every view:
- **Export CSV**: Downloads filtered dataset as a `.csv` file.
- **Export Excel**: Downloads filtered dataset as a formatted `.xlsx` spreadsheet.
- **Export PDF**: Triggers browser print-to-PDF of the currently active view.

---

### 12. 🔐 Role-Based Access Control (Simulation)
Simulate different permission levels from a dropdown in the header:

| Role | What They Can See |
|---|---|
| **Manager** | All views |
| **Team Lead** | All views except Team Comparison |
| **Counsellor** | Only their own Profile, Lead Quality, Funnel, Recommendations |

---

### 13. 🗂️ Multi-Sheet Excel Upload Support
When uploading an Excel file with multiple sheets:
- A **sheet selector modal** appears listing all sheet names.
- Select any combination of sheets (or all).
- All selected sheets are **merged** into a single unified dataset.
- Single-sheet files are loaded directly without any dialog.

---

### 14. 🔍 Global Filters (Applied Across All Views)
- **Date Range Picker**: From / To date selectors
- **Month Dropdown**: Filter by April / May / June / All Months
- **Days Dropdown**: Last 7 Days / Last 30 Days / All Days
- **Manager Dropdown**: Filter entire dashboard to one manager's team
- **Team Lead Dropdown**: Filter to one TL's counsellors
- **Campaign Dropdown**: Filter by FY26 / FY27 / CJR

All filters persist across page navigation via **LocalStorage state preservation**.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| **UI Structure** | HTML5 Semantic SPA |
| **Logic** | Vanilla JavaScript ES6+ |
| **Styling** | Vanilla CSS3 (Dark mode, glassmorphism, CSS custom properties, keyframe animations) |
| **Excel Parsing** | SheetJS (XLSX) v0.18.5 via CDN |
| **Charts** | Chart.js via CDN |
| **Data Storage** | Browser LocalStorage (no backend) |
| **Dev Server** | http-server (Node.js) |

---

## 📐 Mathematical Models

> ✅ All formulas verified directly from the actual `analytics-engine.js` code.

### 1. AI Risk Score & Zone Classification

The Risk Score **equals Target Miss Probability (P_miss)**:
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

**Risk Zone uses BOTH FPI and P_miss:**
```
Green  (Safe)    : FPI ≥ 1.0  AND  P_miss < 15%
Yellow (Warning) : 0.85 ≤ FPI < 1.0  OR  15% ≤ P_miss ≤ 40%
Red    (Critical): FPI < 0.85  OR  P_miss > 40%
```

### 2. Avg Daily Dials (Two Contexts)
```
In Leaderboard/Rankings:
  Avg Daily Dials = Total Dialled Calls ÷ Unique Date Count
  (Unique Date Count = number of distinct dates in records)

In Diagnostics/Recommendations:
  Avg Daily Dials = Total Dialled Calls ÷ Active Days
  Active Days = Present Days + (Half Days × 0.5)
```

### 3. Lead Categorization & LQS
```
Hot Leads  = EMI Paid + Full Payment On Spot
Warm Leads = Max(0, Form Filled − Hot Leads)
Cold Leads = Max(0, Total Connected − Hot Leads − Warm Leads)

LQS = [ (3.0 × Hot) + (1.5 × Warm) + (0.5 × Cold) ]
      ÷ Total Connected Calls × 100
      (Capped at 100)

LQS Categories:
  Cold : LQS < 30
  Warm : 30 ≤ LQS < 60
  Hot  : LQS ≥ 60
```

### 4. Fair Performance Index (FPI)
```
Expected Conversion Rate % =
  [ (0.20 × Hot Leads) + (0.10 × Warm Leads) + (0.05 × Cold Leads) ]
  ÷ Total Connected Calls × 100

  (Hot=20% base rate, Warm=10%, Cold=5%)

FPI = Actual Conversion % ÷ Expected Conversion %
```

**FPI Thresholds (exact code values):**
```
FPI ≥ 1.10        → "Highly Efficient"  (Green)
0.90 ≤ FPI < 1.10 → "Parity"            (Yellow)
FPI < 0.90        → "Underperforming"   (Red)
```

### 5. Month-End Target Prediction
```
V_c = Total Admissions ÷ Days Worked
P_m = Total Admissions + (V_c × Days Remaining)
G_t = Target − P_m
P_miss = Max(0, (G_t ÷ Target) × 100), capped at 100%

Days Remaining = 30 − Days Worked
```

### 6. Root Cause Diagnostic Triggers
```
Case 1 — Effort Gap (Critical):
  IF: Avg Dials/day < 60 AND Avg Talktime < 180 sec AND Admissions < 2
  → "Low activity — counsellor not making enough calls"

Case 2 — Lead Quality Gap (High):
  IF: Avg Dials/day ≥ 60 AND (Connected ÷ Dialled) < 0.40 (40%)
  → "Stale numbers / spam-blocked leads"

Case 3 — Skill Gap (Critical):
  IF: Connected > 15 AND Avg Talktime ≥ 200 sec AND Admissions < 2
  → "Engaging on calls but failing to close"
```

### 7. Gross Revenue & Operational Margin
```
Gross Revenue    = Total Admissions × ₹25,000
Total Discounts  = Counsellor Discount + Manager Discount + Other Discount
Net Revenue      = Gross Revenue − Total Discounts

Active Days      = Present Days + (Half Days × 0.5)
Operational Burn = (Total Dials × ₹0.50) + (Active Days × ₹1,200)

Gross Margin     = Net Revenue − Operational Burn
Gross Margin %   = (Gross Margin ÷ Net Revenue) × 100
```

### 8. Statistical Z-Test (Team Comparison)
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
AI Counsellor Platform/
│
├── index.html              # SPA layout — all 9 views + modals + drawer
├── styles.css              # Dark mode design system, glassmorphism, animations
├── app.js                  # Router, event binders, render functions, role control
├── data-processor.js       # Excel parser, column mapper, filters, LocalStorage
├── analytics-engine.js     # Risk, FPI, LQS, predictions, recommendations engine
├── charts.js               # Canvas renderers: line, bar, radar, gauge, funnel
├── exporter.js             # CSV, XLSX, and PDF export handlers
├── mock-data.js            # Seed data generator for demo / offline testing
├── package.json            # npm scripts (dev server, test)
├── May dod data .xlsx      # Real May counsellor performance data
└── april.xlsx              # Real April counsellor performance data
```

---

## 📊 Excel Column Mapping (Accepted Formats)

The data processor accepts all of these column name variants (case-insensitive):

| Field | Accepted Column Names in Excel |
|---|---|
| **Date** | `Date`, `date`, `DATE`, `Reporting Date`, `Report Date`, `Day`, `Working Date`, `Dated` |
| **Counsellor Email** | `Counselor Email`, `Counsellor Email`, `Email`, `email`, `Emp Email`, `Employee Email`, `Mail ID` |
| **Joining Date** | `Joining date`, `Joining Date`, `DOJ`, `Date of Joining` |
| **Team Lead** | `Team Lead`, `TL`, `TL Name` |
| **Manager** | `Manager`, `manager` |
| **Dialled Calls** | `Dialled Calls` |
| **Connected Calls** | `Connected Calls`, `Connected calls` |
| **Effective Calls** | `Effective Calls`, `Effective calls` |
| **Total Admissions** | `Total Admissions`, `Total admissions`, `Total Adm` |
| **Shared Admissions** | `Shared Admissions`, `Shared admissions` |
| **Form Filled** | `Total Adm(form Filled)`, `Total Admissions Form Filled` |
| **EMI Paid** | `EMI Paid`, `EMI paid` |
| **Full Payment** | `Full Payment On Spot`, `Full Payment On spot` |
| **Talktime** | `Talktime (In hours)`, `Talktime`, `Talk Time` |
| **Conversion %** | `Conversion %` (or auto-calculated if missing) |
| **Target** | `Target` |
| **Attendance** | `Attendance` — values: `Present`, `Half Day`, `Absent` |
| **Band** | `Band` — values: `Band A`, `Band B`, `Band C` |
| **Status** | `Status` — values: `Active`, `Inactive` |
| **Campaign** | `Campaign` |
| **Discounts** | `Counsellor discount`, `Manager discount`, `Other Discount` |
| **Campaign Flags** | `FY 26`, `FY 27`, `CJR`, `AI`, `Auto Dial`, `Manual Dial` |

> **Auto Email Detect**: If no email column name matches, the parser will automatically scan ALL columns and use the first cell that contains `@` as the email — so data is never silently lost.

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

# Or use the default dev command
npm run dev
```

Then open your browser at: **`http://127.0.0.1:8081/`**

> **Port**: The server runs on **8081** (not 8080).

---

## 🧪 Running Unit Tests

```bash
npm test
```
Tests validate: mock data generation, Excel date serialization, risk score bounds, FPI calculation, conversion variance, and diagnostic trigger thresholds.

---

## 🐛 Bugs Fixed (Changelog)

| # | Issue | Fix Applied |
|---|---|---|
| 1 | Rows with `Counsellor Email` (double-l) being dropped | Added British spelling variant + 6 more email column name fallbacks |
| 2 | Rows being silently dropped when `Date` column missing | Filter now only requires email; date-less rows are kept |
| 3 | Auto email detection when column name is custom | Scans all columns for any `@` value as fallback |
| 4 | AVG DAILY DIALS showing admission count instead of calls | Fixed formula: `Total Dials ÷ Unique Working Days` |
| 5 | Browser serving stale cached JS after code updates | JS files now versioned (`?v=3`), server started with `-c-1` (no cache) |
| 6 | `Reporting Date`, `Report Date`, `Day` columns not parsed | Added 6 more date column name variants |
| 7 | `TL Name`, `TL` column not recognized for Team Lead | Added TL column variants to parser |
