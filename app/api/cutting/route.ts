// app/api/cutting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// ---- Types from your UI payload ----
type CuttingBody = {
  date?: unknown;               // "YYYY-MM-DD"
  panelId?: unknown;            // string
  panelType?: unknown;          // "Laminated" | "Unlaminated"
  construction?: unknown;       // number-like (float)
  denier?: unknown;             // number-like (float)
  weight?: unknown;             // number-like (float)
  widthSize?: unknown;          // number-like (float)
  lengthSize?: unknown;         // number-like (float)
  actualOutput?: unknown;       // number-like (int)
};

// ---- Helpers ----
const json = (d: any, status = 200) => NextResponse.json(d, { status });

function parseYYYYMMDD(s: string): Date | null {
  // *** CRITICAL FIX: Trim the input string immediately before regex check ***
  const cleanedString = s.trim(); 
  
  // Strict YYYY-MM-DD regex check
  const m = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(cleanedString);
  if (!m) return null;
  
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  
  // Use UTC midnight so it maps cleanly to @db.Date
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  
  // Guard overflow dates (e.g., 2025-02-31)
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

function toFloat(v: unknown, field: string): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Field '${field}' must be a valid number.`);
  return n;
}

function toInt(v: unknown, field: string): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`Field '${field}' must be an integer.`);
  return n;
}

const ALLOWED_PANEL_TYPES = new Set(["Laminated", "Unlaminated"]);

// ---- POST /api/cutting ----
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as CuttingBody;

    // Required: date, panelId, panelType, all measurements
    const dateStr = String(body?.date ?? "").trim();
    // This call now uses the fixed parseYYYYMMDD
    const date = parseYYYYMMDD(dateStr); 
    if (!date) return json({ message: "Field 'date' must be in YYYY-MM-DD and valid." }, 400);

    const panelId = String(body?.panelId ?? "").trim();
    if (!panelId) return json({ message: "Field 'panelId' is required." }, 400);

    const panelType = String(body?.panelType ?? "").trim();
    if (!ALLOWED_PANEL_TYPES.has(panelType)) {
      return json({ message: "Field 'panelType' must be 'Laminated' or 'Unlaminated'." }, 400);
    }

    // Coerce numeric fields. All are required based on your UI.
    const construction = toFloat(body?.construction, "construction");
    const denier = toFloat(body?.denier, "denier");
    const weight = toFloat(body?.weight, "weight");
    const widthSize = toFloat(body?.widthSize, "widthSize");
    const lengthSize = toFloat(body?.lengthSize, "lengthSize");
    const actualOutput = toInt(body?.actualOutput, "actualOutput");

    const requiredNumericFields = {
      construction,
      denier,
      weight,
      widthSize,
      lengthSize,
      actualOutput,
    };
    for (const [k, v] of Object.entries(requiredNumericFields)) {
      if (v === null) return json({ message: `Field '${k}' is required.` }, 400);
    }

    // Create new row (duplicates allowed by schema)
    const created = await prisma.cutting.create({
      data: {
        operationDate: date,                 // @db.Date
        panelId,
        panelType: panelType as any,         // enum PanelType
        construction: construction!,         // Float
        denier: denier!,                     // Float
        weight: weight!,                     // Float
        widthSize: widthSize!,               // Float
        lengthSize: lengthSize!,             // Float
        actualOutput: actualOutput!,         // Int
      },
      select: {
        id: true,
        operationDate: true,
        panelId: true,
        panelType: true,
        actualOutput: true,
        createdAt: true,
      },
    });

    return json({ data: created }, 201);
  } catch (err) {
    console.error("[/api/cutting] POST error:", err);
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as any).message)
        : "Failed to save cutting record.";
    return json({ message }, 500);
  }
}