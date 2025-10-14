import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Accept exactly what the UI sends
const ALLOWED_TYPES = new Set(["Inhouse", "Semi", "Outsource", "Blower"]);

// Numeric fields on the Inspection model
const INSPECTION_FIELDS = [
  "I1","I2","I3","I4","I5","I6","I7","I8",
  "I9","I10","I11","I12","I13","I14",
];

// type InspectionField = (typeof INSPECTION_FIELDS)[number];

export async function POST(req) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "");
    const operationType = String(body?.operationType ?? "").trim();
    const dataEntries = body?.dataEntries ?? {};

    // --- Validate date ---
    if (!dateRaw) {
      return NextResponse.json({ message: "Field 'date' is required." }, { status: 400 });
    }
    const operationDate = new Date(dateRaw);
    if (Number.isNaN(operationDate.getTime())) {
      return NextResponse.json({ message: "Invalid 'date' value." }, { status: 400 });
    }

    // --- Validate operationType exactly as UI strings ---
    if (!ALLOWED_TYPES.has(operationType)) {
      return NextResponse.json({ message: "Invalid or missing 'operationType'." }, { status: 400 });
    }

    // --- Coerce entries: "" -> null, "123" -> 123, anything else -> null ---
    const coerced = {};
    for (const key of INSPECTION_FIELDS) {
      const raw = String(dataEntries?.[key] ?? "").trim();
      if (raw === "") coerced[key] = null;
      else if (/^\d+$/.test(raw)) coerced[key] = Number(raw);
      else coerced[key] = null;
    }

    // --- Write to DB ---
    const created = await prisma.inspection.create({
      data: {
        operationDate,
        operationType, // store UI string directly: "Inhouse" | "Semi" | "Outsource" | "Blower"
        ...coerced,    // I1..I14
      },
      select: {
        id: true,
        operationDate: true,
        operationType: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[/api/inspection] POST error:", err);
    return NextResponse.json(
      { message: err?.message || "Failed to save Inspection record." },
      { status: 500 }
    );
  }
}
