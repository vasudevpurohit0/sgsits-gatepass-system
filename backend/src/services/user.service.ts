import { User, UserRole } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import ApiError from '../utils/ApiError';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * List users filtered by role
   */
  async listUsers(filter: { role?: UserRole }): Promise<Omit<User, 'passwordHash' | 'mfaSecret'>[]> {
    const where: any = { isActive: true };
    if (filter.role) {
      where.role = filter.role;
    }
    const users = await this.userRepository.findMany(where);
    return users.map(({ passwordHash, mfaSecret, ...sanitized }) => sanitized);
  }

  /**
   * Fetch user profile details (sanitized of sensitive security hashes)
   */
  async getUserProfile(id: string): Promise<Omit<User, 'passwordHash' | 'mfaSecret'>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const { passwordHash, mfaSecret, ...sanitizedProfile } = user;
    return sanitizedProfile;
  }

  /**
   * Update user details and return updated profile
   */
  async updateUserProfile(
    id: string, 
    data: { firstName?: string; lastName?: string; phone?: string; photoUrl?: string }
  ): Promise<Omit<User, 'passwordHash' | 'mfaSecret'>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const updatedUser = await this.userRepository.update(id, data);
    const { passwordHash, mfaSecret, ...sanitizedProfile } = updatedUser;
    return sanitizedProfile;
  }
}

export default UserService;
