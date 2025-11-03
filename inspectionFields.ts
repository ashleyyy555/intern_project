// lib/inspectionFields.ts

// ---- CUTTING SECTION ----

// Keys (used for display order)
export const CUTTING_KEYS = [
  "C1", // Panel
  "C2", // Type
  "C3", // Construction A
  "C4", // Construction B
  "C5", // Meterage
  "C6", // Weight
  "C7", // Width Size
  "C8", // Length Size
  "C9", // Actual Output
] as const;

// Human-readable labels
export const CUTTING_HEADERS: Record<(typeof CUTTING_KEYS)[number], string> = {
  C1: "Panel",
  C2: "Type",
  C3: "Construction (Tape/Inch) A",
  C4: "Construction (Tape/Inch) B",
  C5: "Meterage (m)",
  C6: "Weight (g/m²)",
  C7: "Width Size (inch)",
  C8: "Length Size (inch)",
  C9: "Actual Output (pcs)",
};

// Mapping to your DB column names
export const CUTTING_FIELD_MAP: Record<(typeof CUTTING_KEYS)[number], string> = {
  C1: "panelId",
  C2: "panelType",
  C3: "constructionA",
  C4: "constructionB",
  C5: "meterage",
  C6: "weight",
  C7: "widthSize",
  C8: "lengthSize",
  C9: "actualOutput",
};


// --- Packing Data ---
export const PACKING_KEYS = [
    "P1", "P2", "P3", "P4", 
    "P5", "P6", "P7", "P8"
] as const;
export type PackingKey = (typeof PACKING_KEYS)[number];

export const PACKING_FIELD_MAP: Record<PackingKey, string> = {
    P1: "M1ForInHouse", // Prisma Column Name
    P2: "M1ForSemi",
    P3: "M1ForCompleteWt100",
    P4: "M1ForCompleteWO100",
    P5: "M2ForInHouse", 
    P6: "M2ForSemi", 
    P7: "M2ForCompleteWt100", 
    P8: "M2ForCompleteWO100",
};

export const PACKING_HEADERS: Record<PackingKey, string> = {
    P1: "M1 In-House", 
    P2: "M1 Semi",
    P3: "M1 CompleteWt100",
    P4: "M1 CompleteWO100",
    P5: "M2 InHouse", 
    P6: "M2 Semi", 
    P7: "M2 CompleteWt100", 
    P8: "M2 CompleteWO100",
};


// --- Sewing Data (sewing) ---
export const SEWING_KEYS = [
    "C1","C2","C3","C4", "C5","C6","C7","C8", "C9","C10","C11","C12",
    "S1","S2","S3","S4", "S5","S6","S7","S8",
    "S9","S10","S11","S12", "S13","S14","S15","S16",
    "S17","S18","S19","S20", "S21","S22","S23","S24",
    "ST1","ST2",
] as const;
export type SewingKey = (typeof SEWING_KEYS)[number];

export const SEWING_FIELD_MAP: Record<SewingKey, string> = {
  C1: "C1", 
  C2: "C2", 
  C3: "C3", 
  C4: "C4", 
  C5: "C5", 
  C6: "C6", 
  C7: "C7",     
  C8: "C8", 
  C9: "C9", 
  C10: "C10", 
  C11: "C11", 
  C12: "C12", 
  S1: "S1", 
  S2: "S2", 
  S3: "S3", 
  S4: "S4", 
  S5: "S5", 
  S6: "S6", 
  S7: "S7", 
  S8: "S8", 
  S9: "S9", 
  S10: "S10", 
  S11: "S11", 
  S12: "S12", 
  S13: "S13", 
  S14: "S14", 
  S15: "S15", 
  S16: "S16", 
  S17: "S17", 
  S18: "S18", 
  S19: "S19", 
  S20: "S20", 
  S21: "S21", 
  S22: "S22", 
  S23: "S23", 
  S24: "S24", 
  ST1: "ST1", 
  ST2: "ST2", 
};

export const SEWING_HEADERS: Record<SewingKey, string> = {
  C1: "C1", 
  C2: "C2", 
  C3: "C3", 
  C4: "C4", 
  C5: "C5", 
  C6: "C6", 
  C7: "C7",     
  C8: "C8", 
  C9: "C9", 
  C10: "C10", 
  C11: "C11", 
  C12: "C12", 
  S1: "S1", 
  S2: "S2", 
  S3: "S3", 
  S4: "S4", 
  S5: "S5", 
  S6: "S6", 
  S7: "S7", 
  S8: "S8", 
  S9: "S9", 
  S10: "10", 
  S11: "S11", 
  S12: "S12", 
  S13: "S13", 
  S14: "S14", 
  S15: "S15", 
  S16: "S16", 
  S17: "S17", 
  S18: "S18", 
  S19: "S19", 
  S20: "S20", 
  S21: "S21", 
  S22: "S22", 
  S23: "S23", 
  S24: "S24", 
  ST1: "ST1", 
  ST2: "ST2", 
};
// --- Inspection Data (100%) ---
export const INSPECTION_KEYS = [
    "I1", "I2", "I3", "I4", 
    "I5","I6","I7","I8",
    "I9","I10","I11","I12",
    "I13","I14",
] as const;
export type InspectionKey = (typeof INSPECTION_KEYS)[number];

export const INSPECTION_FIELD_MAP: Record<InspectionKey, string> = {
    I1: "I1", // Prisma Column Name
    I2: "I2", 
    I3: "I3",
    I4: "I4",
    I5: "I5",
    I6: "I6",
    I7: "I7",
    I8: "I8",
    I9: "I9",
    I10: "I10",
    I11: "I11",
    I12: "I12",
    I13: "I13",
    I14: "I14",
};

export const INSPECTION_HEADERS: Record<InspectionKey, string> = {
    I1: "I1", // Prisma Column Name
    I2: "I2", 
    I3: "I3",
    I4: "I4",
    I5: "I5",
    I6: "I6",
    I7: "I7",
    I8: "I8",
    I9: "I9",
    I10: "I10",
    I11: "I11",
    I12: "I12",
    I13: "I13",
    I14: "I14",
};

// --- Operating time Data (operating) ---
export const OPERATION_KEYS = [
  "D1","D2","D3","D4","D5","D6","D7","D8",
  "D9","D10","D11","D12","D13","D14","D15","D16",
  "D17","D18","D19","D20","D21","D22","D23","D24",
  "D25","D26","D27","D28","D29","D30","D31",
] as const;
export type OperationKey = (typeof OPERATION_KEYS)[number];

export const OPERATION_FIELD_MAP: Record<OperationKey, string> = {
    D1: "D1", 
    D2: "D2", 
    D3: "D3",
    D4: "D4",
    D5: "D5",
    D6: "D6",
    D7: "D7",
    D8: "D8",
    D9: "D9",
    D10: "D10",
    D11: "D11",
    D12: "D12",
    D13: "D13",
    D14: "D14",
    D15: "D15", 
    D16: "D16", 
    D17: "D17",
    D18: "D18",
    D19: "D19",
    D20: "D20",
    D21: "D21",
    D22: "D22",
    D23: "D23",
    D24: "D24",
    D25: "D25",
    D26: "D26",
    D27: "D27",
    D28: "D28",
    D29: "D29",
    D30: "D30",
    D31: "D31",
};

export const OPERATION_HEADERS: Record<OperationKey, string> = {
    D1: "D1", 
    D2: "D2", 
    D3: "D3",
    D4: "D4",
    D5: "D5",
    D6: "D6",
    D7: "D7",
    D8: "D8",
    D9: "D9",
    D10: "D10",
    D11: "D11",
    D12: "D12",
    D13: "D13",
    D14: "D14",
    D15: "D15", 
    D16: "D16", 
    D17: "D17",
    D18: "D18",
    D19: "D19",
    D20: "D20",
    D21: "D21",
    D22: "D22",
    D23: "D23",
    D24: "D24",
    D25: "D25",
    D26: "D26",
    D27: "D27",
    D28: "D28",
    D29: "D29",
    D30: "D30",
    D31: "D31",
};


// --- Efficiency: Sewing ---
export const EFFICIENCY_SEWING_KEYS = [
  "M1","M2","M3","M4","M5"
] as const;
export type EfficiencySewingKey = (typeof EFFICIENCY_SEWING_KEYS)[number];

export const EFFICIENCY_SEWING_FIELD_MAP: Record<EfficiencySewingKey, string> = {
  M1: "m1_target_panel",
  M2: "m2_workers_normal",
  M3: "m3_operating_mins_normal",
  M4: "m4_workers_ot",
  M5: "m5_operating_mins_ot",
};

export const EFFICIENCY_SEWING_HEADERS: Record<EfficiencySewingKey, string> = {
  M1: "Target: Sewing One Panel",
  M2: "No. of Workers (Normal)",
  M3: "Operating Time (mins)",
  M4: "No. of Workers (OT)",
  M5: "Operating Time (mins) (OT)",
};


// --- Efficiency: 100% Inspection ---
export const EFFICIENCY_INSPECTION100_KEYS = [
  "M1","M6","M7","M2","M3","M4","M5"
] as const;
export type EfficiencyInspection100Key = (typeof EFFICIENCY_INSPECTION100_KEYS)[number];

export const EFFICIENCY_INSPECTION100_FIELD_MAP: Record<EfficiencyInspection100Key, string> = {
  M1: "m1_target_panel",
  M6: "m6_target_duffel",
  M7: "m7_target_blower",
  M2: "m2_workers_normal",
  M3: "m3_operating_mins_normal",
  M4: "m4_workers_ot",
  M5: "m5_operating_mins_ot",
};

export const EFFICIENCY_INSPECTION100_HEADERS: Record<EfficiencyInspection100Key, string> = {
  M1: "Top/Bottom Panel",
  M6: "Duffel",
  M7: "Blower",
  M2: "No. of Workers (Normal)",
  M3: "Operating Time (mins)",
  M4: "No. of Workers (OT)",
  M5: "Operating Time (mins) (OT)",
};

