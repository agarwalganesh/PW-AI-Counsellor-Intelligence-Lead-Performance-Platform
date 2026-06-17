// Core Orchestration Script for AI Counsellor Intelligence & Performance Optimization Platform

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Modules
  const dp = window.DataProcessor;
  const ae = window.AnalyticsEngine;
  const ce = window.ChartingEngine;
  const exp = window.ReportExporter;

  // Application State
  let activeView = "view-executive";
  let activeRole = "manager";
  let activeCounsellorEmail = "";
  let insightsInterval = null;
  let currentInsightIndex = 0;

  // View Names mapping for title section
  const viewMeta = {
    "view-executive": { title: "Executive Dashboard", subtitle: "AI-powered summary & critical pipeline metrics" },
    "view-performance": { title: "Counsellor Metrics", subtitle: "Granular performance data & activity indicators" },
    "view-rankings": { title: "Leaderboards & Rankings", subtitle: "Ranked categories and performance scores" },
    "view-profile": { title: "Counsellor Profile", subtitle: "AI performance summary and individual diagnostics" },
    "view-team-compare": { title: "Team Comparison", subtitle: "Side-by-side performance of managers, leads & campaigns" },
    "view-risk": { title: "AI Risk Prediction Engine", subtitle: "Target gap projections and target miss probabilities" },
    "view-lead-quality": { title: "Lead Quality Intelligence", subtitle: "Expected vs actual conversion matching lead quality mixes" },
    "view-funnel": { title: "Funnel Analysis", subtitle: "Lead stage drop-off analysis and pipeline recommendations" },
    "view-recommendations": { title: "AI Recommendations Engine", subtitle: "Context-aware action plans for leads & coaching" }
  };

  // --- INITIALIZATION ---
  function init() {
    // Start fresh: do not load cache, do not auto-fetch server file, do not load mock data
    const uploadOverlay = document.getElementById("upload-prompt-overlay");
    if (uploadOverlay) uploadOverlay.style.display = "flex";

    document.getElementById("data-status-text").textContent = "No File Uploaded";
    document.getElementById("data-status-dot").style.backgroundColor = "var(--accent-critical)";
    document.getElementById("data-status-dot").style.boxShadow = "var(--glow-shadow-critical)";

    // Bind Event Listeners
    bindEvents();
  }

  function finishInit() {
    // Set Initial Date Range (Min/Max of data)
    const options = dp.getFiltersOptions();
    document.getElementById("filter-start-date").value = options.minDate;
    document.getElementById("filter-end-date").value = options.maxDate;
    
    dp.setFilter("startDate", options.minDate);
    dp.setFilter("endDate", options.maxDate);

    // Populate Filters
    populateFilterDropdowns();
    
    // Bind Event Listeners
    bindEvents();
    
    // Set default selected profile
    if (dp.counsellorsList.length > 0) {
      activeCounsellorEmail = dp.counsellorsList[0].email;
      populateProfileSelector();
    }

    // Draw Dashboard
    renderActiveView();
    startInsightsSlideshow();
  }

  // --- DOM DROP-DOWNS POPULATION ---
  function populateFilterDropdowns() {
    const opts = dp.getFiltersOptions();
    
    const mgrSelect = document.getElementById("filter-manager");
    const tlSelect = document.getElementById("filter-team-lead");
    const campSelect = document.getElementById("filter-campaign");

    // Preserve first option ("All")
    mgrSelect.innerHTML = '<option value="all">All Managers</option>';
    tlSelect.innerHTML = '<option value="all">All Leads</option>';
    campSelect.innerHTML = '<option value="all">All Campaigns</option>';

    opts.managers.forEach(m => {
      mgrSelect.innerHTML += `<option value="${m}">${m}</option>`;
    });
    opts.teamLeads.forEach(tl => {
      tlSelect.innerHTML += `<option value="${tl}">${tl}</option>`;
    });
    opts.campaigns.forEach(c => {
      campSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
  }

  function populateProfileSelector() {
    const selector = document.getElementById("profile-selector-dropdown");
    selector.innerHTML = "";
    
    // In counsellor role, only show themselves
    const list = activeRole === "counsellor" ? 
      dp.counsellorsList.filter(c => c.email === activeCounsellorEmail) : 
      dp.counsellorsList;

    list.forEach(c => {
      selector.innerHTML += `<option value="${c.email}">${c.name} (${c.email})</option>`;
    });

    if (list.length > 0) {
      // If active email is not in the list, set to first available
      if (!list.map(c => c.email).includes(activeCounsellorEmail)) {
        activeCounsellorEmail = list[0].email;
      }
      selector.value = activeCounsellorEmail;
    }
  }

  // --- EVENT BINDERS ---
  function bindEvents() {
    // Navigation routing
    document.querySelectorAll(".sidebar-nav-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = link.getAttribute("data-view");
        switchView(targetView);
      });
    });

    // Global Filter Changes
    document.getElementById("filter-start-date").addEventListener("change", (e) => {
      dp.setFilter("startDate", e.target.value);
      onFiltersChanged();
    });
    document.getElementById("filter-end-date").addEventListener("change", (e) => {
      dp.setFilter("endDate", e.target.value);
      onFiltersChanged();
    });
    document.getElementById("filter-manager").addEventListener("change", (e) => {
      dp.setFilter("manager", e.target.value);
      onFiltersChanged();
    });
    document.getElementById("filter-team-lead").addEventListener("change", (e) => {
      dp.setFilter("teamLead", e.target.value);
      onFiltersChanged();
    });
    document.getElementById("filter-campaign").addEventListener("change", (e) => {
      dp.setFilter("campaign", e.target.value);
      onFiltersChanged();
    });

    // Role-based Access Simulation selector
    document.getElementById("role-selector").addEventListener("change", (e) => {
      activeRole = e.target.value;
      applyRoleRestrictions();
    });
    
    document.getElementById("reset-role-btn").addEventListener("click", () => {
      document.getElementById("role-selector").value = "manager";
      activeRole = "manager";
      applyRoleRestrictions();
    });

    // Profile Dropdown selector
    document.getElementById("profile-selector-dropdown").addEventListener("change", (e) => {
      activeCounsellorEmail = e.target.value;
      renderProfileView();
    });

    // Excel Upload File processor
    document.getElementById("excel-file-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      dp.parseExcelFile(file, (err, dataset) => {
        if (err) {
          alert(`Excel Parsing Error: ${err.message}`);
          return;
        }
        
        // Hide upload prompt overlay
        const uploadOverlay = document.getElementById("upload-prompt-overlay");
        if (uploadOverlay) uploadOverlay.style.display = "none";

        // Success
        document.getElementById("data-status-text").textContent = "Uploaded Sheet Active";
        document.getElementById("data-status-dot").style.backgroundColor = "var(--accent-info)";
        document.getElementById("data-status-dot").style.boxShadow = "var(--glow-shadow-info)";
        
        // Set Date Range dynamically from uploaded dataset min/max dates
        const dateOpts = dp.getFiltersOptions();
        document.getElementById("filter-start-date").value = dateOpts.minDate;
        document.getElementById("filter-end-date").value = dateOpts.maxDate;
        dp.setFilter("startDate", dateOpts.minDate);
        dp.setFilter("endDate", dateOpts.maxDate);

        // Reset and populate filters
        populateFilterDropdowns();
        if (dp.counsellorsList.length > 0) {
          activeCounsellorEmail = dp.counsellorsList[0].email;
          populateProfileSelector();
        }
        
        // Draw views
        onFiltersChanged();
      });
    });

    // Export triggers
    document.getElementById("export-excel-btn").addEventListener("click", () => {
      exp.exportToExcel(dp.filteredDataset);
    });
    document.getElementById("export-csv-btn").addEventListener("click", () => {
      exp.exportToCSV(dp.filteredDataset);
    });
    document.getElementById("export-pdf-btn").addEventListener("click", () => {
      exp.exportToPDF(activeView, viewMeta[activeView].title);
    });

    // Rankings Table category switcher
    document.querySelectorAll("[data-rank]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("[data-rank]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const category = btn.getAttribute("data-rank");
        renderRankingsView(category);
      });
    });

    // Team Compare category switcher
    document.querySelectorAll("[data-compare]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("[data-compare]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const category = btn.getAttribute("data-compare");
        renderTeamCompareView(category);
      });
    });

    // Mobile Navigation Drawer Toggle Handlers
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const menuToggle = document.getElementById("mobile-menu-toggle");

    if (menuToggle && sidebar && overlay) {
      menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("open");
      });

      overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
      });

      // Close drawer automatically when clicking navigation items on mobile viewport
      document.querySelectorAll(".sidebar-nav-link").forEach(link => {
        link.addEventListener("click", () => {
          sidebar.classList.remove("open");
          overlay.classList.remove("open");
        });
      });
    }
  }

  // Handle updates when filters change
  function onFiltersChanged() {
    renderActiveView();
    startInsightsSlideshow(); // restart alerts with new metrics
  }

  // --- ROUTING / VIEW CHANGING ---
  function switchView(targetView) {
    activeView = targetView;

    // Check Role Restrictions
    const isRestricted = checkViewRestriction(targetView);
    const overlay = document.getElementById("access-denied-overlay");
    
    if (isRestricted) {
      overlay.style.display = "flex";
      // Hide active subpanels
      document.querySelectorAll(".dashboard-view").forEach(v => v.classList.remove("active"));
      // Still swap sidebar classes for display visual
      document.querySelectorAll(".sidebar-nav-link").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("data-view") === targetView) link.classList.add("active");
      });
      document.getElementById("view-title").textContent = viewMeta[targetView].title;
      document.getElementById("view-subtitle").textContent = viewMeta[targetView].subtitle;
      return;
    }

    overlay.style.display = "none";

    // Toggle panels
    document.querySelectorAll(".dashboard-view").forEach(v => {
      v.classList.remove("active");
      if (v.id === targetView) v.classList.add("active");
    });

    // Toggle active link class
    document.querySelectorAll(".sidebar-nav-link").forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("data-view") === targetView) link.classList.add("active");
    });

    // Update Header titles
    document.getElementById("view-title").textContent = viewMeta[targetView].title;
    document.getElementById("view-subtitle").textContent = viewMeta[targetView].subtitle;

    // Trigger rendering of specific view
    renderActiveView();
  }

  // Role permissions checking
  function checkViewRestriction(viewId) {
    if (activeRole === "manager") return false; // Managers see all
    
    if (activeRole === "lead") {
      // Team Leads cannot view comparative dashboards
      if (viewId === "view-team-compare") return true;
    }
    
    if (activeRole === "counsellor") {
      // Counsellors can only view profile, lead quality, funnel, recommendations
      const permitted = ["view-profile", "view-lead-quality", "view-funnel", "view-recommendations"];
      if (!permitted.includes(viewId)) return true;
    }

    return false;
  }

  function applyRoleRestrictions() {
    const indicator = document.getElementById("role-indicator");
    if (activeRole === "manager") {
      indicator.style.backgroundColor = "var(--accent-safe)";
      // Reset filter overrides
      dp.setFilter("teamLead", document.getElementById("filter-team-lead").value);
      dp.setFilter("counsellorEmail", "all");
    } else if (activeRole === "lead") {
      indicator.style.backgroundColor = "var(--accent-warning)";
      // Dynamically select the first available Team Lead, falling back to "Amit Singh" if in dataset
      const leads = dp.getFiltersOptions().teamLeads;
      const defaultLead = leads.includes("Amit Singh") ? "Amit Singh" : (leads[0] || "None");
      dp.setFilter("teamLead", defaultLead);
      dp.setFilter("counsellorEmail", "all");
    } else if (activeRole === "counsellor") {
      indicator.style.backgroundColor = "var(--accent-critical)";
      // Dynamically select the first available Counselor, falling back to "sneha.sharma@edu.com" if in dataset
      const defaultEmail = dp.counsellorsList.some(c => c.email === "sneha.sharma@edu.com") ? 
        "sneha.sharma@edu.com" : 
        (dp.counsellorsList[0] ? dp.counsellorsList[0].email : "");
      dp.setFilter("counsellorEmail", defaultEmail);
      activeCounsellorEmail = defaultEmail;
    }

    // Refresh profile selectors
    populateProfileSelector();
    
    // Automatically route to a permitted screen if current is restricted
    if (checkViewRestriction(activeView)) {
      if (activeRole === "counsellor") switchView("view-profile");
      else if (activeRole === "lead") switchView("view-executive");
    } else {
      onFiltersChanged();
    }
  }

  // --- RENDERING ROUTINES ---
  function renderActiveView() {
    if (document.getElementById("access-denied-overlay").style.display === "flex") return;

    switch (activeView) {
      case "view-executive":
        renderExecutiveView();
        break;
      case "view-performance":
        renderPerformanceView();
        break;
      case "view-rankings":
        // Get active button state for leaderboard type
        const activeRankBtn = document.querySelector("[data-rank].active");
        renderRankingsView(activeRankBtn ? activeRankBtn.getAttribute("data-rank") : "top");
        break;
      case "view-profile":
        renderProfileView();
        break;
      case "view-team-compare":
        const activeCompBtn = document.querySelector("[data-compare].active");
        renderTeamCompareView(activeCompBtn ? activeCompBtn.getAttribute("data-compare") : "lead");
        break;
      case "view-risk":
        renderRiskView();
        break;
      case "view-lead-quality":
        renderLeadQualityView();
        break;
      case "view-funnel":
        renderFunnelView();
        break;
      case "view-recommendations":
        renderRecommendationsView();
        break;
    }
  }

  // 1. Executive Dashboard View
  function renderExecutiveView() {
    const aggr = dp.getAggregates();
    const breakdown = dp.getCounsellorBreakdown();

    // Calculate High Risk count
    let highRiskCount = 0;
    breakdown.forEach(c => {
      const risk = ae.calculateRiskScore(c);
      if (risk.category === "Red") highRiskCount++;
    });

    // Set KPI counters
    document.getElementById("kpi-counsellors").textContent = aggr.totalCounsellors;
    document.getElementById("kpi-admissions").textContent = aggr.totalAdmissions;
    document.getElementById("kpi-conversion").textContent = `${aggr.conversionPercentage}%`;
    document.getElementById("kpi-high-risk").textContent = highRiskCount;
    
    document.getElementById("kpi-admissions-target-gap").textContent = 
      `Target: ${aggr.totalTarget} (${aggr.targetAchievement}% Achieved)`;

    const convTrendStatus = document.getElementById("kpi-conversion-status");
    convTrendStatus.textContent = `${aggr.totalEffective} Effective / ${aggr.totalConnected} Connected`;

    const riskStatus = document.getElementById("kpi-high-risk-status");
    riskStatus.textContent = highRiskCount > 0 ? `${highRiskCount} counsellors need coaching` : "All targets safe";
    riskStatus.className = highRiskCount > 0 ? "kpi-trend down" : "kpi-trend up";

    // Daily activity trend line
    const dailyTrend = dp.getDailyTrend();
    ce.renderCallActivityTrend("exec-activity-chart", dailyTrend);

    // Target Achievement cumulative path
    ce.renderTargetProgress("exec-target-chart", dailyTrend, aggr.totalTarget);

    // Render Mini Lists
    renderExecMiniLists(breakdown);
  }

  function renderExecMiniLists(breakdown) {
    // Sort for top performers
    const sortedPerformers = [...breakdown].sort((a,b) => b.totalAdmissions - a.totalAdmissions).slice(0, 3);
    const topList = document.getElementById("exec-top-performers-list");
    topList.innerHTML = "";
    sortedPerformers.forEach((p, idx) => {
      topList.innerHTML += `
        <div class="diagnostic-card safe" style="margin-bottom:8px; cursor:pointer;" onclick="window.routeToProfile('${p.email}')">
          <div class="diagnostic-indicator">🏆</div>
          <div class="diagnostic-info">
            <div class="diagnostic-title">#${idx+1} ${p.name}</div>
            <div class="diagnostic-desc">${p.totalAdmissions} Admissions (Conv: ${p.conversionPercentage}%)</div>
          </div>
        </div>
      `;
    });

    // High Risk warnings
    const riskAlerts = [];
    breakdown.forEach(c => {
      const risk = ae.calculateRiskScore(c);
      const pred = ae.predictTargetAchievement(c);
      if (risk.category === "Red" || risk.category === "Yellow") {
        riskAlerts.push({ ...c, riskScore: risk.score, riskCat: risk.category, gap: pred.gap, missProb: pred.missProbability });
      }
    });
    // Sort by highest risk score
    riskAlerts.sort((a,b) => b.riskScore - a.riskScore);

    const riskList = document.getElementById("exec-high-risk-list");
    riskList.innerHTML = "";
    
    if (riskAlerts.length === 0) {
      riskList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding: 20px 0;">No high-risk alerts.</div>';
    } else {
      riskAlerts.slice(0, 3).forEach(r => {
        const borderClass = r.riskCat === "Red" ? "critical" : "warning";
        const indicator = r.riskCat === "Red" ? "🛑" : "⚠️";
        riskList.innerHTML += `
          <div class="diagnostic-card ${borderClass}" style="margin-bottom:8px; cursor:pointer;" onclick="window.routeToProfile('${r.email}')">
            <div class="diagnostic-indicator">${indicator}</div>
            <div class="diagnostic-info">
              <div class="diagnostic-title">${r.name} (Risk Score: ${r.riskScore})</div>
              <div class="diagnostic-desc">Target Miss Prob: ${r.missProb}% | Target Gap: ${r.gap}</div>
            </div>
          </div>
        `;
      });
    }

    // Mini Recommendations List
    const recs = ae.generateRecommendations(breakdown, dp.filters).slice(0, 3);
    const recList = document.getElementById("exec-recommendations-list");
    recList.innerHTML = "";
    
    if (recs.length === 0) {
      recList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding: 20px 0;">All indicators stable.</div>';
    } else {
      recs.forEach(rec => {
        const severityClass = rec.priority === "High" ? "critical" : rec.priority === "Medium" ? "warning" : "safe";
        recList.innerHTML += `
          <div class="diagnostic-card ${severityClass}" style="margin-bottom:8px; cursor:pointer;" onclick="window.routeToRecommendations()">
            <div class="diagnostic-info">
              <div class="diagnostic-title" style="font-weight:700;">${rec.subject}</div>
              <div class="diagnostic-desc" style="font-size:0.75rem;">${rec.desc}</div>
            </div>
          </div>
        `;
      });
    }
  }

  // 2. Counsellor Metrics View
  function renderPerformanceView() {
    const breakdown = dp.getCounsellorBreakdown();
    const tableBody = document.getElementById("metrics-table-body");
    tableBody.innerHTML = "";

    const searchVal = document.getElementById("search-counsellor").value.toLowerCase();
    const bandVal = document.getElementById("filter-performance-band").value;

    // Register search/band filter dynamically
    const filteredBreakdown = breakdown.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchVal) || c.email.toLowerCase().includes(searchVal);
      const matchBand = bandVal === "all" || c.band === bandVal;
      return matchSearch && matchBand;
    });

    if (filteredBreakdown.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center; color:var(--text-muted);">No records match criteria.</td></tr>';
      return;
    }

    filteredBreakdown.forEach(c => {
      const risk = ae.calculateRiskScore(c);
      const leadQuality = ae.calculateLeadQuality(c);
      const fair = ae.calculateFairScore(c, leadQuality);

      const riskPill = risk.category === "Red" ? "red" : risk.category === "Yellow" ? "yellow" : "green";
      const fairPill = fair.color;

      const hrs = Math.floor(c.totalTalktime / 3600);
      const mins = Math.floor((c.totalTalktime % 3600) / 60);
      const formattedTalktime = `${hrs}h ${mins}m`;

      tableBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="window.routeToProfile('${c.email}')">
          <td style="font-weight:700; color:var(--accent-info);">${c.name}</td>
          <td><div style="font-size:0.75rem;">TL: ${c.teamLead}</div><div style="font-size:0.7rem; color:var(--text-muted)">Mgr: ${c.manager}</div></td>
          <td>${c.campaign}</td>
          <td>${c.attendance.rate}%</td>
          <td>${c.target}</td>
          <td><strong style="font-size:0.95rem;">${c.totalAdmissions}</strong></td>
          <td>${c.conversionPercentage}%</td>
          <td>${c.totalDials}</td>
          <td>${c.totalConnected}</td>
          <td>${c.totalEffective}</td>
          <td>${formattedTalktime}</td>
          <td><span class="status-pill ${fairPill}">${fair.rating}</span></td>
          <td><span class="status-pill ${riskPill}">${risk.category} (${risk.score})</span></td>
        </tr>
      `;
    });

    // Re-bind input triggers
    document.getElementById("search-counsellor").oninput = () => renderPerformanceView();
    document.getElementById("filter-performance-band").onchange = () => renderPerformanceView();
  }

  // Helper link to trigger individual profile routing from cards/rows
  window.routeToProfile = (email) => {
    activeCounsellorEmail = email;
    const selector = document.getElementById("profile-selector-dropdown");
    if (selector) selector.value = email;
    switchView("view-profile");
  };

  window.routeToRecommendations = () => {
    switchView("view-recommendations");
  };

  // 3. Leaderboards & Rankings View
  function renderRankingsView(category) {
    const titleBox = document.getElementById("rankings-panel-title");
    const tableBody = document.getElementById("rankings-table-body");
    tableBody.innerHTML = "";

    const breakdown = dp.getCounsellorBreakdown();

    let sortedList = [...breakdown];

    switch (category) {
      case "top":
        titleBox.textContent = "Leaderboard: Top Performers (by Admissions)";
        sortedList.sort((a,b) => b.totalAdmissions - a.totalAdmissions);
        break;
      case "improved":
        titleBox.textContent = "Leaderboard: Most Improved (by Conversion delta against expectations)";
        sortedList.sort((a,b) => {
          const lqa = ae.calculateLeadQuality(a);
          const lqb = ae.calculateLeadQuality(b);
          const fairA = ae.calculateFairScore(a, lqa);
          const fairB = ae.calculateFairScore(b, lqb);
          return fairB.difference - fairA.difference;
        });
        break;
      case "closers":
        titleBox.textContent = "Leaderboard: Best Closers (by Conversion rate)";
        sortedList.sort((a,b) => b.conversionPercentage - a.conversionPercentage);
        break;
      case "risk":
        titleBox.textContent = "Leaderboard: High Risk (by AI Risk Score)";
        sortedList.sort((a,b) => {
          const rA = ae.calculateRiskScore(a).score;
          const rB = ae.calculateRiskScore(b).score;
          return rB - rA;
        });
        break;
      case "lazy":
        titleBox.textContent = "Leaderboard: Low Activity (by average daily dials)";
        sortedList.sort((a,b) => {
          const activeA = a.attendance.present + a.attendance.halfDay * 0.5 || 1;
          const activeB = b.attendance.present + b.attendance.halfDay * 0.5 || 1;
          return (a.totalDials / activeA) - (b.totalDials / activeB);
        });
        break;
    }

    sortedList.forEach((c, index) => {
      const risk = ae.calculateRiskScore(c);
      const leadQuality = ae.calculateLeadQuality(c);
      const fair = ae.calculateFairScore(c, leadQuality);

      const activeDays = c.attendance.present + c.attendance.halfDay * 0.5 || 1;
      const dailyDials = Math.round(c.totalDials / activeDays);

      tableBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="window.routeToProfile('${c.email}')">
          <td><strong style="font-size:1rem;">#${index + 1}</strong></td>
          <td style="font-weight:700; color:var(--accent-info);">${c.name}</td>
          <td><strong>${c.totalAdmissions}</strong></td>
          <td>${c.targetAchievement}%</td>
          <td>${c.conversionPercentage}%</td>
          <td>${dailyDials} calls/day</td>
          <td><span class="status-pill ${risk.category === "Red" ? "red" : risk.category === "Yellow" ? "yellow" : "green"}">${risk.score} (${risk.category})</span></td>
          <td><span class="status-pill ${fair.color}">${fair.rating}</span></td>
        </tr>
      `;
    });
  }

  // 4. Counsellor Profiles View
  function renderProfileView() {
    const breakdown = dp.getCounsellorBreakdown();
    const c = breakdown.find(item => item.email === activeCounsellorEmail);
    if (!c) return;

    // Populator profile basic card
    document.getElementById("prof-name").textContent = c.name;
    document.getElementById("prof-email").textContent = c.email;
    document.getElementById("prof-avatar").textContent = c.name.charAt(0);
    document.getElementById("prof-tl").textContent = c.teamLead;
    document.getElementById("prof-manager").textContent = c.manager;
    document.getElementById("prof-campaign").textContent = c.campaign;
    document.getElementById("prof-band").textContent = `${c.band} | ${c.status}`;

    // Risk indicator
    const risk = ae.calculateRiskScore(c);
    const riskPill = document.getElementById("prof-risk-pill");
    riskPill.textContent = `${risk.category} Risk`;
    riskPill.className = `status-pill ${risk.category === "Red" ? "red" : risk.category === "Yellow" ? "yellow" : "green"}`;
    riskPill.style.width = "100%";
    riskPill.style.justifyContent = "center";

    // Target Predictor box
    const predictor = ae.predictTargetAchievement(c);
    document.getElementById("profile-risk-val").textContent = risk.score;
    ce.renderRiskGauge("profile-risk-gauge", risk.score);
    
    const targetVerdict = document.getElementById("profile-predictor-verdict");
    if (predictor.predictedAdmissions >= predictor.target) {
      targetVerdict.innerHTML = `Projected to hit target! Predicted: <strong>${predictor.predictedAdmissions}</strong> / Target: ${predictor.target}`;
      targetVerdict.style.color = "var(--accent-safe)";
    } else {
      targetVerdict.innerHTML = `Likely to miss. Projected: <strong>${predictor.predictedAdmissions}</strong> (Gap: ${predictor.gap}) | Miss probability: <strong>${predictor.missProbability}%</strong>`;
      targetVerdict.style.color = "var(--accent-critical)";
    }

    // Stats Grid
    document.getElementById("prof-stat-progress").textContent = `${c.totalAdmissions} / ${c.target}`;
    document.getElementById("prof-stat-progress-sub").textContent = `${c.targetAchievement}% Target Achieved`;
    
    document.getElementById("prof-stat-conversion").textContent = `${c.conversionPercentage}%`;
    document.getElementById("prof-stat-conversion-sub").textContent = `${c.totalAdmissions} closed of ${c.totalConnected} connected`;

    document.getElementById("prof-stat-attendance").textContent = `${c.attendance.rate}%`;
    document.getElementById("prof-stat-attendance-sub").textContent = `Present: ${c.attendance.present} | Half: ${c.attendance.halfDay} | Absent: ${c.attendance.absent}`;

    // Diagnostic Root Causes list
    const diagList = document.getElementById("profile-diagnostics-list");
    diagList.innerHTML = "";
    
    const diagnostics = ae.diagnosePerformance(c);
    diagnostics.forEach(diag => {
      const isSafe = diag.severity === "Safe";
      const isCritical = diag.severity === "Critical";
      const pillClass = isSafe ? "safe" : isCritical ? "critical" : "warning";
      const flag = isSafe ? "✓" : isCritical ? "🛑" : "⚠️";

      diagList.innerHTML += `
        <div class="diagnostic-card ${pillClass}" style="margin-bottom:8px;">
          <div class="diagnostic-indicator">${flag}</div>
          <div class="diagnostic-info">
            <div class="diagnostic-title" style="font-weight:700;">${diag.type} (${diag.severity})</div>
            <div class="diagnostic-desc">${diag.explanation}</div>
            <div style="font-size:0.75rem; font-weight:600; color:var(--text-primary); margin-top:4px;">Action: ${diag.action}</div>
          </div>
        </div>
      `;
    });

    // AI summary generation
    const summaryBox = document.getElementById("profile-ai-summary");
    summaryBox.textContent = generateAISummaryText(c, risk, diagnostics, predictor);

    // Radar skill compare Chart
    // 6 dimensions: dials, connections, effective %, conversion %, attendance %, avg talktime
    // We compute team averages for normalization
    const normalizedInd = normalizeCounsellorDimensions(c);
    
    // Average team competencies
    const normalizedTeamAvg = getTeamAverageNormalizedDimensions(breakdown);
    ce.renderCounsellorRadar("profile-radar-chart", c.name, normalizedInd, normalizedTeamAvg);

    // Daily Calling trends chart for individual
    const indDailyTrend = getCounsellorDailyTrend(c);
    ce.renderCallActivityTrend("profile-trend-chart", indDailyTrend);
  }

  // Dynamic natural language summary
  function generateAISummaryText(c, risk, diagnostics, predictor) {
    let text = "";
    
    if (risk.category === "Green") {
      text += `${c.name} is demonstrating strong performance. Admissions run-rate is projected to hit ${predictor.predictedAdmissions} against a target of ${c.target}. `;
      if (c.conversionPercentage >= 15) {
        text += "Their closing skill is outstanding. ";
      }
      text += "Objection handling appears solid. Recommendations: Maintain current workload, possibly assign them premium hot leads to maximize conversion yields.";
    } else {
      text += `${c.name} is classified as ${risk.category} Risk. Projected month-end admissions: ${predictor.predictedAdmissions} vs target: ${c.target}, leaving a gap of ${predictor.gap}. `;
      
      const mainDiag = diagnostics[0];
      if (mainDiag && mainDiag.caseId !== 0) {
        text += `Primary bottleneck identified: **${mainDiag.type}**. ${mainDiag.explanation} `;
        text += `**Recommended Action Plan:** ${mainDiag.action}`;
      } else {
        text += "The risk is driven by slight declines in daily call volumes and pro-rata milestones. Close monitoring on follow-up frequencies is suggested.";
      }
    }
    
    return text;
  }

  function normalizeCounsellorDimensions(c) {
    const activeDays = c.attendance.present + c.attendance.halfDay * 0.5 || 1;
    
    const dialsMetric = Math.min(100, Math.round((c.totalDials / activeDays) / 80 * 100)); // benchmark 80
    const reachability = Math.min(100, Math.round((c.totalConnected / (c.totalDials || 1)) * 2 * 100)); // benchmark 50%
    const engagement = Math.min(100, Math.round(c.effectiveRatio)); // benchmark 100
    const closing = Math.min(100, Math.round(c.conversionPercentage / 18 * 100)); // benchmark 18%
    const attendanceVal = Math.min(100, Math.round(c.attendance.rate));
    const avgTalk = c.totalConnected > 0 ? (c.totalTalktime / c.totalConnected) : 0;
    const talktimeVal = Math.min(100, Math.round(avgTalk / 240 * 100)); // benchmark 240s

    return [dialsMetric, reachability, engagement, closing, attendanceVal, talktimeVal];
  }

  function getTeamAverageNormalizedDimensions(breakdown) {
    let dials = 0, reach = 0, engage = 0, close = 0, attend = 0, talk = 0;
    
    breakdown.forEach(c => {
      const dimensions = normalizeCounsellorDimensions(c);
      dials += dimensions[0];
      reach += dimensions[1];
      engage += dimensions[2];
      close += dimensions[3];
      attend += dimensions[4];
      talk += dimensions[5];
    });

    const count = breakdown.length || 1;
    return [
      Math.round(dials/count),
      Math.round(reach/count),
      Math.round(engage/count),
      Math.round(close/count),
      Math.round(attend/count),
      Math.round(talk/count)
    ];
  }

  function getCounsellorDailyTrend(c) {
    // Filter raw records of this counselor and map daily dials, connected, effective, admissions
    const records = c.rawRecords || [];
    return records.map(r => ({
      date: r["Date"],
      dialled: r["Dialled Calls"],
      connected: r["Connected calls"],
      effective: r["Effective calls"],
      admissions: r["Total admissions"],
      talktime: r["Talktime (In hours)"] * 3600
    })).sort((a,b) => new Date(a.date) - new Date(b.date));
  }

  // 5. Team Comparison View
  function renderTeamCompareView(category) {
    const chartTitle = document.getElementById("compare-chart-title");
    const tableHeader = document.getElementById("compare-table-header");
    const tableBody = document.getElementById("compare-table-body");
    tableBody.innerHTML = "";

    const dataset = dp.filteredDataset;

    // Grouping container
    const groups = {};

    dataset.forEach(row => {
      let key = "Unknown";
      if (category === "lead") key = row["Team Lead"] || "No Lead";
      else if (category === "manager") key = row["Manager"] || "No Manager";
      else if (category === "campaign") key = row["Campaign"] || "No Campaign";
      else if (category === "band") key = row["Band"] || "No Band";

      if (!groups[key]) {
        groups[key] = {
          admissions: 0,
          connected: 0,
          riskSum: 0,
          counsellorEmails: new Set(),
          rows: []
        };
      }

      groups[key].admissions += row["Total admissions"];
      groups[key].connected += row["Connected calls"];
      groups[key].counsellorEmails.add(row["Counselor Email"]);
      groups[key].rows.push(row);
    });

    const categories = Object.keys(groups).sort();
    const admissionsData = [];
    const conversionData = [];
    const riskData = [];

    // Change Titles
    const capCat = category.charAt(0).toUpperCase() + category.slice(1);
    chartTitle.textContent = `${capCat} Comparative Analysis`;
    tableHeader.textContent = capCat;

    categories.forEach(key => {
      const grp = groups[key];
      const convPct = grp.connected > 0 ? parseFloat(((grp.admissions / grp.connected) * 100).toFixed(2)) : 0;
      
      // Calculate average risk score of counsellors in this group
      let totalRisk = 0;
      let count = 0;
      grp.counsellorEmails.forEach(email => {
        // Find counselor aggregates
        const cRecords = grp.rows.filter(r => r["Counselor Email"] === email);
        const cAggr = dp.getAggregates(cRecords);
        const risk = ae.calculateRiskScore({ ...cAggr, rawRecords: cRecords });
        totalRisk += risk.score;
        count++;
      });
      const avgRisk = count > 0 ? Math.round(totalRisk / count) : 0;

      admissionsData.push(grp.admissions);
      conversionData.push(convPct);
      riskData.push(avgRisk);

      let riskColor = "green";
      if (avgRisk > 30 && avgRisk <= 60) riskColor = "yellow";
      else if (avgRisk > 60) riskColor = "red";

      tableBody.innerHTML += `
        <tr>
          <td style="font-weight:700; color:var(--accent-info);">${key}</td>
          <td><strong>${grp.admissions}</strong></td>
          <td>${convPct}%</td>
          <td><span class="status-pill ${riskColor}">${avgRisk}</span></td>
        </tr>
      `;
    });

    // Render Side-by-side comparative Bar chart
    ce.renderTeamComparison("compare-bar-chart", categories, admissionsData, conversionData);
  }

  // 6. Risk Predictions View
  function renderRiskView() {
    const tableBody = document.getElementById("risk-predictions-table-body");
    tableBody.innerHTML = "";

    const breakdown = dp.getCounsellorBreakdown();

    breakdown.forEach(c => {
      const risk = ae.calculateRiskScore(c);
      const pred = ae.predictTargetAchievement(c);
      const pillClass = risk.category === "Red" ? "red" : risk.category === "Yellow" ? "yellow" : "green";

      tableBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="window.routeToProfile('${c.email}')">
          <td style="font-weight:700; color:var(--accent-info);">${c.name}</td>
          <td>${pred.target}</td>
          <td>${pred.currentAdmissions}</td>
          <td><strong style="font-size:0.95rem;">${pred.predictedAdmissions}</strong></td>
          <td>${pred.gap > 0 ? `<span style="color:var(--accent-critical); font-weight:700;">-${pred.gap}</span>` : '<span style="color:var(--accent-safe); font-weight:700;">0</span>'}</td>
          <td><strong>${pred.missProbability}%</strong></td>
          <td><span class="status-pill ${pillClass}">${risk.category} (${risk.score})</span></td>
        </tr>
      `;
    });
  }

  // 7. Lead Quality View
  function renderLeadQualityView() {
    const breakdown = dp.getCounsellorBreakdown();
    const lqBody = document.getElementById("lead-quality-table-body");
    const fairBody = document.getElementById("fair-scoring-table-body");

    lqBody.innerHTML = "";
    fairBody.innerHTML = "";

    breakdown.forEach(c => {
      const leadStats = ae.calculateLeadQuality(c);
      const fair = ae.calculateFairScore(c, leadStats);

      // A. Populate Lead Breakdown Table
      let scoreColor = "green";
      if (leadStats.score < 35) scoreColor = "red";
      else if (leadStats.score >= 35 && leadStats.score < 60) scoreColor = "yellow";

      lqBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="window.routeToProfile('${c.email}')">
          <td style="font-weight:700; color:var(--accent-info);">${c.name}</td>
          <td>${leadStats.hotLeads}</td>
          <td>${leadStats.warmLeads}</td>
          <td>${leadStats.coldLeads}</td>
          <td><span class="status-pill ${scoreColor}">${leadStats.score} (${leadStats.category})</span></td>
          <td>${c.conversionPercentage}%</td>
          <td style="font-size:0.75rem;">${leadStats.attribution}</td>
        </tr>
      `;

      // B. Populate Fair Performance Table
      const varPrefix = fair.difference > 0 ? "+" : "";
      const varColor = fair.color === "green" ? "var(--accent-safe)" : fair.color === "red" ? "var(--accent-critical)" : "var(--text-primary)";

      fairBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="window.routeToProfile('${c.email}')">
          <td style="font-weight:700; color:var(--accent-info);">${c.name}</td>
          <td>${leadStats.score}</td>
          <td>${fair.expectedRate}%</td>
          <td>${fair.actualRate}%</td>
          <td style="color:${varColor}; font-weight:700;">${varPrefix}${fair.difference}%</td>
          <td><span class="status-pill ${fair.color}">${fair.rating}</span></td>
        </tr>
      `;
    });
  }

  // 8. Funnel Analysis View
  function renderFunnelView() {
    const aggr = dp.getAggregates();
    const funnel = ae.calculateFunnelDropoff(aggr);

    const container = document.getElementById("funnel-chart-container");
    container.innerHTML = "";

    funnel.stages.forEach((stage, idx) => {
      // Calculate conversion percent to render funnel bars
      // Stage value represents the percentage conversion of this stage. 
      // Scale visual bar relative to value, minimum 15% width for visibility
      const widthPct = Math.max(15, Math.round(stage.value));
      const is0 = stage.value === 0;

      container.innerHTML += `
        <div class="funnel-stage">
          <div class="funnel-bar-wrapper">
            <div class="funnel-bar" style="width: ${is0 ? 0 : widthPct}%;"></div>
            <div class="funnel-bar-text">
              <span class="funnel-stage-label">${stage.name}</span>
              <span class="funnel-stage-val">${stage.count} count</span>
            </div>
          </div>
          <div class="funnel-conversion-rate">${is0 ? '0' : stage.value.toFixed(1)}%</div>
        </div>
      `;

      // Add Drop-off arrow indicator if not last stage
      if (idx < funnel.stages.length - 1) {
        // Dropoff between stage and next stage
        const nextStage = funnel.stages[idx + 1];
        const dropoff = 100 - (stage.count > 0 ? (nextStage.count / stage.count * 100) : 0);
        const hasDrop = stage.count > 0 && dropoff > 10;
        
        container.innerHTML += `
          <div class="funnel-dropoff-label" style="opacity: ${hasDrop ? 1 : 0.2}">
            ↓ Dropoff rate: ${dropoff.toFixed(1)}%
          </div>
        `;
      }
    });

    // Set side panels
    document.getElementById("funnel-dropoff-stage-title").textContent = `Critical Drop-off Stage: ${funnel.dropoffStage.name}`;
    document.getElementById("funnel-dropoff-stage-desc").textContent = 
      `The pipeline registers the steepest drop-off during the "${funnel.dropoffStage.name}" stage converting at just ${funnel.dropoffStage.value.toFixed(1)}%.`;
    document.getElementById("funnel-recommendation-text").textContent = funnel.advice;
  }

  // 9. Recommendations View
  function renderRecommendationsView() {
    const breakdown = dp.getCounsellorBreakdown();
    const recs = ae.generateRecommendations(breakdown, dp.filters);

    const listContainer = document.getElementById("recommendations-full-list");
    listContainer.innerHTML = "";

    if (recs.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding: 40px; color:var(--text-muted);">
          <h3>No actions needed!</h3>
          <p>All counsellors are hitting targets, making dials, and converting within pro-rata margins.</p>
        </div>
      `;
      return;
    }

    recs.forEach(rec => {
      const isHigh = rec.priority === "High";
      const isMed = rec.priority === "Medium";
      const pClass = isHigh ? "high" : isMed ? "medium" : "low";

      listContainer.innerHTML += `
        <div class="recommendation-item ${pClass}">
          <div class="recommendation-header">
            <h4 class="recommendation-subject">${rec.subject}</h4>
            <span class="recommendation-priority">${rec.priority} Priority</span>
          </div>
          <p class="recommendation-desc">${rec.desc}</p>
          <div class="recommendation-action" onclick="window.applyRecommendationPrompt('${rec.counsellorEmail}', '${rec.actionText}')">
            <span>⚡ Apply Action: ${rec.actionText}</span>
          </div>
        </div>
      `;
    });
  }

  // Recommendation action prompt simulation
  window.applyRecommendationPrompt = (email, actionText) => {
    alert(`Triggered action plan: "${actionText}" for ${email}.\nNotification dispatched to counsellor email and Team Lead.`);
  };

  // --- AI INSIGHTS TICKER SLIDESHOW ---
  function generateAIInsightsList() {
    const aggr = dp.getAggregates();
    const breakdown = dp.getCounsellorBreakdown();

    let highRiskCount = 0;
    breakdown.forEach(c => {
      const risk = ae.calculateRiskScore(c);
      if (risk.category === "Red") highRiskCount++;
    });

    const insights = [];
    
    // Core insights matching templates from PRD
    if (highRiskCount > 0) {
      insights.push(`🚨 AI Predictive Alert: ${highRiskCount} counsellors are at high risk of missing their month-end targets.`);
    } else {
      insights.push(`✨ Operational Alert: All active counsellor portfolios are currently predicted to hit targets.`);
    }

    // Compare campaigns (FY26 vs FY27 vs CJR)
    const camps = {};
    dp.filteredDataset.forEach(r => {
      const key = r["Campaign"];
      if (!camps[key]) camps[key] = { adm: 0, conn: 0 };
      camps[key].adm += r["Total admissions"];
      camps[key].conn += r["Connected calls"];
    });

    const campRates = Object.keys(camps).map(k => ({
      name: k,
      rate: camps[k].conn > 0 ? (camps[k].adm / camps[k].conn * 100) : 0
    })).sort((a,b) => b.rate - a.rate);

    if (campRates.length >= 2) {
      const diff = (campRates[0].rate - campRates[1].rate).toFixed(1);
      insights.push(`📈 Campaign Insights: Campaign ${campRates[0].name} is outperforming ${campRates[1].name} by ${diff}% in overall conversion rate.`);
    }

    // Reachability / Connected Ratio drops
    const reachRate = aggr.totalDials > 0 ? (aggr.totalConnected / aggr.totalDials * 100) : 0;
    if (reachRate < 45) {
      insights.push(`⚠️ Pipeline Alert: Effective reachability has decreased. Connected call rate is just ${reachRate.toFixed(1)}%. Re-verify dialer lead lists.`);
    } else {
      insights.push(`✓ Reachability Alert: Call reachability remains stable at ${reachRate.toFixed(1)}% connect rate.`);
    }

    // Lead quality discrepancy
    const underperformingList = [];
    breakdown.forEach(c => {
      const lq = ae.calculateLeadQuality(c);
      const fair = ae.calculateFairScore(c, lq);
      if (fair.rating === "Underperforming") {
        underperformingList.push(c.name);
      }
    });

    if (underperformingList.length > 0) {
      insights.push(`💡 Lead Allocation recommendation: ${underperformingList.slice(0,2).join(" & ")} are under-converting. Consider routing their hot leads to top closers.`);
    }

    return insights;
  }

  function startInsightsSlideshow() {
    // Clear old slideshow
    if (insightsInterval) clearInterval(insightsInterval);

    const list = generateAIInsightsList();
    const container = document.getElementById("insights-feed-container");
    const dotsNav = document.getElementById("insights-feed-nav");

    container.innerHTML = "";
    dotsNav.innerHTML = "";
    currentInsightIndex = 0;

    if (list.length === 0) {
      container.innerHTML = '<div class="insights-slide active">AI engine preparing performance summaries...</div>';
      return;
    }

    // Build DOM elements
    list.forEach((ins, idx) => {
      container.innerHTML += `
        <div class="insights-slide ${idx === 0 ? 'active' : ''}" data-slide="${idx}">
          ${ins}
        </div>
      `;
      dotsNav.innerHTML += `
        <div class="insights-dot ${idx === 0 ? 'active' : ''}" data-dot="${idx}" onclick="window.gotoInsightSlide(${idx})"></div>
      `;
    });

    // Set Interval to slide
    insightsInterval = setInterval(() => {
      let nextIdx = currentInsightIndex + 1;
      if (nextIdx >= list.length) nextIdx = 0;
      slideInsightTo(nextIdx);
    }, 6000); // cycle every 6s

    window.gotoInsightSlide = (idx) => {
      clearInterval(insightsInterval);
      slideInsightTo(idx);
    };
  }

  function slideInsightTo(idx) {
    const slides = document.querySelectorAll(".insights-slide");
    const dots = document.querySelectorAll(".insights-dot");

    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));

    const targetSlide = document.querySelector(`.insights-slide[data-slide="${idx}"]`);
    const targetDot = document.querySelector(`.insights-dot[data-dot="${idx}"]`);

    if (targetSlide && targetDot) {
      targetSlide.classList.add("active");
      targetDot.classList.add("active");
      currentInsightIndex = idx;
    }
  }

  // Initialize app
  init();
});
