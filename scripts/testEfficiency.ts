/* npx tsx scripts/testEfficiency.ts */
import { getEfficiencyReport } from "@/lib/reports/efficiency";

const [,, proc = "sewing", start = "2025-01-01", end = "2025-12-31"] = process.argv as unknown as [string, string, "sewing"|"inspection100", string, string];

(async () => {
  const { daily, monthly } = await getEfficiencyReport(proc, {
    startDate: new Date(start + "T00:00:00Z"),
    endDate: new Date(end + "T23:59:59Z"),
  });

  console.log(`=== ${proc} Efficiency ===`);
  console.log("Daily sample:", daily.slice(0, 3));
  console.log("Monthly:", monthly);
})();
