"use client";

import React, { useState } from "react";

/** Strong types for the inspection fields */
type InspectionKey =
  | "I1" | "I2" | "I3" | "I4"
  | "I5" | "I6" | "I7" | "I8"
  | "I9" | "I10" | "I11" | "I12"
  | "I13" | "I14";

type StatusMessage = { type: "success" | "error"; message: string };

const FIELDS: readonly InspectionKey[] = [
  "I1","I2","I3","I4",
  "I5","I6","I7","I8",
  "I9","I10","I11","I12",
  "I13","I14",
] as const;

// Group fields into rows of 4 for layout
const ROWS: InspectionKey[][] = (() => {
  const rows: InspectionKey[][] = [];
  for (let i = 0; i < FIELDS.length; i += 4) rows.push(FIELDS.slice(i, i + 4) as InspectionKey[]);
  return rows;
})();

/** Helper to display date as DD/MM/YYYY */
const formatDisplayDate = (isoDateStr: string) => {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  return `${year}/${month}/${day}`;
};

export default function InspectionPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [operationType, setOperationType] = useState("Inhouse"); // UI strings are saved directly
  const [dataEntries, setDataEntries] = useState<Record<InspectionKey, string>>({
    I1:"", I2:"", I3:"", I4:"",
    I5:"", I6:"", I7:"", I8:"",
    I9:"", I10:"", I11:"", I12:"",
    I13:"", I14:"",
  });

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // Styles
  const baseInputStyle =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const entryInputStyle = "p-2 border border-gray-300 rounded-lg w-full text-center";

  // Only allow integers (or empty)
  const handleEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, "");
    setDataEntries((prev) => ({
      ...prev,
      [name as InspectionKey]: numericValue,
    }));
  };

  const resetEntries = () =>
    setDataEntries({
      I1:"", I2:"", I3:"", I4:"",
      I5:"", I6:"", I7:"", I8:"",
      I9:"", I10:"", I11:"", I12:"",
      I13:"", I14:"",
    });

  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, operationType, dataEntries }),
      });

      if (!res.ok) {
        let msg = "Failed to save data on the server.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {}
        throw new Error(msg);
      }

      setStatusMessage({
        type: "success",
        message: "Data successfully saved! Ready for next entry.",
      });
      resetEntries();
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
      <h1 className="text-3xl font-extrabold text-gray-900">100% Inspection Data Entry</h1>

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

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
        {/* Date + Operation Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DATE with custom display */}
          <div className="flex items-center space-x-3">
            <label htmlFor="date" className="text-lg font-semibold mb-4">
              Date:
            </label>

            <div className="relative w-full">
              {/* Hidden real input (keeps backend value format) */}
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              {/* Visible display box */}
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

          {/* OPERATION TYPE */}
          <div className="flex items-center space-x-3">
            <label htmlFor="op-type" className="text-lg font-semibold mb-4">
              Operating Type:
            </label>
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

        {/* Quantities */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Operating Quantity :</h2>

          {ROWS.map((group, idx) => (
            <div key={idx} className={`grid grid-cols-4 gap-4 ${idx === 0 ? "" : "mt-4"}`}>
              {group.map((key) => (
                <div key={key} className="space-y-1">
                  <label htmlFor={key} className="block text-xs font-medium text-gray-500">
                    {key}:
                  </label>
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
          ))}
        </div>

        {/* Save */}
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
            {saving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
