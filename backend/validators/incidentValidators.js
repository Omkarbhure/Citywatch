import { z } from 'zod';

export const createIncidentSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, { message: 'Title cannot be empty' })
    .max(120, { message: 'Title must be 120 characters or fewer' }),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, { message: 'Description cannot be empty' })
    .max(1000, { message: 'Description must be 1000 characters or fewer' }),
  category: z.enum(
    ['pothole', 'streetlight', 'garbage', 'flooding', 'safety', 'other'],
    { required_error: 'Valid category is required' }
  ),
  coordinates: z
    .tuple([z.number(), z.number()], {
      required_error: 'Coordinates [longitude, latitude] are required'
    })
    .refine(
      ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
      { message: 'Invalid coordinates range: longitude must be between -180 and 180, latitude between -90 and 90' }
    ),
  address: z.string().trim().optional(),
  media: z.array(z.string()).optional().default([])
});

export const updateStatusSchema = z.object({
  status: z.enum(
    ['pending', 'acknowledged', 'in_progress', 'resolved', 'rejected'],
    { required_error: 'Valid status is required' }
  ),
  note: z.string().trim().optional()
});

export const assignIncidentSchema = z.object({
  force: z.boolean().optional().default(false)
});

export const updatePrioritySchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    required_error: 'Valid priority is required (low, medium, high, critical)'
  }),
  note: z.string().trim().optional()
});
