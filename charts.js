// Charting Engine for AI Counsellor Intelligence & Performance Optimization Platform

class ChartingEngine {
  constructor() {
    this.chartRegistry = {};
  }

  // Helper to destroy previous chart instance on a canvas
  destroyChart(canvasId) {
    if (this.chartRegistry[canvasId]) {
      this.chartRegistry[canvasId].destroy();
      delete this.chartRegistry[canvasId];
    }
  }

  // 1. Line Chart: Call Activity over Time
  renderCallActivity
  renderCallActivityTrend(canvasId, dailyTrend) {
    try {
      // Validate inputs
      if (!canvasId || typeof canvasId !== 'string') {
        console.warn("Invalid canvasId provided to renderCallActivityTrend:", canvasId);
        return;
      }

      if (!dailyTrend || !Array.isArray(dailyTrend)) {
        console.warn("Invalid dailyTrend provided to renderCallActivityTrend:", dailyTrend);
        return;
      }

      this.destroyChart(canvasId);

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn("Canvas element not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Unable to get canvas context for:", canvasId);
        return;
      }

      // Process data with safety checks
      const labels = dailyTrend
        .filter(t => t && typeof t === 'object')
        .map(t => t.date || '');

      const dialled = dailyTrend
        .filter(t => t && typeof t === 'object')
        .map(t => Number(t.dialled) || 0);

      const connected = dailyTrend
        .filter(t => t && typeof t === 'object')
        .map(t => Number(t.connected) || 0);

      const effective = dailyTrend
        .filter(t => t && typeof t === 'object')
        .map(t => Number(t.effective) || 0);

      this.chartRegistry[canvasId] = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Dialled Calls",
              data: dialled,
              borderColor: "rgba(255, 255, 255, 0.4)",
              backgroundColor: "transparent",
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3,
              pointRadius: 2
            },
            {
              label: "Connected Calls",
              data: connected,
              borderColor: "hsl(217, 91%, 60%)",
              backgroundColor: "rgba(217, 91%, 60%, 0.1)",
              borderWidth: 3,
              fill: true,
              tension: 0.3,
              pointRadius: 3
            },
            {
              label: "Effective Calls",
              data: effective,
              borderColor: "hsl(142, 76%, 45%)",
              backgroundColor: "rgba(142, 76%, 45%, 0.1)",
              borderWidth: 3,
              fill: true,
              tension: 0.3,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: "hsl(215, 20%, 68%)", font: { family: "Inter" } }
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "hsl(223, 47%, 11%)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "hsla(217, 30%, 20%, 0.5)",
              borderWidth: 1
            }
          },
          scales: {
            x: {
              grid: { color: "hsla(217, 30%, 20%, 0.3)", drawTicks: false },
              ticks: { color: "hsl(215, 20%, 68%)", font: { size: 10 } }
            },
            y: {
              grid: { color: "hsla(217, 30%, 20%, 0.3)", drawTicks: false },
              ticks: { color: "hsl(215, 20%, 68%)", font: { size: 10 } }
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in renderCallActivityTrend:", error, { canvasId, dailyTrend });
      // Don't re-throw the error to avoid breaking the UI
    }
  }

  // 2. Combo Line/Bar Chart: Admissions & Cumulative Target Progress
  renderTargetProgress(canvasId, dailyTrend, monthlyTarget) {
    try {
      // Validate inputs
      if (!canvasId || typeof canvasId !== 'string') {
        console.warn("Invalid canvasId provided to renderTargetProgress:", canvasId);
        return;
      }

      if (!dailyTrend || !Array.isArray(dailyTrend)) {
        console.warn("Invalid dailyTrend provided to renderTargetProgress:", dailyTrend);
        return;
      }

      if (typeof monthlyTarget !== 'number' || isNaN(monthlyTarget)) {
        console.warn("Invalid monthlyTarget provided to renderTargetProgress:", monthlyTarget);
        return;
      }

      this.destroyChart(canvasId);

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn("Canvas element not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Unable to get canvas context for:", canvasId);
        return;
      }

      // Process data with safety checks
      const labels = dailyTrend
        .filter(t => t && typeof t === 'object')
        .map(t => t.date || '');

      const admissions = dailyTrend
        .filter(t => t && typeof t === 'object')
        .map(t => Number(t.admissions) || 0);

      // Calculate cumulative admissions
      let cumulative = 0;
      const cumulativeAdmissions = admissions.map(a => {
        cumulative += a;
        return cumulative;
      });

      // Pro-rata Target reference line
      const daysInMonth = 30;
      const proRata);

      this.chartRegistry[canvasId] = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              type: "bar",
              label: "Daily Admissions",
              data: admissions,
              backgroundColor: "hsl(217, 91%, 60%)",
              borderRadius: 4,
              barPercentage: 0.6
            },
            {
              type: "line",
              label: "Cumulative Admissions",
              data: cumulativeAdmissions,
              borderColor: "hsl(142, 76%, 45%)",
              borderWidth: 3,
              fill: false,
              tension: 0.2,
              pointRadius: 4,
              pointBackgroundColor: "hsl(142, 76%, 45%)"
            },
            {
              type: "line",
              label: "Target Path (Pro-rata)",
              data: proRataTarget,
              borderColor: "hsl(48, 96%, 53%)",
              borderWidth: 2,
              borderDash: [4, 4],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: "hsl(215, 20%, 68%)" }
            }
          },
          scales: {
            x: {
              grid: { color: "hsla(217, 30%, 20%, 0.3)" },
              ticks: { color: "hsl(215, 20%, 68%)", font: { size: 10 } }
            },
            y: {
              grid: { color: "hsla(217, 30%, 20%, 0.3)" },
              ticks: { color: "hsl(215, 20%, 68%)", font: { size: 10 } }
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in renderTargetProgress:", error, { canvasId, dailyTrend, monthlyTarget });
      // Don't re-throw the error to avoid breaking the UI
    }
  }

  // 3. Team Comparison Dashboard Chart (Admissions & Conversion Rates)
  renderTeamComparison(canvasId, labels, admissionsData, conversionData) {
    try {
      // Validate inputs
      if (!canvasId || typeof canvasId !== 'string') {
        console.warn("Invalid canvasId provided to renderTeamComparison:", canvasId);
        return;
      }

      if (!labels || !Array.isArray(labels)) {
        console.warn("Invalid labels provided to renderTeamComparison:", labels);
        return;
      }

      if (!admissionsData || !Array.isArray(admissionsData)) {
        console.warn("Invalid admissionsData provided to renderTeamComparison:", admissionsData);
        return;
      }

      if (!conversionData || !Array.isArray(conversionData)) {
        console.warn("Invalid conversionData provided to renderTeamComparison:", conversionData);
        return;
      }

      // Ensure arrays are the same length
      const length = Math.min(labels.length, admissionsData.length, conversionData.length);
      if (length === 0) {
        console.warn("Empty arrays provided to renderTeamComparison");
        return;
      }

      this.destroyChart(canvasId);

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn("Canvas element not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Unable to get canvas context for:", canvasId);
        return;
      }

      // Process data with safety checks
      const safeLabels = labels.slice(0, length).map(label => String(label || ''));
      const safeAdmissionsData = admissionsData.slice(0, length).map(value => Number(value) || 0);
      const safeConversionData = conversionData.slice(0, length).map(value => Number(value) || 0);

      this.chartRegistry[canvasId] = new Chart(ctx, {
        type: "bar",
        data: {
          labels: safeLabels,
          datasets: [
            {
              label: "Total Admissions",
              data: safeAdmissionsData,
              backgroundColor: "hsl(217, 91%, 60%)",
              yAxisID: "yAdmissions",
              borderRadius: 6
            },
            {
              label: "Conversion %",
              data: safeConversionData,
              backgroundColor: "hsl(142, 76%, 45%)",
              yAxisID: "yConversion",
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: "hsl(215, 20%, 68%)" }
            }
          },
          scales: {
            x: {
              grid: { color: "hsla(217, 30%, 20%, 0.3)" },
              ticks: { color: "hsl(215, 20%, 68%)" }
            },
            yAdmissions: {
              type: "linear",
              position: "left",
              grid: { color: "hsla(217, 30%, 20%, 0.3)" },
              ticks: { color: "hsl(215, 20%, 68%)" },
              title: { display: true, text: "Admissions Count", color: "hsl(215, 20%, 68%)" }
            },
            yConversion: {
              type: "linear",
              position: "right",
              grid: { drawOnChartArea: false }, // Only draw left axis grids
              ticks: {
                color: "hsl(215, 20%, 68%)",
                callback: value => value + "%"
              },
              title: { display: true, text: "Conversion Rate", color: "hsl(215, 20%, 68%)" }
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in renderTeamComparison:", error, { canvasId, labels, admissionsData, conversionData });
      // Don't re-throw the error to avoid breaking the UI
    }
  }

  // 4. Radar Chart: Counsellor Skill Profile compared with Team Average
  renderCounsellorRadar(canvasId, counsellorName, indScores, teamScores) {
    try {
      // Validate inputs
      if (!canvasId || typeof canvasId !== 'string') {
        console.warn("Invalid canvasId provided to renderCounsellorRadar:", canvasId);
        return;
      }

      if (!counsellorName || typeof counsellorName !== 'string') {
        console.warn("Invalid counsellorName provided to renderCounsellorRadar:", counsellorName);
        return;
      }

      if (!indScores || !Array.isArray(indScores)) {
        console.warn("Invalid indScores provided to renderCounsellorRadar:", indScores);
        return;
      }

      if (!teamScores || !Array.isArray(teamScores)) {
        console.warn("Invalid teamScores provided to renderCounsellorRadar:", teamScores);
        return;
      }

      // Ensure arrays have the expected length (6 dimensions)
      const expectedLength = 6;
      const safeIndScores = (indScores.slice(0, expectedLength) || []).map(value => Number(value) || 0);
      const safeTeamScores = (teamScores.slice(0, expectedLength) || []).map(value => Number(value) || 0);

      // Pad arrays if they're too short
      while (safeIndScores.length < expectedLength) {
        safeIndScores.push(0);
      }
      while (safeTeamScores.length < expectedLength) {
        safeTeamScores.push(0);
      }

      this.destroyChart(canvasId);

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn("Canvas element not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Unable to get canvas context for:", canvasId);
        return;
      }

      this.chartRegistry[canvasId] = new Chart(ctx, {
        type: "radar",
        data: {
          labels: [
            "Calling Activity (Dials)",
            "Reachability (Connections)",
            "Engagement (Effective Ratio)",
            "Closing Power (Conversion)",
            "Availability (Attendance)",
            "Customer Talktime"
          ],
          datasets: [
            {
              label: `${String(counsellorName)} (Actual)`,
              data: safeIndScores,
              backgroundColor: "rgba(217, 91%, 60%, 0.2)",
              borderColor: "hsl(217, 91%, 60%)",
              borderWidth: 2,
              pointBackgroundColor: "hsl(217, 91%, 60%)"
            },
            {
              label: "Team Average Benchmark",
              data: safeTeamScores,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderColor: "rgba(255, 255, 255, 0.4)",
              borderWidth: 2,
              borderDash: [3, 3],
              pointBackgroundColor: "rgba(255, 255, 255, 0.6)"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: "hsl(215, 20%, 68%)" }
            }
          },
          scales: {
            r: {
              grid: { color: "hsla(217, 30%, 20%, 0.4)" },
              angleLines: { color: "hsla(217, 30%, 20%, 0.4)" },
              ticks: { display: false, backdropColor: "transparent" },
              pointLabels: {
                color: "hsl(215, 20%, 68%)",
                font: { family: "Inter", size: 10 }
              },
              suggestedMin: 0,
              suggestedMax: 100
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in renderCounsellorRadar:", error, { canvasId, counsellorName, indScores, teamScores });
      // Don't re-throw the error to avoid breaking the UI
    }
  }

  // 5. Half-doughnut Gauge: Risk Score visualization
  renderRiskGauge(canvasId, riskScore) {
    try {
      // Validate inputs
      if (!canvasId || typeof canvasId !== 'string') {
        console.warn("Invalid canvasId provided to renderRiskGauge:", canvasId);
        return;
      }

      if (typeof riskScore !== 'number' || isNaN(riskScore)) {
        console.warn("Invalid riskScore provided to renderRiskGauge:", riskScore);
        // Use a default safe value
        riskScore = 0;
      }

      // Ensure riskScore is within valid range
      riskScore = Math.max(0, Math.min(100, riskScore));

      this.destroyChart(canvasId);

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn("Canvas element not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Unable to get canvas context for:", canvasId);
        return;
      }

      let riskColor = "hsl(142, 76%, 45%)"; // safe
      if (riskScore > 30 && riskScore <= 60) riskColor = "hsl(48, 96%, 53%)"; // warning
      else if (riskScore > 60) riskColor = "hsl(346, 84%, 61%)"; // critical

      this.chartRegistry[canvasId] = new Chart(ctx, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: [riskScore, 100 - riskScore],
              backgroundColor: [riskColor, "hsla(217, 30%, 20%, 0.3)"],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          rotation: -90,
          circumference: 180,
          cutout: "80%",
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
    } catch (error) {
      console.error("Error in renderRiskGauge:", error, { canvasId, riskScore });
      // Don't re-throw the error to avoid breaking the UI
    }
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.ChartingEngine = new ChartingEngine();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChartingEngine;
}
