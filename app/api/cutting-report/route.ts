import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const json = (d: any, status = 200) => NextResponse.json(d, { status });

function parseDate(s: string): Date | null {
  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date;
}

export async function POST(req: NextRequest) {
  try {
    const { startDate, endDate } = await req.json();

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
      return json({ message: "Invalid or missing startDate / endDate." }, 400);
    }

    // Aggregate by panelId (the “type” of fabric)
    const panels = await prisma.cutting.groupBy({
      by: ["panelId"],
      _sum: { actualOutput: true },
      where: {
        operationDate: { gte: start, lte: end },
      },
      orderBy: { panelId: "asc" },
    });

    return json({
      panels: panels.map((p) => ({
        panelId: p.panelId,
        pcs: p._sum.actualOutput ?? 0,
      })),
    });
  } catch (err) {
    console.error("[/api/cutting/report] POST error:", err);
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as any).message)
        : "Failed to fetch cutting report.";
    return json({ message }, 500);
  }
}
