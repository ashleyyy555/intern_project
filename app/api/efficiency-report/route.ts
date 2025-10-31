// File location: app/api/efficiency-report/route.ts (or pages/api/efficiency-report.ts)

import { NextResponse } from "next/server";
// Import reporting functions for Efficiency (Output)
import { 
  getSewingEfficiencyReport, 
  getInspection100EfficiencyReport 
} from "@/lib/reports/efficiency"; 
// Import reporting functions for Utilization (Time)
import {
  getSewingUtilizationReport,
  getInspection100UtilizationReport
} from "@/lib/reports/utilization";

// Keep it Node runtime
export const runtime = "nodejs";

/**
 * NOTE: This function temporarily mocks the Actual Output, 
 * as the provided library (`lib/reports/efficiency.ts`) only calculates Rated Output.
 * In a real application, Actual Output would come from another database column or report.
 */
function mockActualOutput(ratedOutput: number): number {
  // Generates a random Actual Output that is 85% to 98% of the rated output.
  const minFactor = 0.85;
  const maxFactor = 0.98;
  const factor = Math.random() * (maxFactor - minFactor) + minFactor;
  return Math.round(ratedOutput * factor);
}

// 🛑 REMOVED MOCKING FUNCTION: 
// We no longer need to mock Rated Operating Time as it is now calculated correctly
// in getUtilizationReport.

export async function GET(req: Request) {
  try {
    // 1. Extract date parameters
    const url = new URL(req.url);
    const startDateRaw = url.searchParams.get("startDate");
    const endDateRaw = url.searchParams.get("endDate");

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
      return NextResponse.json(
        { 
          message: "Invalid date format submitted in query.",
          details: `Received Start: ${startDateRaw}, End: ${endDateRaw}` 
        }, 
        { status: 400 }
      );
    }

    const input = { startDate, endDate };

    // 3. Fetch all data concurrently
    const [
      sewingEfficiency, 
      inspectionEfficiency, 
      sewingUtilization, 
      inspectionUtilization
    ] = await Promise.all([
      getSewingEfficiencyReport(input),
      getInspection100EfficiencyReport(input),
      getSewingUtilizationReport(input),
      getInspection100UtilizationReport(input),
    ]);

    // 4. Aggregate Monthly Totals for Output (Efficiency)
    const sewingTotalRatedOutput = sewingEfficiency.monthly.reduce(
      (sum, row) => sum + row.ratedOutput,
      0
    );
    const inspectionTotalRatedOutput = inspectionEfficiency.monthly.reduce(
      (sum, row) => sum + row.ratedOutput,
      0
    );

    // 5. Aggregate Monthly Totals for Time (Utilization)
    // Rated Operating Time (Theoretical Maximum)
    const sewingTotalRatedTime = sewingUtilization.monthly.reduce(
      (sum, row) => sum + row.ratedOperatingTimeMins,
      0
    );
    const inspectionTotalRatedTime = inspectionUtilization.monthly.reduce(
      (sum, row) => sum + row.ratedOperatingTimeMins,
      0
    );
    
    // Actual Operating Time (Recorded)
    const sewingTotalActualTime = sewingUtilization.monthly.reduce(
      (sum, row) => sum + row.operatingTimeMins,
      0
    );
    const inspectionTotalActualTime = inspectionUtilization.monthly.reduce(
      (sum, row) => sum + row.operatingTimeMins,
      0
    );


    // 6. Build Final Response (Combining Efficiency and Utilization metrics)
    const responseData = {
      sewing: {
        // --- Efficiency (Output) Metrics ---
        ratedOutput: sewingTotalRatedOutput,
        actualOutput: mockActualOutput(sewingTotalRatedOutput), // Still mocked

        // --- Utilization (Time) Metrics ---
        ratedOperatingTimeMins: sewingTotalRatedTime,
        actualOperatingTimeMins: sewingTotalActualTime,
      },
      inspection100: {
        // --- Efficiency (Output) Metrics ---
        ratedOutput: inspectionTotalRatedOutput,
        actualOutput: mockActualOutput(inspectionTotalRatedOutput), // Still mocked

        // --- Utilization (Time) Metrics ---
        ratedOperatingTimeMins: inspectionTotalRatedTime,
        actualOperatingTimeMins: inspectionTotalActualTime,
      },
    };

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error("[/api/efficiency-report] GET error:", err);
    return NextResponse.json(
      { message: "Failed to generate efficiency and utilization report.", error: err.message },
      { status: 500 }
    );
  }
}
