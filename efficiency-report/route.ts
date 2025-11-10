import { NextResponse } from "next/server";
import { 
  getSewingEfficiencyReport, 
  getInspection100EfficiencyReport 
} from "@/lib/reports/efficiency"; 
import {
  getSewingUtilizationReport,
  getInspection100UtilizationReport
} from "@/lib/reports/utilization";
import { getInspectionDashboardReport } from "@/lib/reports/inspection";
import { getSewingReports } from "@/lib/reports/sewing";


export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const startDateRaw = url.searchParams.get("startDate");
    const endDateRaw = url.searchParams.get("endDate");

    if (!startDateRaw || !endDateRaw) {
      return NextResponse.json({ message: "Missing startDate or endDate query parameter." }, { status: 400 });
    }

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

    const sewingReports = await getSewingReports({ start: startDate, end: endDate });

    const input = { startDate, endDate };

    // Fetch all data concurrently
    const [
      sewingEfficiency, 
      inspectionEfficiency, 
      sewingUtilization, 
      inspectionUtilization,
      inspectionDashboard,
    ] = await Promise.all([
      getSewingEfficiencyReport(input),
      getInspection100EfficiencyReport(input),
      getSewingUtilizationReport(input),
      getInspection100UtilizationReport(input),
      getInspectionDashboardReport(input),
    ]);

    const sumField = (arr: any[], field: string) => arr.reduce((sum, row) => sum + (row[field] || 0), 0);

    // Total actual outputs
const totalActualSewingOutput = Object.values(sewingReports.monthlyByOpTypeRaw).reduce(
  (monthSum, opTypeTotals) => 
    monthSum + Object.values(opTypeTotals).reduce((sum, val) => sum + val, 0),
  0
);

    // ✅ use grand total from inspection dashboard
    const totalActualInspectionOutput = inspectionDashboard.monthly.grand.reduce((sum, row) => sum + (row.total || 0), 0);

const responseData = {
  sewing: {
    ratedOutput: sumField(sewingEfficiency.monthly, 'ratedOutput'),
    actualOutput: totalActualSewingOutput, // ✅ replaced with date-range total
    ratedOperatingTimeMins: sumField(sewingUtilization.monthly, 'ratedOperatingTimeMins'),
    actualOperatingTimeMins: sumField(sewingUtilization.monthly, 'operatingTimeMins'),
  },
  inspection100: {
    ratedOutput: sumField(inspectionEfficiency.monthly, 'ratedOutput'),
    actualOutput: totalActualInspectionOutput,
    ratedOperatingTimeMins: sumField(inspectionUtilization.monthly, 'ratedOperatingTimeMins'),
    actualOperatingTimeMins: sumField(inspectionUtilization.monthly, 'operatingTimeMins'),
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
