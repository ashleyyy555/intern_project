"use client";

// app/search/page.tsx or components/SearchPage.tsx

import React, { useState } from 'react';

const sectionOptions = [
    { value: 'all', label: 'All Sections' },
    { value: 'cutting', label: 'Cutting' },
    { value: 'sewing', label: 'Sewing' },
    { value: '100%', label: '100% Inspection' },
    { value: 'packing', label: 'Packing' },
    { value: 'operatingtime', label: 'Operating Time' },
];

export default function SearchPage() {
  // State for search filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [section, setSection] = useState(sectionOptions[0].value);
  
  // Placeholder for search results (future table data)
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reusable input style for text/date/select
  const baseInputStyle = "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

  // Handler for applying the filters
  const handleApplyFilters = () => {
    setIsSearching(true);
    // 1. In a real application, you would construct a query object:
    const searchParams = { startDate, endDate, section };
    console.log("Applying Filters:", searchParams);

    // 2. Mock API call simulation:
    setTimeout(() => {
        // Replace this with your actual API fetch call
        const mockData = [
            { date: '2025-09-01', item: 'A001', value: 100, sec: 'Finance' },
            { date: '2025-09-05', item: 'B002', value: 250, sec: 'Operations' },
        ];
        setSearchResults(mockData);
        setIsSearching(false);
    }, 1500); // Simulate network latency
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Page Title */}
      <h1 className="text-3xl font-extrabold text-gray-900">Data Search</h1>
      
      {/* Main Filter Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
        
        <h2 className="text-lg font-semibold text-indigo-600 mb-4">Filter Options</h2>

        {/* ========================================================= */}
        {/* Filter Row: Date Range & Section Dropdown (Same Row) */}
        {/* The grid is set up to distribute space: 2/3 for dates, 1/3 for section/button */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          
          {/* Column 1: Date Range Inputs (Takes 2/3 of space on MD+) */}
          <div className="md:col-span-2 flex space-x-4">
            {/* Start Date */}
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

            {/* End Date */}
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

          {/* Column 2: Section Dropdown (Takes 1/3 of space on MD+) */}
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
        
        {/* ========================================================= */}
        {/* Apply Filters Button (Below Section Dropdown) */}
        {/* This div uses flex to push the button to the right side */}
        {/* ========================================================= */}
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
      
      {/* ========================================================= */}
      {/* Search Results Area (Future Table Import) */}
      {/* ========================================================= */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Search Results</h2>
        
        {isSearching && (
            <div className="text-center text-indigo-600 py-4">Loading results...</div>
        )}

        {/* Future Table Placeholder */}
        {!isSearching && (
            <div className="overflow-x-auto">
                {searchResults.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {searchResults.map((row, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.item}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.value.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.sec}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-8 text-gray-500 border border-dashed p-4 rounded-lg">
                        Apply filters above to view results.
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}