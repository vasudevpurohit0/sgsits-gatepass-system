import { Request, Response } from 'express';
import { EntryLogService } from '../services/entryLog.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

const entryLogService = new EntryLogService();

/**
 * Scan and verify cryptographic QR code
 */
export const verifyQR = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { qrToken, gate } = req.body;
  const log = await entryLogService.scanAndVerifyQR(req.user.id, qrToken, gate);

  res.status(200).json(
    new ApiResponse(200, log, `Visitor successfully logged for ${log.logType}`)
  );
});

/**
 * Log manual override (triggered by guard upon security check)
 */
export const manualOverride = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { passId, gate, logType, overrideReason } = req.body;
  const log = await entryLogService.logManualOverride(
    req.user.id,
    passId,
    gate,
    logType,
    overrideReason
  );

  res.status(200).json(
    new ApiResponse(200, log, `Manual override successfully logged for ${logType}`)
  );
});

/**
 * List paginated entry logs history
 */
export const listLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await entryLogService.listLogs(req.query);

  res.status(200).json(
    new ApiResponse(200, result.logs, 'Entry logs retrieved successfully', {
      total: result.count,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    })
  );
});

export default { verifyQR, manualOverride, listLogs };
