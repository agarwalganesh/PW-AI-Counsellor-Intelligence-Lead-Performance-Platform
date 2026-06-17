// Analytics & AI Engine for AI Counsellor Intelligence & Performance Optimization Platform

class AnalyticsEngine {
  constructor() {}

  // 1. Calculate Risk Score & Contributors
  calculateRiskScore(counsellorData) {
    const {
      totalAdmissions,
      totalTarget,
      effectiveRatio,
      attendance,
      totalTalktime,
      totalConnected,
      totalDials,
      rawRecords
    } = counsellorData;

    // A. Target Achievement Gap
    // Calculate expected target progress based on elapsed days in month.
    // Assuming 30 days month, we compare actual admissions against expected pro-rata target
    const daysElapsed = this.getDaysElapsed(rawRecords);
    const expectedProRataTarget = (totalTarget / 30) * daysElapsed;
    const targetGap = expectedProRataTarget > 0 ? 
      Math.max(0, (expectedProRataTarget - totalAdmissions) / expectedProRataTarget * 100) : 0;

    // B. Effective Ratio Gap (Benchmark effective ratio is 75% of connected calls)
    const effectiveGap = Math.max(0, 75 - effectiveRatio) / 75 * 100;

    // C. Attendance Gap (Benchmark is 92%)
    const attendanceGap = Math.max(0, 92 - attendance.rate) / 92 * 100;

    // D. Talktime Gap (Benchmark is 240s average talktime per connected call)
    const avgTalktime = totalConnected > 0 ? (totalTalktime / totalConnected) : 0;
    const talktimeGap = Math.max(0, 240 - avgTalktime) / 240 * 100;

    // E. Productivity (Dialled Calls) Gap (Benchmark is 80 calls dialled per active day)
    const activeDays = attendance.present + attendance.halfDay * 0.5;
    const avgDials = activeDays > 0 ? (totalDials / activeDays) : 0;
    const dialsGap = Math.max(0, 80 - avgDials) / 80 * 100;

    // F. Weighted Risk Score
    const riskScore = Math.round(
      (0.35 * targetGap) +
      (0.20 * effectiveGap) +
      (0.15 * attendanceGap) +
      (0.15 * talktimeGap) +
      (0.15 * dialsGap)
    );

    // G. Identify Risk Contributors
    const contributors = [];
    if (targetGap > 30) {
      contributors.push({
        factor: "Target Progress",
        description: `Admissions (${totalAdmissions}) lagging behind pro-rata target (${Math.round(expectedProRataTarget)})`,
        impact: "High"
      });
    }
    if (effectiveGap > 25) {
      contributors.push({
        factor: "Effective Call Quality",
        description: `Effective ratio (${Math.round(effectiveRatio)}%) is below standard benchmark (75%)`,
        impact: "Medium"
      });
    }
    if (attendanceGap > 15) {
      contributors.push({
        factor: "Attendance / Availability",
        description: `Attendance rate (${Math.round(attendance.rate)}%) is affecting total talk opportunities`,
        impact: "Medium"
      });
    }
    if (talktimeGap > 25) {
      contributors.push({
        factor: "Talk Time Engagement",
        description: `Average talktime (${Math.round(avgTalktime)}s) is low, indicating rapid disconnects`,
        impact: "Low"
      });
    }
    if (dialsGap > 25) {
      contributors.push({
        factor: "Calling Productivity",
        description: `Average daily dials (${Math.round(avgDials)}) are below the 80 dials benchmark`,
        impact: "Medium"
      });
    }

    let category = "Green";
    if (riskScore > 30 && riskScore <= 60) category = "Yellow";
    else if (riskScore > 60) category = "Red";

    return {
      score: Math.min(100, Math.max(0, riskScore)),
      category,
      contributors
    };
  }

  // Helper to extract elapsed days from active records
  getDaysElapsed(records) {
    if (!records || records.length === 0) return 17; // default fallback
    const dates = records.map(r => r["Date"]).filter(Boolean);
    if (dates.length === 0) return 17;
    // Assume days are counted from day 1 to max day in dates array
    const sorted = dates.sort();
    const latestDate = new Date(sorted[sorted.length - 1]);
    return latestDate.getDate(); // e.g. 17 for 2026-06-17
  }

  // 2. Perform Root Cause Analysis Diagnostics
  diagnosePerformance(counsellorData) {
    const {
      totalDials,
      totalConnected,
      totalAdmissions,
      conversionPercentage,
      totalTalktime,
      attendance,
      leadQualityScore
    } = counsellorData;

    const activeDays = attendance.present + attendance.halfDay * 0.5;
    const avgDials = activeDays > 0 ? (totalDials / activeDays) : 0;
    const avgConnected = activeDays > 0 ? (totalConnected / activeDays) : 0;
    const connectRate = totalDials > 0 ? (totalConnected / totalDials) : 0;
    const avgTalktime = totalConnected > 0 ? (totalTalktime / totalConnected) : 0;

    const issues = [];

    // Case 1: Low Dialled Calls
    if (avgDials < 55) {
      issues.push({
        caseId: 1,
        severity: "Critical",
        type: "Low Productivity",
        reason: "Low Dialled Calls",
        explanation: `Counsellor averages ${Math.round(avgDials)} dialled calls per day, which is below the benchmark of 80. Indicates a productivity/effort drop.`,
        action: "Establish strict daily call targets, require auto-dial mode usage, and schedule regular supervisor check-ins."
      });
    }

    // Case 2: Low Connected Calls (Lead Quality Issue)
    if (avgDials >= 50 && connectRate < 0.40) {
      issues.push({
        caseId: 2,
        severity: "High",
        type: "Lead Quality Issue",
        reason: "Low Connected Calls",
        explanation: `Counsellor has decent dialing activity but only a ${Math.round(connectRate * 100)}% connection rate. This is usually due to bad, stale, or marked-as-spam numbers.`,
        action: "Flag campaign leads for re-scrubbing. Rotate dialing list to active status records, and test outgoing numbers for spam tags."
      });
    }

    // Case 3: High Connected but Low Admissions (Poor Closing)
    if (avgConnected > 12 && conversionPercentage < 5) {
      issues.push({
        caseId: 3,
        severity: "Critical",
        type: "Counsellor Skill Gap",
        reason: "High Connections, Low Admissions",
        explanation: `Counsellor connects with many prospects (${Math.round(avgConnected)}/day) but converts only ${conversionPercentage}%. Indicates struggles at objection handling and closing.`,
        action: "Assign shadow-coaching sessions with a top closer, review call recordings focusing on objection-handling scripts, and run mock closes."
      });
    }

    // Case 4: High Activity but Low Conversion (Lead Mismatch)
    if (avgDials >= 70 && conversionPercentage < 4 && leadQualityScore < 35) {
      issues.push({
        caseId: 4,
        severity: "Medium",
        type: "Lead Mismatch",
        reason: "High Activity, Low Quality Conversion",
        explanation: `Counsellor exhibits high effort and talk time, but conversion rate is low due to a low Lead Quality Score (${Math.round(leadQualityScore)}). Leads assigned are predominantly cold explorers.`,
        action: "Inject a percentage of warm or hot leads (e.g. form filled or payment failed) into their dialer to balance conversion opportunity."
      });
    }

    // Fallback: If no issues, return safe diagnostic
    if (issues.length === 0) {
      issues.push({
        caseId: 0,
        severity: "Safe",
        type: "Optimal Performance",
        reason: "No Critical Issues Detected",
        explanation: "This counsellor is operating efficiently. Dials, reachability, and conversions meet standard pipeline expectations.",
        action: "Maintain current workload and lead allocation. Highlight as team benchmark example."
      });
    }

    return issues;
  }

  // 3. Lead Quality Intelligence
  calculateLeadQuality(counsellorData) {
    const { totalConnected, totalFormFilled, totalEmiPaid, totalFullPayment } = counsellorData;
    
    // Categorization
    const hotLeads = totalEmiPaid + totalFullPayment;
    const warmLeads = Math.max(0, totalFormFilled - (totalEmiPaid + totalFullPayment));
    const coldLeads = Math.max(0, totalConnected - hotLeads - warmLeads);

    // Lead Quality Score
    const lqs = totalConnected > 0 ? 
      Math.min(100, Math.round(((3.0 * hotLeads) + (1.5 * warmLeads) + (0.5 * coldLeads)) / totalConnected * 100)) : 0;

    let leadQualityCategory = "Cold";
    if (lqs >= 30 && lqs < 60) leadQualityCategory = "Warm";
    else if (lqs >= 60) leadQualityCategory = "Hot";

    // Attribution Logic
    let attribution = "";
    if (lqs >= 55 && counsellorData.conversionPercentage < 6) {
      attribution = "Counsellor Skill Bottleneck (High quality leads are being under-converted due to execution gaps).";
    } else if (lqs < 35 && counsellorData.conversionPercentage < 6) {
      attribution = "Lead Quality Bottleneck (Performance issues stem primarily from cold, low-intent leads assigned).";
    } else if (lqs >= 55 && counsellorData.conversionPercentage >= 8) {
      attribution = "Optimal Pipeline Alignment (Solid leads combined with excellent counsellor conversion skills).";
    } else {
      attribution = "Balanced Pipeline Performance (Average performance metrics matching standard lead mix).";
    }

    return {
      hotLeads,
      warmLeads,
      coldLeads,
      score: lqs,
      category: leadQualityCategory,
      attribution
    };
  }

  // 4. Fair Performance Scoring
  calculateFairScore(counsellorData, leadQualityStats) {
    const { hotLeads, warmLeads, coldLeads } = leadQualityStats;
    const { totalConnected, conversionPercentage } = counsellorData;

    // Expected Conversion Rate based on lead mix:
    // Hot leads are expected to convert at 18%, Warm at 6%, Cold at 1.5%
    const expectedRate = totalConnected > 0 ? 
      parseFloat((((0.18 * hotLeads) + (0.06 * warmLeads) + (0.015 * coldLeads)) / totalConnected * 100).toFixed(2)) : 0;

    const diff = conversionPercentage - expectedRate;
    let rating = "Average";
    let color = "yellow";
    if (diff > 2.0) {
      rating = "Overperforming";
      color = "green";
    } else if (diff < -2.0) {
      rating = "Underperforming";
      color = "red";
    }

    return {
      expectedRate,
      actualRate: conversionPercentage,
      difference: parseFloat(diff.toFixed(2)),
      rating,
      color
    };
  }

  // 5. Funnel Analysis Drop-off Stage
  calculateFunnelDropoff(counsellorData) {
    const {
      totalDials,
      totalConnected,
      totalEffective,
      totalFormFilled,
      totalAdmissions,
      totalEmiPaid,
      totalFullPayment
    } = counsellorData;

    const payments = totalEmiPaid + totalFullPayment;

    // Conversion rates relative to preceding stage
    const connectRate = totalDials > 0 ? (totalConnected / totalDials) * 100 : 0;
    const effectiveRate = totalConnected > 0 ? (totalEffective / totalConnected) * 100 : 0;
    const formRate = totalEffective > 0 ? (totalFormFilled / totalEffective) * 100 : 0;
    const admissionRate = totalFormFilled > 0 ? (totalAdmissions / totalFormFilled) * 100 : 0;
    const paymentRate = totalAdmissions > 0 ? (payments / totalAdmissions) * 100 : 0;

    const stages = [
      { name: "Reachability (Dials -> Connected)", value: connectRate, label: "Connected / Dialled", count: totalConnected },
      { name: "Engagement (Connected -> Effective)", value: effectiveRate, label: "Effective / Connected", count: totalEffective },
      { name: "Interest (Effective -> Form Filled)", value: formRate, label: "Form Filled / Effective", count: totalFormFilled },
      { name: "Closing (Form Filled -> Admissions)", value: admissionRate, label: "Admissions / Form Filled", count: totalAdmissions },
      { name: "Collection (Admissions -> Paid)", value: paymentRate, label: "Payments / Admissions", count: payments }
    ];

    // Find highest drop-off (lowest conversion percentage)
    let dropoffStage = stages[0];
    stages.forEach(stage => {
      // Avoid 0/NaN issues
      if (stage.value > 0 && stage.value < dropoffStage.value) {
        dropoffStage = stage;
      }
    });

    let advice = "";
    if (dropoffStage.name.includes("Reachability")) {
      advice = "Re-verify lead contact numbers, avoid spam call registry, and focus calls during high-response hours (11AM-1PM & 4PM-6PM).";
    } else if (dropoffStage.name.includes("Engagement")) {
      advice = "Provide coaching on elevator pitches and scripts to keep leads engaged during the first 30 seconds of the call.";
    } else if (dropoffStage.name.includes("Interest")) {
      advice = "Strengthen lead qualification procedures. Focus the course value proposition to candidate career objectives.";
    } else if (dropoffStage.name.includes("Closing")) {
      advice = "Provide sales closing and negotiation training. Utilize counselor or manager discount options to build urgency.";
    } else {
      advice = "Streamline checkout link distribution, address immediate financial friction by proposing EMI solutions, and check in on deposit details.";
    }

    return {
      stages,
      dropoffStage,
      advice
    };
  }

  // 6. Target Achievement Predictor
  predictTargetAchievement(counsellorData) {
    const { totalAdmissions, totalTarget, rawRecords } = counsellorData;
    const daysElapsed = this.getDaysElapsed(rawRecords);
    const daysInMonth = 30; // standard month size
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

    // Run-rate projection:
    // Admissions in last 7 days of the log, or average per day
    const sortedRecords = [...rawRecords].sort((a,b) => new Date(a["Date"]) - new Date(b["Date"]));
    const last7Days = sortedRecords.slice(-7);
    const admissionsLast7 = last7Days.reduce((acc, r) => acc + r["Total Admissions"], 0);
    const recentRunrate = last7Days.length > 0 ? (admissionsLast7 / last7Days.length) : 0;
    
    // Average run-rate since joining/start
    const totalDailyAvg = daysElapsed > 0 ? (totalAdmissions / daysElapsed) : 0;
    
    // Weighted Run-rate (Recent 7 days weighted 65%, total average 35%)
    const runrate = recentRunrate > 0 ? (0.65 * recentRunrate + 0.35 * totalDailyAvg) : totalDailyAvg;

    const predictedAdmissions = totalAdmissions + Math.round(runrate * daysRemaining);
    const gap = Math.max(0, totalTarget - predictedAdmissions);

    // Probability of missing target
    let missProbability = 0;
    if (predictedAdmissions >= totalTarget) {
      missProbability = Math.max(0, Math.min(25, Math.round((totalTarget - totalAdmissions) / totalTarget * 15))); 
      // minimal risk if ahead of runrate
    } else {
      // Scale probability linearly by the gap percentage, capped at 99%
      const gapPct = (totalTarget - predictedAdmissions) / totalTarget;
      missProbability = Math.min(99, Math.round(40 + (gapPct * 60)));
    }

    return {
      currentAdmissions: totalAdmissions,
      target: totalTarget,
      predictedAdmissions,
      gap,
      missProbability,
      daysElapsed,
      daysRemaining
    };
  }

  // 7. Dynamic AI Recommendations Generator
  generateRecommendations(counsellorsBreakdown, activeFilters) {
    const recommendations = [];

    counsellorsBreakdown.forEach(c => {
      // Check Risk & Analytics for each counsellor
      const risk = this.calculateRiskScore(c);
      const leadQuality = this.calculateLeadQuality(c);
      const fairScore = this.calculateFairScore(c, leadQuality);
      const diagnostic = this.diagnosePerformance(c);
      const predictor = this.predictTargetAchievement(c);

      const isCounsellorMatch = activeFilters.counsellorEmail === "all" || activeFilters.counsellorEmail === c.email;

      if (isCounsellorMatch) {
        // A. Coach poor closers
        if (c.effectiveRatio > 65 && c.conversionPercentage < 5 && c.totalConnected > 30) {
          recommendations.push({
            counsellorEmail: c.email,
            counsellorName: c.name,
            subject: `Sales Closing Refresher for ${c.name}`,
            priority: "High",
            desc: `${c.name} has a high effective call ratio (${Math.round(c.effectiveRatio)}%), but is struggle to close admissions (${c.conversionPercentage}%). Focus on urgency building and coupon code deployment.`,
            actionText: "Schedule Sales Coaching"
          });
        }

        // B. Reallocate leads for underperformers receiving premium leads
        if (leadQuality.score > 60 && fairScore.rating === "Underperforming") {
          recommendations.push({
            counsellorEmail: c.email,
            counsellorName: c.name,
            subject: `Lead Reallocation for ${c.name}`,
            priority: "Medium",
            desc: `${c.name} is assigned Hot/Warm leads (Lead Quality: ${leadQuality.score}) but underperforming on conversion. Reallocating a portion of premium leads to top performers could capture better value.`,
            actionText: "Optimize Lead Allocation"
          });
        }

        // C. Target warning gaps
        if (predictor.missProbability > 70 && predictor.gap > 0) {
          recommendations.push({
            counsellorEmail: c.email,
            counsellorName: c.name,
            subject: `Target Recovery Strategy - ${c.name}`,
            priority: "High",
            desc: `Projected to miss target by ${predictor.gap} admissions. Action required: apply a 5% extra discount code ("MGR5") and focus on Form Filled leads immediately.`,
            actionText: "Issue Recovery Discount"
          });
        }

        // D. Productivity boosts
        const dailyAvgDials = c.totalDials / (c.attendance.present + c.attendance.halfDay * 0.5 || 1);
        if (dailyAvgDials < 60) {
          recommendations.push({
            counsellorEmail: c.email,
            counsellorName: c.name,
            subject: `Dial Volume Increase for ${c.name}`,
            priority: "Medium",
            desc: `Daily call dials average ${Math.round(dailyAvgDials)} against a benchmark of 80. Promote auto-dialer adoption to optimize talktime capacity.`,
            actionText: "Enable Auto-Dial Mode"
          });
        }

        // E. Lead quality problems
        if (leadQuality.score < 30 && c.conversionPercentage < 5) {
          recommendations.push({
            counsellorEmail: c.email,
            counsellorName: c.name,
            subject: `Lead Quality Escalation - ${c.name}`,
            priority: "Low",
            desc: `Low conversion is highly correlated with cold leads assigned (Lead Quality Score: ${leadQuality.score}). Transition ${c.name} to fresh FY27 campaign sources.`,
            actionText: "Swap Lead Campaign"
          });
        }
      }
    });

    // Sort by priority (High, Medium, Low)
    const priorityMap = { High: 3, Medium: 2, Low: 1 };
    return recommendations.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.AnalyticsEngine = new AnalyticsEngine();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = AnalyticsEngine;
}
