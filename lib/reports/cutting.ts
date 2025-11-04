// lib/reports/cutting.ts
import { prisma } from "@/lib/prisma";

/** Inputs for report generation */
export type CuttingReportInput = {
  /** Inclusive "YYYY-MM-DD" */
  startDate: string;
  /** Inclusive "YYYY-MM-DD" */
  endDate: string;
};

/** Per-panel metrics (per day or accumulated) */
export type PanelMetrics = {
  pcs: number;  // actualOutput (pcs)
  m2: number;   // (1) weight * actualOutput
  mL: number;   // (2) lengthSize * actualOutput
};

/** Day → PanelType (free-text) → PanelId */
export type DailyBreakdown = {
  [dateYYYYMMDD: string]: {
    byPanel: {
      [panelType: string]: {
        [panelId: string]: PanelMetrics; // (3) == m2, (4) == mL
      };
    };
    dayTotals: PanelMetrics; // sums across panels; (3) == m2, (4) == mL
  };
};

/** Totals aggregated across the entire range by panelType (free-text) → panelId */
export type TotalsByPanel = {
  [panelType: string]: {
    [panelId: string]: PanelMetrics; // (3) == m2, (4) == mL
  };
};

/** Monthly totals per spec (5a..5e) */
export type MonthlyTotals = {
  [monthYYYYMM: string]: {
    /** (5a) monthly total of actual output (pcs) */
    actualOutputPcs: number;
    /** (5b) monthly total of (1) in m² */
    calc1_m2: number;
    /** (5c) monthly total of (2) in mL */
    calc2_mL: number;
    /** (5d) monthly total of (3) in m² = (5b) */
    calc3_totalOutputM2: number;
    /** (5e) monthly total of (4) in mL = (5c) */
    calc4_totalOutputML: number;
  };
};

export type CuttingReport = {
  range: { startDate: string; endDate: string };
  daily: DailyBreakdown;
  totalsByPanel: TotalsByPanel;
  monthlyTotals: MonthlyTotals;
};

/** Convert Date to 'YYYY-MM-DD' */
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Convert Date to 'YYYY-MM' */
function toYM(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Normalize free-text panelType so we don't get empty/null object keys */
function normalizePanelType(v: string | null): string {
  const s = (v ?? "").trim();
  return s === "" ? "(Unspecified)" : s;
}

/** Normalize panelId for safety (should always exist, but guard anyway) */
function normalizePanelId(v: string | null): string {
  const s = (v ?? "").trim();
  return s === "" ? "(Unknown Fabric)" : s;
}

/**
 * Fetch Cutting rows in [startDate, endDate] inclusive.
 * Assumes `operationDate` is stored as @db.Date (no time).
 */
async function fetchCuttingRows(startDate: string, endDate: string) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sy, (sm ?? 1) - 1, sd ?? 1));
  const end = new Date(Date.UTC(ey, (em ?? 1) - 1, ed ?? 1));

  return prisma.cutting.findMany({
    where: { operationDate: { gte: start, lte: end } },
    select: {
      operationDate: true,
      panelId: true,
      panelType: true,     // now free-text (string | null)
      weight: true,
      lengthSize: true,
      actualOutput: true,
    },
    // Sorting still fine with nullable strings; nulls come first in most DBs
    orderBy: [{ operationDate: "asc" }, { panelType: "asc" }, { panelId: "asc" }],
  });
}

/**
 * Main report generator for Cutting.
 * - (1) daily m² = weight * actualOutput
 * - (2) daily mL = lengthSize * actualOutput
 * - (3) total output m² ≡ (1)
 * - (4) total output mL ≡ (2)
 * - (5) monthly totals: (a) pcs, (b) m² of (1), (c) mL of (2), (d) == (b), (e) == (c)
 */
export async function getCuttingReport(
  input: CuttingReportInput
): Promise<CuttingReport> {
  const { startDate, endDate } = input;
  const rows = await fetchCuttingRows(startDate, endDate);

  const daily: DailyBreakdown = {};
  const totalsByPanel: TotalsByPanel = {};

  // Internal monthly accumulators (we’ll duplicate to 5d/5e on finalize)
  const monthlyAccum: {
    [month: string]: { pcs: number; m2: number; mL: number };
  } = {};

  for (const r of rows) {
    const dateKey = toYMD(r.operationDate);
    const monthKey = toYM(r.operationDate);

    // panelType is now free-text → normalize blanks/nulls
    const panelType = normalizePanelType(r.panelType as string | null);
    const panelId = normalizePanelId(r.panelId as string | null);

    const pcs = r.actualOutput ?? 0;
    const m2 = (r.weight ?? 0) * pcs;     // (1)
    const mL = (r.lengthSize ?? 0) * pcs; // (2)

    // ---- daily breakdown ----
    if (!daily[dateKey]) {
      daily[dateKey] = {
        byPanel: {},
        dayTotals: { pcs: 0, m2: 0, mL: 0 },
      };
    }
    if (!daily[dateKey].byPanel[panelType]) {
      daily[dateKey].byPanel[panelType] = {};
    }
    if (!daily[dateKey].byPanel[panelType][panelId]) {
      daily[dateKey].byPanel[panelType][panelId] = { pcs: 0, m2: 0, mL: 0 };
    }

    daily[dateKey].byPanel[panelType][panelId].pcs += pcs;
    daily[dateKey].byPanel[panelType][panelId].m2 += m2; // (3) ≡ m2
    daily[dateKey].byPanel[panelType][panelId].mL += mL; // (4) ≡ mL

    daily[dateKey].dayTotals.pcs += pcs;
    daily[dateKey].dayTotals.m2 += m2; // (3) ≡ m2
    daily[dateKey].dayTotals.mL += mL; // (4) ≡ mL

    // ---- totals by panel across range ----
    if (!totalsByPanel[panelType]) {
      totalsByPanel[panelType] = {};
    }
    if (!totalsByPanel[panelType][panelId]) {
      totalsByPanel[panelType][panelId] = { pcs: 0, m2: 0, mL: 0 };
    }
    totalsByPanel[panelType][panelId].pcs += pcs;
    totalsByPanel[panelType][panelId].m2 += m2; // (3) ≡ m2
    totalsByPanel[panelType][panelId].mL += mL; // (4) ≡ mL

    // ---- monthly accumulators ----
    if (!monthlyAccum[monthKey]) {
      monthlyAccum[monthKey] = { pcs: 0, m2: 0, mL: 0 };
    }
    monthlyAccum[monthKey].pcs += pcs;
    monthlyAccum[monthKey].m2 += m2; // (5b)
    monthlyAccum[monthKey].mL += mL; // (5c)
  }

  // Finalize monthly totals: map to the 5(a..e) structure (with 5d = 5b, 5e = 5c)
  const monthlyTotals: MonthlyTotals = {};
  for (const [month, acc] of Object.entries(monthlyAccum)) {
    monthlyTotals[month] = {
      actualOutputPcs: acc.pcs,       // (5a)
      calc1_m2: acc.m2,               // (5b)
      calc2_mL: acc.mL,               // (5c)
      calc3_totalOutputM2: acc.m2,    // (5d) = (5b)
      calc4_totalOutputML: acc.mL,    // (5e) = (5c)
    };
  }

  return {
    range: { startDate, endDate },
    daily,
    totalsByPanel,
    monthlyTotals,
  };
}

/** Convenience helper for a single day (YYYY-MM-DD). */
export async function getCuttingReportForDay(date: string) {
  return getCuttingReport({ startDate: date, endDate: date });
}
