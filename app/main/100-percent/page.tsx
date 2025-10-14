"use client";

import React, { useState } from 'react';

// Component for the Sewing Data Entry Page. 
// This is designed to be a client component for interactive forms.
export default function InspectionPage() {
  // State for the main form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationType, setOperationType] = useState('Seam');
  
  // State for the 8 data entry fields (using a single object for convenience)
  const [dataEntries, setDataEntries] = useState({
    I1: '', I2: '', I3: '', I4: '',
    I5: '', I6: '', I7: '', I8: '',
    I9: '', I10: '', I11: '', I12: '',
    I14: '', I13: '',
  });

  // Display-only value for Operation Quantity (simulating a calculated field)
  const operationQuantity = 1200; 

  // State for showing submission feedback
  const [statusMessage, setStatusMessage] = useState(null);

  // Reusable input style for text/date/select
  const baseInputStyle = "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const labelStyle = "text-sm font-medium text-gray-700 w-32 shrink-0";
  const entryInputStyle = "p-2 border border-gray-300 rounded-lg w-full text-center";
  
  // Handler for updating the 8 data entry fields
  const handleEntryChange = (e) => {
    const { name, value } = e.target;
    // Ensure only integers or empty string are allowed
    const numericValue = value.replace(/[^0-9]/g, '');
    setDataEntries(prev => ({ ...prev, [name]: numericValue }));
  };

  // Handler for form submission
  const handleSave = () => {
    // In a real application, you would send dataEntries, date, and operationType to an API.
    console.log("Saving Data:", { date, operationType, operationQuantity, dataEntries });

    setStatusMessage({
        type: 'success',
        message: 'Data successfully saved! Ready for next entry.'
    });

    // Reset the C1-C8 inputs after submission
    setDataEntries({
    I1: '', I2: '', I3: '', I4: '',
    I5: '', I6: '', I7: '', I8: '',
    I9: '', I10: '', I11: '', I12: '',
    I14: '', I13: '',
  });
    
    // Clear status message after a delay
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <h1 className="text-3xl font-extrabold text-gray-900">100% Inspection Data Entry</h1>
      
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
        
        {/* Row 1: Date and Operation Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Date Input */}
          <div className="flex items-center space-x-3">
            <label htmlFor="date" className="text-lg font-semibold mb-4">Date:</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={baseInputStyle}
            />
          </div>

          {/* Operation Type Dropdown */}
          <div className="flex items-center space-x-3">
            <label htmlFor="op-type" className="text-lg font-semibold mb-4">Operating Type:</label>
            <select
              id="op-type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className={`${baseInputStyle} appearance-none`}
            >
              <option value="Inhouse">In-house (IH)</option>
              <option value="Semi">Semi (S)</option>
              <option value="Outsource">Outsource (OS)</option>
              <option value="Blower">Blower (B)</option>
            </select>
          </div>
        </div>

        {/* Data Entry Grid (C1-C8) */}
        <div className="pt-4 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Operating Quantity :</h2>
            
            {/* 4-Column Layout */}
            <div className="grid grid-cols-4 gap-4">
                {/* Row 1: C1 to C4 */}
                {Object.keys(dataEntries).slice(0, 4).map(key => (
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

            {/* Row 2: C5 to C8 */}
            <div className="grid grid-cols-4 gap-4 mt-4">
                {Object.keys(dataEntries).slice(4, 8).map(key => (
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

            {/* Row 3: C9 to C12 */}
            <div className="grid grid-cols-4 gap-4 mt-4">
                {Object.keys(dataEntries).slice(8, 12).map(key => (
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

            {/* Row 4: S1 to S4 */}
            <div className="grid grid-cols-4 gap-4 mt-4">
                {Object.keys(dataEntries).slice(12, 16).map(key => (
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
