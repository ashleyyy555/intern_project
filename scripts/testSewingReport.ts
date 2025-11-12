/* npx tsx scripts/testSewingReport.ts */
import { getSewingReports } from "@/lib/reports/sewing";

/** Small pretty printer that avoids super-long lines */
function logSection(title: string, obj: unknown, opts?: { keys?: number }) {
  console.log(`\n== ${title} ==`);
  if (!obj || (typeof obj === "object" && Object.keys(obj as any).length === 0)) {
    console.log("(no data)");
    return;
  }
  const keys = Object.keys(obj as Record<string, any>).sort();
  const take = Math.min(opts?.keys ?? keys.length, keys.length);
  for (let i = 0; i < take; i++) {
    const k = keys[i];
    console.log(k, (obj as any)[k]);
  }
  if (take < keys.length) console.log(`... (${keys.length - take} more)`);
}

(async () => {
  // Allow optional CLI overrides: yarn tsx scripts/testSewingReport.ts 2025-01-01 2025-12-31
  const [startArg, endArg] = process.argv.slice(2);
  const start = new Date(startArg ?? "2025-01-01T00:00:00Z");
  const end   = new Date(endArg   ?? "2025-12-31T23:59:59Z");

  const r = await getSewingReports({ start, end });

  // --- Existing sections ---
  logSection("Weighted Daily By Machine (first 3 days)", r.weightedDailyByMachine, { keys: 3 });
  logSection("Daily By Operation Type (Raw) (first 3 days)", r.dailyByOpTypeRaw, { keys: 3 });
  logSection("Monthly By Operation Type (Raw) (all months)", r.monthlyByOpTypeRaw);

  // --- NEW sections you asked for ---
  logSection("Daily Weighted By Operation Type (first 3 days)", r.dailyWeightedByOpType, { keys: 3 });
  logSection("Monthly Weighted By Operation Type (all months)", r.monthlyWeightedByOpType);
  logSection("Monthly Grand Total (Weighted) (all months)", r.monthlyGrandWeighted);

  // Optional: quick totals sanity line
  const months = Object.keys(r.monthlyGrandWeighted ?? {}).sort();
  if (months.length) {
    const grandYearTotal = months.reduce((acc, m) => acc + (r.monthlyGrandWeighted as any)[m], 0);
    console.log(`\n== Sanity: Sum of Monthly Grand Totals across range ==\nTOTAL: ${grandYearTotal}`);
  }
})();
