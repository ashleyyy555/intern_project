import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Canonical operation types (labels used in UI & results)
// ---------------------------------------------------------------------------
export const OP_TYPES = [
  "in-house",
  "semi",
  "complete wt 100%",
  "complete wo 100%",
] as const;
export type OpType = typeof OP_TYPES[number];

type Machine = "M1" | "M2";

/** DB row shape (only fields we need). Adjust if your schema differs. */
type PackingRow = {
  operationDate: Date;
  yearMonth?: string | null;
  // M1
  M1ForInHouse: number | null;
  M1ForSemi: number | null;
  M1ForCompleteWt100: number | null;
  M1ForCompleteWO100: number | null;
  // M2
  M2ForInHouse: number | null;
  M2ForSemi: number | null;
  M2ForCompleteWt100: number | null;
  M2ForCompleteWO100: number | null;
};

// Column mapping from op type → the two machine columns to add
const COLS: Record<
  OpType,
  { m1: keyof PackingRow; m2: keyof PackingRow }
> = {
  "in-house":             { m1: "M1ForInHouse",         m2: "M2ForInHouse" },
  "semi":                 { m1: "M1ForSemi",            m2: "M2ForSemi" },
  "complete wt 100%":     { m1: "M1ForCompleteWt100",   m2: "M2ForCompleteWt100" },
  "complete wo 100%":     { m1: "M1ForCompleteWO100",   m2: "M2ForCompleteWO100" },
};

// ---------------------------------------------------------------------------
// KL timezone helpers (treat days by KL-local midnight boundaries)
// ---------------------------------------------------------------------------
/** Convert a JS Date to the UTC instant that represents KL-local midnight start of that date */
function klMidnightUTC(date: Date): Date {
  // Get the parts in KL and rebuild an ISO date at 00:00:00 KL, then convert to UTC Date
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const d = Number(parts.find(p => p.type === "day")!.value);
  // This string is interpreted as local time, so we append 'T00:00:00' and then *shift* to KL → UTC
  // Easiest: make a date in KL by formatting then use the same formatter to get epoch via offset math.
  // Simpler approach: create a Date from ISO and subtract KL offset at that moment (GMT+8, no DST)
  // But to be robust, compute the offset using the formatter:
  const klStart = new Date(Date.UTC(y, m - 1, d, 16, 0, 0)); // 00:00 KL = 16:00 previous day UTC
  return klStart;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function clampRangeByKL(startDate: Date, endDate: Date) {
  // Inclusive start, inclusive end (as dates). We'll use [start, endNextDay) for filtering.
  const utcStart = klMidnightUTC(startDate);
  const utcEndExclusive = addDays(klMidnightUTC(endDate), 1);
  return { utcStart, utcEndExclusive };
}

/** Build Prisma where clause for operationDate limited to a KL date-range */
function whereByKLDateRange(startDate: Date, endDate: Date) {
  const { utcStart, utcEndExclusive } = clampRangeByKL(startDate, endDate);
  return {
    operationDate: {
      gte: utcStart,
      lt: utcEndExclusive,
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Result types for dashboard
// ---------------------------------------------------------------------------
export type DailyByOpType = {
  date: string; // 'YYYY-MM-DD' in KL
  opType: OpType;
  total: number;
};
export type DailyGrandTotal = {
  date: string; // 'YYYY-MM-DD' in KL
  total: number;
};

export type MonthlyByMachineAndOpType = {
  yearMonth: string; // 'YYYY-MM'
  machine: Machine;  // 'M1' | 'M2'
  opType: OpType;
  total: number;
};
export type MonthlyByOpType = {
  yearMonth: string;
  opType: OpType;
  total: number;
};
export type MonthlyGrandTotal = {
  yearMonth: string;
  total: number;
};

// ---------------------------------------------------------------------------
// Formatting helpers (KL-local day/month labels)
// ---------------------------------------------------------------------------
function fmtKLDate(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "short" });
  // en-CA short = YYYY-MM-DD
  return fmt.format(d);
}
function toYearMonthKL(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit" })
    .formatToParts(d);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// CORE QUERIES
// We group by day/month at the DB level and sum the denormalized numeric columns,
// then reshape into the desired arrays.
// ---------------------------------------------------------------------------

/** 1) Daily totals by op type + 2) Daily grand total */
export async function getPackingDaily(
  startDate: Date,
  endDate: Date
): Promise<{ byOpType: DailyByOpType[]; grand: DailyGrandTotal[] }> {
  const where = whereByKLDateRange(startDate, endDate);

  // Group rows by operationDate (per KL-day stored as UTC instant), sum all numeric columns at once
  const grouped = await prisma.packing.groupBy({
    by: ["operationDate"],
    where,
    _sum: {
      M1ForInHouse: true, M2ForInHouse: true,
      M1ForSemi: true, M2ForSemi: true,
      M1ForCompleteWt100: true, M2ForCompleteWt100: true,
      M1ForCompleteWO100: true, M2ForCompleteWO100: true,
    },
    orderBy: { operationDate: "asc" },
  });

  const byOpType: DailyByOpType[] = [];
  const grand: DailyGrandTotal[] = [];

  for (const g of grouped) {
    const dateLabel = fmtKLDate(g.operationDate);

    // Sum per op type
    for (const opType of OP_TYPES) {
      const cols = COLS[opType];
      const v1 = (g._sum[cols.m1 as keyof typeof g._sum] as number | null) ?? 0;
      const v2 = (g._sum[cols.m2 as keyof typeof g._sum] as number | null) ?? 0;
      const total = v1 + v2;
      byOpType.push({ date: dateLabel, opType, total });
    }

    // Grand total across all op types & machines
    const dayTotal =
      ((g._sum.M1ForInHouse ?? 0) + (g._sum.M2ForInHouse ?? 0)) +
      ((g._sum.M1ForSemi ?? 0) + (g._sum.M2ForSemi ?? 0)) +
      ((g._sum.M1ForCompleteWt100 ?? 0) + (g._sum.M2ForCompleteWt100 ?? 0)) +
      ((g._sum.M1ForCompleteWO100 ?? 0) + (g._sum.M2ForCompleteWO100 ?? 0));

    grand.push({ date: dateLabel, total: dayTotal });
  }

  return { byOpType, grand };
}

/** 3) Monthly totals by machine & op type */
export async function getPackingMonthlyByMachineAndOpType(
  startDate: Date,
  endDate: Date
): Promise<MonthlyByMachineAndOpType[]> {
  const where = whereByKLDateRange(startDate, endDate);

  // Prefer grouping by yearMonth if column exists/filled; fall back to computing from operationDate.
  // We'll always group by operationDate at DB then map to KL yearMonth in JS, which works in both cases.
  const grouped = await prisma.packing.groupBy({
    by: ["operationDate"],
    where,
    _sum: {
      M1ForInHouse: true, M2ForInHouse: true,
      M1ForSemi: true, M2ForSemi: true,
      M1ForCompleteWt100: true, M2ForCompleteWt100: true,
      M1ForCompleteWO100: true, M2ForCompleteWO100: true,
    },
    orderBy: { operationDate: "asc" },
  });

  // Accumulate into {yearMonth, machine, opType}
  const acc = new Map<string, number>(); // key = `${ym}|${machine}|${opType}`
  const key = (ym: string, machine: Machine, op: OpType) => `${ym}|${machine}|${op}`;

  for (const g of grouped) {
    const ym = toYearMonthKL(g.operationDate);

    for (const opType of OP_TYPES) {
      const { m1, m2 } = COLS[opType];
      const m1v = (g._sum[m1 as keyof typeof g._sum] as number | null) ?? 0;
      const m2v = (g._sum[m2 as keyof typeof g._sum] as number | null) ?? 0;

      acc.set(key(ym, "M1", opType), (acc.get(key(ym, "M1", opType)) ?? 0) + m1v);
      acc.set(key(ym, "M2", opType), (acc.get(key(ym, "M2", opType)) ?? 0) + m2v);
    }
  }

  const out: MonthlyByMachineAndOpType[] = [];
  for (const [k, total] of acc) {
    const [yearMonth, machine, opType] = k.split("|") as [string, Machine, OpType];
    out.push({ yearMonth, machine, opType, total });
  }
  // Sort for stable output (YM, machine, opType)
  out.sort((a, b) =>
    a.yearMonth === b.yearMonth
      ? a.machine === b.machine
        ? OP_TYPES.indexOf(a.opType) - OP_TYPES.indexOf(b.opType)
        : a.machine.localeCompare(b.machine)
      : a.yearMonth.localeCompare(b.yearMonth)
  );

  return out;
}

/** 4) Monthly totals by op type (M1+M2 combined) */
export async function getPackingMonthlyByOpType(
  startDate: Date,
  endDate: Date
): Promise<MonthlyByOpType[]> {
  const byMachine = await getPackingMonthlyByMachineAndOpType(startDate, endDate);

  // Collapse M1/M2
  const acc = new Map<string, number>(); // key = `${ym}|${opType}`
  const key = (ym: string, op: OpType) => `${ym}|${op}`;

  for (const row of byMachine) {
    const k = key(row.yearMonth, row.opType);
    acc.set(k, (acc.get(k) ?? 0) + row.total);
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

/** 5) Monthly grand total (all machines, all op types) */
export async function getPackingMonthlyGrandTotal(
  startDate: Date,
  endDate: Date
): Promise<MonthlyGrandTotal[]> {
  const byOp = await getPackingMonthlyByOpType(startDate, endDate);

  const acc = new Map<string, number>(); // key = yearMonth
  for (const row of byOp) {
    acc.set(row.yearMonth, (acc.get(row.yearMonth) ?? 0) + row.total);
  }

  const out: MonthlyGrandTotal[] = [];
  for (const [yearMonth, total] of acc) {
    out.push({ yearMonth, total });
  }
  out.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  return out;
}

// ---------------------------------------------------------------------------
// Convenience: build everything your dashboard needs in a single call
// ---------------------------------------------------------------------------
export async function getPackingDashboardReport(params: {
  /** Inclusive KL-local date range for the dashboard */
  startDate: Date;
  endDate: Date;
}) {
  const { startDate, endDate } = params;

  const [{ byOpType, grand }, monthlyByMachineAndOpType, monthlyByOpType, monthlyGrandTotal] =
    await Promise.all([
      getPackingDaily(startDate, endDate),
      getPackingMonthlyByMachineAndOpType(startDate, endDate),
      getPackingMonthlyByOpType(startDate, endDate),
      getPackingMonthlyGrandTotal(startDate, endDate),
    ]);

  return {
    daily: {
      byOpType,       // [{ date:'YYYY-MM-DD', opType, total }]
      grand,          // [{ date:'YYYY-MM-DD', total }]
    },
    monthly: {
      byMachineAndOpType: monthlyByMachineAndOpType, // [{ yearMonth, machine:'M1'|'M2', opType, total }]
      byOpType: monthlyByOpType,                     // [{ yearMonth, opType, total }]
      grand: monthlyGrandTotal,                      // [{ yearMonth, total }]
    },
  };
}
