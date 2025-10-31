"use client";

import React, { useState } from "react";

// Define the type for status messages
type StatusMessage = { type: "success" | "error"; message: string };

// Utility to get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split("T")[0];

export default function CuttingPage() {
  // Date (YYYY-MM-DD), defaulting to today
  const [date, setDate] = useState(getTodayDate());
  
  // State for the Panel ID (string)
  const [panelId, setPanelId] = useState("");
  
  // New state for Panel Type, defaulting to Laminated
  const [panelType, setPanelType] = useState("Laminated"); 
  
  // States for the measurement fields (stored as strings to manage input control)
  const [construction, setConstruction] = useState("");
  const [denier, setDenier] = useState("");
  const [weight, setWeight] = useState("");
  
  // New states for size and output fields
  const [widthSize, setWidthSize] = useState("");
  const [lengthSize, setLengthSize] = useState("");
  const [actualOutput, setActualOutput] = useState("");

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // Styles (Matching Inspection file's styling conventions)
  const baseInputStyleCentered =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-center";
  
  // Style for non-centered inputs (Date, Panel ID, Type)
  const baseInputStyleLeft =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  
  const resetForm = () => {
    setDate(getTodayDate());
    setPanelId("");
    setPanelType("Laminated"); // Reset to default
    setConstruction("");
    setDenier("");
    setWeight("");
    setWidthSize("");
    setLengthSize("");
    setActualOutput("");
  };
  
  // Handler for float inputs: allows only numbers and a single decimal point
  const handleFloatChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<string>>
  ) => {
    let { value } = e.target;
    // 1. Remove non-digit/non-decimal characters
    value = value.replace(/[^0-9.]/g, "");
    // 2. Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setState(value);
  };

  // Handler for integer inputs: allows only whole numbers
  const handleIntegerChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const { value } = e.target;
    // Allow only digits (0-9)
    const integerValue = value.replace(/[^0-9]/g, "");
    setState(integerValue);
  };

  const handleSave = async () => {
    if (!date || !panelId.trim()) {
        setStatusMessage({ type: "error", message: "Date and Panel ID are required fields." });
        setTimeout(() => setStatusMessage(null), 3000);
        return;
    }
    // Check that all measurement fields are non-empty
    if (!construction || !denier || !weight || !widthSize || !lengthSize || !actualOutput) {
        setStatusMessage({ type: "error", message: "Please fill in all cutting measurement fields." });
        setTimeout(() => setStatusMessage(null), 3000);
        return;
    }

    setStatusMessage(null);
    setSaving(true);
    
    // API call to save data
    try {
      // Data to save, parsing the string values to their final numeric types
      const dataToSave = {
        date,
        panelId,
        panelType, // Include new field
        construction: parseFloat(construction),
        denier: parseFloat(denier),
        weight: parseFloat(weight),
        widthSize: parseFloat(widthSize),
        lengthSize: parseFloat(lengthSize),
        actualOutput: parseInt(actualOutput, 10), // Parse to integer
      };

      console.log("Saving cutting data:", dataToSave); 
      
      // NOTE: Using a mock endpoint and payload. Replace with real API logic.
      const res = await fetch("/api/cutting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (!res.ok) {
        let msg = "Failed to save data on the server.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {}
        throw new Error(msg);
      }

      setStatusMessage({ type: "success", message: "Cutting data successfully saved! Ready for next entry." });
      resetForm();
    } catch (e: any) {
      setStatusMessage({
        type: "error",
        message: `Submission failed: ${e?.message || "Unknown error"}`,
      });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900">
        Cutting Data Entry
      </h1>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg font-medium ${
            statusMessage.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      {/* Main card container matching the Inspection style */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
        
        {/* 1. Date Input (with line below it) */}
        <div className="pb-4 border-b border-gray-200"> 
          <div className="flex items-center space-x-3 max-w-sm">
            <label htmlFor="date" className="text-lg font-semibold whitespace-nowrap">
              Date:
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={baseInputStyleLeft}
            />
          </div>
        </div>

        {/* 2. Panel ID and Type Inputs - Side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4"> 
            {/* Panel ID */}
            <div className="flex items-center space-x-3">
                <label htmlFor="panelId" className="text-lg font-semibold whitespace-nowrap">
                Panel ID:
                </label>
                <input
                id="panelId"
                type="text"
                placeholder="Enter Panel ID"
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
                className={baseInputStyleLeft}
                />
            </div>
            
            {/* Type Dropdown */}
            <div className="flex items-center space-x-3">
                <label htmlFor="panelType" className="text-lg font-semibold whitespace-nowrap">
                    Type:
                </label>
                <select
                    id="panelType"
                    value={panelType}
                    onChange={(e) => setPanelType(e.target.value)}
                    className={`${baseInputStyleLeft} appearance-none`}
                >
                    <option value="Laminated">Laminated</option>
                    <option value="Unlaminated">Unlaminated</option>
                </select>
            </div>
        </div>

        {/* 3. Cutting Measurements Section - Row 1 */}
        <div className="mb-4 pt-4"> 
          {/* New 3-column grid for measurements (Tape/Inch, Denier, Weigh) */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Construction (Tape/Inch) */}
            <div className="space-y-1">
              <label htmlFor="construction" className="block text-xs font-bold text-gray-500 text-center font-bold">
                Construction (Tape/Inch):
              </label>
              <input
                id="construction"
                name="construction"
                type="text"
                placeholder="0.00"
                value={construction}
                onChange={(e) => handleFloatChange(e, setConstruction)}
                className={baseInputStyleCentered}
              />
            </div>

            {/* Denier */}
            <div className="space-y-1">
              <label htmlFor="denier" className="block text-xs font-bold text-gray-500 text-center font-bold">
                Denier:
              </label>
              <input
                id="denier"
                name="denier"
                type="text"
                placeholder="0.00"
                value={denier}
                onChange={(e) => handleFloatChange(e, setDenier)}
                className={baseInputStyleCentered}
              />
            </div>

            {/* Weigh (g/m2) */}
            <div className="space-y-1">
              <label htmlFor="weight" className="block text-xs font-bold text-gray-500 text-center font-bold">
                Weigh (g/m²):
              </label>
              <input
                id="weight"
                name="weight"
                type="text"
                placeholder="0.00"
                value={weight}
                onChange={(e) => handleFloatChange(e, setWeight)}
                className={baseInputStyleCentered}
              />
            </div>
          </div>
        </div>
        
        {/* 4. Cutting Measurements Section - Row 2 (New Fields) */}
        <div className="mb-4">
          {/* New 3-column grid for sizes and output */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Width Size (inch) - Float */}
            <div className="space-y-1">
              <label htmlFor="widthSize" className="block text-xs font-bold text-gray-500 text-center font-bold">
                Width Size (inch):
              </label>
              <input
                id="widthSize"
                name="widthSize"
                type="text"
                placeholder="0.00"
                value={widthSize}
                onChange={(e) => handleFloatChange(e, setWidthSize)}
                className={baseInputStyleCentered}
              />
            </div>

            {/* Length Size (inch) - Float */}
            <div className="space-y-1">
              <label htmlFor="lengthSize" className="block text-xs font-bold text-gray-500 text-center font-bold">
                Length Size (inch):
              </label>
              <input
                id="lengthSize"
                name="lengthSize"
                type="text"
                placeholder="0.00"
                value={lengthSize}
                onChange={(e) => handleFloatChange(e, setLengthSize)}
                className={baseInputStyleCentered}
              />
            </div>

            {/* Actual Output (pcs) - Integer */}
            <div className="space-y-1">
              <label htmlFor="actualOutput" className="block text-xs font-bold text-gray-500 text-center font-bold">
                Actual Output (pcs):
              </label>
              <input
                id="actualOutput"
                name="actualOutput"
                type="text"
                placeholder="0"
                value={actualOutput}
                onChange={(e) => handleIntegerChange(e, setActualOutput)}
                className={baseInputStyleCentered}
              />
            </div>
          </div>
        </div>


        {/* 5. Save Button (at the bottom) */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 text-white font-semibold rounded-lg shadow-md transition duration-150 transform ${
              saving
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
            }`}
          >
            {saving ? (
                <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                </div>
            ) : (
                "Save Data"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
