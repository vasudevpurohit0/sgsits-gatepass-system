import { Request, Response } from 'express';
import { SecurityPassService } from '../services/securityPass.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

const securityPassService = new SecurityPassService();

/**
 * Get the dynamic frontend origin resiliently from request headers or fallback
 */
const getFrontendUrl = (req: Request): string => {
  let origin = req.headers.origin;
  if (Array.isArray(origin)) origin = origin[0];

  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch {
      // ignore
    }
  }
  if (!origin && req.headers['x-forwarded-host']) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'];
    origin = `${proto}://${host}`;
  }
  if (!origin) {
    origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  }
  return origin;
};

/**
 * Create a Security Pass for an unknown/walk-in visitor
 */
export const createSecurityPass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const govIdFile = files?.govIdPhoto?.[0];
  const visitorPhotoFile = files?.visitorPhoto?.[0];
  const frontendUrl = getFrontendUrl(req);

  const pass = await securityPassService.createSecurityPass(
    req.user.id,
    `${req.user.firstName} ${req.user.lastName}`,
    req.body,
    govIdFile ? { buffer: govIdFile.buffer, mimeType: govIdFile.mimetype } : undefined,
    visitorPhotoFile ? { buffer: visitorPhotoFile.buffer, mimeType: visitorPhotoFile.mimetype } : undefined,
    frontendUrl
  );

  res.status(201).json(
    new ApiResponse(201, pass, 'Security Pass submitted for approval')
  );
});

/**
 * Return the dynamically configured list of security approver emails (from .env)
 */
export const getApprovers = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const approvers = securityPassService.getApproverEmails();

  res.status(200).json(
    new ApiResponse(200, approvers, 'Approver list retrieved successfully')
  );
});

/**
 * List Security Passes scoped by role (creators see own, admins see all)
 */
export const listSecurityPasses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const result = await securityPassService.listSecurityPasses(req.user.id, req.user.role, req.query);

  res.status(200).json(
    new ApiResponse(200, result.passes, 'Security passes retrieved successfully', {
      total: result.count,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    })
  );
});

/**
 * Public endpoint hit by approver clicking Approve/Reject link in email
 */
export const respondToSecurityPass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token: string };
  const frontendUrl = getFrontendUrl(req);

  const result = await securityPassService.respondToSecurityPass(token, frontendUrl);

  if (result.status === 'invalid') {
    res.status(200).json(new ApiResponse(200, { status: 'invalid' }, 'This approval link is invalid or has expired.'));
    return;
  }
  if (result.status === 'already_processed') {
    res.status(200).json(new ApiResponse(200, { status: 'already_processed' }, 'This request has already been processed.'));
    return;
  }

  const emailWarning = result.status === 'approved' ? result.emailWarning : undefined;

  res.status(200).json(
    new ApiResponse(
      200,
      { status: result.status, pass: result.pass },
      emailWarning
        ? `Security Pass successfully approved, but warning: ${emailWarning}`
        : `Security Pass successfully ${result.status}`
    )
  );
});

export default { createSecurityPass, getApprovers, listSecurityPasses, respondToSecurityPass };
