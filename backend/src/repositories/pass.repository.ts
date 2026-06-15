import { Prisma, Pass, UserRole } from '@prisma/client';
import { prisma } from '../config/database';

export class PassRepository {
  /**
   * Create a new gate pass record
   */
  async create(data: Prisma.PassUncheckedCreateInput): Promise<Pass> {
    return prisma.pass.create({
      data,
      include: {
        visitor: true,
        requester: true,
        vehiclePass: true,
        hostelGuest: true,
      },
    });
  }

  /**
   * Find pass by ID including all relations
   */
  async findById(id: string): Promise<Pass | null> {
    return prisma.pass.findUnique({
      where: { id },
      include: {
        visitor: true,
        requester: true,
        approvals: {
          include: { approver: true },
        },
        entryLogs: true,
        vehiclePass: {
          include: { vehicle: true },
        },
        hostelGuest: {
          include: { warden: true },
        },
        emailDeliveryLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find pass by human-readable pass number
   */
  async findByPassNumber(passNumber: string): Promise<Pass | null> {
    return prisma.pass.findUnique({
      where: { passNumber },
      include: { visitor: true, requester: true },
    });
  }

  /**
   * Find pass by decrypted QR token hash
   */
  async findByQrToken(qrToken: string): Promise<Pass | null> {
    return prisma.pass.findUnique({
      where: { qrToken },
      include: { visitor: true, requester: true, entryLogs: true },
    });
  }

  /**
   * Update pass details
   */
  async update(id: string, data: Prisma.PassUpdateInput): Promise<Pass> {
    return prisma.pass.update({
      where: { id },
      data,
      include: {
        visitor: true,
        requester: true,
        vehiclePass: true,
        hostelGuest: true,
      },
    });
  }

  /**
   * List passes with role-based scoping (Students see own, Wardens see hostel block, Admins see all)
   */
  async list(params: {
    userId: string;
    role: UserRole;
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
    passType?: string;
  }): Promise<{ passes: Pass[]; count: number }> {
    const { userId, role, skip = 0, take = 20, search, status, passType } = params;

    const where: Prisma.PassWhereInput = {};

    // 1. Apply Role Scoping (BR-RBAC matrix constraints)
    if (role === UserRole.STUDENT || role === UserRole.STAFF || role === UserRole.VISITOR) {
      // Students, Staff, and Visitors only see passes they requested or hold
      where.OR = [
        { requesterId: userId },
        { visitor: { phone: userId } }, // If phone matches userId
      ];
    } else if (role === UserRole.FACULTY) {
      // Faculty see their own requests
      where.requesterId = userId;
    } else if (role === UserRole.HOSTEL_WARDEN) {
      // Wardens see hostel guest passes assigned to them or their block
      where.OR = [
        { requesterId: userId },
        { hostelGuest: { wardenId: userId } },
      ];
    }

    // 2. Apply general filters
    if (status) {
      where.status = status as any;
    }
    if (passType) {
      where.passType = passType as any;
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { passNumber: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { visitor: { name: { contains: search, mode: 'insensitive' } } },
        { visitor: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [passes, count] = await prisma.$transaction([
      prisma.pass.findMany({
        where,
        include: {
          visitor: true,
          requester: true,
          vehiclePass: true,
          hostelGuest: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.pass.count({ where }),
    ]);

    return { passes, count };
  }
}

export default PassRepository;
