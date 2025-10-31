/* npx tsx scripts/testCuttingReport.ts */
import { getCuttingReport } from "@/lib/reports/cutting";

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

(async () => {
  try {
    const start = new Date("2025-01-01T00:00:00Z");
    const end   = new Date("2025-12-31T23:59:59Z");

    const r = await getCuttingReport({
      startDate: toYMD(start),
      endDate: toYMD(end),
    });

    // === Daily (sample) ===
    console.log("== Daily (sample) ==");
    const dayKeys = Object.keys(r.daily).sort();
    if (dayKeys.length) {
      const firstDay = dayKeys[0];
      const day = r.daily[firstDay];
      console.log(`Date: ${firstDay}`);
      console.log("  Day Totals:", day.dayTotals); // { pcs, m2, mL }
      // Print one panelType → panelId group if exists
      const panelTypes = Object.keys(day.byPanel).sort();
      if (panelTypes.length) {
        const pt = panelTypes[0];
        const ids = Object.keys(day.byPanel[pt]).sort();
        if (ids.length) {
          const firstId = ids[0];
          console.log(`  Sample Panel: [${pt}] ${firstId}:`, day.byPanel[pt][firstId]);
        }
      }
    } else {
      console.log("(no data in range)");
    }

    // === Totals By Panel ===
    console.log("\n== Totals By Panel ==");
    const panelTypes = Object.keys(r.totalsByPanel).sort();
    if (panelTypes.length === 0) {
      console.log("(no data)");
    } else {
      for (const pt of panelTypes) {
        const byId = r.totalsByPanel[pt];
        const ids = Object.keys(byId).sort();
        for (const id of ids) {
          const m = byId[id]; // { pcs, m2, mL }
          console.log(`[${pt}] ${id} -> pcs=${m.pcs}, m2=${m.m2}, mL=${m.mL}`);
        }
      }
    }

    // === Monthly Totals (5a..5e) ===
    console.log("\n== Monthly Totals (5a..5e) ==");
    const months = Object.keys(r.monthlyTotals).sort();
    if (months.length === 0) {
      console.log("(no data)");
    } else {
      for (const ym of months) {
        const m = r.monthlyTotals[ym];
        // Sanity: 5d == 5b, 5e == 5c
        const ok3eq1 = m.calc3_totalOutputM2 === m.calc1_m2;
        const ok4eq2 = m.calc4_totalOutputML === m.calc2_mL;
        console.log(
          `${ym} | (5a) pcs=${m.actualOutputPcs} | (5b) m2=${m.calc1_m2} | (5c) mL=${m.calc2_mL} |` +
          ` (5d) m2=${m.calc3_totalOutputM2}${ok3eq1 ? "" : " [!= 5b]"} | (5e) mL=${m.calc4_totalOutputML}${ok4eq2 ? "" : " [!= 5c]"}`
        );
      }
    }
  } catch (err) {
    console.error("Test failed:", err);
    process.exitCode = 1;
  }
})();
