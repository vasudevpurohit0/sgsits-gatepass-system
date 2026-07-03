import { Prisma, User, RefreshToken } from '@prisma/client';
import { prisma } from '../config/database';

export class UserRepository {
  /**
   * Find user by UUID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by unique email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by unique university identity card code
   */
  async findByUniversityId(universityId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { universityId },
    });
  }

  /**
   * Find multiple users matching filter criteria
   */
  async findMany(where: Prisma.UserWhereInput): Promise<User[]> {
    return prisma.user.findMany({
      where,
    });
  }

  /**
   * Create new user record
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Update existing user record by ID
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Create a refresh token database record for session tracking
   */
  async createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data,
    });
  }

  /**
   * Retrieve refresh token details and associated user profile
   */
  async findRefreshToken(tokenHash: string): Promise<(RefreshToken & { user: User }) | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  /**
   * Revoke all refresh tokens belonging to a specific family (compromise detection)
   */
  async revokeRefreshTokenFamily(family: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { family },
      data: { isRevoked: true },
    });
    return result.count;
  }

  /**
   * Revoke every refresh token belonging to a user (used when token reuse/theft is suspected
   * and we don't know which family the compromised token came from)
   */
  async revokeAllRefreshTokensForUser(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return result.count;
  }

  /**
   * Revoke a single refresh token record by ID
   */
  async revokeRefreshTokenById(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  /**
   * Purge a refresh token record completely
   */
  async deleteRefreshToken(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.delete({
      where: { id },
    });
  }
}

export default UserRepository;
