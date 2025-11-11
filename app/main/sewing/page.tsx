"use client";

import React, { useState } from "react";

type StatusMessage = { type: "success" | "error"; message: string } | null;

// Allowed operation types (keeps select + state typed)
type OperationType = "SP1" | "SP2" | "PC" | "SB" | "SPP" | "SS" | "SSP" | "SD" | "ST";

// Keep the labels as a typed tuple so we can derive the key type
const ORDER = [
  "C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12",
  "S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12",
  "S13","S14","S15","S16","S17","S18","S19","S20","S21","S22","S23","S24",
  "ST1","ST2",
] as const;

type EntryKey = (typeof ORDER)[number];

const BASE_INPUT =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
const ENTRY_INPUT = "p-2 border border-gray-300 rounded-lg w-full text-center";

// Safe error → message helper
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

export default function SewingPage() {
  // Date in YYYY-MM-DD
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Default operation type
  const [operationType, setOperationType] = useState<OperationType>("SP1");

  // Counts
  const [dataEntries, setDataEntries] = useState<Record<EntryKey, string>>(
    Object.fromEntries(ORDER.map((k) => [k, ""])) as Record<EntryKey, string>
  );

  // UI state
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const [saving, setSaving] = useState(false);

  // Only allow integers (or empty)
  const handleEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, "");
    // name is string; assert it's one of our typed keys
    if (ORDER.includes(name as EntryKey)) {
      setDataEntries((prev) => ({ ...prev, [name as EntryKey]: numericValue }));
    }
  };

  // Explicit order already defined in ORDER
  // Group into rows of 4 (last row has 2)
  const rows: EntryKey[][] = [];
  for (let i = 0; i < ORDER.length; i += 4) rows.push(ORDER.slice(i, i + 4) as EntryKey[]);

  const resetEntries = () =>
    setDataEntries(Object.fromEntries(ORDER.map((k) => [k, ""])) as Record<EntryKey, string>);

  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/sewing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,          // backend keeps YYYY-MM-DD
          operationType, // now strongly typed
          dataEntries,
        }),
      });

      if (!res.ok) {
        let msg = "Failed to save data on the server.";
        try {
          const json = await res.json();
          if (json?.message) msg = json.message as string;
        } catch {}
        throw new Error(msg);
      }

      setStatusMessage({
        type: "success",
        message: "Data successfully saved! Ready for next entry.",
      });
      resetEntries();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        message: `Submission failed: ${getErrorMessage(err)}`,
      });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900">Sewing Data Entry</h1>

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
        {/* Row 1: Date and Operation Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date picker with visible YYYY/MM/DD */}
          <div className="flex items-center space-x-3">
            <label htmlFor="date" className="text-lg font-semibold mb-4">
              Date:
            </label>

            <div className="relative w-full">
              {/* Hidden real input for backend */}
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              {/* Visible box with YYYY/MM/DD */}
              <div
                className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                           focus-within:ring-2 focus-within:ring-indigo-500 w-full text-gray-800
                           text-center font-medium select-none"
                onClick={() => {
                  const realInput = document.getElementById("date") as HTMLInputElement | null;
                  realInput?.showPicker?.();
                }}
              >
                {date.split("-").join("/")}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <label htmlFor="op-type" className="text-lg font-semibold mb-4">
              Operating Type:
            </label>
            <select
              id="op-type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as OperationType)}
              className={`${BASE_INPUT} appearance-none`}
            >
              <option value="SP1">SP1</option>
              <option value="SP2">SP2</option>
              <option value="PC">PC</option>
              <option value="SB">SB</option>
              <option value="SPP">SPP</option>
              <option value="SS">SS</option>
              <option value="SSP">SSP</option>
              <option value="SD">SD</option>
              <option value="ST">ST</option>
            </select>
          </div>
        </div>

        {/* Entry grid */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Operating Quantity :</h2>

          {rows.map((group, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-4 mt-4">
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
                    value={dataEntries[key] ?? ""}
                    onChange={handleEntryChange}
                    className={ENTRY_INPUT}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Save Button */}
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
