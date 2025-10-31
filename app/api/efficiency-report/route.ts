// File location: app/api/efficiency-report/route.ts (or pages/api/efficiency-report.ts)

import { NextResponse } from "next/server";
// Import your reporting functions from the provided library file
import { getSewingEfficiencyReport, getInspection100EfficiencyReport } from "@/lib/reports/efficiency"; 

// Keep it Node runtime
export const runtime = "nodejs";

/** * NOTE: This function temporarily mocks the Actual Output, as the provided 
 * library (`lib/reports/efficiency.ts`) only calculates Rated Output.
 * In a real application, Actual Output would come from another database column or report.
 */
function mockActualOutput(ratedOutput: number): number {
    // Generates a random Actual Output that is 85% to 98% of the rated output.
    const minFactor = 0.85;
    const maxFactor = 0.98;
    const factor = Math.random() * (maxFactor - minFactor) + minFactor;
    return Math.round(ratedOutput * factor);
}

// 🛑 NEW FUNCTION TO MOCK ACTUAL OPERATING TIME 🛑
/**
 * Temporarily mocks the Actual Operating Time for the Utilization calculation.
 * Generates a time that is 90% to 105% of the rated time.
 */
function mockActualOperatingTime(ratedTime: number): number {
    const minFactor = 0.90;
    const maxFactor = 1.05;
    const factor = Math.random() * (maxFactor - minFactor) + minFactor;
    return Math.round(ratedTime * factor);
}

export async function GET(req: Request) {
  try {
    // 1. Extract date parameters
    const url = new URL(req.url);
    const startDateRaw = url.searchParams.get('startDate');
    const endDateRaw = url.searchParams.get('endDate');

    if (!startDateRaw || !endDateRaw) {
      return NextResponse.json(
        { message: "Missing startDate or endDate query parameter." },
        { status: 400 }
      );
    }
    
    // 2. Convert to Date objects
    const startDate = new Date(`${startDateRaw}T00:00:00Z`); 
    const endDate = new Date(`${endDateRaw}T00:00:00Z`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return NextResponse.json({ 
            message: "Invalid date format submitted in query.",
            details: `Received Start: ${startDateRaw}, End: ${endDateRaw}`
        }, { status: 400 });
    }

    const input = { startDate, endDate };
    
    // 3. Fetch data using your library functions
    const [sewingReport, inspectionReport] = await Promise.all([
        getSewingEfficiencyReport(input),
        getInspection100EfficiencyReport(input),
    ]);
    
    // 4. Aggregate Monthly Totals
    const sewingTotalRatedOutput = sewingReport.monthly.reduce((sum, row) => sum + row.ratedOutput, 0);
    const inspectionTotalRatedOutput = inspectionReport.monthly.reduce((sum, row) => sum + row.ratedOutput, 0);

    // 🛑 NEW: Aggregate Rated Operating Time 🛑
    const sewingTotalRatedTime = sewingReport.monthly.reduce((sum, row) => sum + row.operatingTimeMins, 0);
    const inspectionTotalRatedTime = inspectionReport.monthly.reduce((sum, row) => sum + row.operatingTimeMins, 0);

    // 5. Build Final Response (including new operating time data)
    const responseData = {
        sewing: {
            ratedOutput: sewingTotalRatedOutput,
            actualOutput: mockActualOutput(sewingTotalRatedOutput),
            // 🛑 NEW FIELDS 🛑
            operatingTimeMins: sewingTotalRatedTime,
            actualOperatingTimeMins: mockActualOperatingTime(sewingTotalRatedTime), 
        },
        inspection100: {
            ratedOutput: inspectionTotalRatedOutput,
            actualOutput: mockActualOutput(inspectionTotalRatedOutput),
            // 🛑 NEW FIELDS 🛑
            operatingTimeMins: inspectionTotalRatedTime,
            actualOperatingTimeMins: mockActualOperatingTime(inspectionTotalRatedTime),
        },
    };

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error("[/api/efficiency-report] GET error:", err);
    return NextResponse.json({ message: "Failed to generate efficiency report.", error: err.message }, { status: 500 });
  }
}