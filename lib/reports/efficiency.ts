// lib/reports/efficiency.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

/* ---------- Common output shapes ---------- */
export type DailyRowBase = {
  operationDate: string;       // YYYY-MM-DD
  ratedOutput: number;         // per-day
  operatingTimeMins: number;   // per-day
};

export type MonthlyRow = {
  yearMonth: string;           // YYYY-MM
  ratedOutput: number;         // monthly sum
  operatingTimeMins: number;   // monthly sum
};

/* ---------- Sewing ---------- */
export type SewingEfficiencyDailyRow = DailyRowBase & {
  m1_target_panel: number;
  m2_workers_normal: number;
  m3_operating_mins_normal: number;
  m4_workers_ot: number;
  m5_operating_mins_ot: number;
};

export async function getSewingEfficiencyReport(input: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = input;

  const rows = await prisma.efficiencySewing.findMany({
    where: { operationDate: { gte: startDate, lte: endDate } },
    orderBy: { operationDate: "asc" },
  });

  const daily: SewingEfficiencyDailyRow[] = [];
  const monthlyMap = new Map<string, { rated: Prisma.Decimal; op: Prisma.Decimal }>();

  for (const r of rows) {
    const m1 = d(r.m1_target_panel);
    const m2 = d(r.m2_workers_normal);
    const m3 = d(r.m3_operating_mins_normal); // Decimal
    const m4 = d(r.m4_workers_ot);
    const m5 = d(r.m5_operating_mins_ot);     // Decimal

    // Rated: (m2*m1) + [ m4*m1*(m5/720) ]
    const ratedOutput = m2.mul(m1).add(
      m4.mul(m1).mul(m5).div(new D(720))
    );

    // Operating time (mins): (m2*m3) + (m4*m5)
    const operatingTime = m2.mul(m3).add(m4.mul(m5));

    daily.push({
      operationDate: r.operationDate.toISOString().slice(0, 10),
      ratedOutput: Number(ratedOutput.toFixed(4)),
      operatingTimeMins: Number(operatingTime.toFixed(4)),
      m1_target_panel: Number(m1),
      m2_workers_normal: Number(m2),
      m3_operating_mins_normal: Number(m3),
      m4_workers_ot: Number(m4),
      m5_operating_mins_ot: Number(m5),
    });

    const ym = yearMonthKL(r.operationDate);
    const agg = monthlyMap.get(ym) ?? { rated: new D(0), op: new D(0) };
    agg.rated = agg.rated.add(ratedOutput);
    agg.op = agg.op.add(operatingTime);
    monthlyMap.set(ym, agg);
  }

  const monthly: MonthlyRow[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ym, v]) => ({
      yearMonth: ym,
      ratedOutput: Number(v.rated.toFixed(4)),
      operatingTimeMins: Number(v.op.toFixed(4)),
    }));

  return { daily, monthly };
}

/* ---------- 100% Inspection ---------- */
export type Insp100EfficiencyDailyRow = DailyRowBase & {
  m1_target_panel: number;
  m6_target_duffel: number;
  m7_target_blower: number;
  m2_workers_normal: number;
  m3_operating_mins_normal: number;
  m4_workers_ot: number;
  m5_operating_mins_ot: number;
};

export async function getInspection100EfficiencyReport(input: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = input;

  const rows = await prisma.efficiencyInspection100.findMany({
    where: { operationDate: { gte: startDate, lte: endDate } },
    orderBy: { operationDate: "asc" },
  });

  const daily: Insp100EfficiencyDailyRow[] = [];
  const monthlyMap = new Map<string, { rated: Prisma.Decimal; op: Prisma.Decimal }>();

  for (const r of rows) {
    const m1 = d(r.m1_target_panel);
    const m6 = d(r.m6_target_duffel);
    const m7 = d(r.m7_target_blower);
    const m2 = d(r.m2_workers_normal);
    const m3 = d(r.m3_operating_mins_normal); // Decimal
    const m4 = d(r.m4_workers_ot);
    const m5 = d(r.m5_operating_mins_ot);     // Decimal

    // Weighted target per person (panel 85%, duffel 4%, blower 11%)
    const targetWeighted = m1.mul(0.85).add(m6.mul(0.04)).add(m7.mul(0.11));

    // Rated: (m2 * targetWeighted) + (m4 * targetWeighted * (m5/720))
    const ratedOutput = m2
      .mul(targetWeighted)
      .add(m4.mul(targetWeighted).mul(m5).div(new D(720)));

    // Operating time (mins): (m2*m3) + (m4*m5)
    const operatingTime = m2.mul(m3).add(m4.mul(m5));

    daily.push({
      operationDate: r.operationDate.toISOString().slice(0, 10),
      ratedOutput: Number(ratedOutput.toFixed(4)),
      operatingTimeMins: Number(operatingTime.toFixed(4)),
      m1_target_panel: Number(m1),
      m6_target_duffel: Number(m6),
      m7_target_blower: Number(m7),
      m2_workers_normal: Number(m2),
      m3_operating_mins_normal: Number(m3),
      m4_workers_ot: Number(m4),
      m5_operating_mins_ot: Number(m5),
    });

    const ym = yearMonthKL(r.operationDate);
    const agg = monthlyMap.get(ym) ?? { rated: new D(0), op: new D(0) };
    agg.rated = agg.rated.add(ratedOutput);
    agg.op = agg.op.add(operatingTime);
    monthlyMap.set(ym, agg);
  }

  const monthly: MonthlyRow[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ym, v]) => ({
      yearMonth: ym,
      ratedOutput: Number(v.rated.toFixed(4)),
      operatingTimeMins: Number(v.op.toFixed(4)),
    }));

  return { daily, monthly };
}

/* ---------- Optional single entry point ---------- */
export type EfficiencyProcess = "sewing" | "inspection100";
export async function getEfficiencyReport(
  process: EfficiencyProcess,
  input: { startDate: Date; endDate: Date }
) {
  if (process === "sewing") return getSewingEfficiencyReport(input);
  return getInspection100EfficiencyReport(input);
}
