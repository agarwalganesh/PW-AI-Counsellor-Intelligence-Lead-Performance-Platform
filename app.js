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
  let privacyMode = false;

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function maskedEmail(email) {
    if (!privacyMode || !email) return email || "";
    const [name, domain] = String(email).split("@");
    return `${name.slice(0, 2)}***@${domain || "hidden"}`;
  }

  function displayName(c) {
    if (!privacyMode) return c.name || toTitleCase(c.email || "");
    return `Counsellor ${String(c.email || c.name || "X").slice(0, 3).toUpperCase()}`;
  }

  function renderStorageStatus() {
    const select = document.getElementById("storage-mode-select");
    if (select) select.value = dp.storageMode || "session";
  }

  function renderFileList(fileResults, totalRows, mode = "replace") {
    const listEl = document.getElementById("loaded-files-list");
    if (!listEl) return;
    const rows = fileResults.map(f => {
      const icon = mode === "append" ? "+" : "File";
      const detail = f.error ? `warning ${f.error}` : `${(f.rows || 0).toLocaleString()} rows`;
      return `${icon}: ${f.name} - ${detail}`;
    });
    rows.push(`Total: ${totalRows.toLocaleString()} records`);
    listEl.textContent = rows.join("\n");
  }

  function toTitleCase(str) {
    if (!str) return "";
    let namePart = str;
    if (str.includes("@")) {
      namePart = str.split("@")[0];
    }
    // Replace dots, underscores, dashes with spaces
    namePart = namePart.replace(/[._-]/g, " ");
    return namePart
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

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
    "view-recommendations": { title: "AI Recommendations Engine", subtitle: "Context-aware action plans for leads & coaching" },
    "view-team-trends": { title: "Team Performance Trends", subtitle: "Historical trends and performance analytics by team groupings" }
  };

  // --- INITIALIZATION ---
  function init() {
    // Start fresh: do not load cache, do not auto-fetch server file, do not load mock data
    const uploadOverlay = document.getElementById("upload-prompt-overlay");
    if (uploadOverlay) {
      uploadOverlay.style.display = "flex";
      
      // Inject Demo Mock Data button dynamically to allow easy testing and fallback previews
      let mockBtn = document.getElementById("load-mock-data-btn");
      if (!mockBtn) {
        mockBtn = document.createElement("button");
        mockBtn.id = "load-mock-data-btn";
        mockBtn.className = "no-data-btn";
        mockBtn.style.marginTop = "10px";
        mockBtn.style.backgroundColor = "transparent";
        mockBtn.style.border = "1px solid var(--accent-info)";
        mockBtn.style.color = "var(--accent-info)";
        mockBtn.textContent = "Or Load Demo Mock Data";
        uploadOverlay.appendChild(mockBtn);
        
        mockBtn.addEventListener("click", () => {
          uploadOverlay.style.display = "none";
          document.getElementById("data-status-text").textContent = "Using Mock Dataset";
          document.getElementById("data-status-dot").style.backgroundColor = "var(--accent-safe)";
          document.getElementById("data-status-dot").style.boxShadow = "var(--glow-shadow-safe)";
          dp.loadDataset(window.MOCK_DATA);
          finishInit();
        });
      }
    }

    document.getElementById("data-status-text").textContent = "No File Uploaded";
    document.getElementById("data-status-dot").style.backgroundColor = "var(--accent-critical)";
    document.getElementById("data-status-dot").style.boxShadow = "var(--glow-shadow-critical)";

    // Bind Event Listeners
    bindEvents();

  }

  function finishInit() {
    // Set Initial Date Range (Min/Max of data)
    const options = dp.getFiltersOptions();
    
    // \u2705 FIX: loadDataset() now clears "ai_counsellor_portal_state" from localStorage
    // on fresh file upload, so savedFilters will be null after a new file is loaded.
    // This prevents stale manager/TL/campaign filters from silently hiding data rows.
    // savedFilters will only be non-null if the user manually set them in the same session.
    const saved = localStorage.getItem("ai_counsellor_portal_state");
    let savedFilters = null;
    if (saved) {
      try {
        savedFilters = JSON.parse(saved).filters;
      } catch (err) {}
    }

    // Use data min/max dates — if savedFilters exist and are valid, prefer them
    const startDate = (savedFilters && savedFilters.startDate) || options.minDate;
    const endDate = (savedFilters && savedFilters.endDate) || options.maxDate;

    document.getElementById("filter-start-date").value = startDate;
    document.getElementById("filter-end-date").value = endDate;

    // Set min/max bounds so the calendar only allows valid dates from the dataset
    const startEl = document.getElementById("filter-start-date");
    const endEl   = document.getElementById("filter-end-date");
    startEl.min = options.minDate;
    startEl.max = options.maxDate;
    endEl.min   = options.minDate;
    endEl.max   = options.maxDate;
    
    dp.setFilter("startDate", startDate);
    dp.setFilter("endDate", endDate);

    // Populate Filters Dropdowns (uses fresh rawDataset values)
    populateFilterDropdowns();

    // \u2705 FIX: Only restore saved manager/TL/campaign filters if the savedFilters value
    // actually exists in the new dataset's options. Otherwise silently reset to "all".
    if (savedFilters) {
      const validManagers = new Set(options.managers || []);
      const validTLs = new Set(options.teamLeads || []);
      const validCampaigns = new Set(options.campaigns || []);

      if (savedFilters.manager && validManagers.has(savedFilters.manager)) {
        document.getElementById("filter-manager").value = savedFilters.manager;
        dp.filters.manager = savedFilters.manager;
      }
      if (savedFilters.teamLead && validTLs.has(savedFilters.teamLead)) {
        document.getElementById("filter-team-lead").value = savedFilters.teamLead;
        dp.filters.teamLead = savedFilters.teamLead;
      }
      if (savedFilters.campaign && validCampaigns.has(savedFilters.campaign)) {
        document.getElementById("filter-campaign").value = savedFilters.campaign;
        dp.filters.campaign = savedFilters.campaign;
      }
      if (savedFilters.month) {
        const mSel = document.getElementById("filter-month");
        if (mSel && Array.from(mSel.options).some(o => o.value === savedFilters.month)) {
          mSel.value = savedFilters.month;
          dp.filters.month = savedFilters.month;
        }
      }
      if (savedFilters.daysLimit) {
        const dSel = document.getElementById("filter-days");
        if (dSel) {
          dSel.value = savedFilters.daysLimit;
          dp.filters.daysLimit = savedFilters.daysLimit;
        }
      }
    }
    
    // Apply filters after all dropdowns are set
    dp.applyDashboardFilters();

    // Set default selected profile
    if (dp.counsellorsList.length > 0) {
      activeCounsellorEmail = (savedFilters && savedFilters.counsellorEmail) || dp.counsellorsList[0].email;
      populateProfileSelector();
    }

    // Apply sorting header icons
    updateSortingIcons();

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

    // Dynamic Injection of Month and Days select dropdown elements if they don't exist
    let monthSelect = document.getElementById("filter-month");
    if (!monthSelect) {
      const group = document.createElement("div");
      group.className = "filter-group";
      group.innerHTML = `
        <span class="filter-label">Month:</span>
        <select id="filter-month" class="filter-select">
          <option value="all">All Months</option>
        </select>
      `;
      const headerFilters = document.querySelector(".header-filters");
      const roleBadge = document.querySelector(".role-badge-container");
      if (headerFilters && roleBadge) {
        headerFilters.insertBefore(group, roleBadge);
      }
      monthSelect = document.getElementById("filter-month");
      
      // Bind event listener — delegation in bindEvents handles cross-filter reset & re-render
      monthSelect.addEventListener("change", (e) => {
        dp.setFilter("month", e.target.value);
        // Note: onFiltersChanged() is intentionally NOT called here.
        // The event delegation listener on .header-filters in bindEvents() handles
        // resetting conflicting filters AND calling onFiltersChanged().
      });
    }

    // Populate month options dynamically
    const monthNames = {
      "01": "January", "02": "February", "03": "March", "04": "April",
      "05": "May", "06": "June", "07": "July", "08": "August",
      "09": "September", "10": "October", "11": "November", "12": "December"
    };
    const prevMonthVal = monthSelect.value;
    monthSelect.innerHTML = '<option value="all">All Months</option>';
    if (opts.monthsList) {
      opts.monthsList.forEach(m => {
        const monthCode = m.includes("-") ? m.split("-")[1] : m;
        const yearCode = m.includes("-") ? m.split("-")[0] : "";
        const label = `${monthNames[monthCode] || `Month ${monthCode}`}${yearCode ? ` ${yearCode}` : ""}`;
        monthSelect.innerHTML += `<option value="${escapeHTML(m)}">${escapeHTML(label)}</option>`;
      });
    }
    if (Array.from(monthSelect.options).some(o => o.value === prevMonthVal)) {
      monthSelect.value = prevMonthVal;
    } else {
      monthSelect.value = "all";
      dp.filters.month = "all";
    }

    let daysSelect = document.getElementById("filter-days");
    if (!daysSelect) {
      const group = document.createElement("div");
      group.className = "filter-group";
      group.innerHTML = `
        <span class="filter-label">Days:</span>
        <select id="filter-days" class="filter-select">
          <option value="all">All Days</option>
          <option value="7">Last 7 Days</option>
          <option value="15">Last 15 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="60">Last 60 Days</option>
        </select>
      `;
      const headerFilters = document.querySelector(".header-filters");
      const roleBadge = document.querySelector(".role-badge-container");
      if (headerFilters && roleBadge) {
        headerFilters.insertBefore(group, roleBadge);
      }
      daysSelect = document.getElementById("filter-days");
      
      // Bind event listener — delegation in bindEvents handles cross-filter reset & re-render
      daysSelect.addEventListener("change", (e) => {
        dp.setFilter("daysLimit", e.target.value);
        // Note: onFiltersChanged() is intentionally NOT called here.
        // The event delegation listener on .header-filters in bindEvents() handles
        // resetting conflicting filters AND calling onFiltersChanged().
      });
    }

    // Preserve currently selected values before rebuilding
    const prevMgrVal  = mgrSelect.value;
    const prevTlVal   = tlSelect.value;
    const prevCampVal = campSelect.value;

    // Rebuild Manager dropdown
    mgrSelect.innerHTML = '<option value="all">All Managers</option>';
    opts.managers.forEach(m => {
      mgrSelect.innerHTML += `<option value="${escapeHTML(m)}">${escapeHTML(toTitleCase(m))}</option>`;
    });
    // Restore manager selection
    mgrSelect.value = (Array.from(mgrSelect.options).some(o => o.value === prevMgrVal)) ? prevMgrVal : "all";

    // Cascade TL dropdown: if a manager is selected, only show TLs under that manager
    const currentMgr = mgrSelect.value;
    let filteredTLs;
    if (currentMgr && currentMgr !== "all") {
      // Only include TLs that appear in rows belonging to this manager
      filteredTLs = [...new Set(
        dp.rawDataset
          .filter(r => (r["Manager"] || "").toLowerCase() === currentMgr.toLowerCase())
          .map(r => r["Team Lead"])
          .filter(Boolean)
      )].sort();
    } else {
      filteredTLs = opts.teamLeads;
    }
    tlSelect.innerHTML = '<option value="all">All Leads</option>';
    filteredTLs.forEach(tl => {
      tlSelect.innerHTML += `<option value="${escapeHTML(tl)}">${escapeHTML(toTitleCase(tl))}</option>`;
    });
    // Restore TL selection if it is still valid; otherwise reset to "all"
    if (Array.from(tlSelect.options).some(o => o.value === prevTlVal)) {
      tlSelect.value = prevTlVal;
    } else {
      tlSelect.value = "all";
      dp.filters.teamLead = "all";
    }

    // Rebuild Campaign dropdown
    campSelect.innerHTML = '<option value="all">All Campaigns</option>';
    opts.campaigns.forEach(c => {
      campSelect.innerHTML += `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`;
    });
    // Restore campaign selection
    campSelect.value = (Array.from(campSelect.options).some(o => o.value === prevCampVal)) ? prevCampVal : "all";

    // Dynamically populate the Band dropdown from actual data values
    // This fixes the "No records match criteria" bug caused by hardcoded options
    // not matching the real Band values in the uploaded Excel file.
    const bandSelect = document.getElementById("filter-performance-band");
    if (bandSelect && opts.bands && opts.bands.length > 0) {
      const prevBandVal = bandSelect.value;
      bandSelect.innerHTML = '<option value="all">All Bands</option>';
      opts.bands.forEach(b => {
        bandSelect.innerHTML += `<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`;
      });
      // Restore previously selected value if it still exists in data
      if (Array.from(bandSelect.options).some(o => o.value === prevBandVal)) {
        bandSelect.value = prevBandVal;
      } else {
        bandSelect.value = "all";
      }
    }
  }

  function populateProfileSelector() {
    const selector = document.getElementById("profile-selector-dropdown");
    selector.innerHTML = "";
    
    // In counsellor role, only show themselves
    const list = activeRole === "counsellor" ? 
      dp.counsellorsList.filter(c => c.email === activeCounsellorEmail) : 
      dp.counsellorsList;

    list.forEach(c => {
      selector.innerHTML += `<option value="${escapeHTML(c.email)}">${escapeHTML(displayName(c))} (${escapeHTML(maskedEmail(c.email))})</option>`;
    });

    if (list.length > 0) {
      // If active email is not in the list, set to first available
      if (!list.map(c => c.email).includes(activeCounsellorEmail)) {
        activeCounsellorEmail = list[0].email;
      }
      selector.value = activeCounsellorEmail;
    }
  }

  // --- MULTI-SHEET MODAL MANAGEMENT ---
  function openSheetSelectorModal(sheetNames) {
    const modal = document.getElementById("multi-sheet-modal");
    const container = document.getElementById("sheet-checkboxes-container");
    container.innerHTML = "";
    
    sheetNames.forEach(name => {
      const item = document.createElement("div");
      item.className = "sheet-option-item";
      item.innerHTML = `
        <input type="checkbox" class="sheet-option-checkbox" value="${name}">
        <label class="sheet-option-label">${name}</label>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "input") return;
        const cb = item.querySelector(".sheet-option-checkbox");
        if (cb) cb.checked = !cb.checked;
      });

      container.appendChild(item);
    });
    
    document.querySelectorAll(".sheet-option-checkbox").forEach(cb => cb.checked = true);
    
    modal.style.display = "flex";
  }

  function closeSheetSelectorModal() {
    const modal = document.getElementById("multi-sheet-modal");
    modal.style.display = "none";
    document.getElementById("excel-file-input").value = "";
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
    // Helper to reset Month and Days dropdowns when custom date range is used
    function clearTemporalSideFilters() {
      const monthSel = document.getElementById("filter-month");
      const daysSel  = document.getElementById("filter-days");
      if (monthSel && monthSel.value !== "all") {
        monthSel.value = "all";
        dp.filters.month = "all";
      }
      if (daysSel && daysSel.value !== "all") {
        daysSel.value = "all";
        dp.filters.daysLimit = "all";
      }
    }

    // Helper to reset custom date pickers back to full dataset range when Month/Days is used
    function resetCustomDateRange() {
      const opts = dp.getFiltersOptions();
      const startEl = document.getElementById("filter-start-date");
      const endEl   = document.getElementById("filter-end-date");
      if (startEl) { startEl.value = opts.minDate; dp.filters.startDate = opts.minDate; }
      if (endEl)   { endEl.value   = opts.maxDate; dp.filters.endDate   = opts.maxDate; }
    }

    document.getElementById("filter-start-date").addEventListener("change", (e) => {
      clearTemporalSideFilters();
      dp.setFilter("startDate", e.target.value);
      // Ensure end date can't be before start date
      const endEl = document.getElementById("filter-end-date");
      if (endEl && endEl.value && endEl.value < e.target.value) {
        endEl.value = e.target.value;
        dp.filters.endDate = e.target.value;
      }
      if (endEl) endEl.min = e.target.value; // Keep end min in sync
      onFiltersChanged();
    });
    document.getElementById("filter-end-date").addEventListener("change", (e) => {
      clearTemporalSideFilters();
      dp.setFilter("endDate", e.target.value);
      // Ensure start date can't be after end date
      const startEl = document.getElementById("filter-start-date");
      if (startEl && startEl.value && startEl.value > e.target.value) {
        startEl.value = e.target.value;
        dp.filters.startDate = e.target.value;
      }
      if (startEl) startEl.max = e.target.value; // Keep start max in sync
      onFiltersChanged();
    });
    document.getElementById("filter-manager").addEventListener("change", (e) => {
      dp.setFilter("manager", e.target.value);
      // Cascade: rebuild TL list filtered to this manager's TLs
      populateFilterDropdowns();
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

    // Month and Days dropdowns: reset conflicting filters and re-render
    // (They are dynamically injected so we use event delegation on .header-filters)
    document.querySelector(".header-filters").addEventListener("change", (e) => {
      if (e.target.id === "filter-month") {
        if (e.target.value !== "all") {
          // When a specific month is chosen: clear custom date range and Days filter
          resetCustomDateRange();
          dp.filters.daysLimit = "all";
          const daysSel = document.getElementById("filter-days");
          if (daysSel) daysSel.value = "all";
        }
        onFiltersChanged();
      }
      if (e.target.id === "filter-days") {
        if (e.target.value !== "all") {
          // When a specific day range is chosen: clear custom date range and Month filter
          resetCustomDateRange();
          dp.filters.month = "all";
          const monthSel = document.getElementById("filter-month");
          if (monthSel) monthSel.value = "all";
        }
        onFiltersChanged();
      }
    });

    const privacyToggle = document.getElementById("privacy-mode-toggle");
    if (privacyToggle) {
      privacyToggle.addEventListener("change", (e) => {
        privacyMode = e.target.checked;
        populateProfileSelector();
        renderActiveView();
      });
    }

    const storageModeSelect = document.getElementById("storage-mode-select");
    if (storageModeSelect) {
      storageModeSelect.value = dp.storageMode || "session";
      storageModeSelect.addEventListener("change", (e) => {
        dp.setStorageMode(e.target.value);
        renderStorageStatus();
      });
    }

    const clearDataBtn = document.getElementById("clear-uploaded-data-btn");
    if (clearDataBtn) {
      clearDataBtn.addEventListener("click", () => {
        if (!confirm("Clear the uploaded dataset from this browser?")) return;
        dp.clearStoredDataset();
        document.getElementById("data-status-text").textContent = "No File Uploaded";
        document.getElementById("loaded-files-list").textContent = "";
        const uploadOverlay = document.getElementById("upload-prompt-overlay");
        if (uploadOverlay) uploadOverlay.style.display = "flex";
        renderActiveView();
      });
    }

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

    // Excel Upload File processor — supports single AND multiple files
    document.getElementById("excel-file-input").addEventListener("change", (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Helper: update sidebar loaded-files list
      const updateFileList = (fileResults, totalRows) => {
        const listEl = document.getElementById("loaded-files-list");
        if (listEl) {
          listEl.innerHTML = fileResults.map(f =>
            `📄 <strong>${f.name}</strong>: ${f.rows ? f.rows.toLocaleString() + " rows" : "⚠ " + (f.error || "error")}`
          ).join("<br>") + `<br>✅ <strong>Total: ${totalRows.toLocaleString()} records loaded</strong>`;
        }
      };

      // Helper: show success state
      const showSuccess = (label) => {
        const uploadOverlay = document.getElementById("upload-prompt-overlay");
        if (uploadOverlay) uploadOverlay.style.display = "none";
        document.getElementById("data-status-text").textContent = label;
        document.getElementById("data-status-dot").style.backgroundColor = "var(--accent-info)";
        document.getElementById("data-status-dot").style.boxShadow = "var(--glow-shadow-info)";
        // Show Append button after first load
        const appendBtn = document.getElementById("append-file-btn");
        if (appendBtn) appendBtn.style.display = "flex";
      };

      if (files.length === 1) {
        // Single file — use original path to preserve multi-sheet modal behaviour
        dp.parseExcelFile(files[0], (err, result) => {
          if (err) { alert(`Excel Parsing Error: ${err.message}`); return; }
          if (result.isMultiSheet) { openSheetSelectorModal(result.sheetNames); return; }
          showSuccess("Uploaded Sheet Active");
          dp.saveDatasetToStorage();
          renderFileList([{ name: files[0].name, rows: dp.rawDataset.length }], dp.rawDataset.length);
          finishInit();
        });
      } else {
        // Multiple files — merge all sheets from all files
        dp.parseMultipleFiles(files, (err, result) => {
          if (err) { alert(`Excel Parsing Error: ${err.message}`); return; }
          showSuccess(`${files.length} Files Merged Active`);
          dp.saveDatasetToStorage();
          renderFileList(result.fileResults, result.totalRows);
          finishInit();
        });
      }
      // Reset input so same files can be re-selected if needed
      e.target.value = "";
    });

    // Append More Data — merge additional files into currently loaded dataset
    const appendInput = document.getElementById("excel-append-input");
    if (appendInput) {
      appendInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        dp.appendMultipleFiles(files, (err, result) => {
          if (err) { alert(`Append Error: ${err.message}`); return; }
          const listEl = document.getElementById("loaded-files-list");
          if (false && listEl) {
            // Prepend to existing list
            const added = result.fileResults.map(f =>
              `➕ <strong>${f.name}</strong>: +${(f.rows || 0).toLocaleString()} rows`
            ).join("<br>");
            listEl.innerHTML = added + "<br>" + listEl.innerHTML;
            listEl.innerHTML += `<br>✅ <strong>Total now: ${result.totalRows.toLocaleString()} records</strong>`;
          }
          dp.saveDatasetToStorage();
          renderFileList(result.fileResults, result.totalRows, "append");
          document.getElementById("data-status-text").textContent = `${result.totalRows.toLocaleString()} Records (Merged)`;
          finishInit();
        });
        e.target.value = "";
      });
    }

    // Sheet Selection Modal handlers
    document.getElementById("close-sheet-modal").addEventListener("click", () => {
      closeSheetSelectorModal();
    });
    
    document.getElementById("btn-cancel-load").addEventListener("click", () => {
      closeSheetSelectorModal();
    });

    document.getElementById("btn-select-all-sheets").addEventListener("click", () => {
      document.querySelectorAll(".sheet-option-checkbox").forEach(cb => cb.checked = true);
    });

    document.getElementById("btn-deselect-all-sheets").addEventListener("click", () => {
      document.querySelectorAll(".sheet-option-checkbox").forEach(cb => cb.checked = false);
    });

    document.getElementById("btn-confirm-load-sheets").addEventListener("click", () => {
      const selectedSheets = [];
      document.querySelectorAll(".sheet-option-checkbox").forEach(cb => {
        if (cb.checked) {
          selectedSheets.push(cb.value);
        }
      });

      if (selectedSheets.length === 0) {
        alert("Please select at least one sheet to load.");
        return;
      }

      dp.loadSheets(selectedSheets, (err, mergedDataset) => {
        if (err) {
          alert(`Error loading selected sheets: ${err.message}`);
          return;
        }

        // Hide modal
        closeSheetSelectorModal();

        // Hide upload prompt overlay
        const uploadOverlay = document.getElementById("upload-prompt-overlay");
        if (uploadOverlay) uploadOverlay.style.display = "none";

        // Success
        document.getElementById("data-status-text").textContent = "Uploaded Sheets Active";
        document.getElementById("data-status-dot").style.backgroundColor = "var(--accent-info)";
        document.getElementById("data-status-dot").style.boxShadow = "var(--glow-shadow-info)";
        
        // Clean and unify setup by calling finishInit
        finishInit();
      });
    });

    // Financial settings modal handlers
    const settingsModal = document.getElementById("settings-modal");
    const settingsToggleBtn = document.getElementById("settings-toggle-btn");
    const closeSettingsBtn = document.getElementById("close-settings-modal");
    const cancelSettingsBtn = document.getElementById("btn-cancel-settings");
    const saveSettingsBtn = document.getElementById("btn-save-settings");

    if (settingsToggleBtn && settingsModal) {
      settingsToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Populate current values
        document.getElementById("setting-course-price").value = dp.COURSE_PRICE;
        document.getElementById("setting-dial-cost").value = dp.DIAL_COST;
        document.getElementById("setting-salary-daily").value = dp.SALARY_DAILY;
        
        settingsModal.style.display = "flex";
      });

      const closeSettings = () => {
        settingsModal.style.display = "none";
      };

      if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettings);
      if (cancelSettingsBtn) cancelSettingsBtn.addEventListener("click", closeSettings);

      if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener("click", () => {
          const cp = parseFloat(document.getElementById("setting-course-price").value);
          const dc = parseFloat(document.getElementById("setting-dial-cost").value);
          const sd = parseFloat(document.getElementById("setting-salary-daily").value);

          if (isNaN(cp) || cp <= 0 || isNaN(dc) || dc < 0 || isNaN(sd) || sd < 0) {
            alert("Please enter valid positive values for all constants.");
            return;
          }

          // Save changes
          dp.COURSE_PRICE = cp;
          dp.DIAL_COST = dc;
          dp.SALARY_DAILY = sd;
          dp.saveStateToLocalStorage();

          // Refresh UI
          closeSettings();
          renderActiveView();
        });
      }
    }

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

    // Regex Search Checkbox trigger
    const regexModeCheckbox = document.getElementById("regex-search-mode");
    if (regexModeCheckbox) {
      regexModeCheckbox.addEventListener("change", () => {
        renderPerformanceView();
      });
    }

    const searchInput = document.getElementById("search-counsellor");
    if (searchInput) {
      searchInput.addEventListener("input", renderPerformanceView);
    }
    const bandSelect = document.getElementById("filter-performance-band");
    if (bandSelect) {
      bandSelect.addEventListener("change", renderPerformanceView);
    }
    const riskSelect = document.getElementById("filter-performance-risk");
    if (riskSelect) riskSelect.addEventListener("change", renderPerformanceView);
    const fairSelect = document.getElementById("filter-performance-fair");
    if (fairSelect) fairSelect.addEventListener("change", renderPerformanceView);
    const minConvInput = document.getElementById("filter-min-conversion");
    if (minConvInput) minConvInput.addEventListener("input", renderPerformanceView);

    ["sim-counsellor-select", "sim-dials-lift", "sim-connect-lift"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", renderWhatIfSimulator);
      if (el) el.addEventListener("change", renderWhatIfSimulator);
    });

    // Bind Table Sorting triggers
    bindTableSorting();

    // Bind Sliding Profile Drawer close events
    const drawerClose = document.getElementById("drawer-close-btn");
    if (drawerClose) {
      drawerClose.addEventListener("click", () => {
        document.getElementById("profile-drawer").classList.remove("open");
      });
    }

    // Bind sliding drawer tab changes
    document.querySelectorAll(".drawer-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".drawer-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.getAttribute("data-drawer-tab");
        document.querySelectorAll(".drawer-tab-content").forEach(content => {
          content.style.display = content.id === target ? "flex" : "none";
        });
      });
    });

    // Bind daily/hourly segmented toggles in drawer
    const dailyBtn = document.getElementById("drawer-view-daily-btn");
    const hourlyBtn = document.getElementById("drawer-view-hourly-btn");
    if (dailyBtn && hourlyBtn) {
      dailyBtn.addEventListener("click", () => {
        dailyBtn.classList.add("active");
        dailyBtn.style.color = "var(--text-primary)";
        hourlyBtn.classList.remove("active");
        hourlyBtn.style.color = "var(--text-muted)";
        drawerChartType = "daily";
        const warnEl = document.getElementById("drawer-hourly-simulated-warning");
        if (warnEl) warnEl.style.display = "none";
        renderDrawerTrendChart();
      });

      hourlyBtn.addEventListener("click", () => {
        hourlyBtn.classList.add("active");
        hourlyBtn.style.color = "var(--text-primary)";
        dailyBtn.classList.remove("active");
        dailyBtn.style.color = "var(--text-muted)";
        drawerChartType = "hourly";
        const warnEl = document.getElementById("drawer-hourly-simulated-warning");
        if (warnEl) warnEl.style.display = "block";
        renderDrawerTrendChart();
      });
    }

    // Team Trends View Controls
    const trendGroupBy = document.getElementById("trend-group-by");
    const trendMetric = document.getElementById("trend-metric");
    const trendPeriod = document.getElementById("trend-period");

    if (trendGroupBy) {
      trendGroupBy.addEventListener("change", () => {
        renderTeamTrendsView();
      });
    }

    if (trendMetric) {
      trendMetric.addEventListener("change", () => {
        renderTeamTrendsView();
      });
    }

    if (trendPeriod) {
      trendPeriod.addEventListener("change", () => {
        renderTeamTrendsView();
      });
    }

    // Mobile Navigation Drawer Toggle Handlers
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const menuToggle = document.getElementById("mobile-menu-toggle");
    const sidebarClose = document.getElementById("mobile-sidebar-close-btn");

    if (menuToggle && sidebar && overlay) {
      menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("open");
      });

      overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
      });

      if (sidebarClose) {
        sidebarClose.addEventListener("click", () => {
          sidebar.classList.remove("open");
          overlay.classList.remove("open");
        });
      }

      // Close drawer automatically when clicking navigation items on mobile viewport
      document.querySelectorAll(".sidebar-nav-link").forEach(link => {
        link.addEventListener("click", () => {
          sidebar.classList.remove("open");
          overlay.classList.remove("open");
        });
      });
    }

  }

  // --- MULTI-COLUMN SORTING BINDER HELPERS ---
  function bindTableSorting() {
    const headers = document.querySelectorAll(".sortable-header");
    headers.forEach(th => {
      th.addEventListener("click", (e) => {
        const field = th.getAttribute("data-sort");
        const isShift = e.shiftKey;
        
        const existingIdx = dp.sortDescriptors.findIndex(d => d.field === field);
        let dir = "asc";
        
        if (existingIdx !== -1) {
          dir = dp.sortDescriptors[existingIdx].dir === "asc" ? "desc" : "asc";
          dp.sortDescriptors[existingIdx].dir = dir;
        } else {
          if (!isShift) {
            dp.sortDescriptors = [];
          }
          dp.sortDescriptors.push({ field, dir });
        }
        
        dp.saveStateToLocalStorage();
        updateSortingIcons();
        renderPerformanceView();
      });
    });
  }

  function updateSortingIcons() {
    const headers = document.querySelectorAll(".sortable-header");
    headers.forEach(th => {
      const field = th.getAttribute("data-sort");
      const desc = dp.sortDescriptors.find(d => d.field === field);
      if (desc) {
        th.setAttribute("data-dir", desc.dir);
      } else {
        th.removeAttribute("data-dir");
      }
    });
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

    // Show/hide view-specific header controls
    const teamTrendsFilters = document.getElementById("team-trends-filters");
    if (teamTrendsFilters) {
      if (targetView === "view-team-trends") {
        teamTrendsFilters.style.display = "block";
      } else {
        teamTrendsFilters.style.display = "none";
      }
    }

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
    try {
      // Check if access denied overlay is visible
      const accessDeniedOverlay = document.getElementById("access-denied-overlay");
      if (accessDeniedOverlay && accessDeniedOverlay.style.display === "flex") {
        return;
      }

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
        case "view-team-trends":
          renderTeamTrendsView();
          break;
        default:
          console.warn("Unknown view:", activeView);
          // Default to executive view
          activeView = "view-executive";
          renderExecutiveView();
      }
    } catch (error) {
      console.error("Error in renderActiveView:", error, { activeView });
      // Show error message to user
      const errorContainer = document.getElementById("error-container");
      if (errorContainer) {
        errorContainer.innerHTML = `
          <div class="alert alert-danger">
            <strong>Error loading view:</strong> ${error.message}
          </div>
        `;
        errorContainer.style.display = "block";
      }
      // Fallback to executive view to try to recover
      try {
        activeView = "view-executive";
        renderExecutiveView();
      } catch (fallbackError) {
        console.error("Error in fallback render:", fallbackError);
        // Last resort - try to show a basic message
        const mainContent = document.querySelector(".dashboard-view");
        if (mainContent) {
          mainContent.innerHTML = `
            <div class="alert alert-danger">
              <strong>Application Error:</strong> An unexpected error occurred. Please refresh the page.
            </div>
          `;
        }
      }
    }
  }

  // 1. Executive Dashboard View
  function renderExecutiveView() {
    try {
      const aggr = dp.getAggregates();
      const breakdown = dp.getCounsellorBreakdown();

      // Calculate High Risk count
      let highRiskCount = 0;
      breakdown.forEach(c => {
        const risk = ae.calculateRiskScore(c);
        if (risk && risk.category === "Red") highRiskCount++;
      });

      // Set KPI counters
      const counsellorsEl = document.getElementById("kpi-counsellors");
      const admissionsEl = document.getElementById("kpi-admissions");
      const conversionEl = document.getElementById("kpi-conversion");
      const highRiskEl = document.getElementById("kpi-high-risk");

      if (counsellorsEl) counsellorsEl.textContent = aggr.totalCounsellors || 0;
      if (admissionsEl) admissionsEl.textContent = aggr.totalAdmissions || 0;
      if (conversionEl) conversionEl.textContent = `${(aggr.conversionPercentage || 0)}%`;
      if (highRiskEl) highRiskEl.textContent = highRiskCount;

      const targetGapEl = document.getElementById("kpi-admissions-target-gap");
      if (targetGapEl) {
        targetGapEl.textContent =
          `Target: ${aggr.totalTarget || 0} (${(aggr.targetAchievement || 0)}% Achieved)`;
      }

      const convTrendStatus = document.getElementById("kpi-conversion-status");
      if (convTrendStatus) {
        convTrendStatus.textContent = `${(aggr.totalEffective || 0)} Effective / ${(aggr.totalConnected || 0)} Connected`;
      }

      const riskStatus = document.getElementById("kpi-high-risk-status");
      if (riskStatus) {
        riskStatus.textContent = highRiskCount > 0 ? `${highRiskCount} counsellors need coaching` : "All targets safe";
        riskStatus.className = highRiskCount > 0 ? "kpi-trend down" : "kpi-trend up";
      }

      // Set Financial counters (Module 1)
      const grossMarginEl = document.getElementById("kpi-gross-margin");
      const grossMarginPctEl = document.getElementById("kpi-gross-margin-pct");
      const operationalBurnEl = document.getElementById("kpi-operational-burn");

      if (grossMarginEl && grossMarginPctEl && operationalBurnEl) {
        try {
          const grossMargin = Math.round(aggr.grossMargin || 0);
          grossMarginEl.textContent = `₹${grossMargin.toLocaleString()}`;
          grossMarginPctEl.textContent = `${(aggr.grossMarginPercentage || 0)}% Gross Margin`;
          const marginClass = (aggr.grossMarginPercentage || 0) >= 40 ? "kpi-trend up" : "kpi-trend down";
          if (grossMarginPctEl.className !== marginClass) {
            // Remove any existing trend classes
            grossMarginPctEl.className = grossMarginPctEl.className.replace(/kpi-trend\s+\w+/g, '').trim();
            // Add the new class
            if (marginClass) {
              const classes = (grossMarginPctEl.className + ' ' + marginClass).trim();
              grossMarginPctEl.className = classes;
            }
          }
          operationalBurnEl.textContent = `₹${Math.round(aggr.operationalBurn || 0).toLocaleString()}`;
        } catch (financeError) {
          console.error("Error setting financial counters:", financeError);
          // Set fallback values
          if (grossMarginEl) grossMarginEl.textContent = "₹0";
          if (grossMarginPctEl) {
            g
          }
        }
      }

      // Systemic trend warning indicator (Module 1)
      const dailyTrend = dp.getDailyTrend();
      const trendAlert = document.getElementById("systemic-trend-alert");
      if (trendAlert) {
        try {
          if (Array.isArray(dailyTrend) && dailyTrend.length >= 6) {
            const mid = Math.floor(dailyTrend.length / 2);
            const firstHalf = dailyTrend.slice(0, mid);
            const secondHalf = dailyTrend.slice(mid);

            const firstAdmissions = firstHalf.reduce((s, t) => s + (t.admissions || 0), 0);
            const firstConnected = firstHalf.reduce((s, t) => s + (t.connected || 0), 0);
            const secondAdmissions = secondHalf.reduce((s, t) => s + (t.admissions || 0), 0);
            const secondConnected = secondHalf.reduce((s, t) => s + (t.connected || 0), 0);

            const rate1 = firstConnected > 0 ? (firstAdmissions / firstConnected * 100) : 0;
            const rate2 = secondConnected > 0 ? (secondAdmissions / secondConnected * 100) : 0;

            const drop = rate1 - rate2;

            if (drop > 5.0) {
              trendAlert.style.display = "flex";
              const descEl = document.getElementById("systemic-trend-desc");
              if (descEl) {
                descEl.textContent = `Macro conversion rate has dropped by ${drop.toFixed(1)}% (from ${rate1.toFixed(1)}% to ${rate2.toFixed(1)}%) between the first half and second half of the date range.`;
              }
            } else {
              trendAlert.style.display = "none";
            }
          } else {
            trendAlert.style.display = "none";
          }
        } catch (trendError) {
          console.error("Error processing trend data:", trendError);
          if (trendAlert) trendAlert.style.display = "none";
        }
      } else if (trendAlert) {
        trendAlert.style.display = "none";
      }

      // Daily activity trend line
      try {
        ce.renderCallActivityTrend("exec-activity-chart", dailyTrend);
      } catch (chartError) {
        console.error("Error rendering activity chart:", chartError);
      }

      // Target Achievement cumulative path
      try {
        ce.renderTargetProgress("exec-target-chart", dailyTrend, aggr.totalTarget || 30);
      } catch (targetChartError) {
        console.error("Error rendering target chart:", targetChartError);
      }

      // Render Mini Lists
      try {
        renderExecMiniLists(breakdown);
      } catch (miniListsError) {
        console.error("Error rendering mini lists:", miniListsError);
      }
    } catch (error) {
      console.error("Error in renderExecutiveView:", error);
      // Show error in the executive view container
      const execView = document.getElementById("view-executive");
      if (execView) {
        execView.innerHTML = `
          <div class="alert alert-danger">
            <strong>Error loading Executive Dashboard:</strong> ${error.message}
          </div>
        `;
      }
    }
  }

  function renderExecMiniLists(breakdown) {
    // Live leaderboard highlighting Top Performers normalized by FPI (Module 1)
    const sortedPerformers = [...breakdown]
      .map(c => {
        const leadQuality = ae.calculateLeadQuality(c);
        const fair = ae.calculateFairScore(c, leadQuality);
        const fpi = fair.fpi;
        return { ...c, fpi };
      })
      .sort((a,b) => b.fpi - a.fpi)
      .slice(0, 3);

    const topList = document.getElementById("exec-top-performers-list");
    topList.innerHTML = "";
    sortedPerformers.forEach((p, idx) => {
      topList.innerHTML += `
        <div class="diagnostic-card safe" style="margin-bottom:8px; cursor:pointer;" onclick="window.routeToProfile('${p.email}')">
          <div class="diagnostic-indicator">🏆</div>
          <div class="diagnostic-info">
            <div class="diagnostic-title">#${idx+1} ${p.name} (FPI: ${p.fpi.toFixed(2)})</div>
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
    const isRegex = document.getElementById("regex-search-mode").checked;
    const bandVal = document.getElementById("filter-performance-band").value;
    const riskVal = document.getElementById("filter-performance-risk")?.value || "all";
    const fairVal = document.getElementById("filter-performance-fair")?.value || "all";
    const minConversion = parseFloat(document.getElementById("filter-min-conversion")?.value || "");

    // Register search/band filter dynamically
    const filteredBreakdown = breakdown.filter(c => {
      const risk = ae.calculateRiskScore(c);
      const leadQuality = ae.calculateLeadQuality(c);
      const fair = ae.calculateFairScore(c, leadQuality);
      let matchSearch = false;
      if (isRegex && searchVal) {
        try {
          const regex = new RegExp(searchVal, 'i');
          matchSearch = regex.test(c.name) || regex.test(c.email);
        } catch (e) {
          matchSearch = c.name.toLowerCase().includes(searchVal) || c.email.toLowerCase().includes(searchVal);
        }
      } else {
        matchSearch = c.name.toLowerCase().includes(searchVal) || c.email.toLowerCase().includes(searchVal);
      }
      const matchBand = bandVal === "all" || (c.band || "").trim().toLowerCase() === bandVal.trim().toLowerCase();
      const matchRisk = riskVal === "all" || risk.category === riskVal;
      const matchFair = fairVal === "all" || fair.rating === fairVal;
      const matchConversion = Number.isNaN(minConversion) || c.conversionPercentage >= minConversion;
      return matchSearch && matchBand && matchRisk && matchFair && matchConversion;
    });

    if (filteredBreakdown.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="13" style="text-align:center; color:var(--text-muted);">No records match criteria.</td></tr>';
      return;
    }

    // Sort using the Multi-Column Sorting descriptors
    const sortedBreakdown = dp.sortBreakdown(filteredBreakdown);

    sortedBreakdown.forEach(c => {
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
          <td style="font-weight:700; color:var(--accent-info);">${escapeHTML(displayName(c))}</td>
          <td><div style="font-size:0.75rem;">TL: ${escapeHTML(toTitleCase(c.teamLead))}</div><div style="font-size:0.7rem; color:var(--text-muted)">Mgr: ${escapeHTML(toTitleCase(c.manager))}</div></td>
          <td>${escapeHTML(c.campaign)}</td>
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

  }

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
        titleBox.textContent = "Leaderboard: FPI Performance Score (Expected vs Actual normalized)";
        sortedList.sort((a,b) => {
          const lqa = ae.calculateLeadQuality(a);
          const lqb = ae.calculateLeadQuality(b);
          const fairA = ae.calculateFairScore(a, lqa);
          const fairB = ae.calculateFairScore(b, lqb);
          return fairB.fpi - fairA.fpi;
        });
        break;
      case "closers":
        // Sorting by Closing Velocity (Module 11) - simulated closing days (lower is better!)
        titleBox.textContent = "Leaderboard: Closing Velocity (Simulated Days to Close)";
        sortedList.sort((a,b) => {
          const vA = 12.5 - a.conversionPercentage * 0.4;
          const vB = 12.5 - b.conversionPercentage * 0.4;
          return vA - vB;
        });
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
        // Sorting by MoM Performance Velocity (Module 11) - delta in conversion rate
        titleBox.textContent = "Leaderboard: MoM Performance Velocity (Conversion Delta between halves)";
        sortedList.sort((a,b) => {
          const getVelocity = (c) => {
            const records = c.rawRecords || [];
            if (records.length < 2) return 0;
            const mid = Math.floor(records.length / 2);
            const first = records.slice(0, mid);
            const second = records.slice(mid);
            const r1 = dp.getAggregates(first).conversionPercentage;
            const r2 = dp.getAggregates(second).conversionPercentage;
            return r2 - r1;
          };
          return getVelocity(b) - getVelocity(a);
        });
        break;
    }

    sortedList.forEach((c, index) => {
      const risk = ae.calculateRiskScore(c);
      const leadQuality = ae.calculateLeadQuality(c);
      const fair = ae.calculateFairScore(c, leadQuality);

      const fpiVal = fair.fpi;
      const closingVelocity = (12.5 - c.conversionPercentage * 0.4).toFixed(1);

      // MoM Velocity
      const records = c.rawRecords || [];
      let momVelocity = 0;
      if (records.length >= 2) {
        const mid = Math.floor(records.length / 2);
        const r1 = dp.getAggregates(records.slice(0, mid)).conversionPercentage;
        const r2 = dp.getAggregates(records.slice(mid)).conversionPercentage;
        momVelocity = r2 - r1;
      }

      // FIX: Calculate ACTUAL Avg Daily Dials = totalDials / unique working days
      const uniqueDays = new Set(records.map(r => r["Date"]).filter(Boolean)).size || 1;
      const avgDailyDials = Math.round(c.totalDials / uniqueDays);

      let metricValText = "";
      if (category === "top") metricValText = `${avgDailyDials} calls/day`;
      else if (category === "improved") metricValText = `FPI Score: ${fpiVal.toFixed(2)}`;
      else if (category === "closers") metricValText = `Velocity: ${closingVelocity} days`;
      else if (category === "risk") metricValText = `Risk: ${risk.score}`;
      else if (category === "lazy") metricValText = `Velocity Shift: ${momVelocity > 0 ? '+' : ''}${momVelocity.toFixed(1)}%`;

      tableBody.innerHTML += `
        <tr style="cursor:pointer;" onclick="window.routeToProfile('${c.email}')">
          <td><strong style="font-size:1rem;">#${index + 1}</strong></td>
          <td style="font-weight:700; color:var(--accent-info);">${c.name}</td>
          <td><strong>${c.totalAdmissions}</strong></td>
          <td>${c.targetAchievement}%</td>
          <td>${c.conversionPercentage}%</td>
          <td>${metricValText}</td>
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

    // Populate profile basic card
    document.getElementById("prof-name").textContent = c.name;
    document.getElementById("prof-email").textContent = c.email;
    document.getElementById("prof-avatar").textContent = c.name.charAt(0);
    document.getElementById("prof-tl").textContent = toTitleCase(c.teamLead);
    document.getElementById("prof-manager").textContent = toTitleCase(c.manager);
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
    const activeDays = (c.attendance.present + c.attendance.halfDay * 0.5) || 1;
    
    const dialsMetric = Math.min(100, Math.round((c.totalDials / activeDays) / 80 * 100)); // benchmark 80
    const reachability = Math.min(100, Math.round((c.totalConnected / (c.totalDials || 1)) * 2 * 100)); // benchmark 50%
    const engagement = Math.min(100, Math.round(c.effectiveRatio)); // benchmark 100
    const closing = Math.min(100, Math.round(c.conversionPercentage / 10 * 100)); // benchmark 10%
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

      const displayName = (category === "lead" || category === "manager") ? toTitleCase(key) : key;
      tableBody.innerHTML += `
        <tr>
          <td style="font-weight:700; color:var(--accent-info);">${displayName}</td>
          <td><strong>${grp.admissions}</strong></td>
          <td>${convPct}%</td>
          <td><span class="status-pill ${riskColor}">${avgRisk}</span></td>
        </tr>
      `;
    });

    // Render Side-by-side comparative Bar chart
    const displayCategories = categories.map(k => (category === "lead" || category === "manager") ? toTitleCase(k) : k);
    ce.renderTeamComparison("compare-bar-chart", displayCategories, admissionsData, conversionData);

    // Calculate statistical significance between the top 2 cohorts by admissions (Module 10)
    let significanceBoxId = "compare-significance-box";
    let sigBox = document.getElementById(significanceBoxId);
    if (!sigBox) {
      sigBox = document.createElement("div");
      sigBox.id = significanceBoxId;
      sigBox.className = "dashboard-panel";
      sigBox.style.marginTop = "20px";
      sigBox.style.gridColumn = "span 2";
      
      const compareGrid = document.querySelector("#view-team-compare .dashboard-row-grid");
      if (compareGrid) {
        compareGrid.appendChild(sigBox);
      }
    }

    const sortedGroups = categories
      .map(k => ({ key: k, ...groups[k] }))
      .sort((a, b) => b.admissions - a.admissions);

    if (sortedGroups.length >= 2) {
      const cohortA = sortedGroups[0];
      const cohortB = sortedGroups[1];
      const result = ae.calculateStatisticalSignificance(cohortA, cohortB);
      
      const alertClass = result.significant ? "critical" : "safe";
      const icon = result.significant ? "⚡" : "✓";
      
      const keyA = (category === "lead" || category === "manager") ? toTitleCase(cohortA.key) : cohortA.key;
      const keyB = (category === "lead" || category === "manager") ? toTitleCase(cohortB.key) : cohortB.key;

      sigBox.innerHTML = `
        <div class="panel-header" style="border:none; padding:0; margin-bottom:8px;">
          <h4 style="font-size:0.95rem; margin:0; font-family:'Outfit'; font-weight:700;">Cohort Conversion Rate Statistical Significance</h4>
        </div>
        <div class="diagnostic-card ${alertClass}" style="margin:0;">
          <div class="diagnostic-indicator">${icon}</div>
          <div class="diagnostic-info">
            <div class="diagnostic-title" style="font-weight:700;">Comparing: "${keyA}" vs "${keyB}"</div>
            <div class="diagnostic-desc" style="margin-top:4px; font-size:0.75rem; line-height:1.4;">
              <strong>${keyA} Conversion:</strong> ${(cohortA.admissions / cohortA.connected * 100).toFixed(1)}% (${cohortA.admissions}/${cohortA.connected})<br>
              <strong>${keyB} Conversion:</strong> ${(cohortB.admissions / cohortB.connected * 100).toFixed(1)}% (${cohortB.admissions}/${cohortB.connected})<br>
              <span style="display:inline-block; margin-top:8px; font-weight:600; color:var(--text-primary); font-size:0.8rem;">${result.explanation}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      sigBox.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">Add more data groups to compare statistical significance.</div>';
    }
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
        <tr style="cursor:pointer;" onclick="window.explainRisk('${escapeHTML(c.email)}')">
          <td style="font-weight:700; color:var(--accent-info);">${escapeHTML(displayName(c))}</td>
          <td>${pred.target}</td>
          <td>${pred.currentAdmissions}</td>
          <td><strong style="font-size:0.95rem;">${pred.predictedAdmissions}</strong></td>
          <td>${pred.gap > 0 ? `<span style="color:var(--accent-critical); font-weight:700;">-${pred.gap}</span>` : '<span style="color:var(--accent-safe); font-weight:700;">0</span>'}</td>
          <td><strong>${pred.missProbability.toFixed(1)}%</strong></td>
          <td><span class="status-pill ${pillClass}">${risk.category} (${risk.score})</span></td>
        </tr>
      `;
    });

    populateSimulatorOptions(breakdown);
    if (breakdown[0]) renderRiskExplanation(breakdown[0]);
    renderWhatIfSimulator();

    // Team Target Risk forecasting grid (Module 12)
    let teamPredictorBoxId = "team-target-predictor-box";
    let teamBox = document.getElementById(teamPredictorBoxId);
    if (!teamBox) {
      teamBox = document.createElement("div");
      teamBox.id = teamPredictorBoxId;
      teamBox.className = "dashboard-panel";
      teamBox.style.gridColumn = "span 2";
      teamBox.style.marginTop = "20px";
      
      const riskContainer = document.querySelector("#view-risk .dashboard-row-grid");
      if (riskContainer) {
        riskContainer.appendChild(teamBox);
      }
    }

    // Group target progress by Team Lead
    const teamGroups = {};
    breakdown.forEach(c => {
      const tl = c.teamLead || "N/A";
      const pred = ae.predictTargetAchievement(c);
      if (!teamGroups[tl]) {
        teamGroups[tl] = { actual: 0, target: 0, projected: 0, count: 0 };
      }
      teamGroups[tl].actual += pred.currentAdmissions;
      teamGroups[tl].target += pred.target;
      teamGroups[tl].projected += pred.predictedAdmissions;
      teamGroups[tl].count++;
    });

    teamBox.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Team-Level Target Risk Forecasting Tracker</h3>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Team Lead</th>
              <th>Team Size</th>
              <th>Group Target</th>
              <th>Actual Admissions</th>
              <th>Projected Month-End</th>
              <th>Projected Gap</th>
              <th>Miss Probability</th>
              <th>Status Alert</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(teamGroups).map(tl => {
              const grp = teamGroups[tl];
              const gap = Math.max(0, grp.target - grp.projected);
              const missProb = Math.min(100, Math.max(0, (gap / grp.target) * 100));
              
              const statusPill = missProb > 40 ? "red" : missProb > 15 ? "yellow" : "green";
              const statusText = missProb > 40 ? "HIGH RISK" : missProb > 15 ? "WARNING" : "STABLE";
              
              return `
                <tr>
                  <td style="font-weight:700; color:var(--accent-info);">${toTitleCase(tl)}</td>
                  <td>${grp.count} agents</td>
                  <td>${grp.target}</td>
                  <td>${grp.actual}</td>
                  <td><strong>${grp.projected}</strong></td>
                  <td>${gap > 0 ? `<span style="color:var(--accent-critical); font-weight:700;">-${gap}</span>` : '<span style="color:var(--accent-safe); font-weight:700;">0</span>'}</td>
                  <td><strong>${missProb.toFixed(1)}%</strong></td>
                  <td><span class="status-pill ${statusPill}">${statusText}</span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRiskExplanation(c) {
    const panel = document.getElementById("risk-explanation-panel");
    if (!panel || !c) return;
    const risk = ae.calculateRiskScore(c);
    const pred = ae.predictTargetAchievement(c);
    const leadQuality = ae.calculateLeadQuality(c);
    const fair = ae.calculateFairScore(c, leadQuality);
    const contributors = risk.contributors.length
      ? risk.contributors.map(item => `<div class="diagnostic-card ${item.impact === "High" ? "critical" : "warning"}"><strong>${escapeHTML(item.factor)}</strong><br>${escapeHTML(item.description)}</div>`).join("")
      : '<div class="diagnostic-card safe"><strong>No major risk contributors</strong><br>Current velocity and fair score are within expected range.</div>';
    panel.innerHTML = `
      <div><strong style="color:var(--text-primary);">${escapeHTML(displayName(c))}</strong> ${privacyMode ? "" : `<span style="color:var(--text-muted);">${escapeHTML(maskedEmail(c.email))}</span>`}</div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
        <div class="profile-stat-box"><div class="profile-stat-label">FPI</div><div class="profile-stat-val">${fair.fpi}</div></div>
        <div class="profile-stat-box"><div class="profile-stat-label">Miss Prob</div><div class="profile-stat-val">${pred.missProbability}%</div></div>
        <div class="profile-stat-box"><div class="profile-stat-label">Gap</div><div class="profile-stat-val">${pred.gap}</div></div>
        <div class="profile-stat-box"><div class="profile-stat-label">Projected</div><div class="profile-stat-val">${pred.predictedAdmissions}/${pred.target}</div></div>
      </div>
      ${contributors}
    `;
  }

  window.explainRisk = (email) => {
    const c = dp.getCounsellorBreakdown().find(item => item.email === email);
    renderRiskExplanation(c);
    activeCounsellorEmail = email;
  };

  function populateSimulatorOptions(breakdown) {
    const select = document.getElementById("sim-counsellor-select");
    if (!select) return;
    const previous = select.value;
    select.innerHTML = breakdown.map(c => `<option value="${escapeHTML(c.email)}">${escapeHTML(displayName(c))}</option>`).join("");
    if (breakdown.some(c => c.email === previous)) select.value = previous;
  }

  function renderWhatIfSimulator() {
    const result = document.getElementById("simulator-result");
    const select = document.getElementById("sim-counsellor-select");
    if (!result || !select) return;
    const c = dp.getCounsellorBreakdown().find(item => item.email === select.value);
    if (!c) {
      result.textContent = "Choose a counsellor to simulate improvements.";
      return;
    }
    const dialsLift = parseFloat(document.getElementById("sim-dials-lift")?.value || 0);
    const connectLift = parseFloat(document.getElementById("sim-connect-lift")?.value || 0);
    const improved = {
      ...c,
      totalDials: Math.round(c.totalDials * (1 + dialsLift / 100)),
      totalConnected: Math.round(c.totalConnected * (1 + connectLift / 100))
    };
    const base = ae.predictTargetAchievement(c);
    const currentRate = c.totalConnected > 0 ? c.totalAdmissions / c.totalConnected : 0;
    improved.totalAdmissions = Math.round(improved.totalConnected * currentRate);
    improved.conversionPercentage = improved.totalConnected > 0 ? parseFloat(((improved.totalAdmissions / improved.totalConnected) * 100).toFixed(2)) : 0;
    const after = ae.predictTargetAchievement(improved);
    result.innerHTML = `
      <strong>${escapeHTML(displayName(c))}</strong><br>
      Dials +${dialsLift}% and connects +${connectLift}% could move projected admissions from
      <strong>${base.predictedAdmissions}</strong> to <strong>${after.predictedAdmissions}</strong>,
      changing the target gap from <strong>${base.gap}</strong> to <strong>${after.gap}</strong>.
    `;
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

    // Structural Lead Disparities & Overload Warning Monitor (Module 6)
    const tlGroups = {};
    breakdown.forEach(c => {
      const tl = c.teamLead || "N/A";
      const leadStats = ae.calculateLeadQuality(c);
      if (!tlGroups[tl]) {
        tlGroups[tl] = { scores: [], count: 0, hot: 0, warm: 0, cold: 0, totalLeads: 0 };
      }
      tlGroups[tl].scores.push(leadStats.score);
      tlGroups[tl].hot += leadStats.hotLeads;
      tlGroups[tl].warm += leadStats.warmLeads;
      tlGroups[tl].cold += leadStats.coldLeads;
      tlGroups[tl].totalLeads += c.totalConnected;
    });

    const tls = Object.keys(tlGroups);
    const tlAverages = tls.map(tl => {
      const group = tlGroups[tl];
      const avg = group.scores.length > 0 ? (group.scores.reduce((a, b) => a + b, 0) / group.scores.length) : 0;
      return { tl, avg, ...group };
    });

    const orgAvgLqs = tlAverages.length > 0 ? (tlAverages.reduce((s, t) => s + t.avg, 0) / tlAverages.length) : 0;

    const disparityBody = document.getElementById("lead-disparity-table-body");
    if (disparityBody) {
      disparityBody.innerHTML = "";
      tlAverages.forEach(item => {
        const deviation = item.avg - orgAvgLqs;
        const isOverloaded = item.avg < orgAvgLqs * 0.90;
        
        const badgeClass = isOverloaded ? "red" : "green";
        const badgeText = isOverloaded ? "OVERLOADED (Low Quality Mix)" : "BALANCED (Standard Mix)";
        const devPrefix = deviation > 0 ? "+" : "";

        disparityBody.innerHTML += `
          <tr>
            <td style="font-weight:700; color:var(--accent-info);">${toTitleCase(item.tl)}</td>
            <td>${item.totalLeads} calls connected</td>
            <td><strong>${item.avg.toFixed(1)}</strong> (Org Avg: ${orgAvgLqs.toFixed(1)})</td>
            <td>
              <span style="color:var(--accent-critical); font-weight:600;">Hot: ${item.hot}</span> | 
              <span style="color:var(--accent-warning); font-weight:600;">Warm: ${item.warm}</span> | 
              <span style="color:var(--text-secondary);">Cold: ${item.cold}</span>
            </td>
            <td style="color:${deviation >= 0 ? 'var(--accent-safe)' : 'var(--accent-critical)'}; font-weight:700;">
              ${devPrefix}${deviation.toFixed(1)}
            </td>
            <td><span class="status-pill ${badgeClass}">${badgeText}</span></td>
          </tr>
        `;
      });
    }
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
    renderCoachingTaskBoard(recs);
    renderDataQualityPanel();

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

  // 10. Team Performance Trends View
  function renderTeamTrendsView() {
    const breakdown = dp.getCounsellorBreakdown();
    const groupBy = document.getElementById("trend-group-by").value;
    const metric = document.getElementById("trend-metric").value;
    const period = document.getElementById("trend-period").value;

    // Group data by time period first, then by team dimension
    // We need to access the raw daily records to get date information
    const timePeriodGroups = {};

    breakdown.forEach(counsellor => {
      // Process each daily record for this counsellor to get dates
      if (counsellor.rawRecords && counsellor.rawRecords.length > 0) {
        counsellor.rawRecords.forEach(record => {
          // Determine time period key based on selection
          let periodKey = "Unknown";
          if (record.date) {
            const date = new Date(record.date);
            if (period === "weekly") {
              // Format as Year-WWeek (e.g., 2026-W25)
              const year = date.getFullYear();
              // Get week number (simple approach: week of year)
              const jan1 = new Date(year, 0, 1);
              const daysPassed = Math.floor((date - jan1) / (24 * 60 * 60 * 1000));
              const weekNumber = Math.ceil((daysPassed + 1) / 7);
              periodKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
            } else if (period === "monthly") {
              // Format as Year-MM (e.g., 2026-06)
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              periodKey = `${year}-${month}`;
            } else {
              // Default to monthly if unknown period
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              periodKey = `${year}-${month}`;
            }
          } else {
            periodKey = "No Date";
          }

          // Determine team dimension key from the counsellor's metadata
          let teamKey = "Unknown";
          if (groupBy === "lead") {
            teamKey = counsellor.teamLead || "No Team Lead";
          } else if (groupBy === "manager") {
            teamKey = counsellor.manager || "No Manager";
          } else if (groupBy === "campaign") {
            teamKey = counsellor.campaign || "No Campaign";
          } else if (groupBy === "band") {
            teamKey = counsellor.band || "No Band";
          }

          // Create composite key: period-team
          const compositeKey = `${periodKey}|${teamKey}`;

          if (!timePeriodGroups[compositeKey]) {
            timePeriodGroups[compositeKey] = {
              period: periodKey,
              team: teamKey,
              records: []
            };
          }

          timePeriodGroups[compositeKey].records.push(record);
        });
      }
    });

    // Calculate metrics for each time period + team combination
    const periodTeamData = {};

    Object.keys(timePeriodGroups).forEach(key => {
      const group = timePeriodGroups[key];
      const records = group.records;

      // Calculate totals for the group
      let totalAdmissions = 0;
      let totalConnected = 0;
      let totalDials = 0;
      let totalRiskScore = 0;
      let count = records.length;

      records.forEach(record => {
        totalAdmissions += record.totalAdmissions || 0;
        totalConnected += record.totalConnected || 0;
        totalDials += record.totalDials || 0;

        // Calculate risk score for each record
        const risk = ae.calculateRiskScore(record);
        totalRiskScore += risk.score;
      });

      let metricValue = 0;
      switch (metric) {
        case "admissions":
          metricValue = totalAdmissions / count;
          break;
        case "conversion":
          metricValue = totalConnected > 0 ? (totalAdmissions / totalConnected) * 100 : 0;
          break;
        case "dials":
          metricValue = totalDials / count;
          break;
        case "risk":
          metricValue = totalRiskScore / count;
          break;
      }

      // Store data by period and team
      if (!periodTeamData[group.period]) {
        periodTeamData[group.period] = {};
      }
      periodTeamData[group.period][group.team] = {
        value: metricValue,
        count: count
      };
    });

    // Get sorted periods (chronological order)
    const sortedPeriods = Object.keys(periodTeamData).sort();

    // Get all unique teams across all periods
    const allTeams = new Set();
    Object.values(periodTeamData).forEach(periodData => {
      Object.keys(periodData).forEach(team => allTeams.add(team));
    });
    const sortedTeams = Array.from(allTeams).sort();

    // Prepare data for line chart - one line per team
    const chartData = {
      labels: sortedPeriods,
      datasets: []
    };

    // Generate a dataset for each team
    sortedTeams.forEach((team, index) => {
      const dataPoints = sortedPeriods.map(period => {
        // Return 0 if no data for this team in this period
        return periodTeamData[period] && periodTeamData[period][team]
          ? parseFloat(periodTeamData[period][team].value.toFixed(1))
          : 0;
      });

      chartData.datasets.push({
        label: team,
        data: dataPoints,
        borderColor: getChartColor(index),
        backgroundColor: getChartColor(index, 0.2),
        fill: false,
        tension: 0.3,
        borderWidth: 2
      });
    });

    // Update table - show summary for each team across all periods
    const tableBody = document.getElementById("team-trends-table-body");
    tableBody.innerHTML = "";

    // Calculate overall averages for each team across all periods
    const teamSummary = {};
    sortedTeams.forEach(team => {
      let totalValue = 0;
      let periodCount = 0;

      sortedPeriods.forEach(period => {
        if (periodTeamData[period] && periodTeamData[period][team]) {
          totalValue += parseFloat(periodTeamData[period][team].value.toFixed(1));
          periodCount++;
        }
      });

      teamSummary[team] = {
        avgValue: periodCount > 0 ? parseFloat((totalValue / periodCount).toFixed(1)) : 0,
        periodCount: periodCount
      };
    });

    // Sort teams by average value (descending)
    const sortedTeamsByValue = Object.entries(teamSummary)
      .sort(([,a], [,b]) => b.avgValue - a.avgValue)
      .map(([team, data]) => ({ team, ...data }));

    // Populate table
    sortedTeamsByValue.forEach((teamData, index) => {
      const { team, avgValue, periodCount } = teamData;

      // Determine status based on value (simplified)
      let status = "average";
      let statusClass = "secondary";

      if (metric === "admissions" || metric === "dials") {
        // Higher is better for admissions and dials
        if (avgValue > 50) {
          status = "high";
          statusClass = "safe";
        } else if (avgValue < 20) {
          status = "low";
          statusClass = "critical";
        }
      } else if (metric === "conversion") {
        // Higher is better for conversion
        if (avgValue > 15) {
          status = "high";
          statusClass = "safe";
        } else if (avgValue < 5) {
          status = "low";
          statusClass = "critical";
        }
      } else if (metric === "risk") {
        // Lower is better for risk
        if (avgValue < 20) {
          status = "low";
          statusClass = "safe";
        } else if (avgValue > 40) {
          status = "high";
          statusClass = "critical";
        }
      }

      tableBody.innerHTML += `
        <tr>
          <td style="font-weight:700; color:var(--accent-info);">${team}</td>
          <td>${avgValue}</td>
          <td><span class="status-pill">${periodCount} periods</span></td>
          <td>-</td>
          <td>-</td>
          <td><span class="status-pill ${statusClass}">${status}</span></td>
        </tr>
      `;
    });

    // Create line chart for trends
    const ctx = document.getElementById("team-trends-chart").getContext("2d");
    if (window.teamTrendsChart) {
      window.teamTrendsChart.destroy();
    }

    window.teamTrendsChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Team ${getMetricLabel(metric)} Trends by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} (${period === 'weekly' ? 'Weekly' : 'Monthly'})`
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: getMetricLabel(metric)
            }
          },
          x: {
            title: {
              display: true,
              text: period === 'weekly' ? 'Week' : 'Month'
            }
          }
        }
      }
    });
  }

  function getChartColor(index, opacity = 1) {
    const colors = [
      'rgba(255, 99, 132',
      'rgba(54, 162, 235',
      'rgba(255, 205, 86',
      'rgba(75, 192, 192',
      'rgba(153, 102, 255',
      'rgba(255, 159, 64',
      'rgba(199, 199, 199',
      'rgba(83, 102, 255',
      'rgba(40, 200, 120',
      'rgba(210, 105, 30'
    ];
    const color = colors[index % colors.length];
    return opacity === 1 ? color + ')' : color + ',' + opacity + ')';
  }

  function getMetricLabel(metric) {
    switch (metric) {
      case "admissions": return "Average Admissions";
      case "conversion": return "Conversion Rate (%)";
      case "dials": return "Average Daily Dials";
      case "risk": return "Average Risk Score";
      default: return metric;
    }
  }

  function getStoredTasks() {
    try {
      return JSON.parse(localStorage.getItem("ai_counsellor_tasks") || "[]");
    } catch (err) {
      return [];
    }
  }

  function saveStoredTasks(tasks) {
    localStorage.setItem("ai_counsellor_tasks", JSON.stringify(tasks));
  }

  function renderCoachingTaskBoard(recs) {
    const board = document.getElementById("coaching-task-board");
    if (!board) return;
    const existing = getStoredTasks();
    const generated = recs.slice(0, 6).map(rec => {
      const id = `${rec.counsellorEmail}|${rec.actionText}`;
      return existing.find(t => t.id === id) || {
        id,
        counsellorEmail: rec.counsellorEmail,
        title: rec.actionText,
        owner: rec.counsellorName,
        priority: rec.priority,
        status: "Pending"
      };
    });
    saveStoredTasks(generated);
    if (generated.length === 0) {
      board.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">No active coaching tasks.</div>';
      return;
    }
    board.innerHTML = generated.map(task => `
      <div class="diagnostic-card ${task.priority === "High" ? "critical" : task.priority === "Medium" ? "warning" : "safe"}" style="display:grid; gap:6px;">
        <div><strong>${escapeHTML(task.title)}</strong><br><span style="color:var(--text-muted);">${escapeHTML(privacyMode ? maskedEmail(task.counsellorEmail) : task.owner)}</span></div>
        <select class="filter-select task-status-select" data-task-id="${escapeHTML(task.id)}" style="width:100%; margin:0;">
          ${["Pending", "In Progress", "Done"].map(status => `<option value="${status}" ${task.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </div>
    `).join("");
    document.querySelectorAll(".task-status-select").forEach(select => {
      select.addEventListener("change", () => {
        const tasks = getStoredTasks().map(task => task.id === select.dataset.taskId ? { ...task, status: select.value } : task);
        saveStoredTasks(tasks);
      });
    });
  }

  function renderDataQualityPanel() {
    const panel = document.getElementById("data-quality-panel");
    if (!panel) return;
    const audit = dp.auditDataset();
    const statusClass = audit.score >= 90 ? "safe" : audit.score >= 70 ? "warning" : "critical";
    panel.innerHTML = `
      <div class="status-pill ${statusClass}" style="justify-content:center;">Upload Health ${audit.score}/100</div>
      <div style="font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">
        Rows: <strong>${audit.totalRows.toLocaleString()}</strong><br>
        Missing columns: <strong>${audit.missingColumns.length ? escapeHTML(audit.missingColumns.join(", ")) : "None"}</strong><br>
        Blank emails: <strong>${audit.blankEmails}</strong> | Invalid dates: <strong>${audit.invalidDates}</strong><br>
        Duplicates: <strong>${audit.duplicateRows}</strong> | Abnormal rows: <strong>${audit.abnormalRows}</strong>
      </div>
    `;
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

  // --- DRAWER GLOBAL HOOKS & CONTROLLERS ---
  let drawerChartType = "daily";
  let activeDrawerEmail = "";

  function openProfileDrawer(email) {
    activeDrawerEmail = email;
    const breakdown = dp.getCounsellorBreakdown();
    const c = breakdown.find(item => item.email === email);
    if (!c) return;

    document.getElementById("drawer-name").textContent = c.name;
    document.getElementById("drawer-email").textContent = c.email;
    document.getElementById("drawer-avatar").textContent = c.name.charAt(0);
    
    const risk = ae.calculateRiskScore(c);
    const riskPill = document.getElementById("drawer-risk-pill");
    riskPill.textContent = `${risk.category} Risk`;
    riskPill.className = `status-pill ${risk.category === "Red" ? "red" : risk.category === "Yellow" ? "yellow" : "green"}`;
    
    const bandPill = document.getElementById("drawer-band-pill");
    bandPill.textContent = `${c.band} | ${c.campaign}`;

    const predictor = ae.predictTargetAchievement(c);
    document.getElementById("drawer-risk-val").textContent = risk.score;
    ce.renderRiskGauge("drawer-risk-gauge", risk.score);
    
    const targetVerdict = document.getElementById("drawer-predictor-verdict");
    if (predictor.predictedAdmissions >= predictor.target) {
      targetVerdict.innerHTML = `Projected to hit target! Predicted: <strong>${predictor.predictedAdmissions}</strong> / Target: ${predictor.target}`;
      targetVerdict.style.color = "var(--accent-safe)";
    } else {
      targetVerdict.innerHTML = `Likely to miss. Projected: <strong>${predictor.predictedAdmissions}</strong> (Gap: ${predictor.gap}) | Miss: <strong>${predictor.missProbability}%</strong>`;
      targetVerdict.style.color = "var(--accent-critical)";
    }

    document.getElementById("drawer-stat-progress").textContent = `${c.totalAdmissions} / ${c.target}`;
    document.getElementById("drawer-stat-progress-sub").textContent = `${c.targetAchievement}% Achieved`;
    
    document.getElementById("drawer-stat-conversion").textContent = `${c.conversionPercentage}%`;
    document.getElementById("drawer-stat-conversion-sub").textContent = `${c.totalAdmissions} of ${c.totalConnected} connects`;

    document.getElementById("drawer-stat-attendance").textContent = `${c.attendance.rate}%`;
    document.getElementById("drawer-stat-attendance-sub").textContent = `Present: ${c.attendance.present} | Absent: ${c.attendance.absent}`;

    const diagnostics = ae.diagnosePerformance(c);
    document.getElementById("drawer-ai-summary").textContent = generateAISummaryText(c, risk, diagnostics, predictor);

    const normalizedInd = normalizeCounsellorDimensions(c);
    const normalizedTeamAvg = getTeamAverageNormalizedDimensions(breakdown);
    ce.renderCounsellorRadar("drawer-radar-chart", c.name, normalizedInd, normalizedTeamAvg);

    const diagList = document.getElementById("drawer-diagnostics-list");
    diagList.innerHTML = "";
    diagnostics.forEach(diag => {
      const isSafe = diag.severity === "Safe";
      const isCritical = diag.severity === "Critical";
      const pillClass = isSafe ? "safe" : isCritical ? "critical" : "warning";
      const flag = isSafe ? "✓" : isCritical ? "🛑" : "⚠️";

      diagList.innerHTML += `
        <div class="diagnostic-card ${pillClass}" style="margin-bottom:8px; padding: 10px; border-radius: 6px; font-size: 0.75rem;">
          <div class="diagnostic-indicator" style="margin-right: 8px;">${flag}</div>
          <div class="diagnostic-info">
            <div class="diagnostic-title" style="font-weight:700;">${diag.type} (${diag.severity})</div>
            <div class="diagnostic-desc" style="margin-top: 2px; color: var(--text-secondary);">${diag.explanation}</div>
            <div style="font-size:0.7rem; font-weight:600; color:var(--text-primary); margin-top:4px;">Action: ${diag.action}</div>
          </div>
        </div>
      `;
    });

    const warnEl = document.getElementById("drawer-hourly-simulated-warning");
    if (warnEl) {
      warnEl.style.display = drawerChartType === "hourly" ? "block" : "none";
    }
    renderDrawerTrendChart();
    document.getElementById("profile-drawer").classList.add("open");
  }

  function renderDrawerTrendChart() {
    const breakdown = dp.getCounsellorBreakdown();
    const c = breakdown.find(item => item.email === activeDrawerEmail);
    if (!c) return;

    if (drawerChartType === "daily") {
      const indDailyTrend = getCounsellorDailyTrend(c);
      ce.renderCallActivityTrend("drawer-trend-chart", indDailyTrend);
    } else {
      const latestDate = c.rawRecords.length > 0 ? c.rawRecords[c.rawRecords.length - 1]["Date"] : "2026-06-17";
      const hourlyData = dp.getHourByHourData(c.email, latestDate);
      const hourlyFormatted = hourlyData.hours.map((h, idx) => ({
        date: h,
        dialled: hourlyData.dials[idx],
        connected: hourlyData.connected[idx],
        effective: hourlyData.effective[idx]
      }));
      ce.renderCallActivityTrend("drawer-trend-chart", hourlyFormatted);
    }
  }

  // Bind routeToProfile to drawer helper for contextual rendering
  window.routeToProfile = (email) => {
    openProfileDrawer(email);
  };

  // Initialize app
  init();
});
