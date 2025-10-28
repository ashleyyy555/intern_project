// app/actions/records.ts
'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Import your field maps so we know which columns are numeric Int?
import {
  PACKING_FIELD_MAP,
  INSPECTION_FIELD_MAP,
  SEWING_FIELD_MAP,
  OPERATION_FIELD_MAP,
} from '@/lib/inspectionFields';

type ModelKey = keyof typeof prisma;

const SECTION: Record<string, { model: ModelKey; idKey: string; dateKey?: 'operationDate' | 'yearMonth' }> = {
  packing:       { model: 'packing',       idKey: 'id', dateKey: 'operationDate' },
  '100%':        { model: 'inspection',    idKey: 'id', dateKey: 'operationDate' },
  sewing:        { model: 'sewing',        idKey: 'id', dateKey: 'operationDate' },
  operationtime: { model: 'operationTime', idKey: 'id', dateKey: 'yearMonth' },
};

const FetchSchema  = z.object({ section: z.enum(['packing','100%','sewing','operationtime']), id: z.string().min(1) });

const EditableValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.date()]);

const UpdateSchema = z.object({
  section: z.enum(['packing','100%','sewing','operationtime']),
  id: z.string().min(1),
  data: z.object({}).catchall(EditableValue),  
});

const DeleteSchema = FetchSchema;

// Build a per-section Set of numeric column names (all Int? in your schema)
const NUMERIC_COLS: Record<string, Set<string>> = {
  packing:       new Set(Object.values(PACKING_FIELD_MAP)),      // all Int?
  '100%':        new Set(Object.values(INSPECTION_FIELD_MAP)),   // all Int?
  sewing:        new Set([
                    ...Object.values(SEWING_FIELD_MAP),          // all C1..C12, S1..S24, ST1, ST2 are Int?
                  ]),
  operationtime: new Set(Object.values(OPERATION_FIELD_MAP)),    // D1..D31 are Int?
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

  // Start with a shallow clone and strip non-editable keys
  const cleaned: Record<string, any> = { ...data };
  delete cleaned.id;         // never attempt to change PK
  delete cleaned.updatedAt;  // Prisma will set it if you add @updatedAt later
  delete cleaned.createdAt;  // in case you add it in future

  // Normalize empty string -> null
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
      // yearMonth stays as "YYYY-MM" string
      cleaned.yearMonth = String(cleaned.yearMonth);
    }
  }

  // Coerce numeric columns (Int?) from strings to numbers
  const numericCols = NUMERIC_COLS[section] ?? new Set<string>();
  for (const col of numericCols) {
    if (col in cleaned) {
      const v = cleaned[col];
      if (v === null || v === undefined || v === '') {
        cleaned[col] = null;
      } else if (typeof v === 'number') {
        // already numeric
      } else {
        const n = Number(v);
        cleaned[col] = Number.isFinite(n) ? n : null; // fallback to null if not a valid number
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
    return { error: 'Update failed. Check that numeric fields contain valid numbers.' };
  }
}

export async function deleteRecord(input: unknown) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid delete payload.' };
  const { section, id } = parsed.data;
  const meta = SECTION[section];

  try {
    // @ts-ignore
    await prisma[meta.model].delete({ where: { [meta.idKey]: id } });
    return { ok: true };
  } catch (e) {
    console.error('Delete failed', e);
    return { error: 'Delete failed. It may not exist or be referenced elsewhere.' };
  }
}