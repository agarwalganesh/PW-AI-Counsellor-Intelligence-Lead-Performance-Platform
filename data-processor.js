// Data Processor Module for AI Counsellor Intelligence & Performance Optimization Platform

// 1. ABSOLUTE STATE ISOLATION (No Mutation)
// Declare isolated state variables globally to store raw and filtered datasets
let masterData = [];
let filteredData = [];

// Access global scope safely in both browser and Node.js environments
const globalScope = (typeof globalThis !== "undefined") ? globalThis : ((typeof window !== "undefined") ? window : global);
globalScope.masterData = masterData;
globalScope.filteredData = filteredData;

class DataProcessor {
  constructor() {
    this._rawDataset = [];
    this._filteredDataset = [];
    this.counsellorsList = []; // Unique list of counsellors with their meta-data
    this.currentWorkbook = null; // Store SheetJS workbook in memory
    this.filters = {
      startDate: "",
      endDate: "",
      counsellorEmail: "all",
      teamLead: "all",
      manager: "all",
      campaign: "all",
      band: "all",
      status: "all",
      month: "all",      // Month filter dropdown selection
      daysLimit: "all"   // Days filter dropdown selection
    };
    this.sortDescriptors = []; // Multi-column sorting state
    this.COURSE_PRICE = 25000; // Average price of course in INR
    this.DIAL_COST = 0.50; // Cost per dialled call in INR
    this.SALARY_DAILY = 1200; // Cost per active day per agent in INR
    this.loadStateFromLocalStorage();
  }

  // Getters/Setters to bind rawDataset and filteredDataset to the global isolated stores
  get rawDataset() {
    return masterData;
  }

  set rawDataset(data) {
    masterData = data;
    const scope = (typeof globalThis !== "undefined") ? globalThis : ((typeof window !== "undefined") ? window : global);
    scope.masterData = data;
  }

  get filteredDataset() {
    return filteredData;
  }

  set filteredDataset(data) {
    filteredData = data;
    const scope = (typeof globalThis !== "undefined") ? globalThis : ((typeof window !== "undefined") ? window : global);
    scope.filteredData = data;
  }

  // Load dataset into memory (replaces existing data)
  loadDataset(data) {
    // Standardize mapping & enforce absolute state isolation
    const cleaned = data
      .map(row => this.cleanRow(row))
      // Only require Counselor Email — rows without a Date are kept
      .filter(row => row && row["Counselor Email"]);
    
    // Assign copy to global raw dataset
    this.rawDataset = JSON.parse(JSON.stringify(cleaned));

    // ✅ FIX: Reset ALL filters after new data upload
    // Stale filters (manager/TL/campaign) from previous localStorage sessions
    // cause rows to be silently hidden if the new file has different values.
    this.filters.startDate = "";
    this.filters.endDate = "";
    this.filters.month = "all";
    this.filters.daysLimit = "all";
    this.filters.teamLead = "all";
    this.filters.manager = "all";
    this.filters.campaign = "all";
    this.filters.band = "all";
    this.filters.status = "all";
    this.filters.counsellorEmail = "all";

    // ✅ FIX: Clear stale portal state from localStorage so finishInit
    // doesn't re-apply old manager/TL filters from a previous session
    try {
      localStorage.removeItem("ai_counsellor_portal_state");
    } catch(err) { /* ignore */ }
    
    this.updateMetadata();
    this.applyDashboardFilters();
  }

  // Append/merge new data into existing dataset (for multi-file loading)
  appendDataset(data) {
    const cleaned = data
      .map(row => this.cleanRow(row))
      .filter(row => row && row["Counselor Email"]);

    if (cleaned.length === 0) return 0;

    // Merge: deduplicate by counselor email + date combination
    const existingKeys = new Set(
      this.rawDataset.map(r => `${r["Counselor Email"]}|${r["Date"]}`)
    );

    let addedCount = 0;
    const newRows = [];
    cleaned.forEach(row => {
      const key = `${row["Counselor Email"]}|${row["Date"]}`;
      // For rows without a Date, always include (they won't collide)
      if (!row["Date"] || !existingKeys.has(key)) {
        newRows.push(row);
        if (row["Date"]) existingKeys.add(key);
        addedCount++;
      }
    });

    // Merge into existing raw dataset
    this.rawDataset = JSON.parse(JSON.stringify([...this.rawDataset, ...newRows]));
    
    this.updateMetadata();
    this.applyDashboardFilters();
    return addedCount;
  }

  // Parse multiple Excel files and merge them all into one dataset
  // files: array of File objects, callback(err, { totalRows, fileResults })
  parseMultipleFiles(files, callback) {
    const fileArray = Array.from(files);
    let allRows = [];
    const fileResults = [];
    let processedCount = 0;

    const processNext = (index) => {
      if (index >= fileArray.length) {
        // All files parsed — load merged dataset
        this.loadDataset(allRows);
        try {
          localStorage.setItem("ai_counsellor_dataset", JSON.stringify(this.rawDataset));
        } catch(err) {
          console.warn("Could not save to LocalStorage (data size limit exceeded).", err);
        }
        callback(null, { totalRows: this.rawDataset.length, fileResults });
        return;
      }

      const file = fileArray[index];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          this.currentWorkbook = workbook; // keep last workbook for sheet selector

          let fileRows = [];
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            fileRows = fileRows.concat(json);
          });

          fileResults.push({ name: file.name, rows: fileRows.length, sheets: workbook.SheetNames.length });
          allRows = allRows.concat(fileRows);
        } catch(err) {
          fileResults.push({ name: file.name, rows: 0, error: err.message });
        }
        processNext(index + 1);
      };

      reader.onerror = () => {
        fileResults.push({ name: file.name, rows: 0, error: "File read error" });
        processNext(index + 1);
      };

      reader.readAsArrayBuffer(file);
    };

    processNext(0);
  }

  // Append multiple Excel files to existing dataset
  // files: array of File objects, callback(err, { addedRows, fileResults })
  appendMultipleFiles(files, callback) {
    const fileArray = Array.from(files);
    let allNewRows = [];
    const fileResults = [];

    const processNext = (index) => {
      if (index >= fileArray.length) {
        // All parsed — append merged rows
        const addedRows = this.appendDataset(allNewRows);
        try {
          localStorage.setItem("ai_counsellor_dataset", JSON.stringify(this.rawDataset));
        } catch(err) {
          console.warn("Could not save to LocalStorage (data size limit exceeded).", err);
        }
        callback(null, { addedRows, totalRows: this.rawDataset.length, fileResults });
        return;
      }

      const file = fileArray[index];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          let fileRows = [];
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            fileRows = fileRows.concat(json);
          });
          fileResults.push({ name: file.name, rows: fileRows.length });
          allNewRows = allNewRows.concat(fileRows);
        } catch(err) {
          fileResults.push({ name: file.name, rows: 0, error: err.message });
        }
        processNext(index + 1);
      };

      reader.onerror = () => {
        fileResults.push({ name: file.name, rows: 0, error: "File read error" });
        processNext(index + 1);
      };

      reader.readAsArrayBuffer(file);
    };

    processNext(0);
  }

  normalizeNumber(value) {
    if (value === null || value === undefined || value === "") return NaN;
    if (typeof value === "number") return value;
    const text = String(value).trim().replace(/,/g, "").replace(/\s+/g, "");
    if (text.endsWith("%")) {
      return parseFloat(text.slice(0, -1));
    }
    return parseFloat(text);
  }

  parseIntegerField(value, fallback = 0) {
    const parsed = Math.trunc(this.normalizeNumber(value));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  parseFloatField(value, fallback = 0.0) {
    const parsed = this.normalizeNumber(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  // Helper to convert Excel date formats safely
  parseExcelDate(excelDate) {
    if (!excelDate) return "";
    if (excelDate instanceof Date) {
      return excelDate.toISOString().split("T")[0];
    }
    if (typeof excelDate === "number") {
      // Excel serial date number
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }
    // String matching
    const strDate = String(excelDate).trim();
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(strDate)) return strDate;
    // Try DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = strDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // Fallback Javascript parse
    const parsed = new Date(strDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return strDate;
  }

  // 2. SYSTEM VALUE MAPPING (Excel Key Safety) & Case Normalization
  cleanRow(row) {
    const result = {};

    // Helper to get raw cell values safely
    const getStringVal = (key, fallback = "") => {
      const actualKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
      if (actualKey === undefined) return fallback;
      const val = row[actualKey];
      if (val === undefined || val === null) return fallback;
      return String(val).trim();
    };

    // Date columns — FIX: Added more column name variants (Reporting Date, Report Date, Day, Working Date)
    result["Date"] = this.parseExcelDate(
      row["Date"] || row["date"] || row["DATE"] ||
      row["Reporting Date"] || row["Report Date"] ||
      row["Day"] || row["Working Date"] || row["Dated"]
    );
    result["Joining date"] = this.parseExcelDate(row["Joining date"] || row["Joining Date"] || row["joining_date"] || row["DOJ"] || row["Date of Joining"]);

    // Case Normalization: Lowercase counselor email, TL, and manager to resolve case-sensitivity errors
    // FIX: Added 'Counsellor Email' (double-l British spelling) and more variants
    result["Counselor Email"] = 
      getStringVal("Counselor Email").toLowerCase() ||
      getStringVal("Counsellor Email").toLowerCase() ||
      getStringVal("counselor_email").toLowerCase() ||
      getStringVal("counsellor_email").toLowerCase() ||
      getStringVal("Email").toLowerCase() ||
      getStringVal("email").toLowerCase() ||
      getStringVal("Emp Email").toLowerCase() ||
      getStringVal("Employee Email").toLowerCase() ||
      getStringVal("Mail ID").toLowerCase() ||
      getStringVal("mail_id").toLowerCase();

    // FIX: Auto-detect email — scan ALL columns for any value containing '@'
    // This is the ultimate fallback if column name doesn't match any known variant
    if (!result["Counselor Email"]) {
      for (const key of Object.keys(row)) {
        const v = String(row[key] || "").trim();
        if (v.includes("@") && v.includes(".") && v.length > 5) {
          result["Counselor Email"] = v.toLowerCase();
          break;
        }
      }
    }

    result["Team Lead"] = getStringVal("Team Lead").toLowerCase() || getStringVal("team_lead").toLowerCase() || getStringVal("TL").toLowerCase() || getStringVal("TL Name").toLowerCase() || "n/a";
    result["Manager"] = getStringVal("Manager").toLowerCase() || getStringVal("manager").toLowerCase() || "n/a";
    
    result["Campaign"] = getStringVal("Campaign") || getStringVal("campaign") || "N/A";
    result["Band"] = getStringVal("Band") || getStringVal("band") || "Band B";
    result["Status"] = getStringVal("Status") || getStringVal("status") || "Active";
    result["Attendance"] = getStringVal("Attendance") || getStringVal("attendance") || "Present";

    // Explicit Typecasting to prevent calculation failures as per Guideline 2
    result["Dialled Calls"] = this.parseIntegerField(row["Dialled Calls"] || row["dialled_calls"] || row["Dialled calls"]);
    
    const connVal = this.parseIntegerField(row["Connected Calls"] || row["Connected calls"] || row["connected_calls"] || row["Connected Calls "]);
    result["Connected Calls"] = connVal;
    result["Connected calls"] = connVal; // support both casing variants

    const effVal = this.parseIntegerField(row["Effective Calls"] || row["Effective calls"] || row["effective_calls"] || row["Effective Calls "]);
    result["Effective Calls"] = effVal;
    result["Effective calls"] = effVal; // support both casing variants

    result["Target"] = this.parseIntegerField(row["Target"] || row["target"] || row["Row Target"] || row["Daily Target"] || 30);

    const admVal = this.parseIntegerField(row["Total Admissions"] || row["Total admissions"] || row["total_admissions"] || row["Total Adm"] || row["Admissions"]);
    result["Total Admissions"] = admVal;
    result["Total admissions"] = admVal; // support both casing variants
    result["Total Adm"] = admVal;

    const sharedVal = this.parseIntegerField(row["Shared Admissions"] || row["Shared admissions"] || row["shared_admissions"] || row["Shared Admission"]);
    result["Shared Admissions"] = sharedVal;
    result["Shared admissions"] = sharedVal; // support both casing variants

    result["Shared admissions Form Filled"] = this.parseIntegerField(row["Shared admissions Form Filled"] || row["Shared Admissions Form Filled"] || row["Shared adm Form Filled"]);
    result["Additional Adm"] = this.parseIntegerField(row["Additional Adm"] || row["Additional Admissions"] || row["Additional Admissions "]);
    result["Penalty"] = this.parseIntegerField(row["Penalty"] || row["penalty"]);
    result["Total Adm(form Filled)"] = this.parseIntegerField(row["Total Adm(form Filled)"] || row["Total Admissions Form Filled"] || row["Total Adm Form Filled"]);
    result["EMI Paid"] = this.parseIntegerField(row["EMI Paid"] || row["EMI paid"] || row["EMI"]);
    
    const spotVal = this.parseIntegerField(row["Full Payment On Spot"] || row["Full Payment On spot"] || row["full_payment_on_spot"] || row["Spot Payment"]);
    result["Full Payment On Spot"] = spotVal;
    result["Full Payment On spot"] = spotVal; // support both casings

    result["Auto Dial"] = this.parseIntegerField(row["Auto Dial"] || row["Auto dial"] || row["auto_dial"]);
    result["Manual Dial"] = this.parseIntegerField(row["Manual Dial"] || row["Manual dial"] || row["manual_dial"]);
    result["AI"] = this.parseIntegerField(row["AI"] || row["ai"] || row["Artificial Intelligence"]);
    result["FY 27"] = this.parseIntegerField(row["FY 27"] || row["FY27"] || row["FY_27"]);
    result["FY 26"] = this.parseIntegerField(row["FY 26"] || row["FY26"] || row["FY_26"]);
    result["CJR"] = this.parseIntegerField(row["CJR"] || row["cjr"] || row["CJR "]);
    
    result["Counsellor discount"] = this.parseIntegerField(row["Counsellor discount"] || row["Counsellor Discount"] || row["Counsellor_Discount"]);
    result["Counsellor discount-FY 27"] = this.parseIntegerField(row["Counsellor discount-FY 27"] || row["Counsellor discount FY 27"] || row["Counsellor discount-FY27"]);
    result["Manager discount"] = this.parseIntegerField(row["Manager discount"] || row["Manager Discount"] || row["Manager_Discount"]);
    result["Other Discount"] = this.parseIntegerField(row["Other Discount"] || row["Other discount"] || row["Other_Discount"]);
    result["No. of days"] = this.parseIntegerField(row["No. of days"] || row["Number of days"] || row["No. of Days"] || row["Days Count"]);
    result["VP Retention"] = this.parseIntegerField(row["VP Retention"] || row["VP Retention "] || row["VP_Retention"]);
    result["CC/FT/Board"] = this.parseIntegerField(row["CC/FT/Board"] || row["CC/FT/Board "] || row["Board Count"]);

    // Float Columns — Talktime: try all known column name variants
    const talktimeHoursRaw =
      row["Talktime (In hours)"] ??
      row["Talktime (in hours)"] ??
      row["Talktime(hours)"] ??
      row["Talktime (Hours)"] ??
      row["talktime_hours"] ??
      row["Talk Time Hours"] ??
      null;

    if (talktimeHoursRaw !== undefined && talktimeHoursRaw !== null && talktimeHoursRaw !== "") {
      result["Talktime (In hours)"] = this.parseFloatField(talktimeHoursRaw, 0.0);
    } else {
      // Try seconds-based columns and convert to hours
      const talktimeSeconds =
        this.parseFloatField(row["Talktime"]) ||
        this.parseFloatField(row["Talk Time"]) ||
        this.parseFloatField(row["Talk time"]) ||
        this.parseFloatField(row["talktime"]) ||
        this.parseFloatField(row["TalkTime"]);
      result["Talktime (In hours)"] = talktimeSeconds > 0 ? parseFloat((talktimeSeconds / 3600).toFixed(4)) : 0.0;
    }

    const conversionPctRaw = row["Conversion %"] ?? row["Conversion"] ?? row["Conv %"] ?? row["Conversion Rate"];
    if (conversionPctRaw !== undefined && conversionPctRaw !== null && conversionPctRaw !== "") {
      const val = this.parseFloatField(conversionPctRaw, 0.0);
      // If Excel stores fraction (e.g. 0.0339 representing 3.39%)
      if (connVal > 0 && Math.abs(val - (admVal / connVal)) < 0.005) {
        result["Conversion %"] = parseFloat(((admVal / connVal) * 100).toFixed(2));
      } else {
        // If it's already in 100 scale (e.g., 3.39)
        result["Conversion %"] = parseFloat(val.toFixed(2));
      }
    } else {
      result["Conversion %"] = connVal > 0 ? parseFloat(((admVal / connVal) * 100).toFixed(2)) : 0.0;
    }

    return result;
  }

  // Get unique lists of metadata for drop-downs and profiles
  updateMetadata() {
    const emails = [...new Set(this.rawDataset.map(r => r["Counselor Email"]))].filter(Boolean);
    
    this.counsellorsList = emails.map(email => {
      const records = this.rawDataset.filter(r => r["Counselor Email"] === email);
      const latest = records[records.length - 1] || {};
      
      const targets = [...new Set(records.map(r => r["Target"]))];
      const target = targets.length > 0 ? targets[0] : 30;
      
      return {
        email: email,
        name: email.split("@")[0].split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
        teamLead: latest["Team Lead"] || "N/A",
        manager: latest["Manager"] || "N/A",
        campaign: latest["Campaign"] || "N/A",
        band: latest["Band"] || "Band B",
        status: latest["Status"] || "Active",
        joiningDate: latest["Joining date"] || "2025-01-01",
        target: target
      };
    });
  }

  // Read uploaded file using SheetJS
  parseExcelFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        this.currentWorkbook = workbook;
        
        const sheetNames = workbook.SheetNames;
        if (!sheetNames || sheetNames.length === 0) {
          callback(new Error("Uploaded file contains no sheets."));
          return;
        }

        if (sheetNames.length > 1) {
          callback(null, { isMultiSheet: true, sheetNames: sheetNames });
          return;
        }
        
        const worksheet = workbook.Sheets[sheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (json.length === 0) {
          callback(new Error("Uploaded sheet is empty."));
          return;
        }
        
        this.loadDataset(json);
        try {
          localStorage.setItem("ai_counsellor_dataset", JSON.stringify(this.rawDataset));
        } catch(err) {
          console.warn("Could not save to LocalStorage (data size limit exceeded).", err);
        }
        callback(null, { isMultiSheet: false, data: this.rawDataset });
      } catch(err) {
        callback(err);
      }
    };
    reader.onerror = () => {
      callback(new Error("File reading error."));
    };
    reader.readAsArrayBuffer(file);
  }

  // Load and merge multiple sheets from current workbook
  loadSheets(sheetNames, callback) {
    try {
      if (!this.currentWorkbook) {
        callback(new Error("No workbook loaded."));
        return;
      }
      
      let mergedJson = [];
      sheetNames.forEach(name => {
        const worksheet = this.currentWorkbook.Sheets[name];
        if (worksheet) {
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          mergedJson = mergedJson.concat(json);
        }
      });
      
      if (mergedJson.length === 0) {
        callback(new Error("Selected sheet(s) contain no data."));
        return;
      }
      
      this.loadDataset(mergedJson);
      try {
        localStorage.setItem("ai_counsellor_dataset", JSON.stringify(this.rawDataset));
      } catch(err) {
        console.warn("Could not save to LocalStorage (data size limit exceeded).", err);
      }
      
      callback(null, this.rawDataset);
    } catch (err) {
      callback(err);
    }
  }

  // Set filter value
  setFilter(filterKey, value) {
    this.filters[filterKey] = value;
    this.applyDashboardFilters();
    this.saveStateToLocalStorage();
  }

  // Backwards compatibility alias
  applyFilters() {
    this.applyDashboardFilters();
  }

  // 3. ROBUST FILTER PIPELINE MECHANISM
  applyDashboardFilters() {
    // ✅ FIX: Dynamic anchor date — always use TODAY, not a hardcoded date
    // Hardcoded date caused "Last 7 Days" / "Last 30 Days" filter to show 0 rows for non-June data
    let anchorDate = null;
    if (masterData && masterData.length > 0) {
      const dates = masterData.map(r => r["Date"]).filter(Boolean).sort();
      if (dates.length > 0) {
        anchorDate = new Date(dates[dates.length - 1] + "T00:00:00");
      }
    }
    if (!anchorDate || isNaN(anchorDate.getTime())) {
      const today = new Date();
      anchorDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    const scope = (typeof globalThis !== "undefined") ? globalThis : ((typeof window !== "undefined") ? window : global);

    // Filter masterData into a fresh filteredData array (no mutation of raw data)
    const filtered = masterData.filter(row => {
      // A. Counsellor Filter: Case-sensitive strict string match on Counselor Email
      if (this.filters.counsellorEmail && this.filters.counsellorEmail !== "all") {
        if (row["Counselor Email"] !== this.filters.counsellorEmail) {
          return false;
        }
      }
      
      // B. Team Lead Filter
      if (this.filters.teamLead && this.filters.teamLead !== "all") {
        if (row["Team Lead"] !== this.filters.teamLead.toLowerCase()) return false;
      }
      
      // C. Manager Filter
      if (this.filters.manager && this.filters.manager !== "all") {
        if (row["Manager"] !== this.filters.manager.toLowerCase()) return false;
      }
      
      // D. Campaign Filter
      if (this.filters.campaign && this.filters.campaign !== "all") {
        if (row["Campaign"] !== this.filters.campaign) return false;
      }
      
      // E. Band Filter
      if (this.filters.band && this.filters.band !== "all") {
        if (row["Band"] !== this.filters.band) return false;
      }
      
      // F. Status Filter
      if (this.filters.status && this.filters.status !== "all") {
        if (row["Status"] !== this.filters.status) return false;
      }

      // G. Days/Date Range Filter: Convert date string into Date object and compare using milliseconds
      if (row["Date"]) {
        const rowDate = new Date(row["Date"] + "T00:00:00");
        if (!isNaN(rowDate.getTime())) {
          // i. Month filter: Filter by specific Month (e.g. "04" for April)
          if (this.filters.month && this.filters.month !== "all") {
            const rowMonth = String(rowDate.getMonth() + 1).padStart(2, "0");
            if (rowMonth !== this.filters.month) {
              return false;
            }
          }

          // ii. Days filter: Filter by last 7, last 30 days compared to anchor date
          if (this.filters.daysLimit && this.filters.daysLimit !== "all") {
            const daysLimit = parseInt(this.filters.daysLimit, 10) || 0;
            const diffTime = anchorDate.getTime() - rowDate.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            // Must be within last N days (including today)
            if (diffDays < 0 || diffDays > daysLimit) {
              return false;
            }
          }

          // iii. Custom date range pickers
          if (this.filters.startDate) {
            const startLimit = new Date(this.filters.startDate + "T00:00:00");
            if (rowDate < startLimit) return false;
          }
          if (this.filters.endDate) {
            const endLimit = new Date(this.filters.endDate + "T00:00:00");
            if (rowDate > endLimit) return false;
          }
        }
      }
      
      return true;
    });

    // Enforce absolute state isolation (assign new array, do not mutate global array in-place)
    filteredData = filtered;
    scope.filteredData = filteredData;

    // Mirror to class instance property for backwards compatibility with exporter/analytics-engine
    this._filteredDataset = filteredData;
  }

  // Get active filters configuration
  getFiltersOptions() {
    const dates = this.rawDataset.map(r => r["Date"]).filter(Boolean).sort();
    const minDate = dates[0] || "";
    const maxDate = dates[dates.length - 1] || "";

    const monthsSet = new Set();
    dates.forEach(d => {
      const parts = d.split("-");
      if (parts.length >= 2) {
        monthsSet.add(parts[1]); // e.g. "06" for "2026-06-17"
      }
    });
    const monthsList = Array.from(monthsSet).sort();

    return {
      minDate,
      maxDate,
      monthsList,
      counsellors: this.counsellorsList,
      teamLeads: [...new Set(this.rawDataset.map(r => r["Team Lead"]))].filter(Boolean).sort(),
      managers: [...new Set(this.rawDataset.map(r => r["Manager"]))].filter(Boolean).sort(),
      campaigns: [...new Set(this.rawDataset.map(r => r["Campaign"]))].filter(Boolean).sort(),
      bands: [...new Set(this.rawDataset.map(r => r["Band"]))].filter(Boolean).sort(),
      statuses: ["Active", "Inactive"]
    };
  }

  // Retrieve dataset aggregates
  getAggregates(dataset = this.filteredDataset) {
    const counts = {
      totalDials: 0,
      totalConnected: 0,
      totalEffective: 0,
      totalTalktime: 0,
      totalAdmissions: 0,
      totalSharedAdmissions: 0,
      totalAdditionalAdmissions: 0,
      totalFormFilled: 0,
      totalEmiPaid: 0,
      totalFullPayment: 0,
      totalAutoDial: 0,
      totalManualDial: 0,
      totalAiDials: 0,
      totalCounsellorDiscount: 0,
      totalManagerDiscount: 0,
      totalOtherDiscount: 0,
      totalTarget: 0,
      uniqueCounsellors: new Set(),
      presentCount: 0,
      halfDayCount: 0,
      absentCount: 0
    };

    dataset.forEach(r => {
      counts.totalDials += r["Dialled Calls"] || 0;
      counts.totalConnected += r["Connected Calls"] || r["Connected calls"] || 0;
      counts.totalEffective += r["Effective Calls"] || r["Effective calls"] || 0;
      counts.totalTalktime += (r["Talktime (In hours)"] || 0) * 3600;
      counts.totalAdmissions += r["Total Admissions"] || r["Total admissions"] || 0;
      counts.totalSharedAdmissions += r["Shared Admissions"] || r["Shared admissions"] || 0;
      counts.totalAdditionalAdmissions += r["Additional Adm"] || 0;
      counts.totalFormFilled += r["Total Adm(form Filled)"] || 0;
      counts.totalEmiPaid += r["EMI Paid"] || 0;
      counts.totalFullPayment += r["Full Payment On Spot"] || r["Full Payment On spot"] || 0;
      counts.totalAutoDial += r["Auto Dial"] || 0;
      counts.totalManualDial += r["Manual Dial"] || 0;
      counts.totalAiDials += r["AI"] || 0;
      counts.totalCounsellorDiscount += r["Counsellor discount"] || 0;
      counts.totalManagerDiscount += r["Manager discount"] || 0;
      counts.totalOtherDiscount += r["Other Discount"] || 0;
      
      if (r["Counselor Email"]) {
        counts.uniqueCounsellors.add(r["Counselor Email"]);
      }
      
      if (r["Attendance"] === "Present") counts.presentCount++;
      else if (r["Attendance"] === "Half Day") counts.halfDayCount++;
      else if (r["Attendance"] === "Absent") counts.absentCount++;
    });

    let aggregatedTarget = 0;
    counts.uniqueCounsellors.forEach(email => {
      const agentRows = dataset.filter(r => r["Counselor Email"] === email);
      if (agentRows.length > 0) {
        const totalAgentTarget = agentRows.reduce((sum, r) => sum + (r["Target"] || 0), 0);
        aggregatedTarget += totalAgentTarget;
      }
    });
    counts.totalTarget = Math.round(aggregatedTarget) || 30;

    const totalCounsellors = counts.uniqueCounsellors.size;
    const conversionPercentage = counts.totalConnected > 0 ? parseFloat(((counts.totalAdmissions / counts.totalConnected) * 100).toFixed(2)) : 0;
    const targetAchievement = counts.totalTarget > 0 ? parseFloat(((counts.totalAdmissions / counts.totalTarget) * 100).toFixed(2)) : 0;
    const effectiveRatio = counts.totalConnected > 0 ? parseFloat(((counts.totalEffective / counts.totalConnected) * 100).toFixed(2)) : 0;

    // Financial calculations
    const grossRevenue = counts.totalAdmissions * this.COURSE_PRICE;
    const totalDiscounts = counts.totalCounsellorDiscount + counts.totalManagerDiscount + counts.totalOtherDiscount;
    const netRevenue = grossRevenue - totalDiscounts;
    const daysWorked = counts.presentCount + counts.halfDayCount * 0.5;
    const operationalBurn = (counts.totalDials * this.DIAL_COST) + (daysWorked * this.SALARY_DAILY);
    const grossMargin = netRevenue - operationalBurn;
    const grossMarginPercentage = netRevenue > 0 ? parseFloat(((grossMargin / netRevenue) * 100).toFixed(2)) : 0.0;

    return {
      totalCounsellors,
      totalDials: counts.totalDials,
      totalConnected: counts.totalConnected,
      totalEffective: counts.totalEffective,
      totalTalktime: counts.totalTalktime,
      totalAdmissions: counts.totalAdmissions,
      totalSharedAdmissions: counts.totalSharedAdmissions,
      totalAdditionalAdmissions: counts.totalAdditionalAdmissions,
      totalFormFilled: counts.totalFormFilled,
      totalEmiPaid: counts.totalEmiPaid,
      totalFullPayment: counts.totalFullPayment,
      totalAutoDial: counts.totalAutoDial,
      totalManualDial: counts.totalManualDial,
      totalAiDials: counts.totalAiDials,
      totalCounsellorDiscount: counts.totalCounsellorDiscount,
      totalManagerDiscount: counts.totalManagerDiscount,
      totalOtherDiscount: counts.totalOtherDiscount,
      totalTarget: counts.totalTarget,
      grossRevenue,
      netRevenue,
      operationalBurn,
      grossMargin,
      grossMarginPercentage,
      attendance: {
        present: counts.presentCount,
        halfDay: counts.halfDayCount,
        absent: counts.absentCount,
        rate: (counts.presentCount + counts.halfDayCount + counts.absentCount) > 0 ? 
          parseFloat((((counts.presentCount + counts.halfDayCount * 0.5) / (counts.presentCount + counts.halfDayCount + counts.absentCount)) * 100).toFixed(2)) : 0
      },
      conversionPercentage,
      targetAchievement,
      effectiveRatio
    };
  }

  // Get data grouped by date for trend lines
  getDailyTrend() {
    const groups = {};
    this.filteredDataset.forEach(r => {
      if (!r["Date"]) return;
      if (!groups[r["Date"]]) {
        groups[r["Date"]] = { dialled: 0, connected: 0, effective: 0, admissions: 0, talktime: 0 };
      }
      groups[r["Date"]].dialled += r["Dialled Calls"] || 0;
      groups[r["Date"]].connected += r["Connected Calls"] || r["Connected calls"] || 0;
      groups[r["Date"]].effective += r["Effective Calls"] || r["Effective calls"] || 0;
      groups[r["Date"]].admissions += r["Total Admissions"] || r["Total admissions"] || 0;
      groups[r["Date"]].talktime += (r["Talktime (In hours)"] || 0) * 3600;
    });

    return Object.keys(groups).sort().map(date => ({
      date,
      dialled: groups[date].dialled,
      connected: groups[date].connected,
      effective: groups[date].effective,
      admissions: groups[date].admissions,
      talktime: groups[date].talktime
    }));
  }

  // Group data by counsellors
  getCounsellorBreakdown() {
    const groups = {};
    this.filteredDataset.forEach(r => {
      const email = r["Counselor Email"];
      if (!email) return;
      if (!groups[email]) {
        groups[email] = [];
      }
      groups[email].push(r);
    });

    return Object.keys(groups).map(email => {
      const records = groups[email];
      const meta = this.counsellorsList.find(c => c.email === email) || {};
      const aggr = this.getAggregates(records);
      
      return {
        email,
        name: meta.name || email.split("@")[0],
        teamLead: meta.teamLead || "N/A",
        manager: meta.manager || "N/A",
        campaign: meta.campaign || "N/A",
        band: meta.band || "Band B",
        status: meta.status || "Active",
        target: aggr.totalTarget || 30,
        ...aggr,
        rawRecords: records
      };
    });
  }

  // --- STATE PRESERVATION ---
  loadStateFromLocalStorage() {
    try {
      const saved = localStorage.getItem("ai_counsellor_portal_state");
      if (saved) {
        const state = JSON.parse(saved);
        if (state.filters) {
          this.filters = { ...this.filters, ...state.filters };
        }
        if (state.sortDescriptors) {
          this.sortDescriptors = state.sortDescriptors;
        }
        if (state.financials) {
          this.COURSE_PRICE = state.financials.coursePrice ?? 25000;
          this.DIAL_COST = state.financials.dialCost ?? 0.50;
          this.SALARY_DAILY = state.financials.salaryDaily ?? 1200;
        }
      }
    } catch (err) {
      console.warn("Could not load state from LocalStorage", err);
    }
  }

  saveStateToLocalStorage() {
    try {
      const state = {
        filters: this.filters,
        sortDescriptors: this.sortDescriptors,
        financials: {
          coursePrice: this.COURSE_PRICE,
          dialCost: this.DIAL_COST,
          salaryDaily: this.SALARY_DAILY
        }
      };
      localStorage.setItem("ai_counsellor_portal_state", JSON.stringify(state));
    } catch (err) {
      console.warn("Could not save state to LocalStorage", err);
    }
  }

  // --- MULTI-COLUMN SORTING ---
  sortBreakdown(breakdown, sortDescriptors = this.sortDescriptors) {
    if (!sortDescriptors || sortDescriptors.length === 0) return breakdown;
    return [...breakdown].sort((a, b) => {
      for (const desc of sortDescriptors) {
        let valA = a[desc.field];
        let valB = b[desc.field];
        
        // Handle attendance sub-object sorting
        if (desc.field === "attendance") {
          valA = a.attendance.rate;
          valB = b.attendance.rate;
        }

        let comparison = 0;
        if (typeof valA === "string" && typeof valB === "string") {
          comparison = valA.localeCompare(valB);
        } else {
          comparison = (valA || 0) - (valB || 0);
        }
        
        if (comparison !== 0) {
          return desc.dir === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  // --- HOUR-BY-HOUR CALLING SIMULATOR ---
  getHourByHourData(counsellorEmail, dateStr) {
    const seed = counsellorEmail + dateStr;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const dailyRow = this.filteredDataset.find(r => r["Counselor Email"] === counsellorEmail && r["Date"] === dateStr);
    const dialsTotal = dailyRow ? dailyRow["Dialled Calls"] : 60;
    const connectedTotal = dailyRow ? (dailyRow["Connected Calls"] || dailyRow["Connected calls"]) : 30;
    const effectiveTotal = dailyRow ? (dailyRow["Effective Calls"] || dailyRow["Effective calls"]) : 20;

    const hourlyDials = [];
    const hourlyConnected = [];
    const hourlyEffective = [];
    
    let dialsRem = dialsTotal;
    let connRem = connectedTotal;
    let effRem = effectiveTotal;

    const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];
    
    for (let i = 0; i < 9; i++) {
      if (i === 8) {
        hourlyDials.push(dialsRem);
        hourlyConnected.push(connRem);
        hourlyEffective.push(effRem);
      } else {
        const weight = [0.08, 0.12, 0.15, 0.15, 0.05, 0.08, 0.12, 0.15, 0.10][i];
        
        let d = Math.round(dialsTotal * weight + (Math.abs(hash) % (i + 2)) * 0.2);
        d = Math.max(0, Math.min(d, dialsRem));
        dialsRem -= d;
        hourlyDials.push(d);

        let c = Math.round(connectedTotal * weight + (Math.abs(hash) % (i + 1)) * 0.1);
        c = Math.max(0, Math.min(c, connRem, d));
        connRem -= c;
        hourlyConnected.push(c);

        let e = Math.round(effectiveTotal * weight + (Math.abs(hash) % (i + 3)) * 0.05);
        e = Math.max(0, Math.min(e, effRem, c));
        effRem -= e;
        hourlyEffective.push(e);
      }
    }

    return {
      hours,
      dials: hourlyDials,
      connected: hourlyConnected,
      effective: hourlyEffective
    };
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.DataProcessor = new DataProcessor();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataProcessor;
}
