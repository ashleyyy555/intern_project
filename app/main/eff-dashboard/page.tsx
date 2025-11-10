"use client";

import React, { useState, useEffect, useMemo } from "react";
import ExcelJS from "exceljs";

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

const fetchEfficiencyReportData = async (startDateObj: Date, endDateObj: Date) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

  const response = await fetch(
    `/api/efficiency-report?startDate=${startDateISO}&endDate=${endDateISO}`
  );
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || errorBody.message || "Server error");
  }
  return response.json();
};

const formatDisplayDate = (isoDateStr: string) => {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  return `${year}/${month}/${day}`;
};

// --------------------------------------------------------------------------------
// --- Calculation Hooks ---
// --------------------------------------------------------------------------------

const PHASE_COL_WIDTH = "w-[250px]";
const RATED_COL_WIDTH = "w-[150px]";
const ACTUAL_COL_WIDTH = "w-[180px]";
const EFFICIENCY_COL_WIDTH = "w-[150px]";

function useEfficiencyMetrics(rawReportData: any) {
  return useMemo(() => {
    if (!rawReportData) return [];
    const phasesConfig = [
      { id: "sewing", name: "Sewing", apiKey: "sewing" },
      { id: "inspection100", name: "100% Inspection", apiKey: "inspection100" },
    ];

    return phasesConfig.map((config) => {
      const apiData = rawReportData[config.apiKey] || {};
      const ratedOutput = Math.round(apiData.ratedOutput || 0);
      const actualOutput = Math.round(apiData.actualOutput || 0);
      const efficiency = ratedOutput > 0 ? (actualOutput / ratedOutput) * 100 : 0;
      return {
        phase: config.name,
        id: config.id,
        ratedOutput,
        actualOutput,
        efficiency: efficiency.toFixed(2),
      };
    });
  }, [rawReportData]);
}

function useOperatingTimeMetrics(rawReportData: any) {
  return useMemo(() => {
    if (!rawReportData) return [];
    const phasesConfig = [
      { id: "sewing", name: "Sewing", apiKey: "sewing" },
      { id: "inspection100", name: "100% Inspection", apiKey: "inspection100" },
    ];

    return phasesConfig.map((config) => {
      const apiData = rawReportData[config.apiKey] || {};
      const ratedTime = Math.round(apiData.ratedOperatingTimeMins || 0);
      const actualTime = Math.round(apiData.actualOperatingTimeMins || 0);
      const utilization = ratedTime > 0 ? (actualTime / ratedTime) * 100 : 0;
      return {
        phase: config.name,
        id: config.id,
        ratedTime,
        actualTime,
        utilization: utilization.toFixed(2),
      };
    });
  }, [rawReportData]);
}

// --------------------------------------------------------------------------------
// --- Table Components (UI) ---
// --------------------------------------------------------------------------------

function EfficiencySummaryTable({ rawReportData }: { rawReportData: any }) {
  const metrics = useEfficiencyMetrics(rawReportData);

  return (
    <>
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Production Efficiency (Output)
      </h2>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th
                className={`px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 ${PHASE_COL_WIDTH}`}
              >
                Production Phase
              </th>
              <th
                className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${RATED_COL_WIDTH}`}
              >
                Rated Output
              </th>
              <th
                className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${ACTUAL_COL_WIDTH}`}
              >
                Actual Output
              </th>
              <th
                className={`px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider ${EFFICIENCY_COL_WIDTH} bg-blue-700`}
              >
                Efficiency (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr key={metric.phase} className="hover:bg-blue-50/50">
                <td
                  className={`px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 ${PHASE_COL_WIDTH}`}
                >
                  {metric.phase}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${RATED_COL_WIDTH}`}
                >
                  {metric.ratedOutput.toLocaleString()}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${ACTUAL_COL_WIDTH}`}
                >
                  {metric.actualOutput.toLocaleString()}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-2xl font-extrabold text-right align-middle ${EFFICIENCY_COL_WIDTH} ${
                    parseFloat(metric.efficiency) >= 95
                      ? "text-green-600"
                      : parseFloat(metric.efficiency) >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {metric.efficiency}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OperatingTimeSummaryTable({ rawReportData }: { rawReportData: any }) {
  const metrics = useOperatingTimeMetrics(rawReportData);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Operating Time and Utilization (Time in Minutes)
      </h2>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th
                className={`px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 ${PHASE_COL_WIDTH}`}
              >
                Production Phase
              </th>
              <th
                className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${RATED_COL_WIDTH}`}
              >
                Rated Operating Time
              </th>
              <th
                className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${ACTUAL_COL_WIDTH}`}
              >
                Actual Operating Time
              </th>
              <th
                className={`px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider ${EFFICIENCY_COL_WIDTH} bg-blue-700`}
              >
                Utilization (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr key={metric.phase} className="hover:bg-blue-50/50">
                <td
                  className={`px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 ${PHASE_COL_WIDTH}`}
                >
                  {metric.phase}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${RATED_COL_WIDTH}`}
                >
                  {metric.ratedTime.toLocaleString()}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${ACTUAL_COL_WIDTH}`}
                >
                  {metric.actualTime.toLocaleString()}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-2xl font-extrabold text-right align-middle ${EFFICIENCY_COL_WIDTH} ${
                    parseFloat(metric.utilization) >= 95
                      ? "text-green-600"
                      : parseFloat(metric.utilization) >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {metric.utilization}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// --- Main Dashboard ---
// --------------------------------------------------------------------------------

export default function EfficiencyDashboard() {
  const { defaultStart, defaultEnd } = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [lastAppliedRange, setLastAppliedRange] = useState({
    start: defaultStart,
    end: defaultEnd,
  });
  const [message, setMessage] = useState("");
  const [efficiencyReportData, setEfficiencyReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleApplyFilter = async (
    initialStart = startDate,
    initialEnd = endDate
  ) => {
    if (new Date(initialStart) > new Date(initialEnd)) {
      setMessage("Error: Start Date cannot be after End Date.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Fetching data...");
      const reportData = await fetchEfficiencyReportData(
        new Date(initialStart),
        new Date(initialEnd)
      );
      setEfficiencyReportData(reportData);
      setLastAppliedRange({ start: initialStart, end: initialEnd });
      setMessage(`Report data loaded for ${initialStart} to ${initialEnd}.`);
    } catch (error: any) {
      console.error(error);
      setMessage(`Error fetching data: ${error.message}`);
      setEfficiencyReportData(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    // initial load with defaults
    handleApplyFilter(defaultStart, defaultEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasDataForRange = Boolean(
    efficiencyReportData &&
      (efficiencyReportData.sewing || efficiencyReportData.inspection100)
  );

  // ------------------------------------------------------------------
  // Excel export: single sheet with big title + two bordered tables
  // ------------------------------------------------------------------
  const BLUE = "FF1D4ED8"; // blue header
  const BLUE_LIGHT = "FFE5EDFF"; // very light blue band
  const WHITE = "FFFFFFFF";
  const BLACK = "FF000000"; 
  const BORDER_THIN = {
    style: "thin" as const,
    color: { argb: BLACK }, // black
  };

  const fillSolid = (argb: string) => ({
    type: "pattern" as const,
    pattern: "solid",
    fgColor: { argb },
  });
  const setRangeBorders = (
    ws: ExcelJS.Worksheet,
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        ws.getCell(r, c).border = {
          top: BORDER_THIN,
          left: BORDER_THIN,
          bottom: BORDER_THIN,
          right: BORDER_THIN,
        };
      }
    }
  };

  const handleExport = async () => {
    if (!efficiencyReportData) return;

    try {
      setIsExporting(true);

      const wb = new ExcelJS.Workbook();
      wb.created = new Date();
      wb.modified = new Date();

      const ws = wb.addWorksheet("Efficiency Summary");

      // Set columns (4 total)
      ws.columns = [
        { width: 26 }, // Phase
        { width: 20 }, // Rated
        { width: 24 }, // Actual
        { width: 16 }, // %
      ];

      const phases = [
        { id: "sewing", name: "Sewing" },
        { id: "inspection100", name: "100% Inspection" },
      ];

      // Title
      const titleText = `Efficiency Summary (${lastAppliedRange.start} to ${lastAppliedRange.end})`;
      ws.mergeCells("A1:D1");
      const title = ws.getCell("A1");
      title.value = titleText;
      title.fill = fillSolid(WHITE);
      title.font = { color: { argb: BLACK }, bold: true, size: 16 };
      title.alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(1).height = 28;

      ws.addRow([]); // spacer

      // ------------------ Section 1: Production Efficiency (Output)
      const effHeaderRowIdx = ws.lastRow!.number + 1;
      ws.mergeCells(`A${effHeaderRowIdx}:D${effHeaderRowIdx}`);
      const effHdr = ws.getCell(`A${effHeaderRowIdx}`);
      effHdr.value = "Production Efficiency (Output)";
      effHdr.font = { bold: true, size: 12 };
      effHdr.alignment = { vertical: "middle", horizontal: "left" };
      ws.getRow(effHeaderRowIdx).height = 20;

      const effTableHeaderRowIdx = effHeaderRowIdx + 1;
      ws.addRow(["Phase", "Rated Output", "Actual Output (Input)", "Efficiency %"]);
      ws.getRow(effTableHeaderRowIdx).eachCell((c) => {
        c.fill = fillSolid(BLUE_LIGHT);
        c.font = { color: { argb: BLACK }, bold: true };
        c.alignment = { vertical: "middle", horizontal: "center" };
      });

      const effDataStart = effTableHeaderRowIdx + 1;
      phases.forEach(({ id, name }) => {
        const d = efficiencyReportData[id] || {};
        const rated = Math.round(d.ratedOutput || 0);
        const actual = Math.round(d.actualOutput || 0);
        const eff = rated > 0 ? (actual / rated) * 100 : 0;
        ws.addRow([name, rated, actual, Number(eff.toFixed(2))]);
      });
      const effDataEnd = ws.lastRow!.number;

      // Formats & borders
      for (let r = effDataStart; r <= effDataEnd; r++) {
        ws.getCell(r, 2).numFmt = "#,##0";
        ws.getCell(r, 3).numFmt = "#,##0";
        ws.getCell(r, 4).numFmt = '0.00"%"';
        ws.getCell(r, 2).alignment = { horizontal: "right" };
        ws.getCell(r, 3).alignment = { horizontal: "right" };
        ws.getCell(r, 4).alignment = { horizontal: "right" };
      }
      setRangeBorders(ws, effTableHeaderRowIdx, 1, effDataEnd, 4);
      ws.getRow(effTableHeaderRowIdx).height = 20;

      // Spacer
      ws.addRow([]);
      ws.addRow([]);

      // ------------------ Section 2: Operating Time and Utilization (Minutes)
      const timeHeaderRowIdx = ws.lastRow!.number + 1;
      ws.mergeCells(`A${timeHeaderRowIdx}:D${timeHeaderRowIdx}`);
      const timeHdr = ws.getCell(`A${timeHeaderRowIdx}`);
      timeHdr.value = "Operating Time and Utilization (Minutes)";
      timeHdr.font = { bold: true, size: 12 };
      timeHdr.alignment = { vertical: "middle", horizontal: "left" };
      ws.getRow(timeHeaderRowIdx).height = 20;

      const timeTableHeaderRowIdx = timeHeaderRowIdx + 1;
      ws.addRow(["Phase", "Rated Time (mins)", "Actual Time (mins)", "Utilization %"]);
      ws.getRow(timeTableHeaderRowIdx).eachCell((c) => {
        c.fill = fillSolid(BLUE_LIGHT);
        c.font = { color: { argb: BLACK }, bold: true };
        c.alignment = { vertical: "middle", horizontal: "center" };
      });

      const timeDataStart = timeTableHeaderRowIdx + 1;
      phases.forEach(({ id, name }) => {
        const d = efficiencyReportData[id] || {};
        const rated = Math.round(d.ratedOperatingTimeMins || 0);
        const actual = Math.round(d.actualOperatingTimeMins || 0);
        const util = rated > 0 ? (actual / rated) * 100 : 0;
        ws.addRow([name, rated, actual, Number(util.toFixed(2))]);
      });
      const timeDataEnd = ws.lastRow!.number;

      for (let r = timeDataStart; r <= timeDataEnd; r++) {
        ws.getCell(r, 2).numFmt = "#,##0";
        ws.getCell(r, 3).numFmt = "#,##0";
        ws.getCell(r, 4).numFmt = '0.00"%"';
        ws.getCell(r, 2).alignment = { horizontal: "right" };
        ws.getCell(r, 3).alignment = { horizontal: "right" };
        ws.getCell(r, 4).alignment = { horizontal: "right" };
      }
      setRangeBorders(ws, timeTableHeaderRowIdx, 1, timeDataEnd, 4);
      ws.getRow(timeTableHeaderRowIdx).height = 20;

      // File name
      const fileName = `Efficiency_Summary_${lastAppliedRange.start}_to_${lastAppliedRange.end}.xlsx`;

      // Generate & download (browser)
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMessage(`Error exporting: ${(err as Error).message}`);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Card style
  const cardStyle =
    "bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit";

  // Loading placeholder
  const loadingPlaceholder = (
    <div className="mt-8 text-center text-gray-300 border-2 border-dashed border-gray-300 p-12 rounded-lg h-56 flex items-center justify-center">
      <p className="text-xl text-gray-500">Loading efficiency data...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 font-sans">
        <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4">
          📈 Efficiency Dashboard
        </h1>

        {/* Date Range Filter and Buttons */}
        <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 md:space-x-6">
            {/* Start Date */}
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-700">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div
                  className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer w-full md:w-44 text-gray-800 text-center font-medium select-none"
                  onClick={() => {
                    const realInput =
                      document.querySelector<HTMLInputElement>(
                        'input[type="date"][value="' + startDate + '"]'
                      );
                    realInput?.showPicker?.();
                  }}
                >
                  {formatDisplayDate(startDate)}
                </div>
              </div>
            </div>

            {/* End Date */}
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-700">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div
                  className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer w-full md:w-44 text-gray-800 text-center font-medium select-none"
                  onClick={() => {
                    const realInput =
                      document.querySelector<HTMLInputElement>(
                        'input[type="date"][value="' + endDate + '"]'
                      );
                    realInput?.showPicker?.();
                  }}
                >
                  {formatDisplayDate(endDate)}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-4 w-full md:w-auto self-end">
              <button
                onClick={() => handleApplyFilter(startDate, endDate)}
                disabled={isLoading || isExporting}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                  ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
              >
                {isLoading ? "Searching..." : "Search"}
              </button>

              <button
                onClick={handleExport}
                disabled={isLoading || isExporting || !hasDataForRange}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                  ${
                    isExporting || !hasDataForRange
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
              >
                {isExporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                message.startsWith("Error")
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Tables */}
        <p className="text-md font-medium text-gray-600">
          Showing data from{" "}
          <span className="text-indigo-600 font-bold">
            {lastAppliedRange.start}
          </span>{" "}
          to{" "}
          <span className="text-indigo-600 font-bold">
            {lastAppliedRange.end}
          </span>
          .
        </p>

        <div className="grid grid-cols-1 gap-8">
          <div className={`${cardStyle}`}>
            {isLoading ? (
              loadingPlaceholder
            ) : hasDataForRange ? (
              <>
                <EfficiencySummaryTable rawReportData={efficiencyReportData} />
                <OperatingTimeSummaryTable rawReportData={efficiencyReportData} />
              </>
            ) : (
              <div className="p-4 border-t border-gray-200">
                <p className="text-center text-gray-500 italic">
                  No report data available for this date range.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
