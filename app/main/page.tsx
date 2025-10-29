"use client";

import React, { useState, useEffect } from 'react';

// --- Helper Functions ---
// Helper function to format Date object into YYYY-MM-DD string
const getISODate = (d) => d.toISOString().split('T')[0];

// Calculate default start (7 days ago) and end (today) dates
const getDefaultDates = () => {
  const today = new Date();
  const defaultEnd = getISODate(today);

  const sevenDaysAgo = new Date(today);
  // FIX: Using setUTCDate ensures correct day subtraction regardless of time of day
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7); 
  const defaultStart = getISODate(sevenDaysAgo);
  
  return { defaultStart, defaultEnd };
};

// --- API Fetch Function for INSPECTION Report ---
const fetchInspectionReport = async (startDateObj, endDateObj) => {
    const startDateISO = getISODate(startDateObj);
    const endDateISO = getISODate(endDateObj);

    // ASSUMPTION: This endpoint retrieves the original Inspection data
    const response = await fetch('/api/inspection', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            startDate: startDateISO, 
            endDate: endDateISO 
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Failed to fetch inspection report: ${errorBody.error || errorBody.message || 'Server error'}`);
    }
    
    return response.json();
};

// --- API Fetch Function for PACKING Report ---
const fetchPackingReport = async (startDateObj, endDateObj) => {
    const startDateISO = getISODate(startDateObj);
    const endDateISO = getISODate(endDateObj);

    // Endpoint for Packing data
    const response = await fetch('/api/packing', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            startDate: startDateISO, 
            endDate: endDateISO 
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Failed to fetch packing report: ${errorBody.error || errorBody.message || 'Server error'}`);
    }
    
    return response.json();
};

// --- API Fetch Function for SEWING Report (New) ---
const fetchSewingReport = async (startDateObj, endDateObj) => {
    const startDateISO = getISODate(startDateObj);
    const endDateISO = getISODate(endDateObj);

    // ASSUMPTION: Dedicated report endpoint for Sewing data
    const response = await fetch('/api/sewing', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            startDate: startDateISO, 
            endDate: endDateISO 
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Failed to fetch sewing report: ${errorBody.error || errorBody.message || 'Server error'}`);
    }
    
    // Assuming the report returns data structure with dailyByOpTypeRaw
    return response.json(); 
};


// --------------------------------------------------------------------------------
// --- Table Component Definition: SEWING (New) ---
// --------------------------------------------------------------------------------
function SewingTotalTable({ dailyData }) {
    // Operation types defined in your lib/sewing.ts
    const OP_TYPES = ["SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST"];
    const TITLE = "Sewing";

    const totalsByOpType = {};
    let overallGrandTotal = 0;

    // Aggregate data from the nested structure: dailyByOpTypeRaw: { dateKey: { opType: totalValue } }
    if (dailyData?.dailyByOpTypeRaw) {
        Object.values(dailyData.dailyByOpTypeRaw).forEach(dateData => {
            Object.entries(dateData).forEach(([opType, total]) => {
                // Ensure we only count known op types
                if (OP_TYPES.includes(opType) && typeof total === 'number') {
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
                            {/* 1. Operation Type Header: Enforce consistent width w-1/4 */}
                            <th 
                                className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4"
                            >
                                Operation Type
                            </th>
                            {/* 2. Total Sewing Header: Flexible width */}
                            <th 
                                className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider"
                            >
                                Total Sewing (Raw)
                            </th>
                            {/* 3. Overall Grand Total Header: Enforce consistent width w-1/4 */}
                            <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                                OVERALL TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {OP_TYPES.map((op, index) => (
                            <tr key={op} className="hover:bg-blue-50/50">
                                {/* 1. Operation Type Data Cell: Enforce consistent width w-1/4 */}
                                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                                    {op}
                                </td>
                                {/* 2. Total Data Cell */}
                                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                                    {totalsByOpType[op]?.toLocaleString() || 0}
                                </td>
                                {/* 3. OVERALL GRAND TOTAL CELL: Enforce consistent width w-1/4 */}
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
// --- Table Component Definition: INSPECTION ---
// --------------------------------------------------------------------------------
function InspectionTotalTable({ dailyData }) {
    // Assumed simplified OP types for the original Inspection report
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
                            {/* 1. Operation Type Header: Enforce consistent width w-1/4 */}
                            <th 
                                className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4"
                            >
                                Operation Type
                            </th>
                            {/* 2. Total Inspections Header: Flexible width */}
                            <th 
                                className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider"
                            >
                                Total Inspections
                            </th>
                            {/* 3. Overall Grand Total Header: Enforce consistent width w-1/4 */}
                            <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                                OVERALL TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {OP_TYPES.map((op, index) => (
                            <tr key={op} className="hover:bg-blue-50/50">
                                {/* 1. Operation Type Data Cell: Enforce consistent width w-1/4 */}
                                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                                    {op}
                                </td>
                                {/* 2. Total Data Cell */}
                                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                                    {totalsByOpType[op]?.toLocaleString() || 0}
                                </td>
                                {/* 3. OVERALL GRAND TOTAL CELL: Enforce consistent width w-1/4 */}
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
// --- Table Component Definition: PACKING ---
// --------------------------------------------------------------------------------
function PackingTotalTable({ dailyData }) {
    // Operation types defined in your lib/packing.ts
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
                            {/* 1. Operation Type Header: Enforce consistent width w-1/4 */}
                            <th 
                                className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300 w-1/4"
                            >
                                Operation Type
                            </th>
                            {/* 2. Total Inspections Header: Flexible width */}
                            <th 
                                className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider"
                            >
                                Total Packing
                            </th>
                            {/* 3. Overall Grand Total Header: Enforce consistent width w-1/4 */}
                            <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider bg-blue-700 w-1/4">
                                OVERALL TOTAL
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {OP_TYPES.map((op, index) => (
                            <tr key={op} className="hover:bg-blue-50/50">
                                {/* 1. Operation Type Data Cell: Enforce consistent width w-1/4 */}
                                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-800 align-middle border-r border-gray-300 w-1/4">
                                    {op}
                                </td>
                                {/* 2. Total Data Cell */}
                                <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-700 font-semibold text-right align-middle">
                                    {totalsByOpType[op]?.toLocaleString() || 0}
                                </td>
                                {/* 3. OVERALL GRAND TOTAL CELL: Enforce consistent width w-1/4 */}
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


// --- Main Dashboard Component ---
export default function DashboardPage() {
  const { defaultStart, defaultEnd } = getDefaultDates();
  
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [lastAppliedRange, setLastAppliedRange] = useState({ start: defaultStart, end: defaultEnd });
  const [message, setMessage] = useState('');
  
  // State for three separate reports (NEW: sewingReportData)
  const [sewingReportData, setSewingReportData] = useState(null);
  const [inspectionReportData, setInspectionReportData] = useState(null);
  const [packingReportData, setPackingReportData] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    handleApplyFilter(defaultStart, defaultEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Basic styles
  const inputStyle = "p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150";
  const cardStyle = "bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-fit";

  const handleApplyFilter = async (initialStart = startDate, initialEnd = endDate) => {
    const start = initialStart;
    const end = initialEnd;

    // Standard date validation
    if (new Date(start) > new Date(end)) {
        setMessage('Error: Start Date cannot be after End Date.');
        return;
    }

    try {
        setIsLoading(true);
        setMessage('Fetching data...');
        
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            throw new Error("Invalid date format detected on client side.");
        }
        
        // Fetch all three reports concurrently (NEW: fetchSewingReport)
        const [sewingData, inspectionData, packingData] = await Promise.all([
            fetchSewingReport(startDateObj, endDateObj),
            fetchInspectionReport(startDateObj, endDateObj),
            fetchPackingReport(startDateObj, endDateObj)
        ]);

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
        setTimeout(() => setMessage(''), 3000);
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
        {/* Dashboard Title */}
        <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4">
          Production Summary Dashboard
        </h1>

        {/* Top Row: Date Range Filter and Apply Button */}
        <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-end justify-between space-y-4 md:space-y-0 md:space-x-6">
            
            {/* Start Date Input */}
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

            {/* End Date Input */}
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
            
            {/* Apply Filter Button */}
            <button
              onClick={() => handleApplyFilter(startDate, endDate)}
              disabled={isLoading}
              className={`px-6 py-2 font-semibold rounded-lg shadow-lg transition duration-300 w-full md:w-40 self-end 
                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {/* Status Message */}
          {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : message.startsWith('Fetching') ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {message}
              </div>
          )}
        </div>

        {/* Displaying Current Range */}
        <p className="text-md font-medium text-gray-600">
          Showing data from <span className="text-indigo-600 font-bold">{lastAppliedRange.start}</span> to <span className="text-indigo-600 font-bold">{lastAppliedRange.end}</span>.
        </p>

        {/* Data Visualization Area */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* 1. SEWING TABLE (NEW: Placed first) */}
          <div className={`${cardStyle}`}> 
            {isLoading ? loadingPlaceholder : (
                <SewingTotalTable dailyData={sewingReportData} />
            )}
          </div>

          {/* 2. INSPECTION TABLE */}
          <div className={`${cardStyle}`}> 
            {isLoading ? loadingPlaceholder : (
                <InspectionTotalTable dailyData={inspectionReportData?.daily} />
            )}
          </div>

          {/* 3. PACKING TABLE */}
          <div className={`${cardStyle}`}> 
            {isLoading ? loadingPlaceholder : (
                <PackingTotalTable dailyData={packingReportData?.daily} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
