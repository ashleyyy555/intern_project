// /app/actions/search.ts
'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { 
  PACKING_FIELD_MAP, 
  INSPECTION_FIELD_MAP,
  SEWING_FIELD_MAP,
  OPERATION_FIELD_MAP,
  CUTTING_FIELD_MAP
} from '@/lib/inspectionFields'; // Assuming these mappings are defined here

// ----------------------------------------
// 1. Update SECTION_IDENTIFIER to include Cutting
// ----------------------------------------
const SECTION_IDENTIFIER: { [key: string]: string } = {
  cutting: 'Cutting',
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

  // --- Date Validation & Filtering ---
  
  if (startDate && isNaN(new Date(startDate).getTime())) {
      return { error: 'Invalid Start Date format. Must be YYYY-MM-DD.' };
  }
  if (endDate && isNaN(new Date(endDate).getTime())) {
      return { error: 'Invalid End Date format. Must be YYYY-MM-DD.' };
  }
  
  const dateWhereClause: any = {};
  if (startDate && endDate) {
    // 1. Start Date (inclusive)
    // Create Date object from the YYYY-MM-DD string and set to midnight UTC
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0); 

    // 2. End Date (inclusive, but using LT operator)
    // Create Date object from the YYYY-MM-DD string
    const end = new Date(endDate);
    // Set to midnight of the NEXT day for an exclusive 'lt' (less than) filter
    end.setUTCDate(end.getUTCDate() + 1); 
    end.setUTCHours(0, 0, 0, 0); 
    
    dateWhereClause.operationDate = {
      gte: start, // >= start date
      lt: end,    // < day after end date
    };
  }

  // --- Section Logic ---

  if (section === 'all') {
    return { error: 'Please select a specific section for the search.' };
  }

  // ----------------------------------------
  // NEW: 0. Cutting
  // ----------------------------------------
  if (targetModel === 'Cutting') {
    try {
      const results = await prisma.cutting.findMany({
        where: dateWhereClause,
        orderBy: { operationDate: 'asc' }, 
      });
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
        orderBy: { operationDate: 'asc' },
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
        orderBy: { operationDate: 'asc' },
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
        orderBy: { operationDate: 'asc' },
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
      // Operation Time only uses YYYY-MM
      operationTimeWhereClause.yearMonth = startDate.substring(0, 7); 
    }
    try {
      const results = await prisma.operationTime.findMany({
        where: operationTimeWhereClause,
        orderBy: { OperatorId: 'asc' },
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
        orderBy: { operationDate: 'asc' },
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
        orderBy: { operationDate: 'asc' },
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