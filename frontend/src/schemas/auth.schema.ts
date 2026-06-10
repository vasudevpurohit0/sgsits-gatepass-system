import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaToken: z
    .string()
    .length(6, 'MFA code must be exactly 6 digits')
    .regex(/^\d+$/, 'MFA code must contain only digits')
    .optional()
    .or(z.literal('')),
});

export const registerFormSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .refine(
        (val) => val.endsWith('@university.edu') || val.endsWith('.edu'), 
        'Email must belong to a valid university domain'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z.string().min(2, 'First name is required').max(100),
    lastName: z.string().min(2, 'Last name is required').max(100),
    phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g. +919876543210)'),
    universityId: z.string().min(3, 'University ID is too short').max(20).optional().or(z.literal('')),
    role: z.enum(['STUDENT', 'FACULTY'], {
      errorMap: () => ({ message: 'Please select a valid role (Student or Faculty)' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const forgotPasswordFormSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordFormSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    token: z.string().min(1, 'OTP reset code is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });
