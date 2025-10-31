"use client";

import React, { useState, useEffect } from "react";

// --- Helper Functions ---
const getISODate = (d) => d.toISOString().split("T")[0];

const getDefaultDates = () => {
  const today = new Date();
  const defaultEnd = getISODate(today);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  const defaultStart = getISODate(sevenDaysAgo);

  return { defaultStart, defaultEnd };
};

// --- API Fetch Functions ---
const fetchCuttingReport = async (startDateObj, endDateObj) => {
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

const fetchSewingReport = async (startDateObj, endDateObj) => {
  const startDateISO = getISODate(startDateObj);
  const endDateISO = getISODate(endDateObj);

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

const fetchInspectionReport = async (startDateObj, endDateObj) => {
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

const fetchPackingReport = async (startDateObj, endDateObj) => {
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
// --- Table Component: CUTTING (Updated to show panelID, including zero totals) ---
// --------------------------------------------------------------------------------
// NOTE: In a real app, ALL_PANEL_IDS should be fetched from an API or config.
// Hardcoding a list for demonstration purposes.
const ALL_PANEL_IDS = ["Circular Fabric", "Heavy Duty Fabric", "Light Duty Fabric", "Type 110", "Type 148",]; // Example list

function CuttingTotalTable({ data }) {
  const TITLE = "Cutting Report";

  // 1. Aggregate data from the report (only includes IDs with > 0 pcs)
  const panelsByIDFromData = (data?.panels || []).reduce((acc, p) => {
    const idLabel = p.panelId;
    acc[idLabel] = (acc[idLabel] || 0) + p.pcs;
    return acc;
  }, {});

  // 2. Combine the full list of ALL_PANEL_IDS with the aggregated data
  const finalPanelsByID = ALL_PANEL_IDS.reduce((acc, panelId) => {
    acc[panelId] = panelsByIDFromData[panelId] || 0; // Use 0 if not in fetched data
    return acc;
  }, {});

  const dataKeys = Object.keys(finalPanelsByID);

  if (!data || dataKeys.length === 0) {
    return (
      <div className="p-4 border-t border-gray-200">
        <p className="text-center text-gray-500 italic">
          No {TITLE} data or panel definitions available.
        </p>
      </div>
    );
  }

  // Calculate Grand Total across all existing data (only if data.panels is not null/empty)
  const grandTotal = (data?.panels || []).reduce((a, p) => a + p.pcs, 0);

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
// --- Table Component: SEWING ---
// --------------------------------------------------------------------------------
function SewingTotalTable({ dailyData }) {
  const OP_TYPES = ["SP1", "SP2", "PC", "SB", "SPP", "SS", "SSP", "SD", "ST"];
  const TITLE = "Sewing";

  const totalsByOpType = {};
  let overallGrandTotal = 0;

  if (dailyData?.dailyByOpTypeRaw) {
    Object.values(dailyData.dailyByOpTypeRaw).forEach((dateData) => {
      Object.entries(dateData).forEach(([opType, total]) => {
        if (OP_TYPES.includes(opType) && typeof total === "number") {
          totalsByOpType[opType] = (totalsByOpType[opType] || 0) + total;
          overallGrandTotal += total;
        }
      });
    });
  }

  if (overallGrandTotal === 0) {
    return (
      <div className="p-4 border-t border-gray-200">
        <p className="text-center text-gray-500 italic">
          No {TITLE} data available for this range.
        </p>
      </div>
    );
  }

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
                Total Sewing (Raw)
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
                  {totalsByOpType[op]?.toLocaleString() || 0}
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
// --- Table Component: INSPECTION ---
// --------------------------------------------------------------------------------
function InspectionTotalTable({ dailyData }) {
  const OP_TYPES = ["IH", "S", "OS", "B"];
  const TITLE = "Inspection";

  if (!dailyData || dailyData.byOpType.length === 0) {
    return (
      <div className="p-4 border-t border-gray-200">
        <p className="text-center text-gray-500 italic">
          No {TITLE} data available for this range.
        </p>
      </div>
    );
  }

  const totalsByOpType = dailyData.byOpType.reduce((acc, row) => {
    if (OP_TYPES.includes(row.opType)) {
      acc[row.opType] = (acc[row.opType] || 0) + row.total;
    }
    return acc;
  }, {});

  const overallGrandTotal = Object.values(totalsByOpType).reduce((sum, total) => sum + total, 0);

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
                  {totalsByOpType[op]?.toLocaleString() || 0}
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
// --- Table Component: PACKING ---
// --------------------------------------------------------------------------------
function PackingTotalTable({ dailyData }) {
  const OP_TYPES = ["in-house", "semi", "complete wt 100%", "complete wo 100%"];
  const TITLE = "Packing";

  if (!dailyData || dailyData.byOpType.length === 0) {
    return (
      <div className="p-4 border-t border-gray-200">
        <p className="text-center text-gray-500 italic">
          No {TITLE} data available for this range.
        </p>
      </div>
    );
  }

  const totalsByOpType = dailyData.byOpType.reduce((acc, row) => {
    if (OP_TYPES.includes(row.opType)) {
      acc[row.opType] = (acc[row.opType] || 0) + row.total;
    }
    return acc;
  }, {});

  const overallGrandTotal = Object.values(totalsByOpType).reduce((sum, total) => sum + total, 0);

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
                  {totalsByOpType[op]?.toLocaleString() || 0}
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

  // Report states
  const [cuttingReportData, setCuttingReportData] = useState(null);
  const [sewingReportData, setSewingReportData] = useState(null);
  const [inspectionReportData, setInspectionReportData] = useState(null);
  const [packingReportData, setPackingReportData] = useState(null);

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
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage(`Error fetching data: ${error.message}`);
    } finally {
      setIsLoading(false);
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
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label htmlFor="start-date-picker" className="text-sm font-semibold text-gray-700">
                Start Date
              </label>
              <input
                id="start-date-picker"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputStyle} w-full md:w-44`}
              />
            </div>

            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label htmlFor="end-date-picker" className="text-sm font-semibold text-gray-700">
                End Date
              </label>
              <input
                id="end-date-picker"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputStyle} w-full md:w-44`}
              />
            </div>

            <button
              onClick={() => handleApplyFilter(startDate, endDate)}
              disabled={isLoading}
              className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                message.startsWith("Error")
                  ? "bg-red-100 text-red-700"
                  : message.startsWith("Fetching")
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
          <div className={cardStyle}>
            {isLoading ? loadingPlaceholder : <CuttingTotalTable data={cuttingReportData} />}
          </div>

          {/* 2. SEWING TABLE */}
          <div className={cardStyle}>
            {isLoading ? loadingPlaceholder : <SewingTotalTable dailyData={sewingReportData} />}
          </div>

          {/* 3. INSPECTION TABLE */}
          <div className={cardStyle}>
            {isLoading ? loadingPlaceholder : (
              <InspectionTotalTable dailyData={inspectionReportData?.daily} />
            )}
          </div>

          {/* 4. PACKING TABLE */}
          <div className={cardStyle}>
            {isLoading ? loadingPlaceholder : (
              <PackingTotalTable dailyData={packingReportData?.daily} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
