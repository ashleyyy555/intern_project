"use server";

import { getSewingReports } from "@/lib/reports/sewing";

/**
 * Fetch summarized sewing data for dashboard display.
 * 
 * @param input.startDate  ISO string (e.g. "2025-10-01")
 * @param input.endDate    ISO string (e.g. "2025-10-31")
 */
export async function fetchSewingDashboard(input: { startDate: string; endDate: string }) {
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  const data = await getSewingReports({ start, end });

  // Optional: derive grand totals for quick dashboard display
  const dailyGrandTotal: Record<string, number> = {};
  const monthlyGrandTotal: Record<string, number> = {};

  // Daily grand total (sum of all opTypes)
  for (const [day, opTypes] of Object.entries(data.dailyByOpTypeRaw)) {
    dailyGrandTotal[day] = Object.values(opTypes).reduce((sum, v) => sum + v, 0);
  }

  // Monthly grand total (sum of all opTypes)
  for (const [ym, opTypes] of Object.entries(data.monthlyByOpTypeRaw)) {
    monthlyGrandTotal[ym] = Object.values(opTypes).reduce((sum, v) => sum + v, 0);
  }

  return {
    weightedDailyByMachine: data.weightedDailyByMachine, // after multipliers
    dailyByOpTypeRaw: data.dailyByOpTypeRaw,             // raw (no multiplier)
    monthlyByOpTypeRaw: data.monthlyByOpTypeRaw,         // raw (no multiplier)
    dailyGrandTotal,
    monthlyGrandTotal,
  };
}
