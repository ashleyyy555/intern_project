"use client";

import React, { useState } from "react";
import ExcelJS from "exceljs";
import type { Worksheet, Row, Cell } from "exceljs";
import { searchData } from "@/app/actions/search";
import {
  PACKING_KEYS, PACKING_HEADERS, PACKING_FIELD_MAP,
  INSPECTION_KEYS, INSPECTION_HEADERS, INSPECTION_FIELD_MAP,
  SEWING_KEYS, SEWING_HEADERS, SEWING_FIELD_MAP,
  OPERATION_KEYS, OPERATION_HEADERS, OPERATION_FIELD_MAP,
  EFFICIENCY_SEWING_KEYS, EFFICIENCY_SEWING_HEADERS, EFFICIENCY_SEWING_FIELD_MAP,
  EFFICIENCY_INSPECTION100_KEYS, EFFICIENCY_INSPECTION100_HEADERS, EFFICIENCY_INSPECTION100_FIELD_MAP,
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

// ---- Operation type / Section type dropdown options (keep in sync with server) ----
const SEWING_OPERATION_TYPES = [
  "SP1","SP2","PC","SB","SPP","SS","SSP","SD","ST",
] as const;

const INSPECTION_OPERATION_TYPES = [
  "IH", "S", "OS", "B",
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

/** Format a JS Date to YYYY-MM-DD in Asia/Kuala_Lumpur (stable string for Excel merge) */
function formatDateKL(d: Date | string | number | null | undefined): string {
  if (!d) return "N/A";
  const date = new Date(d);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find(p => p.type === "year")?.value ?? "0000";
  const m = parts.find(p => p.type === "month")?.value ?? "01";
  const day = parts.find(p => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

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

// Only numeric columns by section (so text fields like panelId/panelType stay text)
const getNumericColsForSection = (section: string) => {
  if (section === "cutting") {
    return new Set([
      CUTTING_FIELD_MAP.C3, // constructionA
      CUTTING_FIELD_MAP.C4, // constructionB
      CUTTING_FIELD_MAP.C5, // meterage
      CUTTING_FIELD_MAP.C6, // weight
      CUTTING_FIELD_MAP.C7, // widthSize
      CUTTING_FIELD_MAP.C8, // lengthSize
      CUTTING_FIELD_MAP.C9, // actualOutput (int)
    ]);
  }
  if (section === "packing") return new Set(Object.values(PACKING_FIELD_MAP));
  if (section === "100%") return new Set(Object.values(INSPECTION_FIELD_MAP));
  if (section === "sewing") return new Set(Object.values(SEWING_FIELD_MAP));
  if (section === "operationtime") return new Set(Object.values(OPERATION_FIELD_MAP));
  // efficiency sections are mixed; keep as text unless you define granular sets
  return new Set<string>();
};

const formatDisplayDate = (isoDateStr: string) => {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  return `${year}/${month}/${day}`;
};


/** -------- Safe public-API auto-fit helper with narrower columns -------- */
function autoFitColumns(ws: Worksheet, headerLabels: string[] = []) {
  const maxColumns = Math.max(ws.columnCount, headerLabels.length);
  const widths = Array.from({ length: maxColumns }, () => 10);

  // Consider headers too
  headerLabels.forEach((label, idx) => {
    const len = String(label ?? "").length + 2;
    widths[idx] = Math.max(widths[idx], len);
  });

  // Scan all rows/cells via public iterators
  ws.eachRow({ includeEmpty: true }, (row: Row) => {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const text =
        (cell as any).text ??
        (cell.value == null ? "" : String(cell.value));

      const idx = colNumber - 1;
      if (idx >= 0 && idx < widths.length) {
        // Cap effective length so long text doesn't explode the width
        const rawLen = text.length;
        const cappedLen = Math.min(rawLen, 18); // only care up to 18 chars
        const desired = cappedLen + 2;

        widths[idx] = Math.max(widths[idx], desired);
      }
    });
  });

  // Apply stricter min/max caps (narrower columns)
  const MIN_WIDTH = 8;
  const MAX_WIDTH = 22;

  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
  });
}

export default function SearchPage() {
  // filter state
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [section, setSection] = useState(sectionOptions[0].value);

  // results state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSection, setCurrentSection] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // NEW export state
  const [errorMessage, setErrorMessage] = useState("");

  // edit/delete state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);

  const baseInputStyle =
    "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

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

  // Map a DB row to table cells (reused for both display and export)
  const getRowData = (row: any, sec: string) => {
    let date = "N/A";
    const operationType = row.operationType || "N/A";

    if (sec === "operationtime") {
      date = row.yearMonth || "N/A";
    } else {
      // Use operationDate everywhere else; format KL-stable for merging
      const d = row.operationDate || row.entry_date;
      date = d ? formatDateKL(d) : "N/A";
    }

    if (sec === "cutting") {
      const map = CUTTING_FIELD_MAP;
      return [
        date,
        row[map.C1], // panelId
        row[map.C2], // panelType
        row[map.C3], // constructionA
        row[map.C4], // constructionB
        row[map.C5], // meterage
        row[map.C6], // weight
        row[map.C7], // widthSize
        row[map.C8], // lengthSize
        row[map.C9], // actualOutput
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
        formatDateKL(row.operationDate || row.entry_date),
        ...EFFICIENCY_SEWING_KEYS.map((k) => row[EFFICIENCY_SEWING_FIELD_MAP[k]]),
      ];
    }
    if (sec === "efficiency-100") {
      return [
        formatDateKL(row.operationDate || row.entry_date),
        row[EFFICIENCY_INSPECTION100_FIELD_MAP.M1], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M6], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M7],
        row[EFFICIENCY_INSPECTION100_FIELD_MAP.M2], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M3], row[EFFICIENCY_INSPECTION100_FIELD_MAP.M4],
        row[EFFICIENCY_INSPECTION100_FIELD_MAP.M5],
      ];
    }

    return [date, row.operator_id || "N/A", row.data_value || 0, row.section || "N/A"];
  };

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

  // NEW: Export to styled Excel using exceljs
  const handleExport = async () => {
    if (searchResults.length === 0) {
      alert("No data to export. Please run a search first.");
      return;
    }

    setIsExporting(true);
    setErrorMessage("");

    try {
      const headersDef = getHeaders(currentSection); // [{key,label}, ...]
      const headerLabels = headersDef.map(h => h.label);

      // Helper utils
      const wb = new ExcelJS.Workbook();
      const sheetName = (sectionOptions.find(s => s.value === currentSection)?.label || "Results")
        .replace(/[\\/?*[\]:]/g, " ");
      const ws = wb.addWorksheet(sheetName);

      const setThinBorder = (cell: Cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      };
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDFEBFF" } } as const;

      // Merge helper: merge equal values in a column for contiguous blocks
      const mergeEqualCellsInColumn = (
        colIndex: number,
        startRow: number,
        endRow: number
      ): void => {
        if (endRow <= startRow) return;
        let blockStart = startRow;
        let prev: any = ws.getCell(startRow, colIndex).value; // can be string | number | null | undefined

        const same = (a: any, b: any) => {
          const ax = a instanceof Date ? formatDateKL(a) : String(a ?? "");
          const bx = b instanceof Date ? formatDateKL(b) : String(b ?? "");
          return ax === bx;
        };

        for (let r = startRow + 1; r <= endRow + 1; r++) {
          const val = r <= endRow ? ws.getCell(r, colIndex).value : Symbol("end");
          const isSame = r <= endRow && same(val, prev);
          if (!isSame) {
            const blockEnd = r - 1;
            if (blockEnd > blockStart) {
              ws.mergeCells(blockStart, colIndex, blockEnd, colIndex);
              const topCell = ws.getCell(blockStart, colIndex);
              topCell.alignment = { vertical: "middle", horizontal: "center" };
            }
            blockStart = r;
            prev = val;
          }
        }
      };

      // Title
      const title = `${sheetName} (${startDate} to ${endDate})`;
      ws.addRow([title]);
      ws.mergeCells(1, 1, 1, headerLabels.length);
      const titleRow = ws.getRow(1);
      titleRow.font = { bold: true, size: 14 };
      titleRow.alignment = { vertical: "middle", horizontal: "center" };
      titleRow.height = 22;

      // spacer
      ws.addRow([]);

      // ---- Common function to add a full bordered table block ----
      const addTable = (subtitle: string, headers: string[], rows: any[][]) => {
        // Subtitle
        const subtitleRowNum = ws.rowCount + 1;
        ws.addRow([subtitle]);
        ws.mergeCells(subtitleRowNum, 1, subtitleRowNum, headers.length);
        const subRow = ws.getRow(subtitleRowNum);
        subRow.font = { bold: true };
        subRow.alignment = { vertical: "middle", horizontal: "left" };

        // Header
        const headerRow = ws.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
        headerRow.eachCell((cell) => {
          (cell as any).fill = headerFill;
        });

        const firstDataRow = headerRow.number + 1;

        // Normalize/pad each row to the header length
        const colCount = headers.length;
        rows.forEach((r) => {
          const row = Array.isArray(r) ? r.slice(0, colCount) : [];
          while (row.length < colCount) row.push("");
          ws.addRow(row);
        });

        const lastDataRow = ws.rowCount;

        // Full rectangle borders + number formats
        for (let r = headerRow.number; r <= lastDataRow; r++) {
          for (let c = 1; c <= colCount; c++) {
            const cell = ws.getCell(r, c);
            setThinBorder(cell);
            if (typeof cell.value === "number") {
              cell.numFmt = Number.isInteger(cell.value) ? "#,##0" : "#,##0.####";
            }
          }
        }

        // spacer under this block
        ws.addRow([]);

        return { firstDataRow, lastDataRow, colCount };
      };

      // ---- Special handling for Operation Time (split into two tables by SectionType) ----
      if (currentSection === "operationtime") {
        const opHeadersDef = getHeaders("operationtime");
        const opHeaderLabels = opHeadersDef
          .filter(h => h.label !== "Section Type") // drop this column
          .map(h => h.label);

        // Build rows -> [YearMonth, OperatorId, D1..D31]
        const buildOpRows = (sectionTypeFilter: "Sewing" | "100% Inspection") => {
          return searchResults
            .filter(row => (row.SectionType || "") === sectionTypeFilter)
            .map(row => {
              const mapped = getRowData(row, "operationtime");
              // mapped includes [YearMonth, SectionType, OperatorId, D1..D31]
              const cleaned = [mapped[0], mapped[2], ...mapped.slice(3)];
              return cleaned;
            });
        };

        const sewingRows = buildOpRows("Sewing");
        const inspRows = buildOpRows("100% Inspection");

        addTable("Sewing", opHeaderLabels, sewingRows);
        addTable("100% Inspection", opHeaderLabels, inspRows);

      } else {
        // ---- Default single-table export for all other sections ----
        const isHundred = (s: string) =>
          s === "100%" || s.toLowerCase() === "inspection" || s.toLowerCase().includes("100");

        const shouldMergeDates =
          currentSection === "cutting" ||
          currentSection === "sewing"  ||
          isHundred(currentSection);


        // Sort rows by KL date (and then by operationType, then id) so equal dates are contiguous
        const sorted = shouldMergeDates
          ? [...searchResults].sort((a, b) => {
              const da = formatDateKL(a.operationDate || a.entry_date || a.date);
              const db = formatDateKL(b.operationDate || b.entry_date || b.date);
              if (da < db) return -1;
              if (da > db) return 1;

              const ota = String(a.operationType || "");
              const otb = String(b.operationType || "");
              if (ota < otb) return -1;
              if (ota > otb) return 1;

              const ia = String(a.id || "");
              const ib = String(b.id || "");
              if (ia < ib) return -1;
              if (ia > ib) return 1;
              return 0;
            })
          : searchResults;

        const dataRows = sorted.map(row => {
          const arr = getRowData(row, currentSection);
          const fixed = arr.slice(0, headerLabels.length);
          while (fixed.length < headerLabels.length) fixed.push("");
          return fixed;
        });

        // Build the table
        const { firstDataRow, lastDataRow } = addTable(sheetName, headerLabels, dataRows);

        // Merge equal dates in the first column for these sections
        if (shouldMergeDates && lastDataRow >= firstDataRow) {
          mergeEqualCellsInColumn(1, firstDataRow, lastDataRow);
        }
      }

      // Auto-fit
      autoFitColumns(ws, headerLabels);

      // Download
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fname = `${currentSection}_${startDate}_to_${endDate}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("Error during export:", err);
      setErrorMessage(`Export failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
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
            {/* --- START DATE --- */}
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label htmlFor="start-date-picker" className="text-sm font-semibold text-gray-700">
                Start Date
              </label>
              <div className="relative">
                {/* Hidden real date input */}
                <input
                  id="start-date-picker"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                {/* Fake visible display */}
                <div
                  className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                             focus-within:ring-2 focus-within:ring-indigo-500 w-full md:w-44 text-gray-800
                             text-center font-medium select-none"
                  onClick={() => {
                    // Open the hidden date picker
                    const realInput = document.getElementById("start-date-picker") as HTMLInputElement | null;
                    if (realInput) realInput.showPicker?.();
                  }}
                >
                  {formatDisplayDate(startDate)}
                </div>
              </div>
            </div>

            {/* --- END DATE --- */}
            <div className="flex flex-col space-y-1 w-full md:w-auto">
              <label htmlFor="end-date-picker" className="text-sm font-semibold text-gray-700">
                End Date
              </label>
              <div className="relative">
                {/* Hidden real date input */}
                <input
                  id="end-date-picker"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                {/* Fake visible display */}
                <div
                  className="p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                             focus-within:ring-2 focus-within:ring-indigo-500 w-full md:w-44 text-gray-800
                             text-center font-medium select-none"
                  onClick={() => {
                    // Open the hidden date picker
                    const realInput = document.getElementById("end-date-picker") as HTMLInputElement | null;
                    if (realInput) realInput.showPicker?.();
                  }}
                >
                  {formatDisplayDate(endDate)}
                </div>
              </div>
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

        {/* Search and Export buttons */}
        <div className="flex justify-end pt-4 border-t border-gray-200 space-x-3">
          <button
            onClick={handleApplyFilters}
            disabled={isSearching || isExporting}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
          <button
            onClick={handleExport}
            disabled={isSearching || isExporting || searchResults.length === 0}
            className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 transition duration-150 disabled:opacity-green-400"
          >
            {isExporting ? "Exporting..." : "Export"}
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

                        {/* Actions */}
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

            {/* Cutting: panelId select + panelType FREE-TEXT */}
            {editSection === "cutting" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fabric</label>
                  <select
                    value={editData?.panelId ?? ""}
                    onChange={(e) => setEditData((d: any) => ({ ...d, panelId: e.target.value }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="" disabled>Select Fabric</option>
                    {PANEL_ID_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Panel</label>
                  <input
                    type="text"
                    placeholder="e.g., Top Panel, Body"
                    value={editData?.panelType ?? ""}
                    onChange={(e) => setEditData((d: any) => ({ ...d, panelType: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
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

                  // Skip Cutting dropdown/text fields here (rendered above)
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
