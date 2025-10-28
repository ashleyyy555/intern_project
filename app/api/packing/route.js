import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// UI keys in your form
const UI_FIELDS = ["P1","P2","P3","P4","P5","P6","P7","P8"];
// type UIKey = (typeof UI_FIELDS)[number]; // Remove or comment out TypeScript-only code

// Map UI keys → Prisma column names
const FIELD_MAP = {
  P1: "M1ForInHouse",
  P2: "M1ForSemi",
  P3: "M1ForCompleteWt100",
  P4: "M1ForCompleteWO100",
  P5: "M2ForInHouse",
  P6: "M2ForSemi",
  P7: "M2ForCompleteWt100",
  P8: "M2ForCompleteWO100",
};

export async function POST(req) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "");
    const dataEntries = body?.dataEntries ?? {};

    // --- Validate date ---
    if (!dateRaw) {
      return NextResponse.json({ message: "Field 'date' is required." }, { status: 400 });
    }
    const operationDate = new Date(dateRaw);
    if (Number.isNaN(operationDate.getTime())) {
      return NextResponse.json({ message: "Invalid 'date' value." }, { status: 400 });
    }

    // --- Coerce entries: "" -> null, "123" -> 123, anything else -> null ---
    const mapped = {};
    for (const k of UI_FIELDS) {
      const raw = String(dataEntries?.[k] ?? "").trim();
      const dbKey = FIELD_MAP[k];
      if (raw === "") mapped[dbKey] = null;
      else if (/^\d+$/.test(raw)) mapped[dbKey] = Number(raw);
      else mapped[dbKey] = null;
    }

    // --- Write to DB ---
    const created = await prisma.packing.create({
      data: {
        operationDate,
        ...mapped,
      },
      select: {
        id: true,
        operationDate: true,
        M1ForInHouse: true,
        M1ForSemi: true,
        M1ForCompleteWt100: true,
        M1ForCompleteWO100: true,
        M2ForInHouse: true,
        M2ForSemi: true,
        M2ForCompleteWt100: true,
        M2ForCompleteWO100: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[/api/packing] POST error:", err);
    return NextResponse.json(
      { message: err?.message || "Failed to save Packing record." },
      { status: 500 }
    );
  }
}