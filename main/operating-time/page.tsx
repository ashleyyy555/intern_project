"use client";

import React, { useState } from "react";

/** Strong types for D1..D31 */
type OTKey =
  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8"
  | "D9" | "D10" | "D11" | "D12" | "D13" | "D14" | "D15" | "D16"
  | "D17" | "D18" | "D19" | "D20" | "D21" | "D22" | "D23" | "D24"
  | "D25" | "D26" | "D27" | "D28" | "D29" | "D30" | "D31";

type StatusMessage = { type: "success" | "error"; message: string };

const FIELDS: readonly OTKey[] = [
  "D1","D2","D3","D4","D5","D6","D7","D8",
  "D9","D10","D11","D12","D13","D14","D15","D16",
  "D17","D18","D19","D20","D21","D22","D23","D24",
  "D25","D26","D27","D28","D29","D30","D31",
] as const;

// break into rows of 4 for layout
const ROWS: OTKey[][] = (() => {
  const rows: OTKey[][] = [];
  for (let i = 0; i < FIELDS.length; i += 4) rows.push(FIELDS.slice(i, i + 4) as OTKey[]);
  return rows;
})();

export default function OperatingPage() {
  const [operatorId, setOperatorId] = useState("");
  const [reportMonth, setReportMonth] = useState(""); // "YYYY-MM"
  const [operationType, setOperationType] = useState("sewing"); // stored as SectionType

  const [dataEntries, setDataEntries] = useState<Record<OTKey, string>>(
    Object.fromEntries(FIELDS.map((k) => [k, ""])) as Record<OTKey, string>
  );

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // styles
  const baseInputStyle =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";
  const entryInputStyle = "p-2 border border-gray-300 rounded-lg w-full text-center";

  // only allow ints (or empty)
  const handleEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, "");
    setDataEntries((prev) => ({ ...prev, [name as OTKey]: numericValue }));
  };

  const resetEntries = () =>
    setDataEntries(Object.fromEntries(FIELDS.map((k) => [k, ""])) as Record<OTKey, string>);

  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);

    try {
      const res = await fetch("/api/operation-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId,
          reportMonth,     // YYYY-MM from <input type="month">
          operationType,   // stored in DB as SectionType (string)
          dataEntries,     // D1..D31
        }),
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
      setOperatorId("");
      setReportMonth("");
    } catch (e: any) {
      setStatusMessage({ type: "error", message: `Submission failed: ${e?.message || "Unknown error"}` });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900">Operating Time Data Entry</h1>

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
        {/* Row 1: Operator ID + Month */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3 w-1/2 pr-4">
            <label htmlFor="operator-id" className="text-lg font-semibold w-24 shrink-0">
              Operator ID:
            </label>
            <input
              id="operator-id"
              type="text"
              placeholder="Enter ID"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className={baseInputStyle}
            />
          </div>

          <div className="flex items-center space-x-3 w-1/2 pl-4 justify-end">
            <label htmlFor="report-month" className="text-lg font-semibold shrink-0">
              Month & Year:
            </label>
            <input
              id="report-month"
              type="month"
              placeholder="YYYY-MM"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className={baseInputStyle}
            />
          </div>
        </div>

        {/* Row 2: Section Type */}
        <div className="border-t pt-4 border-gray-200">
          <div className="flex items-center space-x-3 max-w-md">
            <label htmlFor="op-type" className="text-lg font-semibold w-36 shrink-0">
              Section Type:
            </label>
            <select
              id="op-type"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className={`${baseInputStyle} appearance-none`}
            >
              <option value="sewing">Sewing</option>
              <option value="100%">100% Inspection</option>
            </select>
          </div>
        </div>

        {/* D1–D31 */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-indigo-600">Operating Time (minutes) :</h2>

          {ROWS.slice(0, 7).map((group, idx) => (
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

          {/* final partial row (D29–D31) */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            {FIELDS.slice(28, 31).map((key) => (
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
