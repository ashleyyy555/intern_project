/* npx tsx scripts/testSewingEfficiency.ts */
import { getSewingEfficiencyReport } from "@/lib/reports/efficiency";

// Optional: pass custom range via CLI
//   npx tsx scripts/testSewingEfficiency.ts 2025-01-01 2025-12-31
const [,, argStart, argEnd] = process.argv;

function toDateISOOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseRange(): { start: Date; end: Date } {
  if (argStart && argEnd) {
    const s = new Date(argStart + "T00:00:00Z");
    const e = new Date(argEnd   + "T23:59:59Z");
    return { start: s, end: e };
  }
  // Default: current year
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
  return { start, end };
}

function num(n: number, digits = 4) {
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : n;
}

(async () => {
  const { start, end } = parseRange();

  console.log("=== Sewing Efficiency Test ===");
  console.log("Range:", toDateISOOnly(start), "→", toDateISOOnly(end), "\n");

  const { daily, monthly } = await getSewingEfficiencyReport({ startDate: start, endDate: end });

  // ---- Daily (sample) ----
  console.log("== Daily (first 5 rows) ==");
  if (!daily.length) {
    console.log("(no data)\n");
  } else {
    for (const row of daily.slice(0, 5)) {
      console.log(
        row.operationDate,
        "| RatedOutput:", num(row.ratedOutput),
        "| OperatingTime(min):", num(row.operatingTimeMins),
        "| [M1:", row.m1_target_panel,
        "M2:", row.m2_workers_normal,
        "M3:", row.m3_operating_mins_normal,
        "M4:", row.m4_workers_ot,
        "M5:", row.m5_operating_mins_ot, "]"
      );
    }
    console.log();
  }

  // ---- Monthly (full) ----
  console.log("== Monthly Totals ==");
  if (!monthly.length) {
    console.log("(no data)\n");
  } else {
    for (const m of monthly) {
      console.log(
        m.yearMonth,
        "| RatedOutput:", num(m.ratedOutput),
        "| OperatingTime(min):", num(m.operatingTimeMins)
      );
    }
    console.log();
  }

  // ---- Simple sanity: grand totals from monthly ----
  const grandRated = monthly.reduce((s, m) => s + m.ratedOutput, 0);
  const grandOpMin = monthly.reduce((s, m) => s + m.operatingTimeMins, 0);
  console.log("== Grand Totals (from monthly) ==");
  console.log("RatedOutput:", num(grandRated), "| OperatingTime(min):", num(grandOpMin));
})();
