"use client";

import React, { useState } from "react";
import { searchData } from "@/app/actions/search";
import {
  PACKING_KEYS, PACKING_HEADERS, PACKING_FIELD_MAP,
  INSPECTION_KEYS, INSPECTION_HEADERS, INSPECTION_FIELD_MAP,
  SEWING_KEYS, SEWING_HEADERS, SEWING_FIELD_MAP,
  OPERATION_KEYS, OPERATION_HEADERS, OPERATION_FIELD_MAP,
  EFFICIENCY_SEWING_KEYS, EFFICIENCY_SEWING_HEADERS, EFFICIENCY_SEWING_FIELD_MAP,
  EFFICIENCY_INSPECTION100_KEYS, EFFICIENCY_INSPECTION100_HEADERS, EFFICIENCY_INSPECTION100_FIELD_MAP,
  // Cutting
  CUTTING_KEYS, CUTTING_HEADERS, CUTTING_FIELD_MAP,
} from "@/lib/inspectionFields";

import { fetchRecordById, updateRecord, deleteRecord } from "@/app/actions/records";

// ---- Cutting dropdown options (keep in sync with server allow-lists) ----
const PANEL_ID_OPTIONS = [
  "Heavy Duty Fabric",
  "Light Duty Fabric",
  "Circular Fabric",
  "Type 110",
  "Type 148",
] as const;

const PANEL_TYPE_OPTIONS = ["Laminated", "Unlaminated"] as const;

// ---- NEW: Operation type / Section type dropdown options (keep in sync with server) ----
const SEWING_OPERATION_TYPES = [
  "SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST",
] as const;

const INSPECTION_OPERATION_TYPES = [
  "In house",           // adjust to your canonical spelling if needed (e.g., 'in-house')
  "Semi",
  "Complete wt 100%",
  "Complete wo 100%",
] as const;

const SECTION_TYPE_OPTIONS = [
  "Sewing",
  "100% Inspection",
] as const;

// Section dropdown options
const sectionOptions = [
  { value: "all", label: "Pick a section" },
  { value: "cutting", label: "Cutting" },
  { value: "sewing", label: "Sewing" },
  { value: "100%", label: "100% Inspection" },
  { value: "packing", label: "Packing" },
  { value: "operationtime", label: "Operating Time" },
  { value: "efficiency-sewing", label: "Efficiency - Sewing" },
  { value: "efficiency-100", label: "Efficiency - 100% Inspection" },
];

// Helper: today in YYYY-MM-DD
const getCurrentDate = () => new Date().toISOString().split("T")[0];

// ---- helpers to reuse your maps (for edit modal) ----
const getKeysForSection = (section: string) => {
  if (section === "cutting") return CUTTING_KEYS;
  if (section === "packing") return PACKING_KEYS;
  if (section === "100%") return INSPECTION_KEYS;
  if (section === "sewing") return SEWING_KEYS;
  if (section === "operationtime") return OPERATION_KEYS;
  if (section === "efficiency-sewing") return EFFICIENCY_SEWING_KEYS;
  if (section === "efficiency-100") return EFFICIENCY_INSPECTION100_KEYS;
  return [] as string[];
};

const getHeadersForSection = (section: string) => {
  if (section === "cutting") return CUTTING_HEADERS;
  if (section === "packing") return PACKING_HEADERS;
  if (section === "100%") return INSPECTION_HEADERS;
  if (section === "sewing") return SEWING_HEADERS;
  if (section === "operationtime") return OPERATION_HEADERS;
  if (section === "efficiency-sewing") return EFFICIENCY_SEWING_HEADERS;
  if (section === "efficiency-100") return EFFICIENCY_INSPECTION100_HEADERS;
  return {} as Record<string, string>;
};

const getFieldMapForSection = (section: string) => {
  if (section === "cutting") return CUTTING_FIELD_MAP;
  if (section === "packing") return PACKING_FIELD_MAP;
  if (section === "100%") return INSPECTION_FIELD_MAP;
  if (section === "sewing") return SEWING_FIELD_MAP;
  if (section === "operationtime") return OPERATION_FIELD_MAP;
  if (section === "efficiency-sewing") return EFFICIENCY_SEWING_FIELD_MAP;
  if (section === "efficiency-100") return EFFICIENCY_INSPECTION100_FIELD_MAP;
  return {} as Record<string, string>;
};

// Only numeric columns by section (so text fields like panelId/panelType stay text/select)
const getNumericColsForSection = (section: string) => {
  if (section === "cutting") {
    // construction, denier, weight, widthSize, lengthSize, actualOutput
    return new Set([
      CUTTING_FIELD_MAP.C3,
      CUTTING_FIELD_MAP.C4,
      CUTTING_FIELD_MAP.C5,
      CUTTING_FIELD_MAP.C6,
      CUTTING_FIELD_MAP.C7,
      CUTTING_FIELD_MAP.C8,
    ]);
  }
  if (section === "packing") return new Set(Object.values(PACKING_FIELD_MAP));
  if (section === "100%") return new Set(Object.values(INSPECTION_FIELD_MAP));
  if (section === "sewing") return new Set(Object.values(SEWING_FIELD_MAP));
  if (section === "operationtime") return new Set(Object.values(OPERATION_FIELD_MAP));
  // efficiency sections are mixed; keep as text unless you define granular sets
  return new Set<string>();
};

export default function SearchPage() {
  // filter state
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [section, setSection] = useState(sectionOptions[0].value);

  // results state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSection, setCurrentSection] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // edit/delete state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);

  const baseInputStyle =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

  // Run search with current filters
  const handleApplyFilters = async () => {
    setIsSearching(true);
    setErrorMessage("");
    setSearchResults([]);
    setCurrentSection("");

    const searchParams = {
      startDate: startDate || null,
      endDate: endDate || null,
      section,
    };

    try {
      const response = await searchData(searchParams);
      if (response && "error" in response) {
        console.error("Server Action Error:", response.error);
        setErrorMessage(`Search failed: ${response.error}`);
      } else if (response && "data" in response) {
        setSearchResults(response.data);
        setCurrentSection(response.section);
      }
    } catch (error) {
      console.error("Error during search execution:", error);
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Build headers based on section
  const getHeaders = (sec: string) => {
    const dateHeader =
      sec === "operationtime"
        ? { key: "yearMonth", label: "Month/Year" }
        : { key: "operationDate", label: "Date" };

    const operationTypeHeader = { key: "operationType", label: "Operation Type" };

    if (sec === "cutting") {
      const cuttingHeaders = CUTTING_KEYS.map((key) => ({
        key,
        label: CUTTING_HEADERS[key],
      }));
      // Cutting uses operationDate like other daily tables
      return [{ key: "operationDate", label: "Date" }, ...cuttingHeaders];
    }

    if (sec === "packing") {
      const packingHeaders = PACKING_KEYS.map((key) => ({
        key,
        label: PACKING_HEADERS[key],
      }));
      return [dateHeader, ...packingHeaders];
    }
    if (sec === "100%") {
      const inspectionHeaders = INSPECTION_KEYS.map((key) => ({
        key,
        label: INSPECTION_HEADERS[key],
      }));
      return [dateHeader, operationTypeHeader, ...inspectionHeaders];
    }
    if (sec === "sewing") {
      const sewingHeaders = SEWING_KEYS.map((key) => ({
        key,
        label: SEWING_HEADERS[key],
      }));
      return [dateHeader, operationTypeHeader, ...sewingHeaders];
    }
    if (sec === "operationtime") {
      const operationHeaders = OPERATION_KEYS.map((key) => ({
        key,
        label: OPERATION_HEADERS[key],
      }));
      const sectionTypeHeader = { key: "SectionType", label: "Section Type" };
      const operatorIdHeader = { key: "OperatorId", label: "Operator ID" };
      return [
        { key: "yearMonth", label: "Month/Year" },
        sectionTypeHeader,
        operatorIdHeader,
        ...operationHeaders,
      ];
    }
    if (sec === "efficiency-sewing") {
      const effSewHeaders = EFFICIENCY_SEWING_KEYS.map((key) => ({
        key,
        label: EFFICIENCY_SEWING_HEADERS[key],
      }));
      return [{ key: "operationDate", label: "Date" }, ...effSewHeaders];
    }
    if (sec === "efficiency-100") {
      const eff100Headers = EFFICIENCY_INSPECTION100_KEYS.map((key) => ({
        key,
        label: EFFICIENCY_INSPECTION100_HEADERS[key],
      }));
      return [{ key: "operationDate", label: "Date" }, ...eff100Headers];
    }

    // default (unused path)
    return [
      { key: "date", label: "Date" },
      { key: "itemId", label: "Operator ID" },
      { key: "value", label: "Data Value" },
      { key: "section", label: "Section" },
    ];
  };

  // Map a DB row to table cells
  const getRowData = (row: any, sec: string) => {
    let date = "N/A";
    const operationType = row.operationType || "N/A";

    if (sec === "operationtime") {
      date = row.yearMonth || "N/A";
    } else {
      // Use operationDate everywhere else (fallback only if you truly have legacy)
      const d = row.operationDate || row.entry_date;
      date = d ? new Date(d).toLocaleDateString() : "N/A";
    }

    if (sec === "cutting") {
      const map = CUTTING_FIELD_MAP;
      return [
        date,
        row[map.C1], // panelId
        row[map.C2], // panelType
        row[map.C3],
        row[map.C4],
        row[map.C5],
        row[map.C6],
        row[map.C7],
        row[map.C8],
      ];
    }

    if (sec === "packing") {
      return [
        date,
        row[PACKING_FIELD_MAP.P1], row[PACKING_FIELD_MAP.P2], row[PACKING_FIELD_MAP.P3],
        row[PACKING_FIELD_MAP.P4], row[PACKING_FIELD_MAP.P5], row[PACKING_FIELD_MAP.P6],
        row[PACKING_FIELD_MAP.P7], row[PACKING_FIELD_MAP.P8],
      ];
    }
    if (sec === "100%") {
      return [
        date,
        operationType,
        row[INSPECTION_FIELD_MAP.I1], row[INSPECTION_FIELD_MAP.I2], row[INSPECTION_FIELD_MAP.I3],
        row[INSPECTION_FIELD_MAP.I4], row[INSPECTION_FIELD_MAP.I5], row[INSPECTION_FIELD_MAP.I6],
        row[INSPECTION_FIELD_MAP.I7], row[INSPECTION_FIELD_MAP.I8], row[INSPECTION_FIELD_MAP.I9],
        row[INSPECTION_FIELD_MAP.I10], row[INSPECTION_FIELD_MAP.I11], row[INSPECTION_FIELD_MAP.I12],
        row[INSPECTION_FIELD_MAP.I13], row[INSPECTION_FIELD_MAP.I14],
      ];
    }
    if (sec === "operationtime") {
      const sectionType = row.SectionType || "N/A";
      const operatorId = row.OperatorId || "N/A";
      return [
        date,
        sectionType,
        operatorId,
        row[OPERATION_FIELD_MAP.D1], row[OPERATION_FIELD_MAP.D2], row[OPERATION_FIELD_MAP.D3],
        row[OPERATION_FIELD_MAP.D4], row[OPERATION_FIELD_MAP.D5], row[OPERATION_FIELD_MAP.D6],
        row[OPERATION_FIELD_MAP.D7], row[OPERATION_FIELD_MAP.D8], row[OPERATION_FIELD_MAP.D9],
        row[OPERATION_FIELD_MAP.D10], row[OPERATION_FIELD_MAP.D11], row[OPERATION_FIELD_MAP.D12],
        row[OPERATION_FIELD_MAP.D13], row[OPERATION_FIELD_MAP.D14], row[OPERATION_FIELD_MAP.D15],
        row[OPERATION_FIELD_MAP.D16], row[OPERATION_FIELD_MAP.D17], row[OPERATION_FIELD_MAP.D18],
        row[OPERATION_FIELD_MAP.D19], row[OPERATION_FIELD_MAP.D20], row[OPERATION_FIELD_MAP.D21],
        row[OPERATION_FIELD_MAP.D22], row[OPERATION_FIELD_MAP.D23], row[OPERATION_FIELD_MAP.D24],
        row[OPERATION_FIELD_MAP.D25], row[OPERATION_FIELD_MAP.D26], row[OPERATION_FIELD_MAP.D27],
        row[OPERATION_FIELD_MAP.D28], row[OPERATION_FIELD_MAP.D29], row[OPERATION_FIELD_MAP.D30],
        row[OPERATION_FIELD_MAP.D31],
      ];
    }
    if (sec === "sewing") {
      return [
        date,
        operationType,
        row[SEWING_FIELD_MAP.C1], row[SEWING_FIELD_MAP.C2], row[SEWING_FIELD_MAP.C3], row[SEWING_FIELD_MAP.C4],
        row[SEWING_FIELD_MAP.C5], row[SEWING_FIELD_MAP.C6], row[SEWING_FIELD_MAP.C7], row[SEWING_FIELD_MAP.C8],
        row[SEWING_FIELD_MAP.C9], row[SEWING_FIELD_MAP.C10], row[SEWING_FIELD_MAP.C11], row[SEWING_FIELD_MAP.C12],
        row[SEWING_FIELD_MAP.S1], row[SEWING_FIELD_MAP.S2], row[SEWING_FIELD_MAP.S3], row[SEWING_FIELD_MAP.S4],
        row[SEWING_FIELD_MAP.S5], row[SEWING_FIELD_MAP.S6], row[SEWING_FIELD_MAP.S7], row[SEWING_FIELD_MAP.S8],
        row[SEWING_FIELD_MAP.S9], row[SEWING_FIELD_MAP.S10], row[SEWING_FIELD_MAP.S11], row[SEWING_FIELD_MAP.S12],
        row[SEWING_FIELD_MAP.S13], row[SEWING_FIELD_MAP.S14], row[SEWING_FIELD_MAP.S15], row[SEWING_FIELD_MAP.S16],
        row[SEWING_FIELD_MAP.S17], row[SEWING_FIELD_MAP.S18], row[SEWING_FIELD_MAP.S19], row[SEWING_FIELD_MAP.S20],
        row[SEWING_FIELD_MAP.S21], row[SEWING_FIELD_MAP.S22], row[SEWING_FIELD_MAP.S23], row[SEWING_FIELD_MAP.S24],
        row[SEWING_FIELD_MAP.ST1], row[SEWING_FIELD_MAP.ST2],
      ];
    }
    if (sec === "efficiency-sewing") {
      return [
        new Date(row.operationDate || row.entry_date).toLocaleDateString(),
        ...EFFICIENCY_SEWING_KEYS.map((k) => row[EFFICIENCY_SEWING_FIELD_MAP[k]]),
      ];
    }
    if (sec === "efficiency-100") {
      return [
        new Date(row.operationDate || row.entry_date).toLocaleDateString(),
        row[EFFICIENCY_INSPECTION100_FIELD_MAP.M1], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M6], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M7],
        row[EFFICIENCY_INSPECTION100_FIELD_MAP.M2], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M3], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M4],
        row[EFFICIENCY_INSPECTION100_FIELD_MAP.M5],
      ];
    }

    return [date, row.operator_id || "N/A", row.data_value || 0, row.section || "N/A"];
  };

  const headers = getHeaders(currentSection);
  const finalHeaders = searchResults.length > 0
    ? [...headers, { key: "__actions", label: "Actions" }]
    : headers;

  // --- Actions (only available after search) ---
  const handleOpenEdit = async (row: any, sec: string) => {
    try {
      setRowLoadingId(row.id);
      const res = await fetchRecordById({ section: sec, id: row.id as string });
      if (res && "data" in res && res.data) {
        setEditSection(sec);
        setEditId(row.id);
        setEditData(res.data);
        setIsEditOpen(true);
      } else {
        setErrorMessage((res as any)?.error || "Failed to load the record.");
      }
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleDelete = async (row: any, sec: string) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      setRowLoadingId(row.id);
      const res = await deleteRecord({ section: sec, id: row.id as string });
      if ((res as any)?.error) {
        setErrorMessage((res as any).error);
      } else {
        await handleApplyFilters();
      }
    } finally {
      setRowLoadingId(null);
    }
  };

  // numericCols determines which fields render <input type="number">
  const numericCols = getNumericColsForSection(editSection);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-extrabold text-gray-900">Data Search</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
        <h2 className="text-lg font-semibold text-indigo-600 mb-4">Filter Options</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Dates */}
          <div className="md:col-span-2 flex space-x-4">
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

          {/* Section */}
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
              {sectionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleApplyFilters}
            disabled={isSearching}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Search Results</h2>

        {errorMessage && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 font-medium">
            Error: {errorMessage}
          </div>
        )}
        {isSearching && <div className="text-center text-indigo-600 py-4">Loading results...</div>}

        {!isSearching && (
          <div className="overflow-x-auto">
            {searchResults.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {finalHeaders.map((h) => (
                      <th
                        key={h.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]"
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((row, index) => {
                    const rowData = getRowData(row, currentSection);
                    return (
                      <tr key={row.id ?? index}>
                        {rowData.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {cell}
                          </td>
                        ))}

                        {/* Actions (only visible when results exist) */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenEdit(row, currentSection)}
                              disabled={rowLoadingId === row.id}
                              className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-60"
                            >
                              {rowLoadingId === row.id ? "…" : "Edit"}
                            </button>
                            <button
                              onClick={() => handleDelete(row, currentSection)}
                              disabled={rowLoadingId === row.id}
                              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {rowLoadingId === row.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500 border border-dashed p-4 rounded-lg">
                {errorMessage
                  ? "No results found due to an error."
                  : "No results found with the current filter range."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Edit Record (#{editId}) — {editSection}
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {/* Date / Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {editSection === "operationtime" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month/Year (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={editData?.yearMonth || ""}
                    onChange={(e) =>
                      setEditData((d: any) => ({ ...d, yearMonth: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation Date</label>
                  <input
                    type="date"
                    value={
                      editData?.operationDate
                        ? new Date(editData.operationDate).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setEditData((d: any) => ({ ...d, operationDate: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              )}

              {/* SectionType + OperatorId for operationtime */}
              {editSection === "operationtime" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Type</label>
                    <select
                      value={editData?.SectionType ?? ""}
                      onChange={(e) => setEditData((d: any) => ({ ...d, SectionType: e.target.value }))}
                      className={`${baseInputStyle} bg-white`}
                    >
                      <option value="" disabled>Select section</option>
                      {SECTION_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operator ID</label>
                    <input
                      type="text"
                      value={editData?.OperatorId ?? ""}
                      onChange={(e) => setEditData((d: any) => ({ ...d, OperatorId: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Operation Type for Sewing/100% */}
            {(editSection === "100%" || editSection === "sewing") && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Operation Type</label>
                <select
                  value={editData?.operationType ?? ""}
                  onChange={(e) =>
                    setEditData((d: any) => ({ ...d, operationType: e.target.value }))
                  }
                  className={`${baseInputStyle} bg-white`}
                >
                  <option value="" disabled>Select operation type</option>
                  {(editSection === "sewing" ? SEWING_OPERATION_TYPES : INSPECTION_OPERATION_TYPES).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Cutting: dropdowns for panelId / panelType */}
            {editSection === "cutting" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Panel</label>
                  <select
                    value={editData?.panelId ?? ""}
                    onChange={(e) => setEditData((d: any) => ({ ...d, panelId: e.target.value }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="" disabled>Select Panel</option>
                    {PANEL_ID_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={editData?.panelType ?? ""}
                    onChange={(e) => setEditData((d: any) => ({ ...d, panelType: e.target.value }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="" disabled>Select Type</option>
                    {PANEL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Dynamic fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 max-h-[50vh] overflow-y-auto border rounded p-3">
              {(() => {
                const keys = getKeysForSection(editSection);
                const labels = getHeadersForSection(editSection);
                const map = getFieldMapForSection(editSection);

                return keys.map((k) => {
                  const col = (map as any)[k]; // actual DB column name
                  const text = (labels as any)[k] || k;

                  // Skip Cutting dropdown fields here (they're rendered above)
                  if (editSection === "cutting" && (col === "panelId" || col === "panelType")) {
                    return null;
                  }

                  const val = editData?.[col] ?? "";

                  return (
                    <div key={k} className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">{text}</label>
                      <input
                        type={numericCols.has(col) ? "number" : "text"}
                        value={val ?? ""}
                        onChange={(e) =>
                          setEditData((d: any) => ({
                            ...d,
                            [col]:
                              numericCols.has(col) && e.target.value !== ""
                                ? Number(e.target.value)
                                : e.target.value,
                          }))
                        }
                        className="p-2 border rounded"
                      />
                    </div>
                  );
                });
              })()}
            </div>

            {/* Save */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editId) return;
                  const res = await updateRecord({
                    section: editSection,
                    id: editId,
                    data: editData,
                  });
                  if ((res as any)?.error) {
                    setErrorMessage((res as any).error);
                  } else {
                    setIsEditOpen(false);
                    await handleApplyFilters();
                  }
                }}
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
