# AI Counsellor Intelligence & Performance Optimization Platform

An AI-powered analytics and optimization platform designed for managers, team leads, and counsellors. The platform automatically ingests counsellor performance spreadsheets (e.g., daily call dial logs, attendance, targets, and payments), evaluates conversion bottlenecks, predicts month-end target achievements, grades lead quality, and prescribes actionable recommendation plans.

Developed as a highly responsive, client-side Single Page Application (SPA), the application operates entirely within the browser with zero external database dependencies or server-side script requirements.

---

## 🌟 Key Features

1. **Executive Dashboard**: Unified operational view displaying total active counsellors, total admissions closed, conversion rates, and lists of top performers or red-risk alerts.
2. **Counsellor Performance Metrics**: Searchable, sortable, and paginated table tracking dial rates, talk time, attendance rate, expected conversions, and risk scores.
3. **Counsellor Profile Intelligence**: Deep-dive profile view featuring:
   - Dynamic **AI Performance Summaries** outlining individual strengths and execution gaps.
   - A **Competency Radar Chart** mapping the counsellor's skills against team averages.
   - Diagnostic root cause categorizations.
4. **AI Risk Prediction Engine**: Proactively flags counsellors likely to miss month-end targets and outlines specific contributing factors.
5. **Lead Quality Intelligence**: Distinguishes counselor performance problems from lead reachability and intent issues by generating a **Lead Quality Score (LQS)**.
6. **Fair Performance Scoring**: Calculates an adjusted **Expected Conversion Rate** based on the lead quality mix assigned to each individual to ensure equitable evaluations.
7. **Funnel Drop-Off Analysis**: Visualizes pipeline progression (Dials → Connects → Effective → Form Filled → Admissions → Paid) and highlights the steepest bottlenecks.
8. **AI Recommendations Engine**: Prioritizes urgent action items (such as refresher coaching, list re-scrubbing, discount link issue, or dialer mode shifts) per individual.
9. **Team Comparison Dashboard**: Compares campaigns (e.g., FY26 vs FY27 vs CJR), managers, and team leads side-by-side.
10. **Report Exporter**: Client-side downloads to CSV, clean Excel-compatible formats, and print-ready vector PDFs.

---

## 🛠️ Technical Stack

- **Frontend Core**: HTML5 Semantic Skeleton & JavaScript ES6+ (Module-based state and routers).
- **Styling**: Vanilla CSS3 (Custom properties, grid layouts, glassmorphic filters, keyframe transitions).
- **External Libraries (via CDN)**:
  - **SheetJS (XLSX)**: Client-side Excel reading, data normalization, and spreadsheet writing.
  - **Chart.js**: Animated, vector-rendered line, bar, radar, and gauge charts.
- **Testing**: Node.js automated unit testing suite (`test-suite.js`).

---

## 📐 Mathematical Models & Formulas

The platform operates on quantitative models to produce intelligence indicators:

### 1. AI Risk Score (0 - 100)
Evaluates a counsellor's probability of missing their month-end target milestone:
$$\text{Risk Score} = 0.35 \times \text{Target Ach. Gap} + 0.20 \times \text{Effective Ratio Gap} + 0.15 \times \text{Attendance Gap} + 0.15 \times \text{Talktime Gap} + 0.15 \times \text{Productivity Gap}$$

* **Target Achievement Gap**: $\frac{\text{Expected Pro-rata Target} - \text{Admissions}}{\text{Expected Pro-rata Target}} \times 100$
* **Effective Ratio Gap**: $\frac{75 - \text{Effective Call \%}}{75} \times 100$ (Standard benchmark is 75%)
* **Attendance Gap**: $\frac{92 - \text{Attendance Rate \%}}{92} \times 100$ (Standard benchmark is 92%)
* **Talktime Gap**: $\frac{240 - \text{Avg Talk Time (sec)}}{240} \times 100$ (Standard benchmark is 240 seconds/call)
* **Productivity Gap**: $\frac{80 - \text{Avg Daily Dials}}{80} \times 100$ (Standard benchmark is 80 calls/day)

### 2. Lead Quality Score (LQS)
Grades the quality of leads assigned to a counselor based on customer actions recorded:
$$\text{LQS} = \frac{(3.0 \times \text{Hot Leads}) + (1.5 \times \text{Warm Leads}) + (0.5 \times \text{Cold Leads})}{\text{Total Connected Calls}} \times 100$$
* **Hot Leads**: Total Admissions payments started (EMI Paid + Full Payment On Spot).
* **Warm Leads**: Admissions forms filled but payment not finalized.
* **Cold Leads**: Call connected but no progression or form submission.

### 3. Fair Performance Scoring (Expected vs Actual)
Adjusts target conversion percentages to reflect unequal lead quality distribution:
$$\text{Expected Conv. Rate \%} = \frac{(0.18 \times \text{Hot Leads}) + (0.06 \times \text{Warm Leads}) + (0.015 \times \text{Cold Leads})}{\text{Total Connected Calls}} \times 100$$
* **Overperforming**: Actual Conversion Rate > Expected Rate + 2.0%
* **Average**: Actual Conversion Rate within +/- 2.0% of Expected Rate
* **Underperforming**: Actual Conversion Rate < Expected Rate - 2.0%

### 4. Target Achievement Month-End Forecast
Projects month-end admissions based on recent pro-rata run-rates:
$$\text{Predicted Admissions} = \text{Current Admissions} + (\text{Weighted Run-rate} \times \text{Days Remaining})$$
* **Weighted Run-rate**: Recent 7-day average admissions weighted at 65%, historical daily average admissions weighted at 35%.

---

## 📁 File Structure

```
AI Counsellor Platform/
│
├── index.html            # Primary application UI layout and CDN linkages
├── styles.css            # Dark mode theme design system and print queries
├── app.js                # App router, filter events, slideshow, and role controllers
├── data-processor.js     # Excel parser mapper, LocalStorage caching, and filters
├── analytics-engine.js   # Calculations for risk, predictions, LQS, and diagnostics
├── charts.js             # Canvas graph renderers (radar, line, bar, gauge)
├── exporter.js           # Client-side exports to CSV, XLSX, and printable PDF
├── mock-data.js          # Fallback seed data generator for dashboard evaluation
├── test-suite.js         # Math and clean-up validation script (Node.js)
├── package.json          # Script commands configurations
└── May dod data .xlsx    # Your real spreadsheet data source
```

---

## 📊 Excel Spreadsheet Column Mapping

The data processor is configured to automatically ingest and parse **`May dod data .xlsx`**. The parser includes mapping logic that standardizes headers and data types:

| Standard Key | Spreadsheet Column Name Match | Transformation / Clean-up |
| :--- | :--- | :--- |
| **Date** | `Date` | Converts Excel serial numbers (e.g. `46143` to `2026-05-06`) |
| **Counsellor Email** | `Counselor Email` | Normalizes uppercase strings |
| **Counsellor Name** | Derived from Email if blank | Formats email prefix (e.g. `aman.parashar` to `Aman Parashar`) |
| **Connected Calls** | `Connected calls` / `Connected Calls` | Cleaned integer parsing |
| **Effective Calls** | `Effective calls` / `Effective Calls` | Cleaned integer parsing |
| **Talktime (seconds)** | `Talktime (In hours)` | Converts decimal hours to seconds (multiplies hours by 3600) |
| **Total Admissions** | `Total admissions` / `Total Adm` | Cleaned integer parsing |
| **Form Filled** | `Total Adm(form Filled)` | Cleaned integer parsing |
| **Conversion %** | `Conversion %` | Recalculated dynamically as (Admissions/Connected)*100 |
| **No. of Days** | `No. of days` / `Number of Days` | Cleaned integer parsing |
| **Counsellor Discount**| `Counsellor discount` / `Counsellor discount-FY 27`| Cleaned currency parsing |
| **Campaign Flags** | `FY 26`, `FY 27`, `CJR` | Identifies active indicators |

---

## 🚀 Setup & Execution

### Option A: Open directly in Browser
Since the platform runs client-side, you can double-click **`index.html`** on your computer to open the dashboard immediately. 

### Option B: Local Server (Recommended)
Starting a static server ensures all background fetches and SheetJS AJAX requests execute without CORS issues:

1. **Verify Node.js**: Ensure Node.js is installed on your computer.
2. **Install Dev Server**:
   ```bash
   npm install
   ```
3. **Start the Platform**:
   ```bash
   npm run dev
   ```
4. **Access UI**: Open your browser and navigate to:
   `http://localhost:8080/`

---

## 🧪 Running Unit Tests

To run the automated calculations verification suite:
```bash
npm test
```
The console will execute assertions on mock generation, date serialization, risk score bounds, expected conversion variance, and diagnostic triggers, reporting a success or failure summary.
