"use client";

import React, { useState } from 'react';

// This component will be rendered in the main area of your application,
// next to the fixed sidebar.

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFilter, setSelectedFilter] = useState('Today');
  
  // Basic styles for input and buttons
  const inputStyle = "p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
  const cardStyle = "bg-white p-6 rounded-xl shadow-lg h-96 border border-gray-200";

  const handleApplyFilter = () => {
    // In a real application, this is where you would trigger data fetching
    // based on selectedDate and selectedFilter.
    console.log(`Applying Filter: Date=${selectedDate}, Filter=${selectedFilter}`);
    alert(`Filter applied for ${selectedFilter} starting ${selectedDate}. (Check console for data logic)`);
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Title */}
      <h1 className="text-3xl font-extrabold text-gray-900">Operations Summary Dashboard</h1>

      {/* Top Row: Date Input (Left) and Dropdown/Button (Right) */}
      <div className="flex justify-between items-start bg-white p-4 rounded-xl shadow-md">
        
        {/* Date Input Box (Top Left) */}
        <div className="flex items-center space-x-3 mt-1"> {/* Added mt-1 for slight vertical alignment */}
          <label htmlFor="date-picker" className="text-gray-700 font-medium">
            Filter by Date:
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={inputStyle}
          />
        </div>

        {/* Dropdown Menu & Button Container (Top Right) - Stacked vertically */}
        <div className="flex flex-col space-y-2">
          
          {/* Dropdown Menu */}
          <div className="flex items-center space-x-3">
            <label htmlFor="dropdown-filter" className="text-gray-700 font-medium">
              View Filter:
            </label>
            <select
              id="dropdown-filter"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className={`${inputStyle} appearance-none`}
            >
              <option value="Today">Today</option>
              <option value="Week">Last 7 Days</option>
              <option value="Month">Last 30 Days</option>
              <option value="QTD">Quarter To Date</option>
            </select>
          </div>
          
          {/* Apply Filter Button (Added Here) */}
          <button
            onClick={handleApplyFilter}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 self-end"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Space Below for Imported Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Placeholder Space 1: Primary Table */}
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">
            Table Space 1: Efficiency Metrics
          </h2>
          <p className="text-gray-500">
            This section is reserved for the primary data table (e.g., live throughput, defect rates). 
            It will track efficiency across departments for the selected date/filter.
          </p>
          <div className="mt-8 text-center text-gray-300 border-2 border-dashed border-gray-300 p-12 rounded-lg">
            [Future Imported Table/Component Here]
          </div>
        </div>

        {/* Placeholder Space 2: Secondary Table */}
        <div className={cardStyle}>
          <h2 className="text-xl font-semibold text-teal-600 mb-4">
            Table Space 2: Quality & Labor Summary
          </h2>
          <p className="text-gray-500">
            This section is reserved for a secondary summary table (e.g., labor hours, quality control data).
            It will provide supporting metrics for the main table view.
          </p>
          <div className="mt-8 text-center text-gray-300 border-2 border-dashed border-gray-300 p-12 rounded-lg">
            [Future Imported Table/Component Here]
          </div>
        </div>
      </div>
    </div>
  );
}
