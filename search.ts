// /app/actions/search.ts
'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { 
  PACKING_FIELD_MAP, 
  INSPECTION_FIELD_MAP,
  SEWING_FIELD_MAP,
  OPERATION_FIELD_MAP,
  PACKING_KEYS,
  INSPECTION_KEYS,
  SEWING_KEYS,
  OPERATION_KEYS,
  CUTTING_FIELD_MAP
} from '@/lib/inspectionFields';

// ----------------------------------------
// 1. Update SECTION_IDENTIFIER to include Cutting
// ----------------------------------------
const SECTION_IDENTIFIER: { [key: string]: string } = {
  cutting: 'Cutting', // <--- ADDED
  sewing: 'Sewing',
  '100%': 'Inspection',
  packing: 'Packing',
  operationtime: 'OperationTime',
  'efficiency-sewing': 'EfficiencySewing',
  'efficiency-100': 'EfficiencyInspection100',
};

const SearchParamsSchema = z.object({
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  section: z.string().optional(),
});

export async function searchData(formData: {
  startDate: string | null;
  endDate: string | null;
  section: string;
}) {
  const validatedFormData = {
    ...formData,
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
  };

  const result = SearchParamsSchema.safeParse(validatedFormData);
  if (!result.success) {
    return { error: 'Invalid search parameters provided.' };
  }

  const { startDate, endDate, section } = result.data;
  const targetModel = SECTION_IDENTIFIER[section || ''];

  if (section === 'all') {
    return { error: 'Please select a specific section for the search.' };
  }

  // Common date filter logic
  const dateWhereClause: any = {};
  if (startDate && endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
  }

  // ----------------------------------------
  // NEW: 0. Cutting
  // ----------------------------------------
  if (targetModel === 'Cutting') {
    try {
      const results = await prisma.cutting.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'desc' }, 
      });
      // The section string must match the client-side value
      return { data: results, section: 'cutting', fieldMap: CUTTING_FIELD_MAP }; 
    } catch (error) {
      console.error('Prisma Cutting query failed:', error);
      return { error: 'Failed to retrieve Cutting data.' };
    }
  }


  // ----------------------------------------
  // 1. Inspection (100%)
  // ----------------------------------------
  if (targetModel === 'Inspection') {
    try {
      const results = await prisma.inspection.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'desc' },
      });
      return { data: results, section: '100%', fieldMap: INSPECTION_FIELD_MAP };
    } catch (error) {
      console.error('Prisma Inspection query failed:', error);
      return { error: 'Failed to retrieve Inspection data.' };
    }

  // ----------------------------------------
  // 2. Packing
  // ----------------------------------------
  } else if (targetModel === 'Packing') {
    try {
      const results = await prisma.packing.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'desc' },
      });
      return { data: results, section: 'packing', fieldMap: PACKING_FIELD_MAP };
    } catch (error) {
      console.error('Prisma Packing query failed:', error);
      return { error: 'Failed to retrieve Packing data.' };
    }

  // ----------------------------------------
  // 3. Sewing
  // ----------------------------------------
  } else if (targetModel === 'Sewing') {
    try {
      const results = await prisma.sewing.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'desc' },
      });
      return { data: results, section: 'sewing', fieldMap: SEWING_FIELD_MAP };
    } catch (error) {
      console.error('Prisma Sewing query failed:', error);
      return { error: 'Failed to retrieve Sewing data.' };
    }

  // ----------------------------------------
  // 4. Operation Time
  // ----------------------------------------
  } else if (targetModel === 'OperationTime') {
    // Operation Time uses yearMonth, so dateWhereClause is ignored, and a new clause is built
    const operationTimeWhereClause: any = {};
    if (startDate) {
      operationTimeWhereClause.yearMonth = startDate.substring(0, 7);
    }
    try {
      const results = await prisma.operationTime.findMany({
        where: operationTimeWhereClause,
        orderBy: { OperatorId: 'desc' },
      });
      return { data: results, section: 'operationtime', fieldMap: OPERATION_FIELD_MAP };
    } catch (error) {
      console.error('Prisma OperationTime query failed:', error);
      return { error: 'Failed to retrieve Operation Time data.' };
    }

  // ----------------------------------------
  // 5. Efficiency - Sewing
  // ----------------------------------------
  } else if (targetModel === 'EfficiencySewing') {
    try {
      const results = await prisma.efficiencySewing.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'desc' },
      });
      return { data: results, section: 'efficiency-sewing' };
    } catch (error) {
      console.error('Prisma EfficiencySewing query failed:', error);
      return { error: 'Failed to retrieve Efficiency Sewing data.' };
    }

  // ----------------------------------------
  // 6. Efficiency - 100% Inspection
  // ----------------------------------------
  } else if (targetModel === 'EfficiencyInspection100') {
    try {
      const results = await prisma.efficiencyInspection100.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'desc' },
      });
      return { data: results, section: 'efficiency-100' };
    } catch (error) {
      console.error('Prisma EfficiencyInspection100 query failed:', error);
      return { error: 'Failed to retrieve Efficiency 100% Inspection data.' };
    }

  // ----------------------------------------
  // 7. Fallback
  // ----------------------------------------
  } else {
    return { error: `Search for section "${section}" is not yet implemented.` };
  }
}