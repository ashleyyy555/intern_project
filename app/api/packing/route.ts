import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// --- Configuration for Data Creation (Input from forms) ---
const UI_FIELDS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];
// Define the exact type of the UI fields based on the map keys for strong typing
type UIFieldKey = keyof typeof CREATION_FIELD_MAP;

// Map UI keys → Prisma column names for CREATION
const CREATION_FIELD_MAP = {
  P1: "M1ForInHouse",
  P2: "M1ForSemi",
  P3: "M1ForCompleteWt100",
  P4: "M1ForCompleteWO100",
  P5: "M2ForInHouse",
  P6: "M2ForSemi",
  P7: "M2ForCompleteWt100",
  P8: "M2ForCompleteWO100",
};

// --- Configuration for Data Reporting (Output to dashboard) ---
// Map front-end OpType labels to the corresponding database field names (M1 & M2)
const REPORT_FIELD_MAP = {
  "in-house": ["M1ForInHouse", "M2ForInHouse"],
  "semi": ["M1ForSemi", "M2ForSemi"],
  "complete wt 100%": ["M1ForCompleteWt100", "M2ForCompleteWt100"],
  "complete wo 100%": ["M1ForCompleteWO100", "M2ForCompleteWO100"],
};


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "").trim();
    const startDateRaw = String(body?.startDate ?? "").trim();
    const endDateRaw = String(body?.endDate ?? "").trim();

    // ---------------------------------------------------------------------
    // SCENARIO 1: RECORD CREATION (Single day entry)
    // ---------------------------------------------------------------------
    if (dateRaw && !startDateRaw && !endDateRaw) {
      return handleRecordCreation(body, dateRaw);
    }
    
    // ---------------------------------------------------------------------
    // SCENARIO 2: REPORTING (Date range query)
    // ---------------------------------------------------------------------
    if (startDateRaw && endDateRaw) {
      return handleReportQuery(body, startDateRaw, endDateRaw);
    }

    // ---------------------------------------------------------------------
    // SCENARIO 3: INVALID REQUEST
    // ---------------------------------------------------------------------
    return NextResponse.json(
        { message: "Invalid request format. Must include 'date' for creation or 'startDate'/'endDate' for reporting." },
        { status: 400 }
    );

  } catch (err) {
    console.error("[/api/packing] POST error:", err);
    // Use optional chaining just in case the error is not a standard Error object
    return NextResponse.json(
      { message: (err as Error)?.message || "Failed to process Packing request." },
      { status: 500 }
    );
  }
}

// --- Handler for Scenario 1: Record Creation ---
async function handleRecordCreation(body: any, dateRaw: string) {
    const dataEntries = body?.dataEntries ?? {};

    // Validate date
    // NOTE: This assumes the 'operationDate' is the unique key in the Packing model.
    const operationDate = new Date(dateRaw);
    if (Number.isNaN(operationDate.getTime())) {
      return NextResponse.json({ message: "Invalid 'date' value." }, { status: 400 });
    }

    // Coerce entries: "" -> null, "123" -> 123, anything else -> null
    const mapped: Record<string, number | null> = {};
    for (const k of UI_FIELDS) {
      const raw = String(dataEntries?.[k] ?? "").trim();
      // FIX: Use type assertion 'k as UIFieldKey' to tell TypeScript that k is a valid key,
      // resolving the red squiggles.
      const dbKey = CREATION_FIELD_MAP[k as UIFieldKey];
      if (raw === "") mapped[dbKey] = null;
      else if (/^\d+$/.test(raw)) mapped[dbKey] = Number(raw);
      else mapped[dbKey] = null;
    }

    // FIX: Change from upsert to create with unique constraint violation handling
    try {
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
    } catch (e) {
        // P2002 is the Prisma error code for a unique constraint violation
        if ((e as any).code === 'P2002') {
            console.warn("[/api/packing] Duplicate entry blocked:", { operationDate: dateRaw });
            return NextResponse.json(
                {
                    message: `Entry blocked. A Packing record for the date ${dateRaw} already exists.`,
                    errorType: "DuplicateEntry"
                },
                { status: 409 } // 409 Conflict is the standard HTTP response for this scenario
            );
        }
        // Re-throw any other errors
        throw e;
    }
}

// --- Handler for Scenario 2: Report Query ---
async function handleReportQuery(body: any, startDateRaw: string, endDateRaw: string) {
    
    // 1. Validate required date range fields
    const startDateObj = new Date(startDateRaw);
    const endDateObj = new Date(endDateRaw);

    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format for 'startDate' or 'endDate'." },
        { status: 400 }
      );
    }
    
    // Adjust endDate to include the entire day for the LCE query
    endDateObj.setHours(23, 59, 59, 999);

    // 2. Query DB for all records within the specified date range
    // NOTE: This query does NOT account for KL midnight boundaries,
    // so data entry MUST be done using clean UTC dates (which new Date("YYYY-MM-DD") provides).
    const records = await prisma.packing.findMany({
      where: {
        operationDate: {
          gte: startDateObj, // Greater than or equal to start date
          lte: endDateObj,   // Less than or equal to end date
        },
      },
      select: {
        operationDate: true, // Needed for potential future daily breakdown/sorting
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

    // 3. Aggregate data by Operation Type
    const aggregatedTotals = Object.keys(REPORT_FIELD_MAP).map((opType) => {
      let total = 0;
      // TS type assertion for field mapping key
      const dbFields = REPORT_FIELD_MAP[opType as keyof typeof REPORT_FIELD_MAP];

      // Sum the values for all records and all relevant machine fields
      records.forEach(record => {
        dbFields.forEach(field => {
          // Safely sum numbers, treating null/undefined as 0
          // Access fields using bracket notation since 'record' is a partial type
          total += (record as any)[field] ?? 0; 
        });
      });
      
      return {
        opType: opType,
        total: total,
      };
    });
    
    // 4. Return the aggregated structure (matching the front-end expectation)
    return NextResponse.json({ 
        daily: { byOpType: aggregatedTotals }
    }, { status: 200 });
}
