import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword, verifyTOTP, decryptAES } from '../utils/hashUtils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils';
import { redis } from '../config/redis';
import { mailer } from '../config/mailer';
import { env } from '../config/env';
import ApiError from '../utils/ApiError';
import { logger } from '../utils/logger';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register a new student or faculty account
   */
  async register(data: any): Promise<{ id: string; email: string }> {
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ApiError(409, 'Email address is already registered');
    }

    if (data.universityId) {
      const existingId = await this.userRepository.findByUniversityId(data.universityId);
      if (existingId) {
        throw new ApiError(409, 'University ID is already registered');
      }
    }

    const passwordHash = await hashPassword(data.password);
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      universityId: data.universityId || null,
      role: data.role || UserRole.STUDENT,
    });

    return { id: user.id, email: user.email };
  }

  /**
   * Authenticate email and password, check lockouts, and generate token family
   */
  async login(data: any): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.userRepository.findByEmail(data.email);
    
    const lockoutKey = `lockout:${data.email}`;
    const failedAttemptsKey = `failed_attempts:${data.email}`;
    
    // Check if account is locked out
    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      throw new ApiError(403, 'Account is temporarily locked. Please try again after 30 minutes.');
    }

    if (!user || !(await comparePassword(data.password, user.passwordHash))) {
      // Increment failed login count
      const attempts = await redis.incr(failedAttemptsKey);
      if (attempts === 1) {
        await redis.expire(failedAttemptsKey, 30 * 60); // 30 mins window
      }
      
      if (attempts >= 5) {
        await redis.set(lockoutKey, 'true', 'EX', 30 * 60); // Lock for 30 minutes
        await redis.del(failedAttemptsKey);
        throw new ApiError(403, 'Too many failed login attempts. Your account is locked for 30 minutes.');
      }

      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated. Please contact administrator.');
    }

    // Verify MFA if enabled
    if (user.mfaEnabled) {
      if (!data.mfaToken) {
        throw new ApiError(428, 'MFA code is required');
      }
      
      if (!user.mfaSecret) {
        throw new ApiError(500, 'MFA is enabled but secret key is missing');
      }

      // Decrypt secret and verify TOTP code
      const decryptedSecret = decryptAES(user.mfaSecret, env.JWT_ACCESS_SECRET);
      const isMFAValid = verifyTOTP(data.mfaToken, decryptedSecret);
      if (!isMFAValid) {
        throw new ApiError(401, 'Invalid MFA code');
      }
    }

    // Clear failed attempts counter
    await redis.del(failedAttemptsKey);

    // Update login timestamp
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    
    const tokenFamily = crypto.randomUUID();
    const refreshToken = generateRefreshToken(tokenPayload);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Save to Database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.userRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      family: tokenFamily,
      expiresAt,
    });

    const { passwordHash: _, mfaSecret: __, ...sanitizedUser } = user;

    return {
      accessToken,
      refreshToken,
      user: sanitizedUser,
    };
  }

  /**
   * Rotate a refresh token and issue a new access token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const dbToken = await this.userRepository.findRefreshToken(tokenHash);
      if (!dbToken) {
        // Reuse detection: valid token signature but not in DB (already rotated/used before, or forged).
        // We don't know which family it belonged to, so revoke all sessions for this user as a precaution.
        logger.warn(`⚠️ Refresh token reuse detected! Revoking all sessions for user: ${decoded.userId}`);
        await this.userRepository.revokeAllRefreshTokensForUser(decoded.userId);
        throw new ApiError(401, 'Invalid refresh token');
      }

      if (dbToken.isRevoked || dbToken.expiresAt < new Date()) {
        // Revoke entire family for safety
        await this.userRepository.revokeRefreshTokenFamily(dbToken.family);
        throw new ApiError(401, 'Refresh token has expired or been revoked');
      }

      // Revoke current token immediately (single-use)
      await this.userRepository.revokeRefreshTokenById(dbToken.id);

      // Generate next rotation cycle
      const tokenPayload = { userId: dbToken.user.id, email: dbToken.user.email, role: dbToken.user.role };
      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);
      const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      await this.userRepository.createRefreshToken({
        userId: dbToken.user.id,
        tokenHash: newHash,
        family: dbToken.family, // Preserve family branch
        expiresAt: dbToken.expiresAt,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error: any) {
      throw new ApiError(401, error.message || 'Token refresh failed');
    }
  }

  /**
   * Log out user and invalidate refresh token family
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const dbToken = await this.userRepository.findRefreshToken(tokenHash);
      if (dbToken) {
        await this.userRepository.revokeRefreshTokenFamily(dbToken.family);
        await this.userRepository.deleteRefreshToken(dbToken.id);
      }
    } catch (error) {
      logger.error('Logout processing error:', error);
    }
  }

  /**
   * Request password reset code
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Return success to avoid email enumeration
      return;
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Save hashed OTP in Redis with 15 minutes TTL
    const redisKey = `reset_otp:${email}`;
    await redis.set(redisKey, otpHash, 'EX', 15 * 60);

    // Send email using SMTP Nodemailer transporter
    try {
      await mailer.sendMail({
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Reset Password OTP — Gate Pass System',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #3182ce; margin-top: 0;">Password Reset Requested</h2>
            <p>We received a request to reset your password. Use this One-Time Password (OTP) to reset it. This code is valid for 15 minutes:</p>
            <div style="font-size: 28px; font-weight: bold; background-color: #edf2f7; padding: 12px 24px; border-radius: 6px; display: inline-block; letter-spacing: 4px; color: #2d3748; margin: 15px 0;">
              ${otp}
            </div>
            <p style="color: #718096; font-size: 13px;">If you didn't request a password reset, you can safely ignore this mail.</p>
          </div>
        `,
      });
      logger.info(`📧 Sent password reset OTP to ${email}`);
    } catch (error) {
      logger.error(`❌ Failed to send password reset OTP to ${email}:`, error);
      throw new ApiError(500, 'Could not send reset email. Please try again later.');
    }
  }

  /**
   * Reset user password using OTP verification
   */
  async resetPassword(data: any): Promise<void> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const redisKey = `reset_otp:${data.email}`;
    const savedHash = await redis.get(redisKey);
    if (!savedHash) {
      throw new ApiError(400, 'OTP expired or not requested');
    }

    const inputHash = crypto.createHash('sha256').update(data.token).digest('hex');
    if (savedHash !== inputHash) {
      throw new ApiError(400, 'Invalid OTP code');
    }

    // OTP verified: update password and purge key
    const newPasswordHash = await hashPassword(data.newPassword);
    await this.userRepository.update(user.id, { passwordHash: newPasswordHash });
    await redis.del(redisKey);

    logger.info(`🔒 Password successfully reset for user: ${data.email}`);
  }
}

export default AuthService;
