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

function klMidnightUTC(input: Date | string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;

  // Extract KL components, then construct a UTC Date at that local midnight
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);

  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const day = Number(parts.find(p => p.type === "day")!.value);

  // Create a Date at KL midnight by first creating in KL via toLocaleString, then adjust:
  // Simpler: make a Date from ISO "YYYY-MM-DDT00:00:00" and let JS treat it as local?
  // To be explicit and timezone-agnostic, we use Date.UTC and then subtract KL offset.
  // But offset varies with DST (not applicable in MY). We'll compute offset dynamically:
  const kl = new Date(Date.UTC(y, m - 1, day, 0, 0, 0));
  // Determine KL offset (minutes) for that date:
  const tzOffsetMin = -new Date(kl.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })).getTimezoneOffset();
  // Convert local (KL midnight) to UTC by subtracting offset:
  const utcMs = kl.getTime() - tzOffsetMin * 60_000;
  return new Date(utcMs);
}

function toIntOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isInteger(v)) return v;
  const s = String(v).trim();
  if (s === "") return null;
  return /^\d+$/.test(s) ? Number(s) : null; // Int? fields → only non-negative integers
}


export async function POST(req: Request) {
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
    const coerced: Record<string, number | null> = {};
    for (const key of SEWING_NUMERIC_FIELDS) {
      coerced[key] = toIntOrNull(dataEntries?.[key]);
    }


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
    const message = (err as Error)?.message ?? "Failed to save Sewing record.";
    return NextResponse.json({ message }, { status: 500 });
  }
}