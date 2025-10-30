import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Required for database access

// Keep it Node runtime
export const runtime = "nodejs";

// =========================================================================
// --- COMMON CONSTANTS & HELPERS (For both Creation & Reporting) ---
// =========================================================================

// Allowed operationType values (for Creation)
const ALLOWED_OP_TYPES = new Set(["SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST"]);

// The exact fields in your Sewing model — used to pick & coerce (for Creation)
const SEWING_NUMERIC_FIELDS = [
  "C1","C2","C3","C4","C5","C6","C7","C8",
  "C9","C10","C11","C12",
  "S1","S2","S3","S4","S5","S6","S7","S8",
  "S9","S10","S11","S12","S13","S14","S15","S16",
  "S17","S18","S19","S20","S21","S22","S23","S24",
  "ST1","ST2",
];

/** All machine columns in your Sewing model (for Reporting) */
export const SEWING_MACHINE_COLS = SEWING_NUMERIC_FIELDS as unknown as readonly [
  "C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12",
  "S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12",
  "S13","S14","S15","S16","S17","S18","S19","S20","S21","S22","S23","S24",
  "ST1","ST2",
];
export type SewingMachineCol = typeof SEWING_MACHINE_COLS[number];

/** Exact operation types + their multipliers (for Reporting) */
export const SEWING_OP_TYPES = Array.from(ALLOWED_OP_TYPES) as readonly [
  "SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST",
];
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


// --- CREATION-SPECIFIC HELPERS ---

/**
 * Coerces value to integer or null. (From user's creation code)
 */
function toIntOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isInteger(v)) return v;
  const s = String(v).trim();
  if (s === "") return null;
  return /^\d+$/.test(s) ? Number(s) : null; // Int? fields → only non-negative integers
}

/**
 * Calculates Kuala Lumpur midnight UTC time. (From user's creation code)
 * NOTE: Not used in the final creation logic, but kept for completeness.
 */
function klMidnightUTC(input: Date | string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);

  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const day = Number(parts.find(p => p.type === "day")!.value);

  const kl = new Date(Date.UTC(y, m - 1, day, 0, 0, 0));
  const tzOffsetMin = -new Date(kl.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })).getTimezoneOffset();
  const utcMs = kl.getTime() - tzOffsetMin * 60_000;
  return new Date(utcMs);
}


// =========================================================================
// --- REPORTING LOGIC (formerly in lib/sewing.ts) ---
// =========================================================================

/** KL day bucketing (00:00 KL → stable date key) */
function klDayKey(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}

/** YYYY-MM key */
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

/** Core fetch (bounded by date range, inclusive of start, exclusive of end) */
async function fetchSewingRows(start?: Date, end?: Date) {
  const where: any = {};
  if (start || end) {
    where.operationDate = {};
    if (start) where.operationDate.gte = start;
    if (end)   where.operationDate.lt = end; // lt ensures we include the full start day up to the midnight of the end day
  }
  return prisma.sewing.findMany({ where }) as Promise<SewingRow[]>;
}

/** Sum by machine (daily, weighted) */
async function getWeightedDailyTotalsByMachine(params?: {
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

/** Daily total of ALL machines GROUPED BY operationType (raw) */
async function getDailyTotalsByOperationTypeRaw(params?: {
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

/** Monthly total of ALL machines GROUPED BY operationType (raw) */
async function getMonthlyTotalsByOperationTypeRaw(params?: {
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

/** Convenience aggregator for all reports */
async function getSewingReports(params?: { start?: Date; end?: Date }) {
  const [weightedDailyByMachine, dailyByOpTypeRaw, monthlyByOpTypeRaw] =
    await Promise.all([
      getWeightedDailyTotalsByMachine(params),
      getDailyTotalsByOperationTypeRaw(params),
      getMonthlyTotalsByOperationTypeRaw(params),
    ]);

  return {
    weightedDailyByMachine,
    dailyByOpTypeRaw,
    monthlyByOpTypeRaw,
  };
}

// =========================================================================
// --- API HANDLER (Refactored to handle Creation OR Report) ---
// =========================================================================

/**
 * Handles POST requests for either:
 * 1. Creating a new Sewing record (requires 'date', 'operationType', 'dataEntries').
 * 2. Fetching a Sewing report (requires 'startDate', 'endDate').
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check for CREATION fields
    const dateRaw = String(body?.date ?? "");
    const operationType = String(body?.operationType ?? "").trim();
    const dataEntries = body?.dataEntries ?? {};

    // Check for REPORT fields
    const startDateRaw = String(body?.startDate ?? "");
    const endDateRaw = String(body?.endDate ?? "");

    // --- Decision Tree: CREATION (Priority 1) ---
    if (dateRaw && operationType) {
      
      // --- Creation Validations ---
      // NOTE: The 'operationDate' used for the unique key must be a clean Date object 
      // without time component for the upsert/create logic to match against the DB.
      // We rely on 'new Date(dateRaw)' to produce the UTC midnight date if dateRaw is "YYYY-MM-DD".
      const operationDate = new Date(dateRaw);
      if (Number.isNaN(operationDate.getTime())) {
        return NextResponse.json({ message: "Invalid 'date' value." }, { status: 400 });
      }

      if (!ALLOWED_OP_TYPES.has(operationType)) {
        return NextResponse.json({ message: "Invalid or missing 'operationType'." }, { status: 400 });
      }

      // --- Coerce entries: "" -> null, "123" -> 123, anything else -> null ---
      const coerced: Record<string, number | null> = {};
      for (const key of SEWING_NUMERIC_FIELDS) {
        coerced[key] = toIntOrNull(dataEntries?.[key]);
      }

      // --- FIX: Change from upsert to conditional create ---
      try {
          const saved = await prisma.sewing.create({ // CHANGED from upsert to create
            data: {
              operationDate,
              operationType,
              ...coerced,
            },
            select: {
              id: true,
              operationDate: true,
              operationType: true,
            },
          });
          
          // Successfully created
          return NextResponse.json({ data: saved }, { status: 201 });

      } catch (e) {
          // Check if the error is a unique constraint violation (P2002)
          // This happens when a record with the same operationDate and operationType already exists.
          if ((e as any).code === 'P2002') {
              console.warn("[/api/sewing-report] Duplicate entry blocked:", { operationDate: dateRaw, operationType });
              return NextResponse.json(
                  { 
                      message: `Duplicate entry blocked. A record for Date: ${dateRaw} and Operation Type: ${operationType} already exists.`,
                      errorType: "DuplicateEntry"
                  }, 
                  { status: 409 } // 409 Conflict is the standard HTTP response for this scenario
              );
          }
          // Re-throw other errors
          throw e; 
      }
    } 
    
    // --- Decision Tree: REPORT (Priority 2) ---
    // ... (rest of the report logic remains the same)
    // --- Decision Tree: REPORT (Priority 2) ---
    else if (startDateRaw && endDateRaw) {
    
    // --- Report Validations ---
    const start = new Date(startDateRaw); // 'start' is defined here
    
    // Set 'end' to the day AFTER the requested end date
    const end = new Date(endDateRaw); // 'end' is defined here
    end.setDate(end.getDate() + 1); 

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ message: "Invalid 'startDate' or 'endDate' value." }, { status: 400 });
    }
    
    // Call the reporter function
    const reportData = await getSewingReports({ start, end }); // Squiggles here if this line is OUTSIDE the block

    return NextResponse.json(reportData, { status: 200 });
}
    
    // --- Decision Tree: INVALID REQUEST ---
    else {
      return NextResponse.json(
        { message: "Invalid request body. Requires creation fields ('date' and 'operationType') or report fields ('startDate' and 'endDate')." }, 
        { status: 400 }
      );
    }

  } catch (err) {
    console.error("[/api/sewing-report] POST error:", err);
    const message = (err as Error)?.message ?? "Failed to process Sewing request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
