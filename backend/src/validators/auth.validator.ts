import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { VALIDATION_RULES } from '../config/constants';

const emailSchema = z
  .string()
  .email('Invalid email address')
  .refine((email) => {
    const domain = email.split('@')[1];
    return VALIDATION_RULES.UNIVERSITY_EMAIL_DOMAINS.includes(domain);
  }, `Email must belong to an allowed university domain (e.g. ${VALIDATION_RULES.UNIVERSITY_EMAIL_DOMAINS.join(', ')})`);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(2, 'First name is required').max(100),
    lastName: z.string().min(2, 'Last name is required').max(100),
    phone: z.string().regex(VALIDATION_RULES.PHONE_REGEX, 'Phone number must be in E.164 format (e.g., +919876543210)'),
    universityId: z.string().min(3, 'University ID is too short').max(20).optional().nullable(),
    role: z.enum([UserRole.STUDENT, UserRole.FACULTY], {
      errorMap: () => ({ message: 'Self-registration is only allowed for STUDENT or FACULTY roles' }),
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    mfaToken: z.string().length(6, 'MFA token must be exactly 6 digits').regex(/^\d+$/, 'MFA code must contain only digits').optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    token: z.string().min(1, 'Reset OTP/token is required'),
    newPassword: passwordSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
