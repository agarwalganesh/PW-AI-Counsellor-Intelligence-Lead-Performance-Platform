// Local Test Suite to validate math computations and data logic
// Run this file in Node.js to verify core functionality

const assert = require('assert');
const { generateMockData, MOCK_COUNSELLORS } = require('./mock-data.js');
const DataProcessorClass = require('./data-processor.js');
const AnalyticsEngineClass = require('./analytics-engine.js');

console.log("-------------------------------------------------");
console.log("RUNNING SUITE: AI COUNSELLOR PLATFORM VALIDATION");
console.log("-------------------------------------------------");

try {
  // 1. Validate Mock Data Generation
  console.log("✓ Testing Mock Data generation...");
  const mockData = generateMockData("2026-06-01", "2026-06-17");
  assert(mockData.length > 0, "Mock data should not be empty.");
  assert(mockData[0]["Counselor Email"], "Rows must contain Counselor Email.");
  assert(mockData[0]["Date"], "Rows must contain Date.");
  console.log(`  - Total daily records generated: ${mockData.length}`);

  // 2. Validate Data Processor initialization
  console.log("✓ Testing Data Processor loading & filters...");
  const dp = new DataProcessorClass();
  dp.loadDataset(mockData);
  assert(dp.counsellorsList.length > 0, "Should extract unique counsellors list.");
  assert.strictEqual(dp.rawDataset.length, mockData.length, "Cleaned dataset size must match input size.");

  // Test filter date range
  dp.setFilter("startDate", "2026-06-05");
  dp.setFilter("endDate", "2026-06-15");
  assert(dp.filteredDataset.every(r => r["Date"] >= "2026-06-05" && r["Date"] <= "2026-06-15"), "Date range filter failed.");
  dp.setFilter("startDate", ""); // reset
  dp.setFilter("endDate", ""); // reset
  console.log(`  - Successfully parsed, cleaned, and filtered dataset.`);

  // 3. Test Date Formatter
  console.log("✓ Testing Excel date parser...");
  const dateObj = new Date("2026-06-15");
  assert.strictEqual(dp.parseExcelDate(dateObj), "2026-06-15", "Date object format failed");
  assert.strictEqual(dp.parseExcelDate(46188), "2026-06-15", "Excel serial date (46188) format failed"); // 2026-06-15 in serial
  assert.strictEqual(dp.parseExcelDate("15-06-2026"), "2026-06-15", "DD-MM-YYYY format failed");
  assert.strictEqual(dp.parseExcelDate("2026-06-15"), "2026-06-15", "YYYY-MM-DD format failed");

  // 4. Validate AI Analytics Computations
  console.log("✓ Testing AI Analytics Engine computations...");
  const ae = new AnalyticsEngineClass();
  const breakdowns = dp.getCounsellorBreakdown();
  assert(breakdowns.length > 0, "Should generate counsellor breakdown.");

  breakdowns.forEach(c => {
    // A. Lead Quality Score (LQS)
    const lq = ae.calculateLeadQuality(c);
    assert(lq.score >= 0 && lq.score <= 100, `Lead Quality Score must be 0-100. Got: ${lq.score}`);
    assert(["Cold", "Warm", "Hot"].includes(lq.category), `Invalid lead quality category: ${lq.category}`);

    // B. Fair Performance Score
    const fair = ae.calculateFairScore(c, lq);
    assert(fair.expectedRate >= 0, "Expected conversion rate must be >= 0");
    assert(["Overperforming", "Average", "Underperforming"].includes(fair.rating), "Invalid rating verdict");

    // C. AI Risk Prediction
    const risk = ae.calculateRiskScore({ ...c, leadQualityScore: lq.score });
    assert(risk.score >= 0 && risk.score <= 100, `Risk Score must be 0-100. Got: ${risk.score}`);
    assert(["Green", "Yellow", "Red"].includes(risk.category), `Invalid risk category: ${risk.category}`);

    // D. Target Predictor
    const pred = ae.predictTargetAchievement(c);
    assert(pred.target > 0, "Target should be greater than 0");
    assert(pred.predictedAdmissions >= 0, "Predicted admissions must be >= 0");
    assert(pred.missProbability >= 0 && pred.missProbability <= 100, "Miss probability must be 0-100");

    // E. Funnel analysis
    const funnel = ae.calculateFunnelDropoff(c);
    assert(funnel.stages.length === 5, "Funnel should have exactly 5 stages");
    assert(funnel.dropoffStage, "Funnel must calculate highest dropoff stage");
    assert(funnel.advice.length > 0, "Funnel must provide recommendation advice");

    // F. Diagnostics
    const diagnostics = ae.diagnosePerformance({ ...c, leadQualityScore: lq.score });
    assert(diagnostics.length > 0, "Diagnostics must return at least one classification");
    assert(diagnostics[0].action, "Diagnostics must specify an action plan");
  });
  console.log("  - Checked Lead Quality, Risk Engine, Target Predictor, Funnel drop-offs, and Diagnostics across all staff.");

  console.log("\n-------------------------------------------------");
  console.log("✓ SUCCESS: ALL CALCULATIONS AND FLOWS VALIDATED!");
  console.log("-------------------------------------------------");
  process.exit(0);

} catch (err) {
  console.error("\n❌ FAILED: Assertion failed during validation.");
  console.error(err);
  process.exit(1);
}
