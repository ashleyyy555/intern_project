// app/actions/reports/inspection.ts
"use server";
import { getInspectionDashboardReport } from "@/lib/reports/inspection";

export async function fetchInspectionDashboard(input: { startDate: string; endDate: string }) {
  return getInspectionDashboardReport({
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
  });
}
