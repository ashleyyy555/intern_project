import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Required for database access
import { getSewingReports, SEWING_MACHINE_COLS } from "@/lib/reports/sewing"; // import from your lib

// Keep it Node runtime
export const runtime = "nodejs";

// =========================================================================
// --- COMMON CONSTANTS & HELPERS ---
// =========================================================================

const ALLOWED_OP_TYPES = new Set(["SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST"]);

const SEWING_NUMERIC_FIELDS = SEWING_MACHINE_COLS as readonly string[];

function toIntOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isInteger(v)) return v;
  const s = String(v).trim();
  if (s === "") return null;
  return /^\d+$/.test(s) ? Number(s) : null;
}

// =========================================================================
// --- API HANDLER (POST: CREATE or REPORT) ---
// =========================================================================

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "");
    const operationType = String(body?.operationType ?? "").trim();
    const dataEntries = body?.dataEntries ?? {};

    const startDateRaw = String(body?.startDate ?? "");
    const endDateRaw = String(body?.endDate ?? "");

    // --- CREATION LOGIC ---
    if (dateRaw && operationType) {

      const operationDate = new Date(dateRaw);
      if (Number.isNaN(operationDate.getTime())) {
        return NextResponse.json({ message: "Invalid 'date' value." }, { status: 400 });
      }

      if (!ALLOWED_OP_TYPES.has(operationType)) {
        return NextResponse.json({ message: "Invalid or missing 'operationType'." }, { status: 400 });
      }

      const coerced: Record<string, number | null> = {};
      for (const key of SEWING_NUMERIC_FIELDS) {
        coerced[key] = toIntOrNull(dataEntries?.[key]);
      }

      try {
        const saved = await prisma.sewing.create({
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

        return NextResponse.json({ data: saved }, { status: 201 });

      } catch (e) {
        if ((e as any).code === 'P2002') {
          return NextResponse.json(
            {
              message: `Duplicate entry blocked. A record for Date: ${dateRaw} and Operation Type: ${operationType} already exists.`,
              errorType: "DuplicateEntry"
            },
            { status: 409 }
          );
        }
        throw e;
      }
    } 

    // --- REPORT LOGIC ---
    else if (startDateRaw && endDateRaw) {
      const start = new Date(startDateRaw);
      const end = new Date(endDateRaw);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ message: "Invalid 'startDate' or 'endDate' value." }, { status: 400 });
      }

      // ✅ FIX: getSewingReports is imported from lib, no scoping issues
      const reportData = await getSewingReports({ start, end });

      return NextResponse.json(reportData, { status: 200 });
    }

    // --- INVALID REQUEST ---
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
