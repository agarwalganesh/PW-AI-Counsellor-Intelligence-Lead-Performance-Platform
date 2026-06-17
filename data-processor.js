// Data Processor Module for AI Counsellor Intelligence & Performance Optimization Platform

class DataProcessor {
  constructor() {
    this.rawDataset = [];
    this.filteredDataset = [];
    this.counsellorsList = []; // Unique list of counsellors with their meta-data
    this.filters = {
      startDate: "",
      endDate: "",
      counsellorEmail: "all",
      teamLead: "all",
      manager: "all",
      campaign: "all",
      band: "all",
      status: "all"
    };
  }

  // Load dataset into memory
  loadDataset(data) {
    this.rawDataset = data.map(row => this.cleanRow(row));
    this.updateMetadata();
    this.applyFilters();
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

  // Standardize row fields
  cleanRow(row) {
    const getNum = (val, fallback = 0) => {
      if (val === undefined || val === null || val === "") return fallback;
      const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? fallback : num;
    };

    const getString = (val, fallback = "") => {
      if (val === undefined || val === null) return fallback;
      return String(val).trim();
    };

    const counselorEmail = getString(row["Counselor Email"] || row["counselor_email"] || row["Email"] || row["counsellor_email"]);
    const counselorName = getString(row["Counsellor Name"] || row["Counselor Name"] || counselorEmail.split("@")[0].split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" "));

    const cleanDate = this.parseExcelDate(row["Date"] || row["date"]);

    const dialled = getNum(row["Dialled Calls"] || row["dialled_calls"] || row["Dials"] || row["Dialled"]);
    const connected = getNum(row["Connected Calls"] || row["Connected calls"] || row["connected_calls"] || row["Connections"] || row["Connected"]);
    const effective = getNum(row["Effective Calls"] || row["Effective calls"] || row["effective_calls"] || row["Effective"]);
    
    let talktime = getNum(row["Talktime"] || row["Talk Time"] || row["talktime"]);
    if (row["Talktime (In hours)"] !== undefined && row["Talktime (In hours)"] !== "") {
      talktime = getNum(row["Talktime (In hours)"]) * 3600; // convert hours to seconds
    }
    
    const admissions = getNum(row["Total Admissions"] || row["Total admissions"] || row["Total Adm"] || row["total_admissions"] || row["Admissions"] || row["admissions"]);
    
    // Recalculate conversion percentage to ensure consistency across decimal and percentage formats
    const convPct = connected > 0 ? parseFloat(((admissions / connected) * 100).toFixed(2)) : 0;

    return {
      "Date": cleanDate,
      "Counselor Email": counselorEmail,
      "Counsellor Name": counselorName,
      "Team Lead": getString(row["Team Lead"] || row["team_lead"] || row["TL"]),
      "Manager": getString(row["Manager"] || row["manager"]),
      "Campaign": getString(row["Campaign"] || row["campaign"]),
      "Dialled Calls": dialled,
      "Connected Calls": connected,
      "Effective Calls": effective,
      "Talktime": talktime, // store in seconds
      "Target": getNum(row["Target"] || row["target"], 30), // Default target 30 if not set
      "Total Admissions": admissions,
      "Shared Admissions": getNum(row["Shared Admissions"] || row["Shared admissions"] || row["shared_admissions"]),
      "Additional Admissions": getNum(row["Additional Adm"] || row["Additional Admissions"] || row["additional_admissions"]),
      "Total Admissions Form Filled": getNum(row["Total Adm(form Filled)"] || row["Total Admissions Form Filled"] || row["Form Filled"] || row["form_filled"]),
      "EMI Paid": getNum(row["EMI Paid"] || row["emi_paid"]),
      "Full Payment On Spot": getNum(row["Full Payment On Spot"] || row["Full Payment On spot"] || row["full_payment_on_spot"]),
      "Conversion Percentage": convPct,
      "Attendance": getString(row["Attendance"] || row["attendance"], "Present"),
      "Auto Dial": getNum(row["Auto Dial"] || row["auto_dial"]),
      "Manual Dial": getNum(row["Manual Dial"] || row["manual_dial"]),
      "AI": getNum(row["AI"] || row["ai"]),
      "FY26": getNum(row["FY 26"] || row["FY26"] || row["fy26"]),
      "FY27": getNum(row["FY 27"] || row["FY27"] || row["fy27"]),
      "CJR": getNum(row["CJR"] || row["cjr"]),
      "Status": getString(row["Status"] || row["status"], "Active"),
      "Counsellor Discount": getNum(row["Counsellor discount"] || row["Counsellor discount-FY 27"] || row["Counsellor Discount"] || row["counsellor_discount"]),
      "Manager Discount": getNum(row["Manager discount"] || row["Manager Discount"] || row["manager_discount"]),
      "Joining Date": this.parseExcelDate(row["Joining Date"] || row["Joining date"] || row["joining_date"]),
      "Number of Days": getNum(row["No. of days"] || row["Number of Days"] || row["number_of_days"]),
      "Band": getString(row["Band"] || row["band"], "Band B")
    };
  }

  // Get unique lists of metadata for drop-downs and profiles
  updateMetadata() {
    const emails = [...new Set(this.rawDataset.map(r => r["Counselor Email"]))].filter(Boolean);
    
    this.counsellorsList = emails.map(email => {
      // Find latest record or active details of this counselor
      const records = this.rawDataset.filter(r => r["Counselor Email"] === email);
      const latest = records[records.length - 1] || {};
      
      // Calculate overall target
      const targets = [...new Set(records.map(r => r["Target"]))];
      const target = targets.length > 0 ? targets[0] : 30; // Target is normally consistent per month
      
      return {
        email: email,
        name: latest["Counsellor Name"] || email.split("@")[0],
        teamLead: latest["Team Lead"] || "N/A",
        manager: latest["Manager"] || "N/A",
        campaign: latest["Campaign"] || "N/A",
        band: latest["Band"] || "Band B",
        status: latest["Status"] || "Active",
        joiningDate: latest["Joining Date"] || "2025-01-01",
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
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (json.length === 0) {
          callback(new Error("Uploaded sheet is empty."));
          return;
        }
        
        this.loadDataset(json);
        // Save to LocalStorage
        try {
          localStorage.setItem("ai_counsellor_dataset", JSON.stringify(this.rawDataset));
        } catch(err) {
          console.warn("Could not save to LocalStorage (data size limit exceeded).", err);
        }
        callback(null, this.rawDataset);
      } catch(err) {
        callback(err);
      }
    };
    reader.onerror = () => {
      callback(new Error("File reading error."));
    };
    reader.readAsBinaryString(file);
  }

  // Apply filters
  setFilter(filterKey, value) {
    this.filters[filterKey] = value;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredDataset = this.rawDataset.filter(row => {
      // Date Range Filter
      if (this.filters.startDate && row["Date"] < this.filters.startDate) return false;
      if (this.filters.endDate && row["Date"] > this.filters.endDate) return false;
      
      // Counsellor Filter
      if (this.filters.counsellorEmail !== "all" && row["Counselor Email"] !== this.filters.counsellorEmail) return false;
      
      // Team Lead Filter
      if (this.filters.teamLead !== "all" && row["Team Lead"] !== this.filters.teamLead) return false;
      
      // Manager Filter
      if (this.filters.manager !== "all" && row["Manager"] !== this.filters.manager) return false;
      
      // Campaign Filter
      if (this.filters.campaign !== "all" && row["Campaign"] !== this.filters.campaign) return false;
      
      // Band Filter
      if (this.filters.band !== "all" && row["Band"] !== this.filters.band) return false;
      
      // Status Filter
      if (this.filters.status !== "all" && row["Status"] !== this.filters.status) return false;
      
      return true;
    });
  }

  // Get active filters configuration
  getFiltersOptions() {
    const dates = this.rawDataset.map(r => r["Date"]).filter(Boolean).sort();
    const minDate = dates[0] || "";
    const maxDate = dates[dates.length - 1] || "";

    return {
      minDate,
      maxDate,
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
      totalTarget: 0,
      uniqueCounsellors: new Set(),
      presentCount: 0,
      halfDayCount: 0,
      absentCount: 0
    };

    dataset.forEach(r => {
      counts.totalDials += r["Dialled Calls"];
      counts.totalConnected += r["Connected Calls"];
      counts.totalEffective += r["Effective Calls"];
      counts.totalTalktime += r["Talktime"];
      counts.totalAdmissions += r["Total Admissions"];
      counts.totalSharedAdmissions += r["Shared Admissions"];
      counts.totalAdditionalAdmissions += r["Additional Admissions"];
      counts.totalFormFilled += r["Total Admissions Form Filled"];
      counts.totalEmiPaid += r["EMI Paid"];
      counts.totalFullPayment += r["Full Payment On Spot"];
      counts.totalAutoDial += r["Auto Dial"];
      counts.totalManualDial += r["Manual Dial"];
      counts.totalAiDials += r["AI"];
      counts.totalCounsellorDiscount += r["Counsellor Discount"];
      counts.totalManagerDiscount += r["Manager Discount"];
      
      if (r["Counselor Email"]) {
        counts.uniqueCounsellors.add(r["Counselor Email"]);
      }
      
      if (r["Attendance"] === "Present") counts.presentCount++;
      else if (r["Attendance"] === "Half Day") counts.halfDayCount++;
      else if (r["Attendance"] === "Absent") counts.absentCount++;
    });

    // Compute unique targets
    // A counsellor's target is monthly, so we sum targets of unique counsellors
    let aggregatedTarget = 0;
    counts.uniqueCounsellors.forEach(email => {
      const cMeta = this.counsellorsList.find(c => c.email === email);
      if (cMeta) {
        aggregatedTarget += cMeta.target;
      }
    });
    counts.totalTarget = aggregatedTarget || 30; // Fallback default target

    const totalCounsellors = counts.uniqueCounsellors.size;
    const conversionPercentage = counts.totalConnected > 0 ? parseFloat(((counts.totalAdmissions / counts.totalConnected) * 100).toFixed(2)) : 0;
    const targetAchievement = counts.totalTarget > 0 ? parseFloat(((counts.totalAdmissions / counts.totalTarget) * 100).toFixed(2)) : 0;
    const effectiveRatio = counts.totalConnected > 0 ? parseFloat(((counts.totalEffective / counts.totalConnected) * 100).toFixed(2)) : 0;

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
      totalTarget: counts.totalTarget,
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
      groups[r["Date"]].dialled += r["Dialled Calls"];
      groups[r["Date"]].connected += r["Connected Calls"];
      groups[r["Date"]].effective += r["Effective Calls"];
      groups[r["Date"]].admissions += r["Total Admissions"];
      groups[r["Date"]].talktime += r["Talktime"];
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
        target: meta.target || 30,
        ...aggr,
        rawRecords: records
      };
    });
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.DataProcessor = new DataProcessor();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataProcessor;
}
