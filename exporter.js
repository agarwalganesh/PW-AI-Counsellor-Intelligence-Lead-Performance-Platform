// Export Utilities for AI Counsellor Intelligence & Performance Optimization Platform

class ReportExporter {
  constructor() {}

  // 1. Export JSON data array to CSV file
  exportToCSV(data, filename = "Counsellor_Performance_Report.csv") {
    if (!data || data.length === 0) {
      alert("No data available for export.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","));

    // Data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        const strVal = val === null || val === undefined ? "" : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // 2. Export JSON data array to Excel (.xlsx) file using SheetJS (XLSX)
  exportToExcel(data, filename = "Counsellor_Performance_Report.xlsx") {
    if (!data || data.length === 0) {
      alert("No data available for export.");
      return;
    }

    if (typeof XLSX === "undefined") {
      console.warn("SheetJS (XLSX) library not loaded. Falling back to CSV export.");
      this.exportToCSV(data, filename.replace(".xlsx", ".csv"));
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Performance Data");
      
      // Auto-fit column widths
      const maxLens = {};
      data.forEach(row => {
        Object.keys(row).forEach(key => {
          const val = String(row[key] || "");
          maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
        });
      });
      worksheet["!cols"] = Object.keys(maxLens).map(key => ({
        wch: Math.min(30, maxLens[key] + 2) // Limit width to 30 max for safety
      }));

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Failed to export Excel file, falling back to CSV.", err);
      this.exportToCSV(data, filename.replace(".xlsx", ".csv"));
    }
  }

  // 3. Print active dashboard panel / view to PDF
  exportToPDF(viewId, title = "Performance Report") {
    const originalTitle = document.title;
    document.title = `${title}_${new Date().toISOString().split("T")[0]}`;
    
    // Add print utility classes to DOM temporarily if needed, then trigger native print
    window.print();
    
    // Restore title
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.ReportExporter = new ReportExporter();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ReportExporter;
}
