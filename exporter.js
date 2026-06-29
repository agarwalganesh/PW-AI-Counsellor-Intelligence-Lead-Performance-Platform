// Export Utilities for AI Counsellor Intelligence & Performance Optimization Platform

class ReportExporter {
  constructor() {}

  // 1. Export JSON data array to CSV file
  exportToCSV(data, filename = "Counsellor_Performance_Report.csv") {
    try {
      // Validate inputs
      if (!data || !Array.isArray(data)) {
        console.warn("Invalid data provided to exportToCSV:", data);
        alert("No valid data available for export.");
        return;
      }

      if (data.length === 0) {
        alert("No data available for export.");
        return;
      }

      // Ensure we have at least one object to get headers from
      if (typeof data[0] !== 'object' || data[0] === null) {
        console.warn("Invalid data format for exportToCSV:", data);
        alert("Data format is invalid for export.");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [];

      // Header row
      csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","));

      // Data rows
      data.forEach((row, index) => {
        try {
          if (!row || typeof row !== 'object' || row === null) {
            console.warn(`Skipping invalid row at index ${index}:`, row);
            return;
          }

          const values = headers.map(header => {
            const val = row[header];
            const strVal = val === null || val === undefined ? "" : String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(","));
        } catch (rowError) {
          console.warn(`Error processing row ${index} in exportToCSV:`, rowError, { row });
          // Skip this row but continue with others
        }
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

        // Clean up object URL
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error("Error in exportToCSV:", error, { data, filename });
      alert("An error occurred while exporting to CSV. Please check the console for details.");
    }
  }

  // 2. Export JSON data array to Excel (.xlsx) file using SheetJS (XLSX)
  exportToExcel(data, filename = "Counsellor_Performance_Report.xlsx") {
    try {
      // Validate inputs
      if (!data || !Array.isArray(data)) {
        console.warn("Invalid data provided to exportToExcel:", data);
        alert("No valid data available for export.");
        return;
      }

      if (data.length === 0) {
        alert("No data available for export.");
        return;
      }

      // Ensure we have at least one object to get headers from
      if (typeof data[0] !== 'object' || data[0] === null) {
        console.warn("Invalid data format for exportToExcel:", data);
        alert("Data format is invalid for export.");
        return;
      }

      if (typeof XLSX === "undefined") {
        console.warn("SheetJS (XLSX) library not loaded. Falling back to CSV export.");
        this.exportToCSV(data, filename.replace(".xlsx", ".csv"));
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Performance Data");

      // Auto-fit column widths
      const maxLens = {};
      data.forEach(row => {
        try {
          if (!row || typeof row !== 'object' || row === null) return;

          Object.keys(row).forEach(key => {
            const val = String(row[key] || "");
            maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
          });
        } catch (rowError) {
          console.warn(`Error processing row for column width calculation:`, rowError, { row });
          // Skip this row but continue with others
        }
      });
      worksheet["!cols"] = Object.keys(maxLens).map(key => ({
        wch: Math.min(30, maxLens[key] + 2) // Limit width to 30 max for safety
      }));

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Failed to export Excel file, falling back to CSV.", err, { data, filename });
      try {
        this.exportToCSV(data, filename.replace(".xlsx", ".csv"));
      } catch (fallbackError) {
        console.error("Fallback CSV export also failed:", fallbackError);
        alert("Export failed. Please check the console for details.");
      }
    }
  }

  // 3. Print active dashboard panel / view to PDF
  exportToPDF(viewId, title = "Performance Report") {
    try {
      // Validate inputs
      if (viewId && typeof viewId !== 'string') {
        console.warn("Invalid viewId provided to exportToPDF:", viewId);
        // Continue anyway as viewId is optional
      }

      if (title && typeof title !== 'string') {
        console.warn("Invalid title provided to exportToPDF:", title);
        title = "Performance Report"; // Fallback to default
      }

      const originalTitle = document.title;
      document.title = `${title || "Performance Report"}_${new Date().toISOString().split("T")[0]}`;

      // Add print utility classes to DOM temporarily if needed, then trigger native print
      window.print();

      // Restore title
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    } catch (error) {
      console.error("Error in exportToPDF:", error, { viewId, title });
      // Even if there's an error, try to print anyway as fallback
      try {
        window.print();
      } catch (printError) {
        console.error("Print functionality also failed:", printError);
        alert("Unable to initiate print. Please try using your browser's print function (Ctrl+P).");
      }
    }
  }
}

// Bind to window or module
if (typeof window !== "undefined") {
  window.ReportExporter = new ReportExporter();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ReportExporter;
}
