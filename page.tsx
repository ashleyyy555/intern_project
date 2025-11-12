"use client";

import React, { useState, useEffect } from "react";
// Removed import ExcelJS from "exceljs"; to fix compilation error.
// Export functionality will now use native JavaScript to generate a CSV file.

// --- Helper Functions ---
const getISODate = (d: Date) => d.toISOString().split("T")[0];

const getDefaultDates = () => {
  const today = new Date();
  const defaultEnd = getISODate(today);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  const defaultStart = getISODate(sevenDaysAgo);

  return { defaultStart, defaultEnd };
};

const formatDisplayDate = (isoDateStr: string) => {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  return `${year}/${month}/${day}`;
};


// --- API Fetch Functions ---
const fetchCuttingReport = async (startDateObj: Date, endDateObj: Date) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

  const response = await fetch("/api/cutting-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: startDateISO, endDate: endDateISO }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `Failed to fetch cutting report: ${errorBody.error || errorBody.message || "Server error"}`
    );
  }

  return response.json();
};

const fetchSewingReport = async (startDateObj: Date, endDateObj: Date) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

  // NOTE: Assuming /api/sewing routes to your sewing-report logic.
  const response = await fetch("/api/sewing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: startDateISO, endDate: endDateISO }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `Failed to fetch sewing report: ${errorBody.error || errorBody.message || "Server error"}`
    );
  }

  return response.json();
};

const fetchInspectionReport = async (startDateObj: Date, endDateObj: Date) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

  const response = await fetch("/api/inspection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: startDateISO, endDate: endDateISO }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `Failed to fetch inspection report: ${errorBody.error || errorBody.message || "Server error"}`
    );
  }

  return response.json();
};

const fetchPackingReport = async (startDateObj: Date, endDateObj: Date) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

  const response = await fetch("/api/packing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: startDateISO, endDate: endDateISO }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `Failed to fetch packing report: ${errorBody.error || errorBody.message || "Server error"}`
    );
  }

  return response.json();
};

// --------------------------------------------------------------------------------
// --- Table Component: CUTTING (Updated to show all panelIDs, including zero totals) ---
// --------------------------------------------------------------------------------
const ALL_PANEL_IDS = ["Circular Fabric", "Heavy Duty Fabric", "Light Duty Fabric", "Type 110", "Type 148"]; // Example list

function CuttingTotalTable({ data }: { data: any }) {
  const TITLE = "Cutting Report";

  const panelsByIDFromData = (data?.panels || []).reduce((acc: Record<string, number>, p: any) => {
    const idLabel = p.panelId;
    acc[idLabel] = (acc[idLabel] || 0) + p.pcs;
    return acc;
  }, {});

  const finalPanelsByID = ALL_PANEL_IDS.reduce((acc: Record<string, number>, panelId) => {
    acc[panelId] = panelsByIDFromData[panelId] || 0;
    return acc;
  }, {} as Record<string, number>);

  const dataKeys = Object.keys(finalPanelsByID);

  if (dataKeys.length === 0) {
    return (
      <div className="p-4 border-t border-gray-200">
        <p className="text-center text-gray-500 italic">
          No {TITLE} data or panel definitions available.
        </p>
      </div>
    );
  }

  const grandTotal = (data?.panels || []).reduce((a: number, p: any) => a + p.pcs, 0);

  return (
    <>
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Total {TITLE} by Panel ID
      </h2>

      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4">
                Panel ID
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
                Total PCS
              </th>
              <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                GRAND TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataKeys.map((panelId, index) => (
              <tr key={panelId} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                  {panelId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                  {finalPanelsByID[panelId].toLocaleString()}
                </td>
                {index === 0 && (
                  <td
                    rowSpan={dataKeys.length}
                    className="px-6 py-4 whitespace-nowrap text-3xl font-extrabold text-black text-right bg-white align-middle w-1/4"
                  >
                    <div className="text-xs font-medium uppercase mb-1">Overall Grand Total</div>
                    {grandTotal.toLocaleString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --------------------------------------------------------------------------------
// --- Table Component: SEWING (Updated to show Weighted totals) ---
// --------------------------------------------------------------------------------
function SewingTotalTable({ dailyData }: { dailyData: any }) {
  const OP_TYPES = ["SP1", "SP2", "PC", "SB", "SPP", "SS", "SSP", "SD", "ST"];
  const TITLE = "Sewing";

  const totalsByOpTypeFromData: Record<string, number> = {};
  let overallGrandTotal = 0;

  // *** MODIFIED: Use dailyWeightedByOpType for multiplied totals ***
  if (dailyData?.dailyWeightedByOpType) {
    Object.values(dailyData.dailyWeightedByOpType).forEach((dateData: any) => {
      Object.entries(dateData as Record<string, number>).forEach(([op, total]) => {
        if (OP_TYPES.includes(op) && typeof total === "number") {
          totalsByOpTypeFromData[op] = (totalsByOpTypeFromData[op] || 0) + total;
          overallGrandTotal += total;
        }
      });
    });
  }

  const finalTotalsByOpType = OP_TYPES.reduce((acc: Record<string, number>, opType) => {
    acc[opType] = totalsByOpTypeFromData[opType] || 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Total {TITLE} by Operation Type (Weighted)
      </h2>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4">
                Operation Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
                Total Sewing (Weighted)
              </th>
              <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                OVERALL TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {OP_TYPES.map((op, index) => (
              <tr key={op} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                  {op}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                  {finalTotalsByOpType[op]?.toLocaleString() || 0}
                </td>
                {index === 0 && (
                  <td
                    rowSpan={OP_TYPES.length}
                    className="px-6 py-4 whitespace-nowrap text-3xl font-extrabold text-black text-right bg-white align-middle w-1/4"
                  >
                    <div className="text-xs font-medium uppercase mb-1">Overall Grand Total</div>
                    {overallGrandTotal.toLocaleString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --------------------------------------------------------------------------------
// --- Table Component: INSPECTION (Updated to show 0 totals) ---
// --------------------------------------------------------------------------------
function InspectionTotalTable({ dailyData }: { dailyData: any }) {
  const OP_TYPES = ["IH", "S", "OS", "B"];
  const TITLE = "Inspection";

  const totalsByOpTypeFromData = (dailyData?.byOpType || []).reduce(
    (acc: Record<string, number>, row: any) => {
      if (OP_TYPES.includes(row.opType)) {
        acc[row.opType] = (acc[row.opType] || 0) + row.total;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const finalTotalsByOpType = OP_TYPES.reduce((acc: Record<string, number>, opType) => {
    acc[opType] = totalsByOpTypeFromData[opType] || 0;
    return acc;
  }, {} as Record<string, number>);

  const overallGrandTotal = (Object.values(totalsByOpTypeFromData) as number[]).reduce(
    (sum, total) => sum + total,
    0
  );

  return (
    <>
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Total {TITLE} by Operation Type
      </h2>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4">
                Operation Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
                Total Inspections
              </th>
              <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                OVERALL TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {OP_TYPES.map((op, index) => (
              <tr key={op} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                  {op}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                  {finalTotalsByOpType[op]?.toLocaleString() || 0}
                </td>
                {index === 0 && (
                  <td
                    rowSpan={OP_TYPES.length}
                    className="px-6 py-4 whitespace-nowrap text-3xl font-extrabold text-black text-right bg-white align-middle w-1/4"
                  >
                    <div className="text-xs font-medium uppercase mb-1">Overall Grand Total</div>
                    {overallGrandTotal.toLocaleString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --------------------------------------------------------------------------------
// --- Table Component: PACKING (Updated to show 0 totals) ---
// --------------------------------------------------------------------------------
function PackingTotalTable({ dailyData }: { dailyData: any }) {
  const OP_TYPES = ["in-house", "semi", "complete wt 100%", "complete wo 100%"];
  const TITLE = "Packing";

  const totalsByOpTypeFromData = (dailyData?.byOpType || []).reduce(
    (acc: Record<string, number>, row: any) => {
      if (OP_TYPES.includes(row.opType)) {
        acc[row.opType] = (acc[row.opType] || 0) + row.total;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const finalTotalsByOpType = OP_TYPES.reduce((acc: Record<string, number>, opType) => {
    acc[opType] = totalsByOpTypeFromData[opType] || 0;
    return acc;
  }, {} as Record<string, number>);

  const overallGrandTotal = (Object.values(totalsByOpTypeFromData) as number[]).reduce(
    (sum, total) => sum + total,
    0
  );

  return (
    <>
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Total {TITLE} by Operation Type
      </h2>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4">
                Operation Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
                Total Packing
              </th>
              <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                OVERALL TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {OP_TYPES.map((op, index) => (
              <tr key={op} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                  {op}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                  {finalTotalsByOpType[op]?.toLocaleString() || 0}
                </td>
                {index === 0 && (
                  <td
                    rowSpan={OP_TYPES.length}
                    className="px-6 py-4 whitespace-nowrap text-3xl font-extrabold text-black text-right bg-white align-middle w-1/4"
                  >
                    <div className="text-xs font-medium uppercase mb-1">Overall Grand Total</div>
                    {overallGrandTotal.toLocaleString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --------------------------------------------------------------------------------
// --- Main Dashboard Page ---
// --------------------------------------------------------------------------------
export default function DashboardPage() {
  const { defaultStart, defaultEnd } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [lastAppliedRange, setLastAppliedRange] = useState({
    start: defaultStart,
    end: defaultEnd,
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [cuttingReportData, setCuttingReportData] = useState<any>(null);
  const [sewingReportData, setSewingReportData] = useState<any>(null);
  const [inspectionReportData, setInspectionReportData] = useState<any>(null);
  const [packingReportData, setPackingReportData] = useState<any>(null);

  useEffect(() => {
    handleApplyFilter(defaultStart, defaultEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle =
    "p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150";
  const cardStyle =
    "bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit";

  const handleApplyFilter = async (initialStart = startDate, initialEnd = endDate) => {
    const start = initialStart;
    const end = initialEnd;

    if (new Date(start) > new Date(end)) {
      setMessage("Error: Start Date cannot be after End Date.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Fetching data...");

      const startDateObj = new Date(start);
      const endDateObj = new Date(end);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error("Invalid date format detected on client side.");
      }

      const [cuttingData, sewingData, inspectionData, packingData] = await Promise.all([
        fetchCuttingReport(startDateObj, endDateObj),
        fetchSewingReport(startDateObj, endDateObj),
        fetchInspectionReport(startDateObj, endDateObj),
        fetchPackingReport(startDateObj, endDateObj),
      ]);

      setCuttingReportData(cuttingData);
      setSewingReportData(sewingData);
      setInspectionReportData(inspectionData);
      setPackingReportData(packingData);
      setLastAppliedRange({ start, end });

      setMessage(`Data loaded successfully for ${start} to ${end}.`);
    } catch (error: any) {
      console.error("Fetch error:", error);
      setMessage(`Error fetching data: ${error.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Export a single "Summary" sheet: columns = [Section, Item, Total]
  // CONVERTED TO CSV EXPORT TO RESOLVE COMPILATION ISSUE
  const handleExportClick = async () => {
    const safeNum = (v: any) => (typeof v === "number" && isFinite(v) ? v : 0);
  
    try {
      setIsExporting(true);
      setMessage("Preparing data for export...");
    
      // Build a unified array of rows in the order: Cutting, Sewing, Inspection, Packing
      type Row = { section: string; item: string; total: number; isGrand?: boolean };
      const rows: Row[] = [];
    
      // -------- CUTTING (Section=Cutting, Item=Panel ID) --------
      {
        const section = "Cutting";
        const panels = cuttingReportData?.panels ?? [];
        const agg: Record<string, number> = {};
        panels.forEach((p: any) => {
          const id = String(p.panelId ?? "");
          agg[id] = (agg[id] ?? 0) + safeNum(p.pcs);
        });
      
        Object.entries(agg).forEach(([panelId, total]) => {
          rows.push({ section, item: panelId, total });
        });
      
        const grand = panels.reduce((a: number, p: any) => a + safeNum(p.pcs), 0);
        rows.push({ section, item: "GRAND TOTAL", total: grand, isGrand: true });
      }
    
      // -------- SEWING (Section=Sewing, Item=Operation Type) --------
      {
        const section = "Sewing";
        const OP_TYPES = ["SP1", "SP2", "PC", "SB", "SPP", "SS", "SSP", "SD", "ST"];
        
        // Using dailyWeightedByOpType for multiplied totals
        const weighted = sewingReportData?.dailyWeightedByOpType ?? {};
        const totals: Record<string, number> = {};
        let overall = 0;
      
        Object.values(weighted).forEach((dateData: any) => {
          Object.entries(dateData as Record<string, number>).forEach(([op, t]) => {
            if (OP_TYPES.includes(op)) {
              const n = safeNum(t);
              totals[op] = (totals[op] ?? 0) + n;
              overall += n;
            }
          });
        });
      
        // include all OP_TYPES even if zero
        OP_TYPES.forEach(op => {
          rows.push({ section, item: op, total: safeNum(totals[op]) });
        });
        
        rows.push({ section, item: "GRAND TOTAL (Weighted)", total: overall, isGrand: true });
      }
    
      // -------- INSPECTION (Section=Inspection, Item=Operation Type) --------
      {
        const section = "Inspection";
        const OP_TYPES = ["IH", "S", "OS", "B"];
        const arr = inspectionReportData?.daily?.byOpType ?? [];
        const totals: Record<string, number> = {};
        let overall = 0;
      
        arr.forEach((r: any) => {
          if (OP_TYPES.includes(r.opType)) {
            const n = safeNum(r.total);
            totals[r.opType] = (totals[r.opType] ?? 0) + n;
            overall += n;
          }
        });
      
        OP_TYPES.forEach(op => {
          rows.push({ section, item: op, total: safeNum(totals[op]) });
        });
        rows.push({ section, item: "GRAND TOTAL", total: overall, isGrand: true });
      }
    
      // -------- PACKING (Section=Packing, Item=Operation Type) --------
      {
        const section = "Packing";
        const OP_TYPES = ["in-house", "semi", "complete wt 100%", "complete wo 100%"];
        const arr = packingReportData?.daily?.byOpType ?? [];
        const totals: Record<string, number> = {};
        let overall = 0;
      
        arr.forEach((r: any) => {
          if (OP_TYPES.includes(r.opType)) {
            const n = safeNum(r.total);
            totals[r.opType] = (totals[r.opType] ?? 0) + n;
            overall += n;
          }
        });
      
        OP_TYPES.forEach(op => {
          rows.push({ section, item: op, total: safeNum(totals[op]) });
        });
        rows.push({ section, item: "GRAND TOTAL", total: overall, isGrand: true });
      }
    
      // ================= Build CSV (plain text) =================
      const csvRows = [];
      const header = ["Section", "Item", "Total"];
      csvRows.push(header.join(","));

      let currentSection = "";
      rows.forEach((r) => {
          // Only print section if it changes, to mimic merged cells visually in CSV
          let sectionDisplay = "";
          if (r.section !== currentSection) {
              sectionDisplay = r.section;
              currentSection = r.section;
          }

          // Ensure totals are formatted as plain numbers for CSV
          const totalFormatted = r.total;

          // Note: CSV does not support cell merging or bolding, so we rely on simple structure.
          csvRows.push([
              sectionDisplay,
              `"${r.item}"`, // Quote item to protect text with commas (e.g., "complete wt 100%")
              totalFormatted
          ].join(","));
      });
    
      // Create and trigger download
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], {
          type: "text/csv;charset=utf-8;",
      });
      
      const fname = `Production_Summary_${lastAppliedRange.start}_to_${lastAppliedRange.end}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
    
      setMessage("Export complete! File exported as CSV.");
    } catch (err: any) {
      console.error(err);
      setMessage(`Error exporting: ${err?.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };



  const loadingPlaceholder = (
    <div className="mt-8 text-center text-gray-300 border-2 border-dashed border-gray-300 p-12 rounded-lg h-56 flex items-center justify-center">
      <p className="text-xl text-gray-500">Loading data...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 font-sans">
        <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4">
          Production Summary Dashboard
        </h1>

        {/* Date Range Filter */}
        <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 md:space-x-6">
 {/* --- START DATE --- */}
<div className="flex flex-col space-y-1 w-full md:w-auto">
  <label htmlFor="start-date-picker" className="text-sm font-semibold text-gray-700">
    Start Date
  </label>
  <div className="relative">
    {/* Hidden real date input */}
    <input
      id="start-date-picker"
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      className="absolute inset-0 opacity-0 cursor-pointer"
    />

    {/* Fake visible display */}
    <div
      className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                 focus-within:ring-2 focus-within:ring-indigo-500 w-full md:w-44 text-gray-800
                 text-center font-medium select-none"
      onClick={() => {
        // Open the hidden date picker
        const realInput = document.getElementById("start-date-picker") as HTMLInputElement | null;
        if (realInput) realInput.showPicker?.();
      }}
    >
      {formatDisplayDate(startDate)}
    </div>
  </div>
</div>

{/* --- END DATE --- */}
<div className="flex flex-col space-y-1 w-full md:w-auto">
  <label htmlFor="end-date-picker" className="text-sm font-semibold text-gray-700">
    End Date
  </label>
  <div className="relative">
    {/* Hidden real date input */}
    <input
      id="end-date-picker"
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      className="absolute inset-0 opacity-0 cursor-pointer"
    />

    {/* Fake visible display */}
    <div
      className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                 focus-within:ring-2 focus-within:ring-indigo-500 w-full md:w-44 text-gray-800
                 text-center font-medium select-none"
      onClick={() => {
        // Open the hidden date picker
        const realInput = document.getElementById("end-date-picker") as HTMLInputElement | null;
        if (realInput) realInput.showPicker?.();
      }}
    >
      {formatDisplayDate(endDate)}
    </div>
  </div>
</div>


            {/* Adjusted Button Group Container */}
            <div className="flex space-x-3 w-full md:w-80 self-end">
              {/* Search Button */}
              <button
                onClick={() => handleApplyFilter(startDate, endDate)}
                disabled={isLoading || isExporting}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-1/2 
                  ${isLoading || isExporting ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {isLoading ? "Searching..." : "Search"}
              </button>

              {/* Export Button (Excel Green) */}
              <button
                onClick={handleExportClick}
                disabled={isLoading || isExporting}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-1/2 
                  ${isLoading || isExporting ? "bg-green-600 text-white hover:bg-green-700" : "bg-green-600 text-white hover:bg-green-700"}`}
              >
                {isExporting ? "Exporting..." : "Export (CSV)"}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                message.startsWith("Error")
                  ? "bg-red-100 text-red-700"
                  : message.startsWith("Fetching") || message.startsWith("Preparing")
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Display Range */}
        <p className="text-md font-medium text-gray-600">
          Showing data from{" "}
          <span className="text-indigo-600 font-bold">{lastAppliedRange.start}</span> to{" "}
          <span className="text-indigo-600 font-bold">{lastAppliedRange.end}</span>.
        </p>

        {/* Tables */}
        <div className="grid grid-cols-1 gap-8">
          {/* 1. CUTTING TABLE */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit">
            {isLoading ? loadingPlaceholder : <CuttingTotalTable data={cuttingReportData} />}
          </div>

          {/* 2. SEWING TABLE */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit">
            {isLoading ? loadingPlaceholder : <SewingTotalTable dailyData={sewingReportData} />}
          </div>

          {/* 3. INSPECTION TABLE */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit">
            {isLoading ? loadingPlaceholder : (
              <InspectionTotalTable dailyData={inspectionReportData?.daily} />
            )}
          </div>

          {/* 4. PACKING TABLE */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit">
            {isLoading ? loadingPlaceholder : (
              <PackingTotalTable dailyData={packingReportData?.daily} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}