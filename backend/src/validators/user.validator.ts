import { z } from 'zod';

// Update profile schema
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  avatar: z.string().url('Invalid avatar URL').optional().nullable(),
});

// MongoDB ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// Pagination query schema
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Session ID param schema
export const sessionIdSchema = z.object({
  id: objectIdSchema,
});

// Types
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type SessionIdParam = z.infer<typeof sessionIdSchema>;
