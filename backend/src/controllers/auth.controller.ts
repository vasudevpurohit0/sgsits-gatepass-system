import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import { env } from '../config/env';

const authService = new AuthService();

/**
 * Register user controller
 */
export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body);
  
  res.status(201).json(
    new ApiResponse(201, result, 'Registration successful. You can now login.')
  );
});

/**
 * Login user controller. Sets secure HttpOnly cookie for refresh token.
 */
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { accessToken, refreshToken, user } = await authService.login(req.body);

  // Set httpOnly cookie for refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: `${env.API_PREFIX}/auth/refresh`,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  res.status(200).json(
    new ApiResponse(200, { accessToken, user }, 'Login successful')
  );
});

/**
 * Refresh session access token controller
 */
export const refreshSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Parse cookies manually to support environments without cookie-parser
  const rawCookieHeader = req.headers.cookie || '';
  const parsedCookies = Object.fromEntries(
    rawCookieHeader.split('; ').map((c) => {
      const parts = c.split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );

  const refreshToken = (req as any).cookies?.refreshToken || parsedCookies.refreshToken;

  const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

  // Set rotated refresh token cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: `${env.API_PREFIX}/auth/refresh`,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json(
    new ApiResponse(200, { accessToken }, 'Access token refreshed successfully')
  );
});

/**
 * Logout user controller. Clears session cookies.
 */
export const logoutUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rawCookieHeader = req.headers.cookie || '';
  const parsedCookies = Object.fromEntries(
    rawCookieHeader.split('; ').map((c) => {
      const parts = c.split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  const refreshToken = (req as any).cookies?.refreshToken || parsedCookies.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Clear cookie
  res.clearCookie('refreshToken', {
    path: `${env.API_PREFIX}/auth/refresh`,
  });

  res.status(200).json(
    new ApiResponse(200, null, 'Logged out successfully')
  );
});

/**
 * Forgot password code request controller
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json(
    new ApiResponse(200, null, 'If your email is registered, you will receive a reset OTP code shortly.')
  );
});

/**
 * Reset password controller
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body);
  res.status(200).json(
    new ApiResponse(200, null, 'Password successfully reset.')
  );
});
