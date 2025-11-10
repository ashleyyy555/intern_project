"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ExcelJS from 'exceljs';

// --- Helper Functions ---
const getISODate = (d) => d.toISOString().split('T')[0];

const getDefaultDates = () => {
  const today = new Date();
  const defaultEnd = getISODate(today);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  const defaultStart = getISODate(sevenDaysAgo);

  return { defaultStart, defaultEnd };
};

// --- API Fetch Function ---
const fetchEfficiencyReportData = async (startDateObj, endDateObj) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

  const response = await fetch(`/api/efficiency-report?startDate=${startDateISO}&endDate=${endDateISO}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to fetch efficiency report: ${errorBody.error || errorBody.message || 'Server error'}`);
  }

  return response.json();
};

// --------------------------------------------------------------------------------
// --- Calculation and Table Components ---
// --------------------------------------------------------------------------------

const PHASE_COL_WIDTH = "w-[250px]";
const RATED_COL_WIDTH = "w-[150px]";
const ACTUAL_COL_WIDTH = "w-[180px]";
const EFFICIENCY_COL_WIDTH = "w-[150px]";

/** Efficiency (Rated vs Actual) */
function useEfficiencyMetricsAndInput(rawReportData, actualOutputs) {
  return useMemo(() => {
    if (!rawReportData) return [];

    const phasesConfig = [
      { id: 'sewing', name: 'Sewing', apiKey: 'sewing' },
      { id: 'inspection100', name: '100% Inspection', apiKey: 'inspection100' },
    ];

    return phasesConfig.map(config => {
      const apiData = rawReportData[config.apiKey] || {};

      const ratedOutput = Math.round(apiData.ratedOutput || 0);
      const actualOutput = Math.round(actualOutputs[config.id] || 0);

      const efficiency = ratedOutput > 0 ? (actualOutput / ratedOutput) * 100 : 0;

      return {
        phase: config.name,
        id: config.id,
        ratedOutput,
        actualOutput,
        efficiency: efficiency.toFixed(2),
      };
    });

  }, [rawReportData, actualOutputs]);
}

function EfficiencySummaryTable({ rawReportData, actualOutputs, setActualOutputs }) {
  const metrics = useEfficiencyMetricsAndInput(rawReportData, actualOutputs);

  const handleActualOutputChange = useCallback((id, value) => {
    const num = Math.round(Number(value || 0));
    setActualOutputs(prev => ({ ...prev, [id]: num }));
  }, [setActualOutputs]);

  return (
    <>
      <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center">
        Production Efficiency (Output)
      </h2>
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 ${PHASE_COL_WIDTH}`}>
                Production Phase
              </th>
              <th className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${RATED_COL_WIDTH}`}>
                Rated Output
              </th>
              <th className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${ACTUAL_COL_WIDTH}`}>
                Actual Output (Input)
              </th>
              <th className={`px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider ${EFFICIENCY_COL_WIDTH} bg-blue-700`}>
                Efficiency (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr key={metric.phase} className="hover:bg-blue-50/50">
                <td className={`px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 ${PHASE_COL_WIDTH}`}>
                  {metric.phase}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${RATED_COL_WIDTH}`}>
                  {metric.ratedOutput.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-lg text-right align-middle ${ACTUAL_COL_WIDTH}`}>
                  <input
                    type="number"
                    min="0"
                    value={actualOutputs[metric.id] ?? ''}
                    onChange={(e) => handleActualOutputChange(metric.id, e.target.value)}
                    className="w-32 text-lg text-gray-700 font-semibold text-right border border-gray-300 rounded-md p-1 focus:border-indigo-500 focus:ring-indigo-500 appearance-none no-spinners"
                    aria-label={`Actual Output for ${metric.phase}`}
                  />
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-2xl font-extrabold text-right align-middle ${EFFICIENCY_COL_WIDTH} ${
                  parseFloat(metric.efficiency) >= 95
                    ? 'text-green-600'
                    : parseFloat(metric.efficiency) >= 80
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
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

/** Operating Time (Rated vs Actual) */
function useOperatingTimeMetrics(rawReportData) {
  return useMemo(() => {
    if (!rawReportData) return [];

    const phasesConfig = [
      { id: 'sewing', name: 'Sewing', apiKey: 'sewing' },
      { id: 'inspection100', name: '100% Inspection', apiKey: 'inspection100' },
    ];

    return phasesConfig.map(config => {
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

function OperatingTimeSummaryTable({ rawReportData }) {
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
              <th className={`px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 ${PHASE_COL_WIDTH}`}>
                Production Phase
              </th>
              <th className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${RATED_COL_WIDTH}`}>
                Rated Operating Time
              </th>
              <th className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${ACTUAL_COL_WIDTH}`}>
                Actual Operating Time
              </th>
              <th className={`px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider ${EFFICIENCY_COL_WIDTH} bg-blue-700`}>
                Utilization (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr key={metric.phase} className="hover:bg-blue-50/50">
                <td className={`px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 ${PHASE_COL_WIDTH}`}>
                  {metric.phase}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${RATED_COL_WIDTH}`}>
                  {metric.ratedTime.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${ACTUAL_COL_WIDTH}`}>
                  {metric.actualTime.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-2xl font-extrabold text-right align-middle ${EFFICIENCY_COL_WIDTH} ${
                  parseFloat(metric.utilization) >= 95
                    ? 'text-green-600'
                    : parseFloat(metric.utilization) >= 80
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
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
// --- Main Dashboard Integration ---
// --------------------------------------------------------------------------------

export default function EfficiencyDashboard() {
  const { defaultStart, defaultEnd } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [lastAppliedRange, setLastAppliedRange] = useState({ start: defaultStart, end: defaultEnd });
  const [message, setMessage] = useState('');

  const [efficiencyReportData, setEfficiencyReportData] = useState(null);
  const [actualOutputs, setActualOutputs] = useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const initializeStates = useCallback((data) => {
    if (!data) return;
    setActualOutputs({
      sewing: Math.round(data.sewing?.actualOutput || 0),
      inspection100: Math.round(data.inspection100?.actualOutput || 0),
    });
  }, []);

  useEffect(() => {
    handleApplyFilter(defaultStart, defaultEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle = "p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150";
  const cardStyle = "bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit";

  const handleApplyFilter = async (initialStart = startDate, initialEnd = endDate) => {
    const start = initialStart;
    const end = initialEnd;

    if (new Date(start) > new Date(end)) {
      setMessage('Error: Start Date cannot be after End Date.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Fetching data...');

      const startDateObj = new Date(start);
      const endDateObj = new Date(end);

      const reportData = await fetchEfficiencyReportData(startDateObj, endDateObj);

      setEfficiencyReportData(reportData);
      initializeStates(reportData);
      setLastAppliedRange({ start, end });

      setMessage(`Rated data loaded successfully for ${start} to ${end}.`);
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage(`Error fetching data: ${error.message}`);
      setEfficiencyReportData(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // ===== Excel Export (single sheet, two sections, borders, formats) =====
  const handleExport = async () => {
    if (!efficiencyReportData) {
      setMessage('Error: Please search and load data before exporting.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setIsExporting(true);
      setMessage('Preparing export file...');

      const phases = [
        { id: 'sewing', name: 'Sewing', key: 'sewing' },
        { id: 'inspection100', name: '100% Inspection', key: 'inspection100' },
      ];

      const safeNum = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFEBFF' } };
      const setThinBorder = (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      };

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Efficiency Summary');

      // Title
      ws.addRow([`Efficiency Summary (${lastAppliedRange.start} to ${lastAppliedRange.end})`]);
      ws.mergeCells(1, 1, 1, 4);
      const titleRow = ws.getRow(1);
      titleRow.font = { bold: true, size: 14 };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.height = 22;

      ws.addRow([]); // blank

      // ---- Section 1: Production Efficiency (Output) ----
      const s1TitleRowNum = ws.rowCount + 1;
      ws.addRow(['Production Efficiency (Output)']);
      ws.mergeCells(s1TitleRowNum, 1, s1TitleRowNum, 4);
      const s1TitleRow = ws.getRow(s1TitleRowNum);
      s1TitleRow.font = { bold: true };
      s1TitleRow.alignment = { vertical: 'middle', horizontal: 'left' };

      const s1Header = ws.addRow(['Phase', 'Rated Output', 'Actual Output (Input)', 'Efficiency %']);
      s1Header.font = { bold: true };
      s1Header.alignment = { vertical: 'middle', horizontal: 'center' };
      s1Header.fill = headerFill;

      phases.forEach(p => {
        const rated = Math.round(safeNum(efficiencyReportData?.[p.key]?.ratedOutput));
        const actual = Math.round(safeNum(actualOutputs?.[p.id]));
        const effDecimal = rated > 0 ? actual / rated : 0;
        ws.addRow([p.name, rated, actual, effDecimal]);
      });

      // Style/table 1
      for (let r = s1Header.number; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        row.eachCell(c => setThinBorder(c));
        if (r > s1Header.number) {
          row.getCell(2).numFmt = '#,##0';
          row.getCell(3).numFmt = '#,##0';
          row.getCell(4).numFmt = '0.00%';
        }
      }

      ws.addRow([]); // blank

      // ---- Section 2: Operating Time & Utilization ----
      const s2TitleRowNum = ws.rowCount + 1;
      ws.addRow(['Operating Time and Utilization (Minutes)']);
      ws.mergeCells(s2TitleRowNum, 1, s2TitleRowNum, 4);
      const s2TitleRow = ws.getRow(s2TitleRowNum);
      s2TitleRow.font = { bold: true };
      s2TitleRow.alignment = { vertical: 'middle', horizontal: 'left' };

      const s2Header = ws.addRow(['Phase', 'Rated Time (mins)', 'Actual Time (mins)', 'Utilization %']);
      s2Header.font = { bold: true };
      s2Header.alignment = { vertical: 'middle', horizontal: 'center' };
      s2Header.fill = headerFill;

      phases.forEach(p => {
        const ratedTime = Math.round(safeNum(efficiencyReportData?.[p.key]?.ratedOperatingTimeMins));
        const actualTime = Math.round(safeNum(efficiencyReportData?.[p.key]?.actualOperatingTimeMins));
        const utilDecimal = ratedTime > 0 ? actualTime / ratedTime : 0;
        ws.addRow([p.name, ratedTime, actualTime, utilDecimal]);
      });

      // Style/table 2
      for (let r = s2Header.number; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        row.eachCell(c => setThinBorder(c));
        if (r > s2Header.number) {
          row.getCell(2).numFmt = '#,##0';
          row.getCell(3).numFmt = '#,##0';
          row.getCell(4).numFmt = '0.00%';
        }
      }

      // Column widths
      ws.columns = [
        { width: 24 }, // Phase
        { width: 20 }, // Rated
        { width: 24 }, // Actual
        { width: 16 }, // %
      ];

      // Download
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fname = `Efficiency_Summary_${lastAppliedRange.start}_to_${lastAppliedRange.end}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);

      setMessage('Export complete!');
    } catch (error) {
      console.error("Export error:", error);
      setMessage(`Error during export: ${error.message}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const hasDataForRange = efficiencyReportData && (
    efficiencyReportData.sewing || efficiencyReportData.inspection100
  );

  const loadingPlaceholder = (
    <div className="mt-8 text-center text-gray-300 border-2 border-dashed border-gray-300 p-12 rounded-lg h-56 flex items-center justify-content">
      <p className="text-xl text-gray-500">Loading efficiency data...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 font-sans">
        <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4">
          📈 Efficiency Dashboard
        </h1>

        {/* Date Range Filter */}
        <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 md:space-x-6">
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label htmlFor="start-date-picker" className="text-sm font-semibold text-gray-700">Start Date</label>
              <input
                id="start-date-picker"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputStyle} w-full md:w-44`}
              />
            </div>

            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label htmlFor="end-date-picker" className="text-sm font-semibold text-gray-700">End Date</label>
              <input
                id="end-date-picker"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputStyle} w-full md:w-44`}
              />
            </div>

            {/* Button Container for Search and Export */}
            <div className="flex space-x-4 w-full md:w-auto self-end">
              {/* Search */}
              <button
                onClick={() => handleApplyFilter(startDate, endDate)}
                disabled={isLoading || isExporting}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                  ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={isLoading || isExporting || !hasDataForRange}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                  ${(isExporting || !hasDataForRange) 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'}`
                }
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {message}
            </div>
          )}
        </div>

        <p className="text-md font-medium text-gray-600">
          Showing data from <span className="text-indigo-600 font-bold">{lastAppliedRange.start}</span> to <span className="text-indigo-600 font-bold">{lastAppliedRange.end}</span>.
        </p>

        <div className="grid grid-cols-1 gap-8">
          <div className={`${cardStyle}`}>
            {isLoading ? loadingPlaceholder : hasDataForRange ? (
              <>
                <EfficiencySummaryTable
                  rawReportData={efficiencyReportData}
                  actualOutputs={actualOutputs}
                  setActualOutputs={setActualOutputs}
                />
                <OperatingTimeSummaryTable
                  rawReportData={efficiencyReportData}
                />
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
