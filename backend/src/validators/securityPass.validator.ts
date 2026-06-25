import { z } from 'zod';
import { IdType } from '@prisma/client';
import { VALIDATION_RULES } from '../config/constants';

export const createSecurityPassSchema = z.object({
  body: z.object({
    visitorName: z.string().min(2, 'Name must be at least 2 characters').max(100),
    phone: z.string().regex(VALIDATION_RULES.PHONE_REGEX, 'Phone must be in E.164 format (e.g. +919876543210)'),
    email: z.union([
      z.string().email('Invalid email address'),
      z.literal(''),
      z.null(),
    ]).optional().nullable().transform(val => val === '' ? null : val),
    govIdType: z.enum([
      IdType.AADHAAR,
      IdType.PASSPORT,
      IdType.DRIVING_LICENSE,
      IdType.VOTER_ID,
      IdType.PAN_CARD,
      IdType.OTHER,
    ]),
    govIdNumber: z.string().min(4, 'ID number must be at least 4 characters').max(50),
    purpose: z.string().min(5, 'Purpose must describe access needs in at least 5 characters').max(500),
    whomToVisit: z.string().min(2, 'Whom to visit is required').max(150),
    remarks: z.union([z.string().max(500), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
    expectedDuration: z.string().min(1, 'Expected visit duration is required').max(50),
    entryGate: z.string().min(1, 'Entry gate is required').max(100),
    approverEmails: z.union([
      z.array(z.string().email('Invalid approver email')).min(1, 'Select at least one approver'),
      z.string().email().transform(val => [val]),
    ]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const respondSecurityPassSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
  params: z.object({}).optional(),
});

export const getSecurityPassSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid pass ID'),
  }),
});

export const searchSecurityPassQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '20', 10)),
    search: z.string().optional(),
    status: z.string().optional(),
  }),
  params: z.object({}).optional(),
});
