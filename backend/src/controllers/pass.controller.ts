import { Request, Response } from 'express';
import { PassService } from '../services/pass.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

const passService = new PassService();

/**
 * Request a new gate pass (with optional visitor ID file attachment)
 */
export const createPass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const file = req.file; // From multer single file middleware
  const pass = await passService.createPass(
    req.user.id,
    req.body,
    file?.buffer,
    file?.mimetype
  );

  res.status(201).json(
    new ApiResponse(201, pass, 'Gate pass request submitted successfully')
  );
});

/**
 * Fetch detailed pass information by ID, appending temporary secure media presigned URLs
 */
export const getPass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const pass = await passService.getPassById(id);

  res.status(200).json(
    new ApiResponse(200, pass, 'Pass retrieved successfully')
  );
});

/**
 * List and search passes scoped by user role permissions
 */
export const listPasses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const result = await passService.listPasses(
    req.user.id,
    req.user.role,
    req.query
  );

  res.status(200).json(
    new ApiResponse(200, result.passes, 'Passes retrieved successfully', {
      total: result.count,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    })
  );
});

/**
 * Review pass request: Approve or Reject
 */
export const reviewPass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { id } = req.params;
  const { approved, remarks } = req.body;

  const pass = await passService.approveOrRejectPass(id, req.user.id, approved, remarks);

  res.status(200).json(
    new ApiResponse(200, pass, `Pass successfully ${approved ? 'approved' : 'rejected'}`)
  );
});

/**
 * Revoke active or approved pass
 */
export const revokePass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { id } = req.params;
  const { reason } = req.body;

  const pass = await passService.revokePass(id, req.user.id, req.user.role, reason);

  res.status(200).json(
    new ApiResponse(200, pass, 'Pass successfully revoked')
  );
});

export default { createPass, getPass, listPasses, reviewPass, revokePass };
