// app/search/page.tsx or components/SearchPage.tsx

"use client";

import React, { useState } from 'react';
import { searchData } from '@/app/actions/search';
import { 
    PACKING_KEYS, PACKING_HEADERS, PACKING_FIELD_MAP, 
    INSPECTION_KEYS, INSPECTION_HEADERS, INSPECTION_FIELD_MAP,
    SEWING_KEYS, SEWING_HEADERS, SEWING_FIELD_MAP,
    OPERATION_KEYS, OPERATION_HEADERS, OPERATION_FIELD_MAP
} from '@/lib/inspectionFields'; // Import field metadata

const sectionOptions = [
    { value: 'all', label: 'Pick a section' },
    { value: 'cutting', label: 'Cutting' },
    { value: 'sewing', label: 'Sewing' },
    { value: '100%', label: '100% Inspection' }, // Value used for the database model lookup
    { value: 'packing', label: 'Packing' },
    { value: 'operationtime', label: 'Operation Time' },
];

// Helper function to get today's date in YYYY-MM-DD format
const getCurrentDate = () => {
    const today = new Date();
    // Use toISOString and slice to get YYYY-MM-DD format
    return today.toISOString().split('T')[0]; 
};

export default function SearchPage() {
  // --- UPDATED: Default state to current date ---
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());
  // ---------------------------------------------
  const [section, setSection] = useState(sectionOptions[0].value);
  
  // searchResults holds the raw data array (e.g., from prisma.packing.findMany)
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // Store the section of the current search results to know how to format them
  const [currentSection, setCurrentSection] = useState(''); 
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const baseInputStyle = "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

const handleApplyFilters = async () => {
    setIsSearching(true);
    setErrorMessage('');
    setSearchResults([]);
    setCurrentSection('');

    // If the user clears the input, it sends an empty string, which is converted to null.
    // If the date is present (defaulting to today), the date string is sent.
    const searchParams = { 
        startDate: startDate || null, // Send null if startDate is an empty string
        endDate: endDate || null,     // Send null if endDate is an empty string
        section 
    };
    
    try {
        const response = await searchData(searchParams); 

        // Check if the server action returned a structured error
        if (response && 'error' in response) {
            console.error("Server Action Error:", response.error);
            setErrorMessage(`Search failed: ${response.error}`);
        } else if (response && 'data' in response) {
            // Success: Store the raw data and its section identifier
            setSearchResults(response.data);
            setCurrentSection(response.section);
        }

    } catch (error) {
        console.error("Error during search execution:", error);
        setErrorMessage('A network error occurred. Please try again.');
    } finally {
        setIsSearching(false);
    }
};

  // --- Utility for formatting table data ---
  const getHeaders = (currentSection: string) => {
      // Define the common Date header, which is either a full date or a month string
      const dateHeader = currentSection === 'operationtime' 
        ? { key: 'yearMonth', label: 'Month/Year' }
        : { key: 'operationDate', label: 'Date' };

      if (currentSection === 'packing') {
          // Prepend the Date header to the dynamically generated packing headers
          const packingHeaders = PACKING_KEYS.map(key => ({ key, label: PACKING_HEADERS[key] }));
          return [dateHeader, ...packingHeaders];
      }
      if (currentSection === '100%') {
          // Prepend the Date header to the dynamically generated inspection headers
          const inspectionHeaders = INSPECTION_KEYS.map(key => ({ key, label: INSPECTION_HEADERS[key] }));
          return [dateHeader, ...inspectionHeaders];
      }
      if (currentSection === 'sewing') {
          // Prepend the Date header to the dynamically generated inspection headers
          const sewingHeaders = SEWING_KEYS.map(key => ({ key, label: SEWING_HEADERS[key] }));
          return [dateHeader, ...sewingHeaders];
      }
      if (currentSection === 'operationtime') {
          // Prepend the Date header to the dynamically generated inspection headers
          const operationHeaders = OPERATION_KEYS.map(key => ({ key, label: OPERATION_HEADERS[key] }));
          return [{ key: 'yearMonth', label: 'Month/Year' }, ...operationHeaders];
      }      
      // Default headers for non-wide tables (already starts with Date)
      return [
          { key: 'date', label: 'Date' },
          { key: 'itemId', label: 'Operator ID' },
          { key: 'value', label: 'Data Value' },
          { key: 'section', label: 'Section' },
      ];
  };

  const getRowData = (row: any, currentSection: string) => {
      let date: string = 'N/A';
      
      // FIX: Handle date formatting based on the section's date field type
      if (currentSection === 'operationtime') {
          date = row.yearMonth || 'N/A'; // Use the yearMonth string directly
      } else {
          // Use 'operationDate' (DateTime) for other models
          date = new Date(row.operationDate || row.entry_date).toLocaleDateString() || 'N/A';
      }
      
      if (currentSection === 'packing') {
          // Map all 8 column values based on the column names in the DB row
          return [
              date,
              row[PACKING_FIELD_MAP.P1], row[PACKING_FIELD_MAP.P2], row[PACKING_FIELD_MAP.P3], row[PACKING_FIELD_MAP.P4], 
              row[PACKING_FIELD_MAP.P5], row[PACKING_FIELD_MAP.P6], row[PACKING_FIELD_MAP.P7], row[PACKING_FIELD_MAP.P8], 
          ];
      }
      if (currentSection === '100%') {
           // Map all 14 column values based on the column names in the DB row
          return [
              date,
              row[INSPECTION_FIELD_MAP.I1], row[INSPECTION_FIELD_MAP.I2], row[INSPECTION_FIELD_MAP.I3], row[INSPECTION_FIELD_MAP.I4], 
              row[INSPECTION_FIELD_MAP.I5], row[INSPECTION_FIELD_MAP.I6], row[INSPECTION_FIELD_MAP.I7], row[INSPECTION_FIELD_MAP.I8],
              row[INSPECTION_FIELD_MAP.I9], row[INSPECTION_FIELD_MAP.I10], row[INSPECTION_FIELD_MAP.I11], row[INSPECTION_FIELD_MAP.I12],
              row[INSPECTION_FIELD_MAP.I13], row[INSPECTION_FIELD_MAP.I14], 
          ];
      }
      if (currentSection === 'operationtime') {
           // Map all D1-D31 column values based on the column names in the DB row
          return [
              date,
              row[OPERATION_FIELD_MAP.D1], row[OPERATION_FIELD_MAP.D2], row[OPERATION_FIELD_MAP.D3], row[OPERATION_FIELD_MAP.D4], 
              row[OPERATION_FIELD_MAP.D5], row[OPERATION_FIELD_MAP.D6], row[OPERATION_FIELD_MAP.D7], row[OPERATION_FIELD_MAP.D8],
              row[OPERATION_FIELD_MAP.D9], row[OPERATION_FIELD_MAP.D10], row[OPERATION_FIELD_MAP.D11], row[OPERATION_FIELD_MAP.D12],
              row[OPERATION_FIELD_MAP.D13], row[OPERATION_FIELD_MAP.D14], row[OPERATION_FIELD_MAP.D15], row[OPERATION_FIELD_MAP.D16],
              row[OPERATION_FIELD_MAP.D17], row[OPERATION_FIELD_MAP.D18], row[OPERATION_FIELD_MAP.D19], row[OPERATION_FIELD_MAP.D20], 
              row[OPERATION_FIELD_MAP.D21], row[OPERATION_FIELD_MAP.D22], row[OPERATION_FIELD_MAP.D23], row[OPERATION_FIELD_MAP.D24],
              row[OPERATION_FIELD_MAP.D25], row[OPERATION_FIELD_MAP.D26], row[OPERATION_FIELD_MAP.D27], row[OPERATION_FIELD_MAP.D28],
              row[OPERATION_FIELD_MAP.D29], row[OPERATION_FIELD_MAP.D30], row[OPERATION_FIELD_MAP.D31],
          ];
      }
      if (currentSection === 'sewing') {
           // Map all column values based on the column names in the DB row
          return [
              date,
              row[SEWING_FIELD_MAP.C1], row[SEWING_FIELD_MAP.C2], row[SEWING_FIELD_MAP.C3], row[SEWING_FIELD_MAP.C4], 
              row[SEWING_FIELD_MAP.C5], row[SEWING_FIELD_MAP.C6], row[SEWING_FIELD_MAP.C7], row[SEWING_FIELD_MAP.C8],
              row[SEWING_FIELD_MAP.C9], row[SEWING_FIELD_MAP.C10], row[SEWING_FIELD_MAP.C11], row[SEWING_FIELD_MAP.C12],
              row[SEWING_FIELD_MAP.S1], row[SEWING_FIELD_MAP.S2], row[SEWING_FIELD_MAP.S3], row[SEWING_FIELD_MAP.S4], 
              row[SEWING_FIELD_MAP.S5], row[SEWING_FIELD_MAP.S6], row[SEWING_FIELD_MAP.S7], row[SEWING_FIELD_MAP.S8],
              row[SEWING_FIELD_MAP.S9], row[SEWING_FIELD_MAP.S10], row[SEWING_FIELD_MAP.S11], row[SEWING_FIELD_MAP.S12], 
              row[SEWING_FIELD_MAP.S13], row[SEWING_FIELD_MAP.S14], row[SEWING_FIELD_MAP.S15], row[SEWING_FIELD_MAP.S16],
              row[SEWING_FIELD_MAP.S17], row[SEWING_FIELD_MAP.S18], row[SEWING_FIELD_MAP.S19], row[SEWING_FIELD_MAP.S20], 
              row[SEWING_FIELD_MAP.S21], row[SEWING_FIELD_MAP.S22], row[SEWING_FIELD_MAP.S23], row[SEWING_FIELD_MAP.S24],
              row[SEWING_FIELD_MAP.ST1], row[SEWING_FIELD_MAP.ST2],
          ];
      }
      if (currentSection === 'cutting') {
           // Map all 14 column values based on the column names in the DB row
          return [
              date,
              row.StationID, row.quantityForIH, row.quantityForS, row.quantityForOS, row.quantityForB
          ];
      }
      
      // Default row data for unimplemented sections (currently won't be reached as we return error)
      return [date, row.operator_id || 'N/A', row.data_value || 0, row.section || 'N/A'];
  };
  
  const headers = getHeaders(currentSection);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 font-['Inter']">
      {/* Page Title */}
      <h1 className="text-3xl font-extrabold text-gray-900">Data Search</h1>
      
      {/* Main Filter Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
        
        <h2 className="text-lg font-semibold text-indigo-600 mb-4">Filter Options</h2>

        {/* Filter Row: Date Range & Section Dropdown (Same Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          
          {/* Date Range Inputs */}
          <div className="md:col-span-2 flex space-x-4">
            <div className="flex-1">
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={baseInputStyle}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={baseInputStyle}
              />
            </div>
          </div>

          {/* Section Dropdown */}
          <div className="md:col-span-1">
            <label htmlFor="section-select" className="block text-sm font-medium text-gray-700 mb-1">
              Section
            </label>
            <select
              id="section-select"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className={`${baseInputStyle} appearance-none bg-white`}
            >
              {sectionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Apply Filters Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleApplyFilters}
            disabled={isSearching}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400"
          >
            {isSearching ? 'Searching...' : 'Apply Filters'}
          </button>
        </div>
      </div>
      
      {/* Search Results Area */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Search Results</h2>
        
        {/* Error Message Display */}
        {errorMessage && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 font-medium">
                Error: {errorMessage}
            </div>
        )}

        {isSearching && (
            <div className="text-center text-indigo-600 py-4">Loading results...</div>
        )}

        {/* Table Display */}
        {!isSearching && (
            <div className="overflow-x-auto">
                {searchResults.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {headers.map(header => (
                                    <th 
                                        key={header.key} 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]"
                                    >
                                        {header.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {searchResults.map((row, index) => {
                                const rowData = getRowData(row, currentSection);
                                return (
                                    <tr key={index}>
                                        {rowData.map((cell, cellIndex) => (
                                            <td 
                                                key={cellIndex} 
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                                            >
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-gray-500 border border-dashed p-4 rounded-lg">
                        {errorMessage ? 'No results found due to an error.' : 'No results found with the current filter range.'}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
