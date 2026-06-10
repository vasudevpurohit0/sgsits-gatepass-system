import { Request, Response } from 'express';
import { VisitorService } from '../services/visitor.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

const visitorService = new VisitorService();

/**
 * Register or fetch existing visitor record
 */
export const registerVisitor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const file = req.file; // From multer upload middleware
  const visitorData = req.body;

  const visitor = await visitorService.findOrCreateVisitor(
    visitorData,
    file?.buffer,
    file?.mimetype
  );

  res.status(200).json(
    new ApiResponse(200, visitor, 'Visitor record processed successfully')
  );
});

/**
 * Fetch visitor details by ID
 */
export const getVisitor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const visitor = await visitorService.getVisitorById(id);

  res.status(200).json(
    new ApiResponse(200, visitor, 'Visitor retrieved successfully')
  );
});

/**
 * List/search visitors
 */
export const listVisitors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await visitorService.listVisitors(req.query);

  res.status(200).json(
    new ApiResponse(200, result.visitors, 'Visitors retrieved successfully', {
      total: result.count,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    })
  );
});

/**
 * Blacklist or whitelist a visitor
 */
export const blacklistVisitor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { blacklisted, blacklistReason } = req.body;

  const visitor = await visitorService.setBlacklistStatus(id, blacklisted, blacklistReason);

  res.status(200).json(
    new ApiResponse(200, visitor, `Visitor successfully ${blacklisted ? 'blacklisted' : 'removed from blacklist'}`)
  );
});

/**
 * Fetch visitor ID photo directly
 */
export const getVisitorPhoto = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const visitorDetails = await visitorService.getVisitorById(id);
  
  if (!visitorDetails.idPhotoUrl) {
    res.status(404).send('Photo not found');
    return;
  }

  res.redirect(visitorDetails.idPhotoUrl);
});

export default { registerVisitor, getVisitor, listVisitors, blacklistVisitor, getVisitorPhoto };
