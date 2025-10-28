import { getPackingDashboardReport } from "@/lib/reports/packing";

// optional: set NODE_ENV=development and TS path resolution first
(async () => {
  // choose your range
  const startDate = new Date("2025-10-01");
  const endDate   = new Date("2025-10-31");

  // run the backend function directly
  const report = await getPackingDashboardReport({ startDate, endDate });

  // pretty print the result
  console.log("===== DAILY BY OP TYPE =====");
  console.table(report.daily.byOpType.slice(0, 10)); // show first 10 rows

  console.log("\n===== DAILY GRAND TOTAL =====");
  console.table(report.daily.grand);

  console.log("\n===== MONTHLY BY MACHINE & OP TYPE =====");
  console.table(report.monthly.byMachineAndOpType.slice(0, 10));

  console.log("\n===== MONTHLY BY OP TYPE =====");
  console.table(report.monthly.byOpType);

  console.log("\n===== MONTHLY GRAND TOTAL =====");
  console.table(report.monthly.grand);
})();
