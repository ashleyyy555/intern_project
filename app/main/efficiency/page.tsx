"use client";

import React, { useState } from "react";

// Operation types
type OperationType = "Sewing" | "100% Inspection";

// Metric keys
type MetricKey = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";

// Status message type
type StatusMessage = { type: "success" | "error"; message: string };

// Metrics info
const METRICS: Record<MetricKey, { label: string; decimal: boolean }> = {
  M1: { label: "Sewing One Panel (Top or Bottom)", decimal: false },
  M2: { label: "No. of Workers", decimal: false },
  M3: { label: "Operating Time (mins)", decimal: true },
  M4: { label: "No. of Workers (OT)", decimal: false },
  M5: { label: "Operating Time (mins) (OT)", decimal: true },
  M6: { label: "Duffel", decimal: false },
  M7: { label: "Blower", decimal: false },
};

const LABOR_KEYS: MetricKey[] = ["M2", "M3"];
const OVERTIME_KEYS: MetricKey[] = ["M4", "M5"];
const TARGET_KEYS: MetricKey[] = ["M1", "M6", "M7"];

/** Helper to display date as YYYY/MM/DD */
const formatDisplayDate = (isoDateStr: string) => {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  return `${year}/${month}/${day}`;
};

export default function EfficiencyPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [processType, setProcessType] = useState<OperationType>("Sewing");
  const [dataEntries, setDataEntries] = useState<Record<MetricKey, string>>({
    M1: "", M2: "", M3: "", M4: "", M5: "", M6: "", M7: "",
  });
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);

  const baseInputStyle =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const entryInputStyle = "p-2 border border-gray-300 rounded-lg w-full text-center";

  const handleEntryChange = (key: MetricKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!METRICS[key].decimal) value = value.replace(/[^0-9]/g, "");
    else value = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

    setDataEntries(prev => ({ ...prev, [key]: value }));
  };

  const resetEntries = () => {
    setDataEntries({ M1: "", M2: "", M3: "", M4: "", M5: "", M6: "", M7: "" });
  };

  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);
    try {
      const payload = {
        date,
        processType,
        dataEntries: processType === "100% Inspection"
          ? dataEntries
          : { M1: dataEntries.M1, M2: dataEntries.M2, M3: dataEntries.M3, M4: dataEntries.M4, M5: dataEntries.M5 },
      };
      const res = await fetch("/api/efficiency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save.");
      setStatusMessage({ type: "success", message: "Data successfully saved! Ready for next entry." });
      resetEntries();
    } catch (e: any) {
      setStatusMessage({ type: "error", message: e?.message || "Submission failed." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

      const targetKeysToRender: MetricKey[] =
        processType === "100% Inspection" ? TARGET_KEYS : (["M1"] as MetricKey[]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900">Efficiency & Utilization Data Entry</h1>

      {statusMessage && (
        <div className={`p-3 rounded-lg font-medium ${statusMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {statusMessage.message}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
        {/* Date & Process Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            <label htmlFor="date" className="text-lg font-semibold mb-4">Date:</label>
            <div className="relative w-full">
              {/* Hidden real input */}
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {/* Visible display */}
              <div
                className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                           focus-within:ring-2 focus-within:ring-indigo-500 w-full text-gray-800
                           text-center font-medium select-none"
                onClick={() => {
                  const realInput = document.getElementById("date") as HTMLInputElement | null;
                  realInput?.showPicker?.();
                }}
              >
                {formatDisplayDate(date)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <label htmlFor="process" className="text-lg font-semibold mb-4">Process:</label>
            <select
              id="process"
              value={processType}
              onChange={e => setProcessType(e.target.value as OperationType)}
              className={`${baseInputStyle} appearance-none`}
            >
              <option value="Sewing">Sewing</option>
              <option value="100% Inspection">100% Inspection</option>
            </select>
          </div>
        </div>

        {/* Target */}
        <section>
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-200 pb-1">Target (pcs)</h2>
          <div className={`grid gap-4 ${processType === "100% Inspection" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-sm mx-auto"}`}>
            {targetKeysToRender.map(key => (
              <div key={key} className="space-y-1">
                <label htmlFor={key} className="block text-xs font-medium text-gray-500 text-center">
                {key === "M1" && processType === "100% Inspection" ? "Top/Bottom Panel" : METRICS[key].label}
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

        {/* Normal Operating Time */}
        <section>
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-200 pb-1">Normal Operating Time</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LABOR_KEYS.map(key => (
              <div key={key} className="space-y-1 col-span-2">
                <label htmlFor={key} className="block text-xs font-medium text-gray-500 text-center">{METRICS[key].label}</label>
                <input id={key} name={key} type="text" placeholder="0" value={dataEntries[key]} onChange={handleEntryChange(key)} className={entryInputStyle} inputMode={METRICS[key].decimal ? "decimal" : "numeric"} />
              </div>
            ))}
          </div>
        </section>

        {/* Overtime */}
        <section>
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-200 pb-1">Overtime</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {OVERTIME_KEYS.map(key => (
              <div key={key} className="space-y-1 col-span-2">
                <label htmlFor={key} className="block text-xs font-medium text-gray-500 text-center">{METRICS[key].label}</label>
                <input id={key} name={key} type="text" placeholder="0" value={dataEntries[key]} onChange={handleEntryChange(key)} className={entryInputStyle} inputMode={METRICS[key].decimal ? "decimal" : "numeric"} />
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button onClick={handleSave} disabled={saving} className={`px-6 py-3 text-white font-semibold rounded-lg shadow-md transition duration-150 transform ${saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"}`}>
            {saving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
