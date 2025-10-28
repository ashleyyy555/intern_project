// app/actions/reports/packing.ts (server action) or in an API route
"use server";
import { getPackingDashboardReport } from "@/lib/reports/packing";

export async function fetchPackingDashboard(input: {
  startDate: string; // ISO from client (KL local or plain date)
  endDate: string;
}) {
  const start = new Date(input.startDate);
  const end   = new Date(input.endDate);
  const report = await getPackingDashboardReport({ startDate: start, endDate: end });
  return report;
}
