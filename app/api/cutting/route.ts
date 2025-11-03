// app/api/cutting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// ---- Types from your updated UI payload ----
type CuttingBody = {
  date?: unknown;               // "YYYY-MM-DD"
  panelId?: unknown;            // string
  panelType?: unknown;          // "Laminated" | "Unlaminated"
  constructionA?: unknown;      // number-like (float)
  constructionB?: unknown;      // number-like (float)
  meterage?: unknown;           // number-like (float)
  weight?: unknown;             // number-like (float)
  widthSize?: unknown;          // number-like (float)
  lengthSize?: unknown;         // number-like (float)
  actualOutput?: unknown;       // number-like (int)
};

// ---- Helpers ----
const json = (d: any, status = 200) => NextResponse.json(d, { status });

function parseYYYYMMDD(s: string): Date | null {
  const cleanedString = s.trim();
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
// (Optional) If you want to strictly allow only specific panels, uncomment below and enforce
// const ALLOWED_PANELS = new Set([
//   "Heavy Duty Fabric","Light Duty Fabric","Circular Fabric","Type 110","Type 148"
// ]);

// ---- POST /api/cutting ----
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as CuttingBody;

    // Required: date, panelId, panelType, all measurements
    const dateStr = String(body?.date ?? "").trim();
    const operationDate = parseYYYYMMDD(dateStr);
    if (!operationDate) {
      return json({ message: "Field 'date' must be in YYYY-MM-DD and valid." }, 400);
    }

    const panelId = String(body?.panelId ?? "").trim();
    if (!panelId) return json({ message: "Field 'panelId' is required." }, 400);
    // if (!ALLOWED_PANELS.has(panelId)) return json({ message: "Invalid 'panelId'." }, 400);

    const panelType = String(body?.panelType ?? "").trim();
    if (!ALLOWED_PANEL_TYPES.has(panelType)) {
      return json({ message: "Field 'panelType' must be 'Laminated' or 'Unlaminated'." }, 400);
    }

    // Coerce numeric fields. All are required based on your UI.
    const constructionA = toFloat(body?.constructionA, "constructionA");
    const constructionB = toFloat(body?.constructionB, "constructionB");
    const meterage = toFloat(body?.meterage, "meterage");
    const weight = toFloat(body?.weight, "weight");
    const widthSize = toFloat(body?.widthSize, "widthSize");
    const lengthSize = toFloat(body?.lengthSize, "lengthSize");
    const actualOutput = toInt(body?.actualOutput, "actualOutput");

    const requiredNumericFields = {
      constructionA,
      constructionB,
      meterage,
      weight,
      widthSize,
      lengthSize,
      actualOutput,
    };
    for (const [k, v] of Object.entries(requiredNumericFields)) {
      if (v === null) return json({ message: `Field '${k}' is required.` }, 400);
    }

    // Create new row
    const created = await prisma.cutting.create({
      data: {
        operationDate,                  // @db.Date
        panelId,
        panelType: panelType as any,    // enum PanelType
        constructionA: constructionA!,  // Float
        constructionB: constructionB!,  // Float
        meterage: meterage!,            // Float
        weight: weight!,                // Float
        widthSize: widthSize!,          // Float
        lengthSize: lengthSize!,        // Float
        actualOutput: actualOutput!,    // Int
      },
      select: {
        id: true,
        operationDate: true,
        panelId: true,
        panelType: true,
        constructionA: true,
        constructionB: true,
        meterage: true,
        weight: true,
        widthSize: true,
        lengthSize: true,
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
