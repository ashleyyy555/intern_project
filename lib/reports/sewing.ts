import { prisma } from "@/lib/prisma";

/** KL day bucketing (00:00 KL → stable date key) */
function klDayKey(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}
function yearMonthKey(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  return `${y}-${m}`; // YYYY-MM
}

/** All machine columns in your Sewing model */
export const SEWING_MACHINE_COLS = [
  "C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12",
  "S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12",
  "S13","S14","S15","S16","S17","S18","S19","S20","S21","S22","S23","S24",
  "ST1","ST2",
] as const;
export type SewingMachineCol = typeof SEWING_MACHINE_COLS[number];

/** Exact operation types + their multipliers */
export const SEWING_OP_TYPES = [
  "SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST",
] as const;
export type SewingOpType = typeof SEWING_OP_TYPES[number];

export const SEWING_MULTIPLIER: Record<SewingOpType, number> = {
  SP1: 1,
  SP2: 2,
  PC: 1.5,
  SB: 2,
  SPP: 1,
  SS: 0.2,
  SSP: 0.2,
  SD: 0.6,
  ST: 0.2,
};

/** Prisma row type (partial) */
type SewingRow = {
  id: string;
  operationDate: Date;
  operationType: string;
} & Partial<Record<SewingMachineCol, number | null>>;

/** Safe numeric getter */
function n(v: number | null | undefined) { return typeof v === "number" ? v : 0; }

/** Sum all machine columns (raw, no multiplier) */
function sumRowAllMachinesRaw(row: SewingRow) {
  let total = 0;
  for (const c of SEWING_MACHINE_COLS) total += n(row[c]);
  return total;
}

/** Map<dateKey, Map<machineCol, number>> initialized lazily */
function ensureNested<T extends object, K1 extends string, K2 extends string>(
  obj: Record<K1, Record<K2, number>>,
  k1: K1,
  k2: K2,
) {
  if (!obj[k1]) obj[k1] = {} as Record<K2, number>;
  if (obj[k1][k2] == null) obj[k1][k2] = 0;
}

/** Core fetch (bounded by date range, inclusive) */
async function fetchSewingRows(start?: Date, end?: Date) {
  const where: any = {};
  if (start || end) {
    where.operationDate = {};
    if (start) where.operationDate.gte = start;
    if (end)   where.operationDate.lte = end;
  }
  return prisma.sewing.findMany({ where }) as Promise<SewingRow[]>;
}

/* -----------------------------------------------------------
 * STEP 1 + 2: After multiplying, sum by machine (daily)
 * - For each date, for each machine column, sum(value * multiplier(opType))
 * ----------------------------------------------------------- */
export async function getWeightedDailyTotalsByMachine(params?: {
  start?: Date; end?: Date;
}) {
  const rows = await fetchSewingRows(params?.start, params?.end);

  const result: Record<string, Record<SewingMachineCol, number>> = {};

  for (const row of rows) {
    const dateKey = klDayKey(row.operationDate);
    // multiplier defaults to 1 if an unknown opType sneaks in
    const m = SEWING_MULTIPLIER[(row.operationType as SewingOpType)] ?? 1;

    for (const col of SEWING_MACHINE_COLS) {
      const val = n(row[col]);
      if (val === 0) continue;
      ensureNested(result, dateKey, col);
      result[dateKey][col] += val * m;
    }
  }

  return result;
}

/* -----------------------------------------------------------
 * STEP 3: Daily total of ALL machines GROUPED BY operationType (raw, no multiplier)
 * - For each date, for each operationType, sum(all machine columns)
 * ----------------------------------------------------------- */
export async function getDailyTotalsByOperationTypeRaw(params?: {
  start?: Date; end?: Date;
}) {
  const rows = await fetchSewingRows(params?.start, params?.end);

  const result: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const dateKey = klDayKey(row.operationDate);
    if (!result[dateKey]) result[dateKey] = {};
    if (result[dateKey][row.operationType] == null) result[dateKey][row.operationType] = 0;
    result[dateKey][row.operationType] += sumRowAllMachinesRaw(row);
  }
  return result;
}

/* -----------------------------------------------------------
 * STEP 4: Monthly total of ALL machines GROUPED BY operationType (raw)
 * - Sum of STEP 3 across the month (you can also compute directly)
 * ----------------------------------------------------------- */
export async function getMonthlyTotalsByOperationTypeRaw(params?: {
  start?: Date; end?: Date;
}) {
  const rows = await fetchSewingRows(params?.start, params?.end);

  const result: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const ym = yearMonthKey(row.operationDate);
    if (!result[ym]) result[ym] = {};
    if (result[ym][row.operationType] == null) result[ym][row.operationType] = 0;
    result[ym][row.operationType] += sumRowAllMachinesRaw(row);
  }
  return result;
}

/* -----------------------------------------------------------
 * Convenience aggregator if you want everything in one call
 * ----------------------------------------------------------- */
export async function getSewingReports(params?: { start?: Date; end?: Date }) {
  const [weightedDailyByMachine, dailyByOpTypeRaw, monthlyByOpTypeRaw] =
    await Promise.all([
      getWeightedDailyTotalsByMachine(params),
      getDailyTotalsByOperationTypeRaw(params),
      getMonthlyTotalsByOperationTypeRaw(params),
    ]);

  return {
    weightedDailyByMachine,   // step 1+2
    dailyByOpTypeRaw,         // step 3
    monthlyByOpTypeRaw,       // step 4
  };
}
