"use client";

import React, { useState } from "react";

type StatusMessage = { type: "success" | "error"; message: string };

// Utility to get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split("T")[0];

export default function CuttingPage() {
  const [date, setDate] = useState(getTodayDate());
  const [panelId, setPanelId] = useState("");
  const [panelType, setPanelType] = useState("Laminated");

  // ✅ Construction split into 2 inputs
  const [constructionA, setConstructionA] = useState("");
  const [constructionB, setConstructionB] = useState("");

  // ✅ Renamed Denier → Meterage
  const [meterage, setMeterage] = useState("");

  const [weight, setWeight] = useState("");
  const [widthSize, setWidthSize] = useState("");
  const [lengthSize, setLengthSize] = useState("");
  const [actualOutput, setActualOutput] = useState("");

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);

  const baseInputStyleCentered =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-center";

  const baseInputStyleLeft =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

  const resetForm = () => {
    setDate(getTodayDate());
    setPanelId("");
    setPanelType("Laminated");
    setConstructionA("");
    setConstructionB("");
    setMeterage("");
    setWeight("");
    setWidthSize("");
    setLengthSize("");
    setActualOutput("");
  };

  const handleFloatChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<string>>
  ) => {
    let { value } = e.target;
    value = value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) value = parts[0] + "." + parts.slice(1).join("");
    setState(value);
  };

  const handleIntegerChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const { value } = e.target;
    const integerValue = value.replace(/[^0-9]/g, "");
    setState(integerValue);
  };

  const handleSave = async () => {
    if (!date || !panelId.trim()) {
      setStatusMessage({ type: "error", message: "Date and Panel are required fields." });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (
      !constructionA ||
      !constructionB ||
      !meterage ||
      !weight ||
      !widthSize ||
      !lengthSize ||
      !actualOutput
    ) {
      setStatusMessage({
        type: "error",
        message: "Please fill in all cutting measurement fields.",
      });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setStatusMessage(null);
    setSaving(true);

    try {
      // ✅ Combine construction parts into one string (e.g., "12x8")
      const construction = `${parseFloat(constructionA)}x${parseFloat(constructionB)}`;

      const dataToSave = {
        date,
        panelId,
        panelType,
        construction,
        meterage: parseFloat(meterage), // ✅ changed key
        weight: parseFloat(weight),
        widthSize: parseFloat(widthSize),
        lengthSize: parseFloat(lengthSize),
        actualOutput: parseInt(actualOutput, 10),
      };

      console.log("Saving cutting data:", dataToSave);

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

      setStatusMessage({
        type: "success",
        message: "Cutting data successfully saved! Ready for next entry.",
      });
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
      <h1 className="text-3xl font-extrabold text-gray-900">Cutting Data Entry</h1>

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
        {/* Date Input */}
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

        {/* Panel and Type Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          <div className="flex items-center space-x-3">
            <label htmlFor="panelId" className="text-lg font-semibold whitespace-nowrap">
              Panel:
            </label>
            <select
              id="panelId"
              value={panelId}
              onChange={(e) => setPanelId(e.target.value)}
              className={`${baseInputStyleLeft} appearance-none`}
            >
              <option value="">Select Panel</option>
              <option value="Heavy Duty Fabric">Heavy Duty Fabric</option>
              <option value="Light Duty Fabric">Light Duty Fabric</option>
              <option value="Circular Fabric">Circular Fabric</option>
              <option value="Type 110">Type 110</option>
              <option value="Type 148">Type 148</option>
            </select>
          </div>

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

        {/* Cutting Measurements Row 1 */}
        <div className="mb-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* ✅ Split Construction Input */}
            <div className="space-y-1">
              <label
                htmlFor="constructionA"
                className="block text-xs font-bold text-gray-500 text-center"
              >
                Construction (Tape/Inch):
              </label>
              <div className="flex items-center justify-center space-x-2">
                <input
                  id="constructionA"
                  type="text"
                  placeholder="0"
                  value={constructionA}
                  onChange={(e) => handleFloatChange(e, setConstructionA)}
                  className={`${baseInputStyleCentered} w-20`}
                />
                <span className="font-bold text-gray-600">×</span>
                <input
                  id="constructionB"
                  type="text"
                  placeholder="0"
                  value={constructionB}
                  onChange={(e) => handleFloatChange(e, setConstructionB)}
                  className={`${baseInputStyleCentered} w-20`}
                />
              </div>
            </div>

            {/* ✅ Renamed field */}
            <div className="space-y-1">
              <label
                htmlFor="meterage"
                className="block text-xs font-bold text-gray-500 text-center"
              >
                Meterage (m):
              </label>
              <input
                id="meterage"
                type="text"
                placeholder="0.00"
                value={meterage}
                onChange={(e) => handleFloatChange(e, setMeterage)}
                className={baseInputStyleCentered}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="weight"
                className="block text-xs font-bold text-gray-500 text-center"
              >
                Weight (g/m²):
              </label>
              <input
                id="weight"
                type="text"
                placeholder="0.00"
                value={weight}
                onChange={(e) => handleFloatChange(e, setWeight)}
                className={baseInputStyleCentered}
              />
            </div>
          </div>
        </div>

        {/* Cutting Measurements Row 2 */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="widthSize"
                className="block text-xs font-bold text-gray-500 text-center"
              >
                Width Size (inch):
              </label>
              <input
                id="widthSize"
                type="text"
                placeholder="0.00"
                value={widthSize}
                onChange={(e) => handleFloatChange(e, setWidthSize)}
                className={baseInputStyleCentered}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="lengthSize"
                className="block text-xs font-bold text-gray-500 text-center"
              >
                Length Size (inch):
              </label>
              <input
                id="lengthSize"
                type="text"
                placeholder="0.00"
                value={lengthSize}
                onChange={(e) => handleFloatChange(e, setLengthSize)}
                className={baseInputStyleCentered}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="actualOutput"
                className="block text-xs font-bold text-gray-500 text-center"
              >
                Actual Output (pcs):
              </label>
              <input
                id="actualOutput"
                type="text"
                placeholder="0"
                value={actualOutput}
                onChange={(e) => handleIntegerChange(e, setActualOutput)}
                className={baseInputStyleCentered}
              />
            </div>
          </div>
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
            {saving ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
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
