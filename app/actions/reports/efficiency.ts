// app/actions/reports/efficiency.ts
"use server";
import { getEfficiencyReport, getSewingEfficiencyReport, getInspection100EfficiencyReport } from "@/lib/reports/efficiency";

export async function fetchEfficiencyReport(input: { process: "sewing" | "inspection100"; startDate: string; endDate: string }) {
  return getEfficiencyReport(input.process, { startDate: new Date(input.startDate), endDate: new Date(input.endDate) });
}

// Or keep the specific ones too:
export async function fetchSewingEfficiencyReport(input: { startDate: string; endDate: string }) {
  return getSewingEfficiencyReport({ startDate: new Date(input.startDate), endDate: new Date(input.endDate) });
}
export async function fetchInspection100EfficiencyReport(input: { startDate: string; endDate: string }) {
  return getInspection100EfficiencyReport({ startDate: new Date(input.startDate), endDate: new Date(input.endDate) });
}
