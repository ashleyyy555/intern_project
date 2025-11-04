// app/api/operation-time/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/** Day keys D1..D31 */
type DayKey =
  | `D${1}` | `D${2}` | `D${3}` | `D${4}` | `D${5}` | `D${6}` | `D${7}` | `D${8}` | `D${9}` | `D${10}`
  | `D${11}` | `D${12}` | `D${13}` | `D${14}` | `D${15}` | `D${16}` | `D${17}` | `D${18}` | `D${19}` | `D${20}`
  | `D${21}` | `D${22}` | `D${23}` | `D${24}` | `D${25}` | `D${26}` | `D${27}` | `D${28}` | `D${29}` | `D${30}` | `D${31}`;

const DAY_FIELDS: DayKey[] = Array.from({ length: 31 }, (_, i) => `D${i + 1}` as DayKey);

/** Request body shape we expect */
type OperationTimeBody = {
  operatorId?: unknown;
  reportMonth?: unknown;        // "YYYY-MM"
  operationType?: unknown;      // e.g., "Sewing", "100% Inspection", etc.
  dataEntries?: Record<string, unknown>;
};

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function isIntString(s: string): boolean {
  return /^\d+$/.test(s);
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return isIntString(s) ? Number(s) : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as OperationTimeBody;

    // --- Extract & normalize ---
    const operatorIdRaw = String(body?.operatorId ?? "").trim();
    const reportMonth = String(body?.reportMonth ?? "").trim();         // "YYYY-MM"
    const sectionType = String(body?.operationType ?? "").trim();       // e.g. "sewing", "100%"
    const dataEntries = body?.dataEntries ?? {};

    // --- Validate operatorId ---
    if (!operatorIdRaw) {
      return json({ message: "Field 'operatorId' is required." }, 400);
    }
    if (!isIntString(operatorIdRaw)) {
      return json({ message: "Field 'operatorId' must be an integer." }, 400);
    }
    const OperatorId = Number(operatorIdRaw);

    // --- Validate reportMonth (YYYY-MM) ---
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth)) {
      return json({ message: "Field 'reportMonth' must be in YYYY-MM format." }, 400);
    }

    // --- Validate sectionType ---
    if (!sectionType) {
      return json({ message: "Field 'operationType' (SectionType) is required." }, 400);
    }
    // Optional strict allow-list:
    // const ALLOWED = new Set(["cutting","sewing","finishing","100%"]);
    // if (!ALLOWED.has(sectionType)) return json({ message: "Invalid 'operationType'." }, 400);

    // --- Coerce D1..D31: "" → null, "123" → 123, invalid → null ---
    const coerced: Record<DayKey, number | null> = {} as Record<DayKey, number | null>;
    for (const key of DAY_FIELDS) {
      coerced[key] = toNumOrNull((dataEntries as Record<string, unknown>)?.[key]);
    }

    // --- Create only (no overwrite). Expect a unique composite on (SectionType, OperatorId, yearMonth) in your schema. ---
    try {
      const saved = await prisma.operationTime.create({
        data: {
          SectionType: sectionType,
          OperatorId,
          yearMonth: reportMonth,
          ...coerced, // D1..D31
        },
        select: {
          id: true,
          SectionType: true,
          OperatorId: true,
          yearMonth: true,
        },
      });

      return json({ data: saved }, 201);
    } catch (err: unknown) {
      // Prisma unique constraint
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const constraint = `(Section Type: ${sectionType}, Operator ID: ${OperatorId}, Month: ${reportMonth})`;
        console.warn("[/api/operation-time] Duplicate entry blocked:", constraint);
        return json(
          {
            message: `Duplicate entry blocked. A record for this combination already exists: ${constraint}.`,
            errorType: "DuplicateEntry",
          },
          409
        );
      }

      console.error("[/api/operation-time] POST error:", err);
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as any).message)
          : "Failed to save OperationTime record.";
      return json({ message }, 500);
    }
  } catch (outerErr: unknown) {
    console.error("[/api/operation-time] Outer POST error:", outerErr);
    const message =
      typeof outerErr === "object" && outerErr !== null && "message" in outerErr
        ? String((outerErr as any).message)
        : "Invalid request payload.";
    return json({ message }, 400);
  }
}
