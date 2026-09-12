import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  slaHours: z.coerce.number().min(1).optional()
}).refine(
  (data) => {
    if (data.from && data.to) {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        return fromDate <= toDate;
      }
    }
    return true;
  },
  {
    message: "'from' date must be on or before 'to' date",
    path: ['from']
  }
);
