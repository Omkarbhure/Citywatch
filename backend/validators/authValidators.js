import { z } from 'zod';

// Zod validation schema for user registration
// Note: 'role' is omitted because role assignment is server-controlled (forced to 'citizen')
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' }),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' })
});

// Zod validation schema for user login
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password is required' })
});
