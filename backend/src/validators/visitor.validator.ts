import { z } from 'zod';
import { IdType, VisitorCategory } from '@prisma/client';
import { VALIDATION_RULES } from '../config/constants';

export const createVisitorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
    phone: z.string().regex(VALIDATION_RULES.PHONE_REGEX, 'Phone must be in valid E.164 format (e.g. +919876543210)'),
    email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    idType: z.enum([
      IdType.AADHAAR,
      IdType.PASSPORT,
      IdType.DRIVING_LICENSE,
      IdType.VOTER_ID,
      IdType.PAN_CARD,
      IdType.OTHER
    ], {
      errorMap: () => ({ message: 'Invalid ID card type selection' }),
    }),
    idNumber: z.string().min(4, 'ID number must be at least 4 characters').max(50),
    category: z.enum([
      VisitorCategory.GENERAL,
      VisitorCategory.ACADEMIC,
      VisitorCategory.GOVERNMENT,
      VisitorCategory.VIP,
      VisitorCategory.CONTRACTOR,
      VisitorCategory.VENDOR,
      VisitorCategory.PARENT,
      VisitorCategory.MEDICAL
    ]).default(VisitorCategory.GENERAL),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const blacklistVisitorSchema = z.object({
  body: z.object({
    blacklisted: z.boolean().optional(),
    isBlacklisted: z.boolean().optional(),
    blacklistReason: z.union([
      z.string().min(2, 'Blacklist reason must be at least 2 characters long').max(250),
      z.literal(''),
      z.null()
    ]).optional().nullable().transform(val => val === '' ? null : val),
  }).refine(data => data.blacklisted !== undefined || data.isBlacklisted !== undefined, {
    message: 'Either blacklisted or isBlacklisted boolean field is required',
    path: ['blacklisted'],
  }).transform(data => ({
    ...data,
    blacklisted: data.blacklisted !== undefined ? data.blacklisted : data.isBlacklisted!,
  })),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid visitor identification code'),
  }),
});

export const getVisitorSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid visitor identification code'),
  }),
});

export const searchVisitorQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '20', 10)),
    search: z.string().optional(),
    blacklisted: z.string().transform(v => v === 'true').optional(),
  }),
  params: z.object({}).optional(),
});
