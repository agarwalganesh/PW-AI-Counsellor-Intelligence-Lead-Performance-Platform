// Mock Data Generator for AI Counsellor Intelligence & Performance Optimization Platform

const MOCK_COUNSELLORS = [
  {
    email: "sneha.sharma@edu.com",
    name: "Sneha Sharma",
    manager: "Rajesh Kumar",
    teamLead: "Amit Singh",
    campaign: "FY26",
    band: "Band A",
    status: "Active",
    joiningDate: "2024-03-15",
    target: 35,
    profile: {
      dialledMultiplier: 1.1,
      connectRate: 0.65, // Good reachability
      effectiveRate: 0.80, // Great engagement
      closingRate: 0.18, // Top closing skills (Admissions / Connected)
      attendanceRate: 0.95,
      avgTalktime: 240, // 4 mins
      discounts: { counsellor: 5000, manager: 10000 }
    }
  },
  {
    email: "rahul.verma@edu.com",
    name: "Rahul Verma",
    manager: "Rajesh Kumar",
    teamLead: "Amit Singh",
    campaign: "FY27",
    band: "Band C",
    status: "Active",
    joiningDate: "2025-01-10",
    target: 25,
    profile: {
      dialledMultiplier: 0.6, // Low activity / productivity
      connectRate: 0.50,
      effectiveRate: 0.60,
      closingRate: 0.08,
      attendanceRate: 0.85,
      avgTalktime: 150, // 2.5 mins
      discounts: { counsellor: 2000, manager: 5000 }
    }
  },
  {
    email: "priya.nair@edu.com",
    name: "Priya Nair",
    manager: "Neha Gupta",
    teamLead: "Vikram Rathore",
    campaign: "FY26",
    band: "Band B",
    status: "Active",
    joiningDate: "2024-08-01",
    target: 30,
    profile: {
      dialledMultiplier: 1.25, // Very high activity
      connectRate: 0.55,
      effectiveRate: 0.75,
      closingRate: 0.04, // Low conversion (Poor closing skills)
      attendanceRate: 0.98,
      avgTalktime: 280, // High talktime, but failing to close
      discounts: { counsellor: 3000, manager: 8000 }
    }
  },
  {
    email: "amit.patel@edu.com",
    name: "Amit Patel",
    manager: "Neha Gupta",
    teamLead: "Vikram Rathore",
    campaign: "CJR", // Cold/difficult campaign
    band: "Band B",
    status: "Active",
    joiningDate: "2024-11-15",
    target: 28,
    profile: {
      dialledMultiplier: 1.0,
      connectRate: 0.30, // Low Connected Calls (Lead quality issue)
      effectiveRate: 0.50,
      closingRate: 0.12, // Decent closing when connected
      attendanceRate: 0.92,
      avgTalktime: 190,
      discounts: { counsellor: 4000, manager: 6000 }
    }
  },
  {
    email: "vikas.singh@edu.com",
    name: "Vikas Singh",
    manager: "Rajesh Kumar",
    teamLead: "Amit Singh",
    campaign: "FY27",
    band: "Band B",
    status: "Active",
    joiningDate: "2024-05-20",
    target: 30,
    profile: {
      dialledMultiplier: 0.95,
      connectRate: 0.52,
      effectiveRate: 0.65,
      closingRate: 0.10, // Average performer
      attendanceRate: 0.90,
      avgTalktime: 200,
      discounts: { counsellor: 3000, manager: 6000 }
    }
  },
  {
    email: "pooja.rao@edu.com",
    name: "Pooja Rao",
    manager: "Rajesh Kumar",
    teamLead: "Karan Johar",
    campaign: "FY26",
    band: "Band A",
    status: "Active",
    joiningDate: "2023-10-01",
    target: 40,
    profile: {
      dialledMultiplier: 1.05,
      connectRate: 0.60,
      effectiveRate: 0.82,
      closingRate: 0.20, // Exceptional closer
      attendanceRate: 0.96,
      avgTalktime: 260,
      discounts: { counsellor: 6000, manager: 12000 }
    }
  },
  {
    email: "anil.mehta@edu.com",
    name: "Anil Mehta",
    manager: "Sanjay Dutt",
    teamLead: "Rohan Mehra",
    campaign: "CJR",
    band: "Band C",
    status: "Active",
    joiningDate: "2025-02-01",
    target: 25,
    profile: {
      dialledMultiplier: 0.70, // Low activity
      connectRate: 0.45,
      effectiveRate: 0.52,
      closingRate: 0.05, // High Risk, low conversion
      attendanceRate: 0.72, // Severe Attendance Issue
      avgTalktime: 140,
      discounts: { counsellor: 1000, manager: 4000 }
    }
  },
  {
    email: "deepa.sen@edu.com",
    name: "Deepa Sen",
    manager: "Sanjay Dutt",
    teamLead: "Rohan Mehra",
    campaign: "FY27",
    band: "Band B",
    status: "Active",
    joiningDate: "2024-07-10",
    target: 30,
    profile: {
      dialledMultiplier: 1.0,
      connectRate: 0.58,
      effectiveRate: 0.70,
      closingRate: 0.07, // Low closing despite good talktime
      attendanceRate: 0.93,
      avgTalktime: 270, // Talks a lot but can't close
      discounts: { counsellor: 3000, manager: 5000 }
    }
  },
  {
    email: "rohit.das@edu.com",
    name: "Rohit Das",
    manager: "Neha Gupta",
    teamLead: "Vikram Rathore",
    campaign: "FY26",
    band: "Band A",
    status: "Active",
    joiningDate: "2024-02-18",
    target: 35,
    profile: {
      dialledMultiplier: 1.15,
      connectRate: 0.62,
      effectiveRate: 0.78,
      closingRate: 0.16, // Top Performer
      attendanceRate: 0.94,
      avgTalktime: 220,
      discounts: { counsellor: 5000, manager: 10000 }
    }
  },
  {
    email: "divya.joshi@edu.com",
    name: "Divya Joshi",
    manager: "Sanjay Dutt",
    teamLead: "Rohan Mehra",
    campaign: "FY27",
    band: "Band C",
    status: "Inactive", // Inactive test
    joiningDate: "2025-03-01",
    target: 20,
    profile: {
      dialledMultiplier: 0.5,
      connectRate: 0.40,
      effectiveRate: 0.45,
      closingRate: 0.04,
      attendanceRate: 0.60,
      avgTalktime: 120,
      discounts: { counsellor: 1000, manager: 2000 }
    }
  }
];

function generateMockData(startDateStr = "2026-06-01", endDateStr = "2026-06-17") {
  const data = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6; // Sat or Sun
    
    MOCK_COUNSELLORS.forEach(c => {
      // Determine attendance
      let attendance = "Present";
      const randAtt = Math.random();
      if (isWeekend) {
        // Reduced attendance on weekends
        attendance = randAtt < 0.15 ? "Present" : randAtt < 0.25 ? "Half Day" : "Absent";
      } else {
        if (randAtt > c.profile.attendanceRate) {
          attendance = randAtt > 0.96 ? "Absent" : "Half Day";
        }
      }
      
      if (attendance === "Absent") {
        // Create an absent record (0 calls)
        data.push({
          "Date": dateStr,
          "Counselor Email": c.email,
          "Counsellor Name": c.name, // Extra helper for easier display
          "Team Lead": c.teamLead,
          "Manager": c.manager,
          "Campaign": c.campaign,
          "Dialled Calls": 0,
          "Connected Calls": 0,
          "Effective Calls": 0,
          "Talktime": 0,
          "Target": c.target,
          "Total Admissions": 0,
          "Shared Admissions": 0,
          "Additional Admissions": 0,
          "Total Admissions Form Filled": 0,
          "EMI Paid": 0,
          "Full Payment On Spot": 0,
          "Conversion Percentage": 0,
          "Attendance": "Absent",
          "Auto Dial": 0,
          "Manual Dial": 0,
          "AI": 0,
          "FY26": c.campaign === "FY26" ? 1 : 0,
          "FY27": c.campaign === "FY27" ? 1 : 0,
          "CJR": c.campaign === "CJR" ? 1 : 0,
          "Status": c.status,
          "Counsellor Discount": 0,
          "Manager Discount": 0,
          "Joining Date": c.joiningDate,
          "Number of Days": Math.max(1, Math.round((new Date(dateStr) - new Date(c.joiningDate)) / (1000 * 60 * 60 * 24))),
          "Band": c.band
        });
        return;
      }
      
      const attendanceMultiplier = attendance === "Half Day" ? 0.5 : 1.0;
      
      // Call Activity
      const baseDialled = Math.round((70 + Math.random() * 30) * c.profile.dialledMultiplier * attendanceMultiplier);
      const autoDial = Math.round(baseDialled * 0.7);
      const manualDial = baseDialled - autoDial;
      
      const connected = Math.round(baseDialled * c.profile.connectRate * (0.9 + Math.random() * 0.2));
      const effective = Math.round(connected * c.profile.effectiveRate * (0.9 + Math.random() * 0.15));
      const talktime = connected * c.profile.avgTalktime * (0.85 + Math.random() * 0.3); // in seconds
      
      // Admissions
      // Closing rate is based on Connected Calls
      let totalAdmissions = 0;
      let emiPaid = 0;
      let fullPaymentOnSpot = 0;
      let formFilled = 0;
      
      if (connected > 0) {
        // Daily chance of closing
        const expectedDailyClosures = connected * c.profile.closingRate;
        // Introduce some daily variance using Poisson-like threshold
        totalAdmissions = Math.floor(expectedDailyClosures + (Math.random() - 0.35) * 1.5);
        if (totalAdmissions < 0) totalAdmissions = 0;
        
        if (totalAdmissions > 0) {
          emiPaid = Math.round(totalAdmissions * 0.6); // 60% EMI
          fullPaymentOnSpot = totalAdmissions - emiPaid;
          formFilled = totalAdmissions + Math.round(Math.random() * 2); // some filled form but didn't pay yet
        } else {
          // Sometimes forms are filled but no admissions yet
          formFilled = Math.random() < 0.4 ? 1 : 0;
        }
      }
      
      const sharedAdmissions = Math.random() < 0.15 ? 1 : 0;
      const additionalAdmissions = Math.random() < 0.1 ? 1 : 0;
      const conversionPercentage = connected > 0 ? parseFloat(((totalAdmissions / connected) * 100).toFixed(2)) : 0;
      
      const aiDials = Math.round(autoDial * 0.4); // Calls routed by AI
      
      const counsellorDiscount = totalAdmissions * c.profile.discounts.counsellor;
      const managerDiscount = totalAdmissions * c.profile.discounts.manager;
      const daysTenure = Math.max(1, Math.round((new Date(dateStr) - new Date(c.joiningDate)) / (1000 * 60 * 60 * 24)));
      
      data.push({
        "Date": dateStr,
        "Counselor Email": c.email,
        "Counsellor Name": c.name,
        "Team Lead": c.teamLead,
        "Manager": c.manager,
        "Campaign": c.campaign,
        "Dialled Calls": baseDialled,
        "Connected Calls": connected,
        "Effective Calls": effective,
        "Talktime": Math.round(talktime), // in seconds
        "Target": c.target,
        "Total Admissions": totalAdmissions,
        "Shared Admissions": sharedAdmissions,
        "Additional Admissions": additionalAdmissions,
        "Total Admissions Form Filled": formFilled,
        "EMI Paid": emiPaid,
        "Full Payment On Spot": fullPaymentOnSpot,
        "Conversion Percentage": conversionPercentage,
        "Attendance": attendance,
        "Auto Dial": autoDial,
        "Manual Dial": manualDial,
        "AI": aiDials,
        "FY26": c.campaign === "FY26" ? 1 : 0,
        "FY27": c.campaign === "FY27" ? 1 : 0,
        "CJR": c.campaign === "CJR" ? 1 : 0,
        "Status": c.status,
        "Counsellor Discount": counsellorDiscount,
        "Manager Discount": managerDiscount,
        "Joining Date": c.joiningDate,
        "Number of Days": daysTenure,
        "Band": c.band
      });
    });
  }
  
  return data;
}

// Attach to window for standard SPA loading, or module export
if (typeof window !== "undefined") {
  window.MOCK_DATA = generateMockData();
  window.MOCK_COUNSELLORS = MOCK_COUNSELLORS;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { generateMockData, MOCK_COUNSELLORS };
}
