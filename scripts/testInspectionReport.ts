// scripts/testInspectionReport.ts

import { getInspectionDashboardReport } from "@/lib/reports/inspection";

// ---- CLI date helpers ----
function parseYMD(s?: string) {
  if (!s) return undefined;
  
  // FIX: Use Date constructor with YYYY/MM/DD format to parse the date 
  // in the local timezone (where the script is running) as midnight.
  // This avoids the 'new Date("YYYY-MM-DD")' behavior of parsing as UTC midnight.
  const parts = s.split('-');
  if (parts.length !== 3) {
      throw new Error(`Invalid date format "${s}". Use YYYY-MM-DD (e.g., 2025-10-01).`);
  }
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const d = parseInt(parts[2], 10);
  
  const date = new Date(y, m, d);
  
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${s}". Could not create Date object.`);
  }
  return date;
}

// Defaults: last 30 days in KL (but we pass plain dates to backend which handles KL boundaries)
const [,, argStart, argEnd] = process.argv;

// --- FIX 1: Ensure default dates are set to midnight local time ---

// Set the end date to TODAY at 00:00 local time
const defaultEndDate = new Date();
defaultEndDate.setHours(0, 0, 0, 0); 

// Calculate default start date (30 days ago, including today)
const defaultStartDate = new Date(defaultEndDate.getTime());
// Go back 29 full days to include 30 calendar days (Today + 29 days before)
defaultStartDate.setDate(defaultStartDate.getDate() - 29); 

const endDate   = parseYMD(argEnd)   ?? defaultEndDate;
const startDate = parseYMD(argStart) ?? defaultStartDate;

(async () => {
  try {
    // Optional: Add logging to confirm the boundaries being passed
    // console.log("CLI Range (Local Midnight):", startDate.toISOString(), "to", endDate.toISOString());

    const report = await getInspectionDashboardReport({ startDate, endDate });

    console.log("===== INSPECTION: DAILY GRAND =====");
    console.table(report.daily.grand);

    console.log("\n===== INSPECTION: DAILY BY OP TYPE (first 16 rows) =====");
    console.table(report.daily.byOpType.slice(0, 16));

    console.log("\n===== INSPECTION: MONTHLY GRAND =====");
    console.table(report.monthly.grand);

    console.log("\n===== INSPECTION: MONTHLY BY OP TYPE =====");
    console.table(report.monthly.byOpType);

    console.log("\n===== INSPECTION: MONTHLY BY MACHINE & OP TYPE (first 20 rows) =====");
    console.table(report.monthly.byMachineAndOpType.slice(0, 20));
  } catch (err: any) {
    console.error("Failed to load inspection report:", err?.message ?? err);
    process.exit(1);
  }
})();