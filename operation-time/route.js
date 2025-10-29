import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// D1..D31 in order
const DAY_FIELDS = Array.from({ length: 31 }, (_, i) => `D${i + 1}`);

export async function POST(req) {
  try {
    const body = await req.json();

    const operatorIdRaw = String(body?.operatorId ?? "").trim();
    const reportMonth = String(body?.reportMonth ?? "").trim(); // "YYYY-MM"
    const sectionType = String(body?.operationType ?? "").trim(); // store UI string as-is (e.g., "sewing", "100%")
    const dataEntries = body?.dataEntries ?? {};

    // --- Validate operatorId ---
    if (!operatorIdRaw) {
      return NextResponse.json({ message: "Field 'operatorId' is required." }, { status: 400 });
    }
    if (!/^\d+$/.test(operatorIdRaw)) {
      return NextResponse.json({ message: "Field 'operatorId' must be an integer." }, { status: 400 });
    }
    const OperatorId = Number(operatorIdRaw);

    // --- Validate reportMonth (YYYY-MM) ---
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth)) {
      return NextResponse.json({ message: "Field 'reportMonth' must be in YYYY-MM format." }, { status: 400 });
    }

    // --- Validate sectionType (optional strict list; otherwise just require non-empty) ---
    if (!sectionType) {
      return NextResponse.json({ message: "Field 'operationType' (SectionType) is required." }, { status: 400 });
    }
    // If you want to restrict: const ALLOWED = new Set(["sewing", "100%"]); if (!ALLOWED.has(sectionType)) ...

    // --- Coerce D1..D31: "" -> null, "123" -> 123, else null ---
    const coerced = {};
    for (const key of DAY_FIELDS) {
      const raw = String(dataEntries?.[key] ?? "").trim();
      if (raw === "") coerced[key] = null;
      else if (/^\d+$/.test(raw)) coerced[key] = Number(raw);
      else coerced[key] = null;
    }

    // --- Write to DB ---
    const created = await prisma.operationTime.create({
      data: {
        SectionType: sectionType, // storing UI string directly
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

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[/api/operation-time] POST error:", err);
    return NextResponse.json(
      { message: err?.message || "Failed to save OperationTime record." },
      { status: 500 }
    );
  }
}
