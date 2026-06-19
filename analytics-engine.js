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

    // Calculate expected conversion based on lead quality mix
    const leadStats = this.calculateLeadQuality(counsellorData);
    const fair = this.calculateFairScore(counsellorData, leadStats);
    
    const ECR = fair.expectedRate;
    const ACR = fair.actualRate;
    const FPI = ECR > 0 ? ACR / ECR : 1.0;

    const pred = this.predictTargetAchievement(counsellorData);
    const P_miss = pred.missProbability;

    // Module 3 Zones:
    // Green Zone: FPI >= 1.0 and P_miss < 15%
    // Yellow Zone: 0.85 <= FPI < 1.0 or 15% <= P_miss <= 40%
    // Red Zone: FPI < 0.85 or P_miss > 40%
    let category = "Yellow";
    if (FPI >= 1.0 && P_miss < 15) {
      category = "Green";
    } else if (FPI < 0.85 || P_miss > 40) {
      category = "Red";
    }

    const riskScore = Math.round(P_miss);

    // Identify Risk Contributors
    const contributors = [];
    if (FPI < 0.85) {
      contributors.push({
        factor: "Fair Performance (FPI)",
        description: `FPI is ${FPI.toFixed(2)}, indicating underperformance relative to lead mix expectations.`,
        impact: "High"
      });
    }
    if (P_miss > 40) {
      contributors.push({
        factor: "Target Projections",
        description: `Linear target miss probability is high (${Math.round(P_miss)}%). Gap is ${pred.gap} admissions.`,
        impact: "High"
      });
    }

    const daysElapsed = this.getDaysElapsed(rawRecords);
    const expectedProRataTarget = totalTarget > 0 ? totalTarget : daysElapsed * 5;
    if (totalAdmissions < expectedProRataTarget) {
      contributors.push({
        factor: "Pro-rata Target Pace",
        description: `Admissions (${totalAdmissions}) lagging behind pro-rata target (${Math.round(expectedProRataTarget)})`,
        impact: "Medium"
      });
    }

    return {
      score: Math.min(100, Math.max(0, riskScore)),
      category,
      fpi: FPI,
      contributors
    };
  }

  // Helper to extract elapsed days from active records based on filtered range span
  getDaysElapsed(records) {
    if (!records || records.length === 0) return 18; // default fallback (June 18, 2026 anchor day)
    const dates = records.map(r => r["Date"]).filter(Boolean);
    if (dates.length === 0) return 18;
    
    // Sort dates to find earliest and latest in the range
    const sorted = dates.sort();
    const earliestDateStr = sorted[0];
    const latestDateStr = sorted[sorted.length - 1];
    
    const earliestDate = new Date(earliestDateStr + "T00:00:00");
    const latestDate = new Date(latestDateStr + "T00:00:00");
    
    if (isNaN(earliestDate.getTime()) || isNaN(latestDate.getTime())) return 18;
    
    // Calculate calendar day span
    const diffTime = latestDate.getTime() - earliestDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.max(1, diffDays);
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

    const activeDays = attendance.present + attendance.halfDay * 0.5 || 1;
    const avgDials = totalDials / activeDays;
    const connectRate = totalDials > 0 ? (totalConnected / totalDials) : 0;
    const avgTalktime = totalConnected > 0 ? (totalTalktime / totalConnected) : 0;

    const issues = [];

    // Case 1: Effort Gap
    // Low Dialled Calls (D) + Low Gross Talktime + Low Admissions (A)
    if (avgDials < 60 && avgTalktime < 180 && totalAdmissions < 2) {
      issues.push({
        caseId: 1,
        severity: "Critical",
        type: "Effort Gap",
        reason: "Low Dialled Calls & Talktime",
        explanation: `Counsellor dialled calls average is low (${Math.round(avgDials)}/day) and gross talktime is deficient. Reflects low activity or system runtime utilization.`,
        action: "Trigger systematic Productivity Warning Flag; push notification alert tracking active phone channel status."
      });
    }

    // Case 2: Lead Quality Gap
    // High Dialled Calls (D) + Low Connected Calls (C)
    if (avgDials >= 60 && connectRate < 0.40) {
      issues.push({
        caseId: 2,
        severity: "High",
        type: "Lead Quality Gap",
        reason: "High Dials, Low Connections",
        explanation: `High dialing activity (${Math.round(avgDials)}/day) is yielding poor connection rates (${Math.round(connectRate * 100)}%). Typical of list fatigue, stale numbers, or spam blocking.`,
        action: "Trigger Campaign Automation Pause; route lead source batch ticket directly to Marketing QA for validation."
      });
    }

    // Case 3: Skill Gap
    // High Connected Calls (C) + High Gross Talktime + Low Admissions (A)
    if (totalConnected > 15 && avgTalktime >= 200 && totalAdmissions < 2) {
      issues.push({
        caseId: 3,
        severity: "Critical",
        type: "Skill Gap",
        reason: "High Engagement, Low Closures",
        explanation: `Successful connection rates and high customer engagement times are not translating to course sign-ups. Reflects struggles with objection handling or closing techniques.`,
        action: "Auto-assign structural Objection Handling & Closing Velocity Training Modules via LMS integration."
      });
    }

    // Fallback: If no issues, return safe diagnostic
    if (issues.length === 0) {
      issues.push({
        caseId: 0,
        severity: "Safe",
        type: "Optimal Performance",
        reason: "Parity Reached",
        explanation: "No structural performance gaps are currently flagged. Counselor activity aligns with campaign benchmarks.",
        action: "Maintain current workload and route standard lead inventories."
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

    // Expected Conversion Rate based on lead mix per v1.0 spec:
    // P1 (hotLeads) is expected to convert at 20%, P2 (warmLeads) at 10%, P3 (coldLeads) at 5%
    const expectedRate = totalConnected > 0 ? 
      parseFloat((((0.20 * hotLeads) + (0.10 * warmLeads) + (0.05 * coldLeads)) / totalConnected * 100).toFixed(2)) : 0;

    const fpi = expectedRate > 0 ? parseFloat((conversionPercentage / expectedRate).toFixed(2)) : 1.0;
    const diff = conversionPercentage - expectedRate;

    let rating = "Parity";
    let color = "yellow";
    if (fpi >= 1.10) {
      rating = "Highly efficient";
      color = "green";
    } else if (fpi < 0.90) {
      rating = "Underperforming";
      color = "red";
    }

    return {
      expectedRate,
      actualRate: conversionPercentage,
      fpi,
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

    // Conversion rates relative to preceding stage
    const connectRate = totalDials > 0 ? (totalConnected / totalDials) * 100 : 0;
    const effectiveRate = totalConnected > 0 ? (totalEffective / totalConnected) * 100 : 0;
    const formRate = totalEffective > 0 ? (totalFormFilled / totalEffective) * 100 : 0;
    const admissionRate = totalFormFilled > 0 ? (totalAdmissions / totalFormFilled) * 100 : 0;

    const stages = [
      { name: "Dialled Calls", value: 100, label: "Dialled Outbound", count: totalDials },
      { name: "Connected Calls", value: connectRate, label: "Connected / Dialled", count: totalConnected },
      { name: "Effective Calls", value: effectiveRate, label: "Effective / Connected", count: totalEffective },
      { name: "Buy Now Intent", value: formRate, label: "Form Filled / Effective", count: totalFormFilled },
      { name: "Full Spot Payments", value: admissionRate, label: "Admissions / Form Filled", count: totalAdmissions }
    ];

    // Find highest drop-off (lowest conversion percentage among downstream stages)
    let dropoffStage = stages[1]; // Connected calls is first transition
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].value > 0 && stages[i].value < dropoffStage.value) {
        dropoffStage = stages[i];
      }
    }

    let advice = "";
    if (dropoffStage.name.includes("Connected")) {
      advice = "Re-verify lead contact numbers, avoid spam call registry, and focus calls during high-response hours (11AM-1PM & 4PM-6PM).";
    } else if (dropoffStage.name.includes("Effective")) {
      advice = "Provide coaching on elevator pitches and scripts to keep leads engaged during the first 30 seconds of the call.";
    } else if (dropoffStage.name.includes("Buy Now")) {
      advice = "Strengthen lead qualification procedures. Focus the course value proposition to candidate career objectives.";
    } else if (dropoffStage.name.includes("Payments")) {
      advice = "Provide sales closing and negotiation training. Utilize counselor or manager discount options to build urgency and address immediate financial friction by proposing EMI solutions.";
    } else {
      advice = "Maintain current workload and pipeline sequence.";
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
    
    // Days worked = present + 0.5 * halfDay
    let daysWorked = 18;
    if (counsellorData.attendance) {
      daysWorked = counsellorData.attendance.present + counsellorData.attendance.halfDay * 0.5;
    }
    if (daysWorked <= 0) {
      daysWorked = this.getDaysElapsed(rawRecords) || 18;
    }

    const daysInMonth = 30; // standard month size
    const daysRemaining = Math.max(0, daysInMonth - daysWorked);

    // Calculate daily target based on active rows or days worked, fallback to 5
    const dailyTarget = daysWorked > 0 ? (totalTarget / daysWorked) : 5;
    const monthEndTarget = daysWorked < 30 ? Math.round(dailyTarget * daysInMonth) : totalTarget;

    // Target Achievement Predictor math per Stage 3 Formula:
    // Current Velocity (V_c) = Admissions / Days Worked
    // Predicted Month-End Admissions (P_m) = Admissions + (V_c * Remaining Days)
    // Target Gap (G_t) = Target - P_m
    // Target Miss Probability (P_miss) = Max(0, (G_t / Target) * 100)
    const V_c = totalAdmissions / daysWorked;
    const P_m = totalAdmissions + (V_c * daysRemaining);
    const G_t = monthEndTarget - P_m;
    const P_miss = Math.max(0, (G_t / monthEndTarget) * 100);

    return {
      currentAdmissions: totalAdmissions,
      target: monthEndTarget,
      predictedAdmissions: Math.round(P_m),
      gap: Math.max(0, Math.round(G_t)),
      missProbability: Math.min(100, Math.round(P_miss)),
      daysElapsed: parseFloat(daysWorked.toFixed(1)),
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

  // --- STATISTICAL SIGNIFICANCE (Z-TEST) ---
  calculateStatisticalSignificance(cohortA, cohortB) {
    const nA = cohortA.connected || 0;
    const nB = cohortB.connected || 0;
    const xA = cohortA.admissions || 0;
    const xB = cohortB.admissions || 0;
    
    if (nA === 0 || nB === 0) {
      return { pValue: 1.0, significant: false, explanation: "Insufficient call connection data to test significance." };
    }
    
    const pA = xA / nA;
    const pB = xB / nB;
    
    const pPooled = (xA + xB) / (nA + nB);
    
    if (pPooled === 0 || pPooled === 1) {
      return { pValue: 1.0, significant: false, explanation: "Conversion rates are identical (0% or 100%)." };
    }
    
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB));
    const zScore = (pA - pB) / se;
    
    // Abramowitz & Stegun normal CDF approximation
    const getPValue = (z) => {
      const absZ = Math.abs(z);
      const t = 1 / (1 + 0.2316419 * absZ);
      const d = 0.3989423;
      const probs = d * Math.exp(-0.5 * absZ * absZ) * 
                    (0.3193815 * t - 0.3565638 * t * t + 1.781478 * t * t * t - 
                     1.821256 * t * t * t * t + 1.330274 * t * t * t * t * t);
      return 2 * probs;
    };
    
    const pValue = getPValue(zScore);
    const significant = pValue < 0.05;
    
    let explanation = "";
    if (significant) {
      explanation = `Statistically Significant difference (p = ${pValue.toFixed(4)} < 0.05). Variance in conversion rate is mathematically confirmed to stem from operational/leadership factors rather than lead distribution anomalies.`;
    } else {
      explanation = `Not Statistically Significant (p = ${pValue.toFixed(4)} >= 0.05). Variance falls within standard statistical margin of error. Likely due to lead distribution profiles or random variations.`;
    }
    
    return {
      zScore: parseFloat(zScore.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      significant,
      explanation
    };
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.AnalyticsEngine = new AnalyticsEngine();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = AnalyticsEngine;
}
