import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .transform((val) => val.trim().toLowerCase());

export const otpSchema = z
  .string()
  .min(6, 'Verification code must be 6 digits')
  .max(8, 'Verification code must not exceed 8 characters')
  .regex(/^[0-9]+$/, 'Verification code must be numeric');
