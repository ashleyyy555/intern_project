'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Import your field maps so we know which columns are numeric
import {
  PACKING_FIELD_MAP,
  INSPECTION_FIELD_MAP,
  SEWING_FIELD_MAP,
  OPERATION_FIELD_MAP,

  // Efficiency field maps (from your lib)
  EFFICIENCY_SEWING_FIELD_MAP,
  EFFICIENCY_INSPECTION100_FIELD_MAP,

  // Cutting field map
  CUTTING_FIELD_MAP,
} from '@/lib/inspectionFields';

type ModelKey = keyof typeof prisma;

/** Canonical options used in create UI — enforce on update too (KEEP IN SYNC WITH UI) */
const PANEL_ID_OPTIONS = [
  'Heavy Duty Fabric',
  'Light Duty Fabric',
  'Circular Fabric',
  'Type 110',
  'Type 148',
] as const;

const PANEL_TYPE_OPTIONS = ['Laminated', 'Unlaminated'] as const;

/** NEW: dropdowns for sewing / 100% inspection operationType, and operationtime SectionType */
const SEWING_OPERATION_TYPES = [
  'SP1','SP2','PC','SB','SPP','SS','SSP','SD','ST',
] as const;

const INSPECTION_OPERATION_TYPES = [
  'IH',            // adjust to your canonical spelling if needed (e.g., 'in-house')
  'S',
  'OS',
  'B',
] as const;

const SECTION_TYPE_OPTIONS = [
  'Sewing',
  '100% Inspection',
] as const;

/**
 * Section keys aligned with app/actions/search.ts
 */
const SECTION: Record<string, { model: ModelKey; idKey: string; dateKey?: 'operationDate' | 'yearMonth' }> = {
  packing:             { model: 'packing',                  idKey: 'id', dateKey: 'operationDate' },
  '100%':              { model: 'inspection',               idKey: 'id', dateKey: 'operationDate' },
  sewing:              { model: 'sewing',                   idKey: 'id', dateKey: 'operationDate' },
  operationtime:       { model: 'operationTime',            idKey: 'id', dateKey: 'yearMonth' },

  // Cutting table
  cutting:             { model: 'cutting',                  idKey: 'id', dateKey: 'operationDate' },

  // Efficiency tables
  'efficiency-sewing': { model: 'efficiencySewing',         idKey: 'id', dateKey: 'operationDate' },
  'efficiency-100':    { model: 'efficiencyInspection100',  idKey: 'id', dateKey: 'operationDate' },
};

const SECTION_ENUM = z.enum([
  'packing',
  '100%',
  'sewing',
  'operationtime',
  'cutting',
  'efficiency-sewing',
  'efficiency-100',
]);

const FetchSchema  = z.object({ section: SECTION_ENUM, id: z.string().min(1) });

const EditableValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.date()]);

const UpdateSchema = z.object({
  section: SECTION_ENUM,
  id: z.string().min(1),
  data: z.object({}).catchall(EditableValue),
});

const DeleteSchema = FetchSchema;

/**
 * Build per-section sets of Int?/Float?/Decimal? columns.
 * - Cutting:
 * • Int?    : actualOutput
 * • Float?  : construction, denier, weight, widthSize, lengthSize
 * - Existing efficiency tables use Decimal? for "operating minutes" to preserve precision.
 */

// ---- Cutting: column sets ----
const CUTTING_INT_COLS = new Set<string>([
  CUTTING_FIELD_MAP.C8, // actualOutput (Int)
]);

const CUTTING_FLOAT_COLS = new Set<string>([
  CUTTING_FIELD_MAP.C3, // construction (Float)
  CUTTING_FIELD_MAP.C4, // denier (Float)
  CUTTING_FIELD_MAP.C5, // weight (Float)
  CUTTING_FIELD_MAP.C6, // widthSize (Float)
  CUTTING_FIELD_MAP.C7, // lengthSize (Float)
]);

/**
 * Efficiency(Sewing): m1,m2,m4 are Int? ; m3,m5 are Decimal?
 * Efficiency(100%):   m1,m6,m7,m2,m4 are Int? ; m3,m5 are Decimal?
 */
const EFF_SEWING_INT_COLS = new Set<string>([
  EFFICIENCY_SEWING_FIELD_MAP.M1, // m1_target_panel
  EFFICIENCY_SEWING_FIELD_MAP.M2, // m2_workers_normal
  EFFICIENCY_SEWING_FIELD_MAP.M4, // m4_workers_ot
]);
const EFF_SEWING_DEC_COLS = new Set<string>([
  EFFICIENCY_SEWING_FIELD_MAP.M3, // m3_operating_mins_normal
  EFFICIENCY_SEWING_FIELD_MAP.M5, // m5_operating_mins_ot
]);

const EFF_100_INT_COLS = new Set<string>([
  EFFICIENCY_INSPECTION100_FIELD_MAP.M1, // m1_target_panel
  EFFICIENCY_INSPECTION100_FIELD_MAP.M6, // m6_target_duffel
  EFFICIENCY_INSPECTION100_FIELD_MAP.M7, // m7_target_blower
  EFFICIENCY_INSPECTION100_FIELD_MAP.M2, // m2_workers_normal
  EFFICIENCY_INSPECTION100_FIELD_MAP.M4, // m4_workers_ot
]);
const EFF_100_DEC_COLS = new Set<string>([
  EFFICIENCY_INSPECTION100_FIELD_MAP.M3, // m3_operating_mins_normal
  EFFICIENCY_INSPECTION100_FIELD_MAP.M5, // m5_operating_mins_ot
]);

// ---- Int? columns per section ----
const INT_COLS: Record<string, Set<string>> = {
  packing:             new Set(Object.values(PACKING_FIELD_MAP)),
  '100%':              new Set(Object.values(INSPECTION_FIELD_MAP)),
  sewing:              new Set(Object.values(SEWING_FIELD_MAP)),
  operationtime:       new Set(Object.values(OPERATION_FIELD_MAP)),

  // Cutting: only actualOutput is Int
  cutting:             CUTTING_INT_COLS,

  // Efficiency Int? fields
  'efficiency-sewing': EFF_SEWING_INT_COLS,
  'efficiency-100':    EFF_100_INT_COLS,
};

// ---- Float? columns per section ----
const FLOAT_COLS: Record<string, Set<string>> = {
  cutting: CUTTING_FLOAT_COLS,
};

// ---- Decimal? columns per section (efficiency only) ----
const DECIMAL_COLS: Record<string, Set<string>> = {
  'efficiency-sewing': EFF_SEWING_DEC_COLS,
  'efficiency-100':    EFF_100_DEC_COLS,
};

export async function fetchRecordById(input: unknown) {
  const parsed = FetchSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid parameters.' };
  const { section, id } = parsed.data;
  const meta = SECTION[section];
  // @ts-ignore dynamic
  const row = await prisma[meta.model].findUnique({ where: { [meta.idKey]: id } });
  if (!row) return { error: 'Record not found.' };
  return { data: row };
}

export async function updateRecord(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid update payload.' };

  const { section, id, data } = parsed.data;
  const meta = SECTION[section];

  const cleaned: Record<string, any> = { ...data };

  // Strip non-editable / server-managed
  delete cleaned.id;
  delete cleaned.updatedAt;
  delete cleaned.createdAt;

  // Efficiency tables: avoid changing enum default
  if (section === 'efficiency-sewing' || section === 'efficiency-100') {
    delete cleaned.processType; // keep model default / existing value
  }

  // Normalize "" → null
  for (const [k, v] of Object.entries(cleaned)) {
    if (v === '') cleaned[k] = null;
  }

  // Coerce date fields
  if (meta.dateKey && cleaned[meta.dateKey]) {
    if (meta.dateKey === 'operationDate') {
      const d = new Date(cleaned.operationDate as any);
      if (isNaN(d.getTime())) return { error: 'Invalid operationDate.' };
      cleaned.operationDate = d;
    } else {
      cleaned.yearMonth = String(cleaned.yearMonth);
    }
  }

  // --------------------------------------------------------------------------
  // Cutting-only validations for dropdown fields (Server-side safety net)
  // Ensure PanelType and PanelId match canonical allowed values.
  // --------------------------------------------------------------------------
  if (section === 'cutting') {
    if (cleaned.panelType != null) {
      const ok = PANEL_TYPE_OPTIONS.includes(String(cleaned.panelType) as any);
      if (!ok) {
        return {
          error: `Invalid panelType: "${cleaned.panelType}". Must be one of: ${PANEL_TYPE_OPTIONS.join(' or ')}.`
        };
      }
    }
    if (cleaned.panelId != null) {
      const ok = PANEL_ID_OPTIONS.includes(String(cleaned.panelId) as any);
      if (!ok) {
        // Enhanced error message to explicitly list options
        return {
          error: `Invalid panelId: "${cleaned.panelId}". Must be one of: ${PANEL_ID_OPTIONS.join(', ')}.`
        };
      }
    }
  }

  // --- Sewing / 100% Inspection: restrict operationType to dropdown choices ---
  if (section === 'sewing' && cleaned.operationType != null) {
    const ok = (SEWING_OPERATION_TYPES as readonly string[]).includes(String(cleaned.operationType));
    if (!ok) {
      return { error: `Invalid operationType: "${cleaned.operationType}". Allowed: ${[...SEWING_OPERATION_TYPES].join(', ')}.` };
    }
  }
  if (section === '100%' && cleaned.operationType != null) {
    const ok = (INSPECTION_OPERATION_TYPES as readonly string[]).includes(String(cleaned.operationType));
    if (!ok) {
      return { error: `Invalid operationType: "${cleaned.operationType}". Allowed: ${[...INSPECTION_OPERATION_TYPES].join(', ')}.` };
    }
  }

  // --- Operating Time: restrict SectionType to dropdown choices ---
  if (section === 'operationtime' && cleaned.SectionType != null) {
    const ok = (SECTION_TYPE_OPTIONS as readonly string[]).includes(String(cleaned.SectionType));
    if (!ok) {
      return { error: `Invalid SectionType: "${cleaned.SectionType}". Allowed: ${[...SECTION_TYPE_OPTIONS].join(', ')}.` };
    }
  }

  // ---- Coerce Int? columns
  const intCols = INT_COLS[section] ?? new Set<string>();
  for (const col of intCols) {
    if (col in cleaned) {
      const v = cleaned[col];
      if (v == null || v === '') {
        cleaned[col] = null;
      } else if (typeof v === 'number') {
        cleaned[col] = Number.isFinite(v) ? Math.trunc(v) : null;
      } else {
        const n = Number(v);
        cleaned[col] = Number.isFinite(n) ? Math.trunc(n) : null;
      }
    }
  }

  // ---- Coerce Float? columns (Prisma Float is JS number)
  const floatCols = FLOAT_COLS[section] ?? new Set<string>();
  for (const col of floatCols) {
    if (col in cleaned) {
      const v = cleaned[col];
      if (v == null || v === '') {
        cleaned[col] = null;
      } else if (typeof v === 'number') {
        cleaned[col] = Number.isFinite(v) ? v : null;
      } else {
        const n = Number(String(v).trim());
        cleaned[col] = Number.isFinite(n) ? n : null;
      }
    }
  }

  // ---- Coerce Decimal? columns (store as string for Prisma.Decimal)
  const decCols = DECIMAL_COLS[section] ?? new Set<string>();
  for (const col of decCols) {
    if (col in cleaned) {
      const v = cleaned[col];
      if (v == null || v === '') {
        cleaned[col] = null;
      } else if (typeof v === 'number') {
        cleaned[col] = String(v);
      } else {
        const s = String(v).trim();
        cleaned[col] = s === '' ? null : s;
      }
    }
  }

  try {
    // @ts-ignore dynamic
    const updated = await prisma[meta.model].update({
      where: { [meta.idKey]: id },
      data: cleaned,
    });
    return { data: updated };
  } catch (e) {
    console.error('Update failed', e);
    // You might also want to check for Prisma P2002 Unique constraint violations here.
    return { error: 'Update failed. Check that numeric/decimal fields contain valid values, and that dropdown fields use approved choices.' };
  }
}

export async function deleteRecord(input: unknown) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid delete payload.' };
  const { section, id } = parsed.data;
  const meta = SECTION[section];

  try {
    // @ts-ignore dynamic
    await prisma[meta.model].delete({ where: { [meta.idKey]: id } });
    return { ok: true };
  } catch (e) {
    console.error('Delete failed', e);
    return { error: 'Delete failed. It may not exist or be referenced elsewhere.' };
  }
}
