import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Keep it Node runtime
export const runtime = "nodejs";

/** Allowed process types — match your UI exactly */
const ALLOWED_PROCESS_TYPES = new Set(["Sewing", "100% Inspection"]);

/** Coerce helper: string/number/empty → number | null */
function toNumOrNull(v: unknown) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** API entry point */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "");
    const processType = String(body?.processType ?? "").trim();
    const dataEntries = body?.dataEntries ?? body?.data ?? {};

    // Validate date & process type
    if (!dateRaw || !processType) {
      return NextResponse.json(
        { message: "Missing 'date' or 'processType' field." },
        { status: 400 }
      );
    }

    if (!ALLOWED_PROCESS_TYPES.has(processType)) {
      return NextResponse.json(
        { message: "Invalid 'processType' value." },
        { status: 400 }
      );
    }

    // Store as date-only (your Prisma fields are @db.Date)
    const operationDate = new Date(`${dateRaw}T00:00:00Z`);
    if (Number.isNaN(operationDate.getTime())) {
      return NextResponse.json({ message: "Invalid date format." }, { status: 400 });
    }

    // ------------------------------------------------------------------
    // Branch by process type → write to the correct table
    // ------------------------------------------------------------------
    if (processType === "Sewing") {
      // NOTE: Sewing has M1 and DOES NOT have M6/M7
      const payload = {
        operationDate,
        // Targets
        m1_target_panel: toNumOrNull(dataEntries.M1),
        // Normal time
        m2_workers_normal: toNumOrNull(dataEntries.M2),
        m3_operating_mins_normal: toNumOrNull(dataEntries.M3),
        // Overtime
        m4_workers_ot: toNumOrNull(dataEntries.M4),
        m5_operating_mins_ot: toNumOrNull(dataEntries.M5),
      };

      try {
        // FIX: Replaced upsert with create to enforce no overwrites
        const saved = await prisma.efficiencySewing.create({
          data: payload,
          select: { id: true, operationDate: true },
        });

        return NextResponse.json(
          { ok: true, table: "EfficiencySewing", data: saved },
          { status: 201 }
        );
      } catch (err: any) {
        if (err?.code === "P2002") {
          return NextResponse.json(
            { 
              message: `Duplicate entry blocked for Sewing efficiency on date ${dateRaw}.`,
              errorType: "DuplicateEntry"
            },
            { status: 409 }
          );
        }
        throw err; // Re-throw other errors for outer catch
      }
    }

    if (processType === "100% Inspection") {
      // NOTE: Inspection has ONLY M6/M7 (no M1)
      const payload = {
        operationDate,
        // Targets (inspection only)
        m1_target_panel: toNumOrNull(dataEntries.M1),
        m6_target_duffel: toNumOrNull(dataEntries.M6),
        m7_target_blower: toNumOrNull(dataEntries.M7),
        // Normal time
        m2_workers_normal: toNumOrNull(dataEntries.M2),
        m3_operating_mins_normal: toNumOrNull(dataEntries.M3),
        // Overtime
        m4_workers_ot: toNumOrNull(dataEntries.M4),
        m5_operating_mins_ot: toNumOrNull(dataEntries.M5),
      };

      try {
        // FIX: Replaced upsert with create to enforce no overwrites
        const saved = await prisma.efficiencyInspection100.create({
          data: payload,
          select: { id: true, operationDate: true },
        });

        return NextResponse.json(
          { ok: true, table: "EfficiencyInspection100", data: saved },
          { status: 201 }
        );
      } catch (err: any) {
        if (err?.code === "P2002") {
          return NextResponse.json(
            { 
              message: `Duplicate entry blocked for 100% Inspection efficiency on date ${dateRaw}.`,
              errorType: "DuplicateEntry"
            },
            { status: 409 }
          );
        }
        throw err; // Re-throw other errors for outer catch
      }
    }

    // Should never reach here because of ALLOWED_PROCESS_TYPES
    return NextResponse.json({ message: "Unhandled processType." }, { status: 400 });
  } catch (err) {
    console.error("[/api/efficiency] POST error:", err);
    const message = (err as Error)?.message ?? "Failed to process efficiency entry.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
