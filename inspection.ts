import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Canonical operation types (as stored)
// ---------------------------------------------------------------------------
export const OP_TYPES = ["IH", "S", "OS", "B"] as const;
export type OpType = typeof OP_TYPES[number];

// 14 inspection machines/lines
export const MACHINES = [
  "I1","I2","I3","I4","I5","I6","I7","I8","I9","I10","I11","I12","I13","I14",
] as const;
export type Machine = typeof MACHINES[number];

// Row subset we care about (Prisma model: Inspection)
type InspectionRow = {
  operationDate: Date;
  operationType: OpType | string;
  yearMonth?: string | null;
} & Partial<Record<Machine, number | null>>;

// ---------------------------------------------------------------------------
// ✅ KL timezone helpers (fixed for correct midnight alignment)
// ---------------------------------------------------------------------------
function klMidnightUTC(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);

  // ✅ midnight KL = previous day 16:00 UTC
  return new Date(Date.UTC(y, m - 1, d, -8, 0, 0));
}

function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function whereByKLDateRange(startDate: Date, endDate: Date) {
  const start = klMidnightUTC(startDate);
  const endEx = addDays(klMidnightUTC(endDate), 1);

  // Debug logs help confirm your UTC bounds.
  console.log("--- DEBUG QUERY BOUNDARIES (KL Calendar Date to UTC) ---");
  console.log(`Input Start (Local): ${startDate.toDateString()}`);
  console.log(`Input End (Local): ${endDate.toDateString()}`);
  console.log(`Prisma GTE (Inclusive): ${start.toISOString()}`);
  console.log(`Prisma LT (Exclusive): ${endEx.toISOString()}`);
  console.log("-------------------------------------------------------");

  return { operationDate: { gte: start, lt: endEx } } as const;
}

function fmtKLDate(d: Date): string {
  // ✅ no longer offset one day backward
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "short",
  }).format(d);
}

function toYearMonthKL(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// Types for aggregated results
// ---------------------------------------------------------------------------
export type DailyByOpType = { date: string; opType: OpType; total: number };
export type DailyGrandTotal = { date: string; total: number };

export type MonthlyByMachineAndOpType = {
  yearMonth: string;
  machine: Machine;
  opType: OpType;
  total: number;
};
export type MonthlyByOpType = { yearMonth: string; opType: OpType; total: number };
export type MonthlyGrandTotal = { yearMonth: string; total: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sumMachines<T extends Partial<Record<Machine, number | null>>>(row: T): number {
  let s = 0;
  for (const m of MACHINES) s += (row[m] ?? 0) as number;
  return s;
}

function sumMachineKey<T extends string>(acc: Map<T, number>, key: T, val: number) {
  acc.set(key, (acc.get(key) ?? 0) + val);
}

// ---------------------------------------------------------------------------
// 1) Daily by opType + 2) Daily grand total
// ---------------------------------------------------------------------------
export async function getInspectionDaily(
  startDate: Date,
  endDate: Date
): Promise<{ byOpType: DailyByOpType[]; grand: DailyGrandTotal[] }> {
  const where = whereByKLDateRange(startDate, endDate);

  const grouped = await prisma.inspection.groupBy({
    by: ["operationDate", "operationType"],
    where,
    _sum: Object.fromEntries(MACHINES.map((m) => [m, true])) as any,
    orderBy: [{ operationDate: "asc" }, { operationType: "asc" }],
  });

  console.log(`Prisma successfully retrieved ${grouped.length} records.`);
  if (grouped.length > 0) {
    console.log(`First retrieved record's operationDate: ${grouped[0].operationDate.toISOString()}`);
  }

  const byOpType: DailyByOpType[] = [];
  const grandAcc = new Map<string, number>();

  for (const g of grouped) {
    const dateLabel = fmtKLDate(g.operationDate);
    const op = g.operationType as OpType;
    if (!OP_TYPES.includes(op)) continue;

    const total = sumMachines(g._sum as any);
    byOpType.push({ date: dateLabel, opType: op, total });
    sumMachineKey(grandAcc, dateLabel, total);
  }

  const grand: DailyGrandTotal[] = Array.from(grandAcc, ([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { byOpType, grand };
}

// ---------------------------------------------------------------------------
// 3) Monthly totals by machine & op type
// ---------------------------------------------------------------------------
export async function getInspectionMonthlyByMachineAndOpType(
  startDate: Date,
  endDate: Date
): Promise<MonthlyByMachineAndOpType[]> {
  const where = whereByKLDateRange(startDate, endDate);

  const grouped = await prisma.inspection.groupBy({
    by: ["operationDate", "operationType"],
    where,
    _sum: Object.fromEntries(MACHINES.map((m) => [m, true])) as any,
    orderBy: [{ operationDate: "asc" }, { operationType: "asc" }],
  });

  const acc = new Map<string, number>();
  const key = (ym: string, machine: Machine, op: OpType) => `${ym}|${machine}|${op}`;

  for (const g of grouped) {
    const op = g.operationType as OpType;
    if (!OP_TYPES.includes(op)) continue;
    const ym = toYearMonthKL(g.operationDate);

    for (const m of MACHINES) {
      const v = ((g._sum as any)[m] ?? 0) as number;
      sumMachineKey(acc, key(ym, m, op), v);
    }
  }

  const out: MonthlyByMachineAndOpType[] = [];
  for (const [k, total] of acc) {
    const [yearMonth, machine, opType] = k.split("|") as [string, Machine, OpType];
    out.push({ yearMonth, machine, opType, total });
  }

  out.sort((a, b) =>
    a.yearMonth === b.yearMonth
      ? a.opType === b.opType
        ? MACHINES.indexOf(a.machine) - MACHINES.indexOf(b.machine)
        : OP_TYPES.indexOf(a.opType) - OP_TYPES.indexOf(b.opType)
      : a.yearMonth.localeCompare(b.yearMonth)
  );

  return out;
}

// ---------------------------------------------------------------------------
// 4) Monthly totals by op type (all machines combined)
// ---------------------------------------------------------------------------
export async function getInspectionMonthlyByOpType(
  startDate: Date,
  endDate: Date
): Promise<MonthlyByOpType[]> {
  const byMachine = await getInspectionMonthlyByMachineAndOpType(startDate, endDate);

  const acc = new Map<string, number>();
  const key = (ym: string, op: OpType) => `${ym}|${op}`;

  for (const r of byMachine) {
    acc.set(key(r.yearMonth, r.opType), (acc.get(key(r.yearMonth, r.opType)) ?? 0) + r.total);
  }

  const out: MonthlyByOpType[] = [];
  for (const [k, total] of acc) {
    const [yearMonth, opType] = k.split("|") as [string, OpType];
    out.push({ yearMonth, opType, total });
  }

  out.sort((a, b) =>
    a.yearMonth === b.yearMonth
      ? OP_TYPES.indexOf(a.opType) - OP_TYPES.indexOf(b.opType)
      : a.yearMonth.localeCompare(b.yearMonth)
  );

  return out;
}

// ---------------------------------------------------------------------------
// 5) Monthly grand total (all ops, all machines)
// ---------------------------------------------------------------------------
export async function getInspectionMonthlyGrandTotal(
  startDate: Date,
  endDate: Date
): Promise<MonthlyGrandTotal[]> {
  const byOp = await getInspectionMonthlyByOpType(startDate, endDate);

  const acc = new Map<string, number>();
  for (const r of byOp) {
    acc.set(r.yearMonth, (acc.get(r.yearMonth) ?? 0) + r.total);
  }

  const out: MonthlyGrandTotal[] = Array.from(acc, ([yearMonth, total]) => ({ yearMonth, total }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  return out;
}

// ---------------------------------------------------------------------------
// 6) Convenience: full dashboard bundle (same shape as packing)
// ---------------------------------------------------------------------------
export async function getInspectionDashboardReport(params: {
  startDate: Date;
  endDate: Date;
}) {
  const { startDate, endDate } = params;

  const [{ byOpType, grand }, monthlyByMachineAndOpType, monthlyByOpType, monthlyGrandTotal] =
    await Promise.all([
      getInspectionDaily(startDate, endDate),
      getInspectionMonthlyByMachineAndOpType(startDate, endDate),
      getInspectionMonthlyByOpType(startDate, endDate),
      getInspectionMonthlyGrandTotal(startDate, endDate),
    ]);

  return {
    daily: {
      byOpType,
      grand,
    },
    monthly: {
      byMachineAndOpType: monthlyByMachineAndOpType,
      byOpType: monthlyByOpType,
      grand: monthlyGrandTotal,
    },
  };
}
