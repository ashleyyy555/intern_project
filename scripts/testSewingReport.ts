/* npx tsx scripts/testSewingReport.ts */
import { getSewingReports } from "@/lib/reports/sewing";

(async () => {
  const start = new Date("2025-01-01T00:00:00Z");
  const end   = new Date("2025-12-31T23:59:59Z");

  const r = await getSewingReports({ start, end });

  console.log("== Weighted Daily By Machine (sample) ==");
  // print first day only for brevity
  const dayKeys = Object.keys(r.weightedDailyByMachine).sort();
  if (dayKeys.length) {
    const first = dayKeys[0];
    console.log(first, r.weightedDailyByMachine[first]);
  } else {
    console.log("(no data)");
  }

  console.log("\n== Daily By Operation Type (Raw) (sample) ==");
  const dayKeys2 = Object.keys(r.dailyByOpTypeRaw).sort();
  if (dayKeys2.length) {
    const first = dayKeys2[0];
    console.log(first, r.dailyByOpTypeRaw[first]);
  } else {
    console.log("(no data)");
  }

  console.log("\n== Monthly By Operation Type (Raw) ==");
  const months = Object.keys(r.monthlyByOpTypeRaw).sort();
  for (const ym of months) {
    console.log(ym, r.monthlyByOpTypeRaw[ym]);
  }
})();
