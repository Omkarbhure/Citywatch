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

// Zod validation schema for forgot password request
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' })
});

// Zod validation schema for verifying OTP
export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' }),
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .min(4, { message: 'OTP must be at least 4 digits' })
    .max(8, { message: 'OTP cannot exceed 8 digits' })
});

// Zod validation schema for resetting password
export const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' }),
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .min(4, { message: 'OTP must be at least 4 digits' }),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' })
});

// Zod validation schema for updating user profile
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .optional(),
  phone: z
    .string()
    .trim()
    .optional(),
  address: z
    .string()
    .trim()
    .optional(),
  avatar: z
    .string()
    .optional()
});



