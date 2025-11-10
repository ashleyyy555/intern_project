"use client";

import React, { useState } from "react";

/** Strong types for the packing fields */
type PackingKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";

type StatusMessage = { type: "success" | "error"; message: string };

const FIELDS: readonly PackingKey[] = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"] as const;

// Split into 2 rows of 4 (Machine 1: P1–P4, Machine 2: P5–P8)
const ROWS: PackingKey[][] = [FIELDS.slice(0, 4) as PackingKey[], FIELDS.slice(4, 8) as PackingKey[]];

// Labels per column (reused for both rows)
const CUSTOM_LABELS = ["In-house", "Semi", "Complete wt 100%", "Complete wo 100%"] as const;

export default function PackingPage() {
  // Date (YYYY-MM-DD)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Strongly-typed field values
  const [dataEntries, setDataEntries] = useState<Record<PackingKey, string>>({
    P1: "", P2: "", P3: "", P4: "",
    P5: "", P6: "", P7: "", P8: "",
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
      [name as PackingKey]: numericValue,
    }));
  };

  const resetEntries = () =>
    setDataEntries({
      P1: "", P2: "", P3: "", P4: "",
      P5: "", P6: "", P7: "", P8: "",
    });

  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dataEntries }),
      });

      if (!res.ok) {
        let msg = "Failed to save data on the server.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {}
        throw new Error(msg);
      }

      setStatusMessage({ type: "success", message: "Data successfully saved! Ready for next entry." });
      resetEntries();
    } catch (e: any) {
      setStatusMessage({ type: "error", message: `Submission failed: ${e?.message || "Unknown error"}` });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900">Packing Data Entry</h1>

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
        {/* Date with custom display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {date.split("-").join("/")} {/* YYYY/MM/DD display */}
              </div>
            </div>
          </div>
        </div>

        {/* P1–P8 */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Operating Quantity :</h2>

          {/* Machine 1: P1–P4 */}
          <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2 border-b border-gray-200 pb-1">
            Machine No. 1
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {ROWS[0].map((key, colIdx) => (
              <div key={key} className="space-y-1">
                <label htmlFor={key} className="block text-xs font-medium text-gray-500">
                  {CUSTOM_LABELS[colIdx]}:
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

          {/* Machine 2: P5–P8 */}
          <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2 border-b border-gray-200 pb-1">
            Machine No. 2
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {ROWS[1].map((key, colIdx) => (
              <div key={key} className="space-y-1">
                <label htmlFor={key} className="block text-xs font-medium text-gray-500">
                  {CUSTOM_LABELS[colIdx]}:
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
