import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Keep it Node runtime
export const runtime = "nodejs";

// Allowed operationType values (adjust as needed)
const ALLOWED_OP_TYPES = new Set(["SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST"]);

// The exact fields in your Sewing model — used to pick & coerce
const SEWING_NUMERIC_FIELDS = [
  "C1","C2","C3","C4","C5","C6","C7","C8",
  "C9","C10","C11","C12",
  "S1","S2","S3","S4","S5","S6","S7","S8",
  "S9","S10","S11","S12","S13","S14","S15","S16",
  "S17","S18","S19","S20","S21","S22","S23","S24",
  "ST1","ST2",
];

// Removed TypeScript type alias as it's not valid in .js files

export async function POST(req) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "");
    const operationType = String(body?.operationType ?? "").trim();
    const dataEntries = body?.dataEntries ?? {};

    // --- Basic validations ---
    if (!dateRaw) {
      return NextResponse.json({ message: "Field 'date' is required." }, { status: 400 });
    }
    const operationDate = new Date(dateRaw);
    if (Number.isNaN(operationDate.getTime())) {
      return NextResponse.json({ message: "Invalid 'date' value." }, { status: 400 });
    }

    if (!operationType || !ALLOWED_OP_TYPES.has(operationType)) {
      return NextResponse.json({ message: "Invalid or missing 'operationType'." }, { status: 400 });
    }

    // --- Coerce entries: "" -> null, "123" -> 123, anything else -> null ---
    const coerced = {};
    SEWING_NUMERIC_FIELDS.forEach((key) => {
      const raw = String(dataEntries?.[key] ?? "").trim();
      if (raw === "") {
        coerced[key] = null;
      } else if (/^\d+$/.test(raw)) {
        coerced[key] = Number(raw);
      } else {
        // Non-numeric text → treat as null to avoid DB errors
        coerced[key] = null;
      }
    });

    // --- Write to DB ---
    const created = await prisma.sewing.create({
      data: {
        operationDate,
        operationType,
        ...coerced,
      },
      select: {
        id: true,
        operationDate: true,
        operationType: true,
        // Return a few fields; omit all 38 if you prefer shorter payloads
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[/api/sewing] POST error:", err);
    return NextResponse.json(
      { message: err?.message || "Failed to save Sewing record." },
      { status: 500 }
    );
  }
}
