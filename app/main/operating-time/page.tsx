"use client";

import React, { useState } from 'react';

// Component for the Operating Time Data Entry Page. 
export default function OperatingPage() {
  // State for the main form fields
  const [operatorId, setOperatorId] = useState(''); // State for Operator ID
  const [reportMonth, setReportMonth] = useState(''); // New state for Month and Year
  const [operationType, setOperationType] = useState('sewing');
  
  // State for the 31 data entry fields
  const [dataEntries, setDataEntries] = useState({
    D1: '', D2: '', D3: '', D4: '',
    D5: '', D6: '', D7: '', D8: '',
    D9: '', D10: '', D11: '', D12: '',
    D13: '', D14: '', D15: '', D16: '',
    D17: '', D18: '', D19: '', D20: '',
    D21: '', D22: '', D23: '', D24: '',
    D25: '', D26: '', D27: '', D28: '',
    D29: '', D30: '', D31: '',
  });

  // Display-only value for Operation Quantity (simulating a calculated field)
  const operationQuantity = 1200; 

  // State for showing submission feedback
  const [statusMessage, setStatusMessage] = useState(null);

  // Reusable input style for text/date/select
  const baseInputStyle = "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const entryInputStyle = "p-2 border border-gray-300 rounded-lg w-full text-center";
  
  // Handler for updating the data entry fields (ensures integer only)
  const handleEntryChange = (e) => {
    const { name, value } = e.target;
    // Ensure only integers or empty string are allowed
    const numericValue = value.replace(/[^0-9]/g, '');
    setDataEntries(prev => ({ ...prev, [name]: numericValue }));
  };

  // Handler for form submission
  const handleSave = () => {
    // In a real application, you would send all states to an API.
    console.log("Saving Data:", { operatorId, reportMonth, operationType, operationQuantity, dataEntries });

    setStatusMessage({
        type: 'success',
        message: 'Data successfully saved! Ready for next entry.'
    });

    // Reset inputs after submission
    setDataEntries(
      Object.keys(dataEntries).reduce((acc, key) => ({ ...acc, [key]: '' }), {})
    );
    setOperatorId('');
    setReportMonth(''); // Reset the month/year input too
    
    // Clear status message after a delay
    setTimeout(() => setStatusMessage(null), 3000);
  };
  
  // Helper function to render a row of 4 inputs based on key range
  const renderInputRow = (start, end) => (
    <div className="grid grid-cols-4 gap-4 mt-4">
      {Object.keys(dataEntries).slice(start, end).map(key => (
          <div key={key} className="space-y-1">
              <label htmlFor={key} className="block text-xs font-medium text-gray-500">{key}:</label>
              <input
                  id={key}
                  name={key}
                  type="text" // Use text and rely on JS for integer filtering
                  placeholder="0"
                  value={dataEntries[key]}
                  onChange={handleEntryChange}
                  className={entryInputStyle}
              />
          </div>
      ))}
    </div>
  );


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <h1 className="text-3xl font-extrabold text-gray-900">Operating Time Data Entry</h1>
      
      {/* Submission Status Message */}
      {statusMessage && (
        <div 
          className={`p-3 rounded-lg font-medium ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {statusMessage.message}
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
        
        {/* Row 1: Operator ID (Left) and Month/Year (Right) */}
        {/* Using justify-between to push them to opposite ends */}
        <div className="flex justify-between items-start">
            
            {/* Operator ID Input (Left) */}
            <div className="flex items-center space-x-3 w-1/2 pr-4"> {/* Added pr-4 for spacing */}
                <label htmlFor="operator-id" className="text-lg font-semibold w-24 shrink-0">Operator ID:</label>
                <input
                    id="operator-id"
                    type="text"
                    placeholder="Enter ID"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className={baseInputStyle}
                />
            </div>

            {/* Month and Year Input (Right) */}
            <div className="flex items-center space-x-3 w-1/2 pl-4 justify-end"> {/* Added pl-4 and justify-end */}
                <label htmlFor="report-month" className="text-lg font-semibold shrink-0">Month & Year:</label>
                <input
                    id="report-month"
                    type="month"
                    placeholder="YYYY-MM"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className={baseInputStyle}
                />
            </div>
        </div>
        
        {/* Row 2: Operation Type */}
        <div className="border-t pt-4 border-gray-200">
          <div className="flex items-center space-x-3 max-w-md"> {/* Reduced width slightly for better alignment */}
            <label htmlFor="op-type" className="text-lg font-semibold w-36 shrink-0">Section Type:</label>
            <select
              id="op-type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className={`${baseInputStyle} appearance-none`}
            >
              <option value="sewing">Sewing</option>
              <option value="100%">100% Inspection</option>
            </select>
          </div>
        </div>

        {/* Data Entry Grid (OT1-OT31) */}
        <div className="pt-4 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-indigo-600">Operating Time (minutes) :</h2>
            
            {/* Rows for OT1 to OT31 */}
            {renderInputRow(0, 4)}
            {renderInputRow(4, 8)}
            {renderInputRow(8, 12)}
            {renderInputRow(12, 16)}
            {renderInputRow(16, 20)} 
            {renderInputRow(20, 24)}
            {renderInputRow(24, 28)}

            {/* Row 8: OT29, OT30, OT31 (Partial row) */}
            <div className="grid grid-cols-4 gap-4 mt-4">
                {Object.keys(dataEntries).slice(28, 31).map(key => (
                    <div key={key} className="space-y-1">
                        <label htmlFor={key} className="block text-xs font-medium text-gray-500">{key}:</label>
                        <input
                            id={key}
                            name={key}
                            type="text"
                            placeholder="0"
                            value={dataEntries[key]}
                            onChange={handleEntryChange}
                            className={entryInputStyle}
                        />
                    </div>
                ))}
            </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
                onClick={handleSave}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 transform hover:scale-105"
            >
                Save Data
            </button>
        </div>
      </div>
    </div>
  );
}