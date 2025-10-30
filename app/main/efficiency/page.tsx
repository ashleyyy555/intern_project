"use client";

import React, { useState, useCallback } from "react";

// Define the two operation types
type OperationType = "Sewing" | "100% Inspection";

/** Strong types for the new metrics, now including M6 and M7 for new target types */
type MetricKey = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";

// Define the metrics for Efficiency and Utilization tracking
interface MetricEntry {
  M1: string; // Target: Sewing One Panel (Top or Bottom)
  M2: string; // No. of Workers (Normal)
  M3: string; // Operating Time (mins) (Normal)
  M4: string; // No. of Workers (Overtime)
  M5: string; // Operating Time (mins) (Overtime)
  M6: string; // Target: Duffel
  M7: string; // Target: Blower
}

type StatusMessage = { type: "success" | "error"; message: string };

// Define keys and labels for easy mapping to the new UI structure
const METRICS = {
  M1: { label: "Sewing One Panel (Top or Bottom)", decimal: false },
  M6: { label: "Duffel", decimal: false },
  M7: { label: "Blower", decimal: false },
  M2: { label: "No. of Workers", decimal: false },
  M3: { label: "Operating Time (mins)", decimal: true },
  M4: { label: "No. of Workers (OT)", decimal: false }, // Overtime Worker count
  M5: { label: "Operating Time (mins) (OT)", decimal: true }, // Overtime Duration
} satisfies Record<MetricKey, { label: string; decimal: boolean }>;

// Define the metrics that are always present in the state, but M6/M7 are only rendered for Inspection
const ALL_METRIC_KEYS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"] as const satisfies ReadonlyArray<MetricKey>;
const LABOR_TIME_METRICS = ["M2", "M3"] as const satisfies ReadonlyArray<MetricKey>; // Normal Time
const OVERTIME_METRICS = ["M4", "M5"] as const satisfies ReadonlyArray<MetricKey>; // Overtime (New Row)

export default function App() {
  // --- State Initialization ---
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [processType, setProcessType] = useState<OperationType>("Sewing");

  const [dataEntries, setDataEntries] = useState<Record<MetricKey, string>>(() => {
    // Initialize all metrics to empty string
    const initialState = {} as Record<MetricKey, string>;
    for (const key of ALL_METRIC_KEYS) {
      initialState[key] = "";
    }
    return initialState;
  });

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Styles ---
  const baseInputStyle =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const entryInputStyle = "p-2 border border-gray-300 rounded-lg w-full text-center";

  // --- Handlers ---

  // Only allow numeric input (or empty)
  const handleEntryChange = useCallback(
    (key: MetricKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const isDecimalAllowed = METRICS[key].decimal;

      let numericValue = value.replace(/[^0-9.]/g, "");
      if (!isDecimalAllowed) {
        // For non-decimal fields (M1, M2, M4, M6, M7), remove any decimal points
        numericValue = numericValue.replace(/\./g, "");
      } else {
        // For decimal fields (M3, M5), ensure only one decimal point
        numericValue = numericValue.replace(/(\..*)\./g, "$1");
      }

      setDataEntries((prev) => ({
        ...prev,
        [key]: numericValue,
      }));
    },
    []
  );

  const resetEntries = useCallback(() => {
    // Reset all fields to empty string
    const resetState = {} as Record<MetricKey, string>;
    for (const key of ALL_METRIC_KEYS) {
      resetState[key] = "";
    }
    setDataEntries(resetState);
  }, []);

  const handleProcessTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProcessType = e.target.value as OperationType;
    setProcessType(newProcessType);

    // Clear Duffel and Blower values if switching away from Inspection
    if (newProcessType !== "100% Inspection") {
      setDataEntries((prev) => ({
        ...prev,
        M6: "", // Duffel
        M7: "", // Blower
      }));
    }
  };

  // --- Save Logic (REAL API CALL) ---
  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);

    // Check if any critical data is missing (only checking main fields for simplicity)
    const primaryMetrics: ReadonlyArray<MetricKey> =
      processType === "Sewing" ? (["M1", "M2", "M3"] as const) : (["M1", "M6", "M7", "M2", "M3"] as const);

    const hasPrimaryData = primaryMetrics.some(
      (key) => dataEntries[key]?.length > 0 && parseFloat(dataEntries[key]) > 0
    );

    if (!hasPrimaryData) {
      setSaving(false);
      setStatusMessage({ type: "error", message: "Please enter primary data (Target/Workers/Time) before saving." });
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }

    try {
      // Build payload expected by /api/efficiency
      const payload = {
        date, // "YYYY-MM-DD"
        processType, // "Sewing" | "100% Inspection"
        dataEntries: {
          M1: dataEntries.M1,
          M2: dataEntries.M2,
          M3: dataEntries.M3,
          M4: dataEntries.M4,
          M5: dataEntries.M5,
          // only send M6/M7 when Inspection
          ...(processType === "100% Inspection" ? { M6: dataEntries.M6, M7: dataEntries.M7 } : {}),
        },
      } as const;

      const res = await fetch("/api/efficiency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save.");

      setStatusMessage({
        type: "success",
        message: "Data successfully saved! Ready for next entry.",
      });
      resetEntries();
    } catch (e: any) {
      setStatusMessage({
        type: "error",
        message: e?.message || "Submission failed: Could not connect to server.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Determine which target keys to render
  const targetMetricsToRender: ReadonlyArray<MetricKey> =
    processType === "100% Inspection" ? (["M1", "M6", "M7"] as const) : (["M1"] as const);

  // --- Render ---
  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 text-center">Efficiency & Utilization Data Entry</h1>

      {/* Status Message Area */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg font-medium text-center shadow-md ${
            statusMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
        {/* Date & Process Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-100">
          <div className="flex flex-col space-y-2">
            <label htmlFor="date" className="text-lg font-semibold text-gray-700">
              Date:
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={baseInputStyle}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="process-type" className="text-lg font-semibold text-gray-700">
              Manufacturing Process:
            </label>
            <select
              id="process-type"
              value={processType}
              onChange={handleProcessTypeChange}
              className={`${baseInputStyle} appearance-none bg-white`}
            >
              <option value="Sewing">Sewing</option>
              <option value="100% Inspection">100% Inspection</option>
            </select>
          </div>
        </div>

        {/* Data Grid with 3 Sections */}
        <div className="space-y-6">
          {/* Section 1: Target (pcs) */}
          <section>
            <h3 className="text-base font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Target (pcs)</h3>
            {/* Grid layout adapts based on the number of rendered items (1 for Sewing, 3 for Inspection) */}
            <div
              className={`grid gap-4 ${
                processType === "Sewing" ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {targetMetricsToRender.map((key: MetricKey) => {
                let currentLabel = METRICS[key].label;

                // Conditional Label Change for M1 in '100% Inspection' mode
                if (key === "M1" && processType === "100% Inspection") {
                  currentLabel = "Top/Bottom Panel";
                }

                return (
                  <div key={key} className="space-y-1">
                    <label htmlFor={key} className="block text-xs font-medium text-gray-500 text-center">
                      {currentLabel}
                    </label>
                    <input
                      id={key}
                      name={key}
                      type="text"
                      placeholder="0"
                      value={dataEntries[key]}
                      onChange={handleEntryChange(key)}
                      className={entryInputStyle}
                      inputMode={METRICS[key].decimal ? "decimal" : "numeric"}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Normal Operating Time */}
          <section>
            <h3 className="text-base font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Normal Operating Time
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LABOR_TIME_METRICS.map((key: MetricKey) => (
                <div key={key} className="space-y-1 col-span-2">
                  <label htmlFor={key} className="block text-xs font-medium text-gray-500 text-center">
                    {METRICS[key].label}
                  </label>
                  <input
                    id={key}
                    name={key}
                    type="text"
                    placeholder="0"
                    value={dataEntries[key]}
                    onChange={handleEntryChange(key)}
                    className={entryInputStyle}
                    inputMode={METRICS[key].decimal ? "decimal" : "numeric"}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Overtime */}
          <section>
            <h3 className="text-base font-semibold text-gray-800 mt-2 mb-2 border-b border-gray-200 pb-1">Overtime</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {OVERTIME_METRICS.map((key: MetricKey) => (
                <div key={key} className="space-y-1 col-span-2">
                  <label htmlFor={key} className="block text-xs font-medium text-gray-500 text-center">
                    {METRICS[key].label}
                  </label>
                  <input
                    id={key}
                    name={key}
                    type="text"
                    placeholder="0"
                    value={dataEntries[key]}
                    onChange={handleEntryChange(key)}
                    className={entryInputStyle}
                    inputMode={METRICS[key].decimal ? "decimal" : "numeric"}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 text-white font-semibold rounded-lg shadow-md transition duration-150 transform ${
              saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
            }`}
          >
            {saving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
