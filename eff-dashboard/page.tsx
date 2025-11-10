"use client";

import React, { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';

// --- Helper Functions ---
const getISODate = (d: Date) => d.toISOString().split('T')[0];

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

  const response = await fetch(`/api/efficiency-report?startDate=${startDateISO}&endDate=${endDateISO}`);
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || errorBody.message || 'Server error');
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
      { id: 'sewing', name: 'Sewing', apiKey: 'sewing' },
      { id: 'inspection100', name: '100% Inspection', apiKey: 'inspection100' },
    ];

    return phasesConfig.map(config => {
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

// --------------------------------------------------------------------------------
// --- Table Components ---
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
              <th className={`px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 ${PHASE_COL_WIDTH}`}>
                Production Phase
              </th>
              <th className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${RATED_COL_WIDTH}`}>
                Rated Output
              </th>
              <th className={`px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider ${ACTUAL_COL_WIDTH}`}>
                Actual Output
              </th>
              <th className={`px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider ${EFFICIENCY_COL_WIDTH} bg-blue-700`}>
                Efficiency (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map(metric => (
              <tr key={metric.phase} className="hover:bg-blue-50/50">
                <td className={`px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 ${PHASE_COL_WIDTH}`}>
                  {metric.phase}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${RATED_COL_WIDTH}`}>
                  {metric.ratedOutput.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle ${ACTUAL_COL_WIDTH}`}>
                  {metric.actualOutput.toLocaleString()}
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
            {metrics.map(metric => (
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
// --- Main Dashboard ---
// --------------------------------------------------------------------------------

export default function EfficiencyDashboard() {
  const { defaultStart, defaultEnd } = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [lastAppliedRange, setLastAppliedRange] = useState({ start: defaultStart, end: defaultEnd });
  const [message, setMessage] = useState('');
  const [efficiencyReportData, setEfficiencyReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleApplyFilter = async (initialStart = startDate, initialEnd = endDate) => {
    if (new Date(initialStart) > new Date(initialEnd)) {
      setMessage('Error: Start Date cannot be after End Date.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Fetching data...');
      const reportData = await fetchEfficiencyReportData(new Date(initialStart), new Date(initialEnd));
      setEfficiencyReportData(reportData);
      setLastAppliedRange({ start: initialStart, end: initialEnd });
      setMessage(`Rated data loaded successfully for ${initialStart} to ${initialEnd}.`);
    } catch (error: any) {
      console.error(error);
      setMessage(`Error fetching data: ${error.message}`);
      setEfficiencyReportData(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    handleApplyFilter(defaultStart, defaultEnd);
  }, []);

  const hasDataForRange = efficiencyReportData && (efficiencyReportData.sewing || efficiencyReportData.inspection100);

  // Card style
  const cardStyle = "bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit";

  // Loading placeholder
  const loadingPlaceholder = (
    <div className="mt-8 text-center text-gray-300 border-2 border-dashed border-gray-300 p-12 rounded-lg h-56 flex items-center justify-center">
      <p className="text-xl text-gray-500">Loading efficiency data...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 font-sans">
        <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4">📈 Efficiency Dashboard</h1>

        {/* Date Range Filter and Buttons */}
        <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 md:space-x-6">
            {/* Start Date */}
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-700">Start Date</label>
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
                    const realInput = document.querySelector<HTMLInputElement>('input[type="date"][value="'+startDate+'"]');
                    realInput?.showPicker?.();
                  }}
                >
                  {formatDisplayDate(startDate)}
                </div>
              </div>
            </div>

            {/* End Date */}
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-700">End Date</label>
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
                    const realInput = document.querySelector<HTMLInputElement>('input[type="date"][value="'+endDate+'"]');
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
                  ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>

              <button
                onClick={() => {} /* Export function placeholder */}
                disabled={isLoading || isExporting || !hasDataForRange}
                className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                  ${(isExporting || !hasDataForRange) 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'}`}
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

        {/* Tables */}
        <p className="text-md font-medium text-gray-600">
          Showing data from <span className="text-indigo-600 font-bold">{lastAppliedRange.start}</span> to <span className="text-indigo-600 font-bold">{lastAppliedRange.end}</span>.
        </p>

        <div className="grid grid-cols-1 gap-8">
          <div className={`${cardStyle}`}>
            {isLoading ? loadingPlaceholder : hasDataForRange ? (
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
