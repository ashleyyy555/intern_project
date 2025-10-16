'use server';

import { prisma } from '@/lib/prisma'; // Assuming your prisma client is exported from '@/lib/prisma'
import { z } from 'zod';
import { 
    PACKING_FIELD_MAP, 
    INSPECTION_FIELD_MAP,
    SEWING_FIELD_MAP,
    OPERATION_FIELD_MAP,
    PACKING_KEYS,
    INSPECTION_KEYS,
    SEWING_KEYS,
    OPERATION_KEYS
} from '@/lib/inspectionFields'; // Import field metadata

// Define model names corresponding to the section options
const SECTION_IDENTIFIER: { [key: string]: string } = {
    'cutting': 'Cutting',        
    'sewing': 'Sewing',
    '100%': 'Inspection', // Prisma Model Name: Inspection
    'packing': 'Packing',  // Prisma Model Name: Packing
    'operationtime': 'OperationTime',
};

// Zod validation for search inputs
const SearchParamsSchema = z.object({
  // The client will send YYYY-MM-DD strings or null/undefined
  startDate: z.string().nullable().optional(), 
  endDate: z.string().nullable().optional(),
  section: z.string().optional(),
});

/**
 * Searches the relevant table based on the 'section' filter using Prisma.
 */
export async function searchData(formData: { startDate: string | null, endDate: string | null, section: string }) {
  
  // Cast nullable strings to undefined for Zod validation simplicity
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

  // Common Where Clause for date filtering (for models with operationDate: DateTime)
  const dateWhereClause: any = {};
  if (startDate && endDate) {
      // Set the end of the day to include data from the endDate
      const endOfDay = new Date(endDate);
      endOfDay.setDate(endOfDay.getDate() + 1); // Go to the start of the *next* day
      
      dateWhereClause.operationDate = {
          gte: new Date(startDate),
          lt: endOfDay, // Use 'less than' the start of the next day
      };
  }

  // --- 1. INSPECTION SEARCH LOGIC (100%) ---
  if (targetModel === 'Inspection') {
      try {
          const results = await prisma.inspection.findMany({
              where: dateWhereClause,
              orderBy: {
                  operationDate: 'desc',
              },
          });
          
          return { data: results, section: '100%', fieldMap: INSPECTION_FIELD_MAP };
          
      } catch (error) {
          console.error('Prisma Inspection query failed:', error);
          return { error: 'Failed to retrieve Inspection data from the database. Check model name or schema.' };
      }
      
  // --- 2. PACKING SEARCH LOGIC ---
  } else if (targetModel === 'Packing') {
      try {
          const results = await prisma.packing.findMany({
              where: dateWhereClause,
              orderBy: {
                  operationDate: 'desc',
              },
          });
          
          return { data: results, section: 'packing', fieldMap: PACKING_FIELD_MAP };

      } catch (error) {
          console.error('Prisma Packing query failed:', error);
          return { error: 'Failed to retrieve Packing data from the database. Check model name or schema.' };
      }

  // --- 3. Sewing SEARCH LOGIC ---
  } else if (targetModel === 'Sewing') {
      try {
          const results = await prisma.sewing.findMany({
              where: dateWhereClause,
              orderBy: {
                  operationDate: 'desc',
              },
          });
          
          return { data: results, section: 'sewing', fieldMap: SEWING_FIELD_MAP };

      } catch (error) {
          // FIX: Corrected error message
          console.error('Prisma Sewing query failed:', error);
          return { error: 'Failed to retrieve Sewing data from the database. Check model name or schema.' };
      } 

    // --- 4. Operating Time SEARCH LOGIC ---
  } else if (targetModel === 'OperationTime') {
      const operationTimeWhereClause: any = {};
      
      // FIX: OperationTime model uses a yearMonth string field, not operationDate.
      // We filter by the YYYY-MM derived from the start date.
      if (startDate) {
          const yearMonth = startDate.substring(0, 7); 
          operationTimeWhereClause.yearMonth = yearMonth;
      }
      
      try {
          const results = await prisma.operationTime.findMany({
              where: operationTimeWhereClause, // Filter by yearMonth
              orderBy: {
                  // Order by OperatorId as SectionType is not ideal for sorting
                  OperatorId: 'desc', 
              },
          });
          
          return { data: results, section: 'operationtime', fieldMap: OPERATION_FIELD_MAP };

      } catch (error) {
          // FIX: Corrected error message
          console.error('Prisma OperationTime query failed:', error);
          return { error: 'Failed to retrieve Operating Time data from the database. Check if the "yearMonth" filter is working correctly, or if the model name is wrong.' };
      }
  } 
  
  // --- 5. FALLBACK FOR UNIMPLEMENTED SECTIONS (e.g., Cutting) ---
  else {
    return { error: `Search for section "${section}" is not yet implemented.` };
  }
}
