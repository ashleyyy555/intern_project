// /api/inspection/route.ts - COMBINED CODE FOR SUBMISSION AND REPORTING

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// Reporting
import { getInspectionDashboardReport } from "@/lib/reports/inspection";

// ---- Helpers ----
const OP_MAP: Record<string, "IH"|"S"|"OS"|"B"> = { Inhouse:"IH", Semi:"S", Outsource:"OS", Blower:"B" };

function klMidnightUTC(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(d);
  const y = Number(parts.find(p=>p.type==="year")!.value);
  const m = Number(parts.find(p=>p.type==="month")!.value);
  const day = Number(parts.find(p=>p.type==="day")!.value);
  return new Date(Date.UTC(y, m-1, day, 0, 0, 0));
}
function toYearMonthKL(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Kuala_Lumpur",
    year:"numeric", month:"2-digit"
  }).formatToParts(d);
  const y = parts.find(p=>p.type==="year")!.value;
  const m = parts.find(p=>p.type==="month")!.value;
  return `${y}-${m}`;
}
function coerceIntOrNull(v: any): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function normalizeIKey(key: string) {
  const s = key.replace(/\s+/g, "").toUpperCase();
  const m = s.match(/^I[_-]?0?([1-9]|1[0-4])$/); // I1..I14 (I_1, I01 ok)
  return m ? (`I${m[1]}` as const) : null;
}

export async function POST(req: Request) {
  const marker = `INSPECT_DEBUG_${Date.now()}`;

  const type = req.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await req.json()
    : (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data"))
      ? Object.fromEntries((await req.formData()).entries())
      : await req.json().catch(()=> ({}));

  // flatten dataEntries
  const inputData: Record<string, any> = { ...body };
  if (inputData.dataEntries && typeof inputData.dataEntries === 'object' && inputData.dataEntries !== null) {
    Object.assign(inputData, inputData.dataEntries);
    delete inputData.dataEntries;
  }

  const rawDate = inputData.operationDate ?? inputData.date ?? inputData.day;
  const { startDate, endDate } = inputData;

  // =========================
  // A) REPORTING MODE
  // =========================
  if (startDate && endDate) {
    try {
      if (typeof startDate !== 'string' || typeof endDate !== 'string') {
        return NextResponse.json(
          { error: "Report dates must be strings.", details: "Provide 'startDate' and 'endDate' as ISO strings." },
          { status: 400 }
        );
      }
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return NextResponse.json({ error: "Invalid 'startDate' or 'endDate'." }, { status: 400 });
      }

      const reportData = await getInspectionDashboardReport({
        startDate: startDateObj,
        endDate: endDateObj,
      });

      return NextResponse.json(reportData);
    } catch (error) {
      console.error("Combined API - Report Generation Error:", error);
      return NextResponse.json(
        { error: "Internal Server Error during report generation", details: (error as Error).message },
        { status: 500 }
      );
    }
  }

  // =========================
  // B) SUBMISSION MODE
  // =========================
  console.log("🧩 hit /api/inspection: SUBMISSION MODE", marker);

  if (!rawDate) {
    return NextResponse.json({ error: "operationDate is required for data submission", marker }, { status: 400 });
  }
  const keysSeen = Object.keys(inputData);

  // Date
  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Invalid operationDate", marker, keysSeen, rawDate }, { status: 400 });
  }
  const operationDate = klMidnightUTC(parsed);
  const yearMonth = toYearMonthKL(parsed);

  // operationType
  let operationType: string = inputData.operationType;
  if (!operationType || typeof operationType !== "string") {
    return NextResponse.json({ error: "operationType is required", marker, keysSeen }, { status: 400 });
  }
  operationType = OP_MAP[operationType as keyof typeof OP_MAP] ?? operationType;

  // I1..I14 values
  type InspectionCol = "I1"|"I2"|"I3"|"I4"|"I5"|"I6"|"I7"|"I8"|"I9"|"I10"|"I11"|"I12"|"I13"|"I14";
  const machineValues: Record<InspectionCol, number | null> = { 
    I1:null,I2:null,I3:null,I4:null,I5:null,I6:null,I7:null,I8:null,I9:null,I10:null,I11:null,I12:null,I13:null,I14:null 
  };

  for (const [k, v] of Object.entries(inputData)) {
    const canonical = normalizeIKey(k);
    if (canonical !== null) {
      machineValues[canonical as InspectionCol] = coerceIntOrNull(v);
    }
  }
  // fallback: exact/lowercase
  (Object.keys(machineValues) as InspectionCol[]).forEach(col => {
    if (machineValues[col] === null) {
      const v = (inputData as any)[col] ?? (inputData as any)[String(col).toLowerCase()];
      if (v !== undefined) machineValues[col] = coerceIntOrNull(v);
    }
  });


  try {
    // 🚀 FIX: Switched from upsert to create to prevent overwriting existing data.
    const saved = await prisma.inspection.create({
      data: { 
        operationDate, 
        operationType, 
        yearMonth, 
        ...machineValues 
      },
      select: {
        id:true, operationDate:true, operationType:true, yearMonth:true,
        I1:true,I2:true,I3:true,I4:true,I5:true,I6:true,I7:true,I8:true,I9:true,I10:true,I11:true,I12:true,I13:true,I14:true,
      },
    });

    return NextResponse.json({
      ok: true,
      parsed: { machineValues, keysSeen: Object.keys(inputData) },
      created: saved,
    }, { status: 201 }); // Use 201 Created for successful insertion
  } catch (prismaError: any) {
    console.error("Prisma WRITE ERROR:", prismaError);
    
    // Check for P2002 - Unique Constraint Violation
    if (prismaError?.code === "P2002") {
      const uniqueCombo = `Date: ${rawDate}, Operation Type: ${operationType}`;
      return NextResponse.json(
        { 
          error: `Duplicate entry blocked. A record for ${uniqueCombo} already exists.`, 
          details: "Use a different operationDate or operationType.",
          errorType: "DuplicateEntry",
          marker 
        },
        { status: 409 } // 409 Conflict: standard response for preventing overwrites
      );
    }
    
    // Handle other database errors
    return NextResponse.json(
      { error: "Database write failed. Check constraints or column limits.", details: (prismaError as Error).message, marker },
      { status: 500 }
    );
  }
}
