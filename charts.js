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
  renderCallActivityTrend(canvasId, dailyTrend) {
    this.destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const labels = dailyTrend.map(t => t.date);
    const dialled = dailyTrend.map(t => t.dialled);
    const connected = dailyTrend.map(t => t.connected);
    const effective = dailyTrend.map(t => t.effective);

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
  }

  // 2. Combo Line/Bar Chart: Admissions & Cumulative Target Progress
  renderTargetProgress(canvasId, dailyTrend, monthlyTarget) {
    this.destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const labels = dailyTrend.map(t => t.date);
    const admissions = dailyTrend.map(t => t.admissions);
    
    // Calculate cumulative admissions
    let cumulative = 0;
    const cumulativeAdmissions = admissions.map(a => {
      cumulative += a;
      return cumulative;
    });

    // Pro-rata Target reference line
    const daysInMonth = 30;
    const proRataTarget = labels.map((_, index) => {
      const day = index + 1; // date rank
      return Math.round((monthlyTarget / daysInMonth) * day);
    });

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
  }

  // 3. Team Comparison Dashboard Chart (Admissions & Conversion Rates)
  renderTeamComparison(canvasId, labels, admissionsData, conversionData) {
    this.destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    this.chartRegistry[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Total Admissions",
            data: admissionsData,
            backgroundColor: "hsl(217, 91%, 60%)",
            yAxisID: "yAdmissions",
            borderRadius: 6
          },
          {
            label: "Conversion %",
            data: conversionData,
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
  }

  // 4. Radar Chart: Counsellor Skill Profile compared with Team Average
  renderCounsellorRadar(canvasId, counsellorName, indScores, teamScores) {
    this.destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

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
            label: `${counsellorName} (Actual)`,
            data: indScores,
            backgroundColor: "rgba(217, 91%, 60%, 0.2)",
            borderColor: "hsl(217, 91%, 60%)",
            borderWidth: 2,
            pointBackgroundColor: "hsl(217, 91%, 60%)"
          },
          {
            label: "Team Average Benchmark",
            data: teamScores,
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
  }

  // 5. Half-doughnut Gauge: Risk Score visualization
  renderRiskGauge(canvasId, riskScore) {
    this.destroyChart(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

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
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.ChartingEngine = new ChartingEngine();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChartingEngine;
}
