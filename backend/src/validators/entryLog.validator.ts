import { z } from 'zod';
import { LogType } from '@prisma/client';

export const verifyQRSchema = z.object({
  body: z.object({
    qrToken: z.string().min(20, 'QR Token is missing or invalid'),
    gate: z.string().min(1, 'Gate identifier is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const manualOverrideSchema = z.object({
  body: z.object({
    passId: z.string().uuid('Invalid pass ID'),
    gate: z.string().min(1, 'Gate identifier is required'),
    overrideReason: z.string().min(5, 'Override reason must describe justification in at least 5 characters').max(250),
    logType: z.enum([LogType.ENTRY, LogType.EXIT]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const searchEntryLogsQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '20', 10)),
    gate: z.string().optional(),
    logType: z.string().optional(),
    passId: z.string().uuid('Invalid pass ID').optional(),
  }),
  params: z.object({}).optional(),
});
