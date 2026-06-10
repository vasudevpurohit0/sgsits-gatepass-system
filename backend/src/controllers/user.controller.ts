import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

const userService = new UserService();

/**
 * Get logged-in user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const profile = await userService.getUserProfile(req.user.id);
  res.status(200).json(
    new ApiResponse(200, profile, 'User profile retrieved successfully')
  );
});

/**
 * Update logged-in user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const profile = await userService.updateUserProfile(req.user.id, req.body);
  res.status(200).json(
    new ApiResponse(200, profile, 'User profile updated successfully')
  );
});

/**
 * List/search users filtered by role
 */
export const listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const role = req.query.role as any;
  const users = await userService.listUsers({ role });
  
  res.status(200).json(
    new ApiResponse(200, users, 'Users retrieved successfully')
  );
});
