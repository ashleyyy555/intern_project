// /api/inspection - FIXED CODE
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ... (helper functions: OP_MAP, klMidnightUTC, toYearMonthKL, coerceIntOrNull, normalizeIKey)

const OP_MAP: Record<string, "IH"|"S"|"OS"|"B"> = { Inhouse:"IH", Semi:"S", Outsource:"OS", Blower:"B" };

function klMidnightUTC(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(d);
  const y = Number(parts.find(p=>p.type==="year")!.value);
  const m = Number(parts.find(p=>p.type==="month")!.value);
  const day = Number(parts.find(p=>p.type==="day")!.value);
  return new Date(Date.UTC(y, m-1, day, 16, 0, 0));
}
function toYearMonthKL(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Kuala_Lumpur", year:"numeric", month:"2-digit" }).formatToParts(d);
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
  const s = key.replace(/\s+/g, "").toUpperCase();     // trim + uppercase
  const m = s.match(/^I[_-]?0?([1-9]|1[0-4])$/);       // I1..I14 (I_1, I01 ok)
  return m ? (`I${m[1]}` as const) : null;
}


export async function POST(req: Request) {
  const marker = `INSPECT_DEBUG_${Date.now()}`;
  console.log("🧩 hit /api/inspection", marker);

  const type = req.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await req.json() :
               (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data"))
                 ? Object.fromEntries((await req.formData()).entries()) :
                 await req.json().catch(()=> ({}));
  
  // 1) Extract keys from the nested structure sent by the client
  // Flatten the 'dataEntries' object into the main input object for easy processing
  const inputData = { ...body };
  if (inputData.dataEntries && typeof inputData.dataEntries === 'object' && inputData.dataEntries !== null) {
      Object.assign(inputData, inputData.dataEntries);
      delete inputData.dataEntries; // Remove the nested object now that it's flattened
  }

  // Echo what arrived (from the FLATTENED object)
  const keysSeen = Object.keys(inputData);
  console.log("🧩 keysSeen", keysSeen); // This will now include I1...I14

  // 2) Dates
  const rawDate = inputData.operationDate ?? inputData.date ?? inputData.day;
  if (!rawDate) return NextResponse.json({ error:"operationDate is required", marker, keysSeen }, { status:400 });
  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) return NextResponse.json({ error:"Invalid operationDate", marker, keysSeen, rawDate }, { status:400 });
  const operationDate = klMidnightUTC(parsed);
  const yearMonth = toYearMonthKL(parsed);

  // 3) Op type
  let operationType: string = inputData.operationType;
  if (!operationType || typeof operationType !== "string") {
    return NextResponse.json({ error:"operationType is required", marker, keysSeen }, { status:400 });
  }
  operationType = OP_MAP[operationType as keyof typeof OP_MAP] ?? operationType;

  // 4) Process Machine Values
  const machineValues: Record<
    "I1"|"I2"|"I3"|"I4"|"I5"|"I6"|"I7"|"I8"|"I9"|"I10"|"I11"|"I12"|"I13"|"I14",
    number | null
  > = { I1:null,I2:null,I3:null,I4:null,I5:null,I6:null,I7:null,I8:null,I9:null,I10:null,I11:null,I12:null,I13:null,I14:null };

  // First pass: look for I-keys
  for (const [k, v] of Object.entries(inputData)) {
    const canonical = normalizeIKey(k);
    if (canonical !== null){
      machineValues[canonical as keyof typeof machineValues] = coerceIntOrNull(v);
    } 
  }
  // Fallback: exact/lowercase names
  for (const col of Object.keys(machineValues) as (keyof typeof machineValues)[]) {
    if (machineValues[col] === null) {
      const v = (inputData as any)[col] ?? (inputData as any)[String(col).toLowerCase()];
      if (v !== undefined) machineValues[col] = coerceIntOrNull(v);
    }
  }

  const created = await prisma.inspection.create({
    data: { operationDate, operationType, yearMonth, ...machineValues },
    select: {
      id:true, operationDate:true, operationType:true, yearMonth:true,
      I1:true,I2:true,I3:true,I4:true,I5:true,I6:true,I7:true,I8:true,I9:true,I10:true,I11:true,I12:true,I13:true,I14:true,
    },
  });

  // Optional one-time debug echo:
  return NextResponse.json({
    ok: true,
    parsed: { machineValues, keysSeen: Object.keys(inputData) },
    created,
  });
}