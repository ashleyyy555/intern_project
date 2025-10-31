// lib/reports/utilization.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// --- Reused Utilities from efficiency.ts ---
const D = Prisma.Decimal;
const d = (v: number | string | Prisma.Decimal | null | undefined) =>
  v === null || v === undefined || v === "" ? new D(0) : new D(v as any);

function yearMonthKL(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  return `${y}-${m}`;
}
// -------------------------------------------

/* ---------- Common output shapes for Utilization ---------- */
export type UtilizationDailyRow = {
  operationDate: string;        // YYYY-MM-DD
  ratedOperatingTimeMins: number; // m2 * 12 * 60 (per-day)
  operatingTimeMins: number;    // (m2*m3) + (m4*m5) (per-day) - This is the actual recorded time
};

export type UtilizationMonthlyRow = {
  yearMonth: string;            // YYYY-MM
  ratedOperatingTimeMins: number; // monthly sum
  operatingTimeMins: number;    // monthly sum
};

/* ---------- Sewing Utilization ---------- */
export type SewingUtilizationDailyRow = UtilizationDailyRow & {
  m2_workers_normal: number;
  m3_operating_mins_normal: number;
  m4_workers_ot: number;
  m5_operating_mins_ot: number;
};

export async function getSewingUtilizationReport(input: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = input;

  const rows = await prisma.efficiencySewing.findMany({
    where: { operationDate: { gte: startDate, lte: endDate } },
    orderBy: { operationDate: "asc" },
  });

  const daily: SewingUtilizationDailyRow[] = [];
  const monthlyMap = new Map<string, { rated: Prisma.Decimal; op: Prisma.Decimal }>();

  for (const r of rows) {
    const m2 = d(r.m2_workers_normal);
    const m3 = d(r.m3_operating_mins_normal); // Decimal
    const m4 = d(r.m4_workers_ot);
    const m5 = d(r.m5_operating_mins_ot);     // Decimal

    // Rated Operating Time (mins): m2 * 12 * 60 (The theoretical maximum time)
    // Note: The formula assumes 12 hours of potential operation per day per worker.
    const RATED_MINS_PER_WORKER_DAY = new D(12 * 60);
    const ratedOperatingTime = m2.mul(RATED_MINS_PER_WORKER_DAY);

    // Operating time (mins): (m2*m3) + (m4*m5) (The actual recorded time)
    const operatingTime = m2.mul(m3).add(m4.mul(m5));

    daily.push({
      operationDate: r.operationDate.toISOString().slice(0, 10),
      ratedOperatingTimeMins: Number(ratedOperatingTime.toFixed(4)),
      operatingTimeMins: Number(operatingTime.toFixed(4)),
      m2_workers_normal: Number(m2),
      m3_operating_mins_normal: Number(m3),
      m4_workers_ot: Number(m4),
      m5_operating_mins_ot: Number(m5),
    });

    const ym = yearMonthKL(r.operationDate);
    const agg = monthlyMap.get(ym) ?? { rated: new D(0), op: new D(0) };
    agg.rated = agg.rated.add(ratedOperatingTime);
    agg.op = agg.op.add(operatingTime);
    monthlyMap.set(ym, agg);
  }

  const monthly: UtilizationMonthlyRow[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ym, v]) => ({
      yearMonth: ym,
      ratedOperatingTimeMins: Number(v.rated.toFixed(4)),
      operatingTimeMins: Number(v.op.toFixed(4)),
    }));

  return { daily, monthly };
}

/* ---------- 100% Inspection Utilization ---------- */
export type Insp100UtilizationDailyRow = UtilizationDailyRow & {
  m2_workers_normal: number;
  m3_operating_mins_normal: number;
  m4_workers_ot: number;
  m5_operating_mins_ot: number;
};

export async function getInspection100UtilizationReport(input: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = input;

  const rows = await prisma.efficiencyInspection100.findMany({
    where: { operationDate: { gte: startDate, lte: endDate } },
    orderBy: { operationDate: "asc" },
  });

  const daily: Insp100UtilizationDailyRow[] = [];
  const monthlyMap = new Map<string, { rated: Prisma.Decimal; op: Prisma.Decimal }>();

  for (const r of rows) {
    const m2 = d(r.m2_workers_normal);
    const m3 = d(r.m3_operating_mins_normal); // Decimal
    const m4 = d(r.m4_workers_ot);
    const m5 = d(r.m5_operating_mins_ot);     // Decimal

    // Rated Operating Time (mins): m2 * 12 * 60 (The theoretical maximum time)
    const RATED_MINS_PER_WORKER_DAY = new D(12 * 60);
    const ratedOperatingTime = m2.mul(RATED_MINS_PER_WORKER_DAY);

    // Operating time (mins): (m2*m3) + (m4*m5) (The actual recorded time)
    const operatingTime = m2.mul(m3).add(m4.mul(m5));

    daily.push({
      operationDate: r.operationDate.toISOString().slice(0, 10),
      ratedOperatingTimeMins: Number(ratedOperatingTime.toFixed(4)),
      operatingTimeMins: Number(operatingTime.toFixed(4)),
      m2_workers_normal: Number(m2),
      m3_operating_mins_normal: Number(m3),
      m4_workers_ot: Number(m4),
      m5_operating_mins_ot: Number(m5),
    });

    const ym = yearMonthKL(r.operationDate);
    const agg = monthlyMap.get(ym) ?? { rated: new D(0), op: new D(0) };
    agg.rated = agg.rated.add(ratedOperatingTime);
    agg.op = agg.op.add(operatingTime);
    monthlyMap.set(ym, agg);
  }

  const monthly: UtilizationMonthlyRow[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ym, v]) => ({
      yearMonth: ym,
      ratedOperatingTimeMins: Number(v.rated.toFixed(4)),
      operatingTimeMins: Number(v.op.toFixed(4)),
    }));

  return { daily, monthly };
}

/* ---------- Optional single entry point ---------- */
export type EfficiencyProcess = "sewing" | "inspection100";
export async function getUtilizationReport(
  process: EfficiencyProcess,
  input: { startDate: Date; endDate: Date }
) {
  if (process === "sewing") return getSewingUtilizationReport(input);
  return getInspection100UtilizationReport(input);
}
