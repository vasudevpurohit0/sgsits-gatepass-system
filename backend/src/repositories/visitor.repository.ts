import { Prisma, Visitor } from '@prisma/client';
import { prisma } from '../config/database';

export class VisitorRepository {
  /**
   * Find visitor by unique ID
   */
  async findById(id: string): Promise<Visitor | null> {
    return prisma.visitor.findUnique({
      where: { id },
    });
  }

  /**
   * Find visitor by unique phone number
   */
  async findByPhone(phone: string): Promise<Visitor | null> {
    return prisma.visitor.findUnique({
      where: { phone },
    });
  }

  /**
   * Find visitor by unique Identity Document number (e.g. Aadhaar, Passport)
   */
  async findByIdNumber(idNumber: string): Promise<Visitor | null> {
    return prisma.visitor.findUnique({
      where: { idNumber },
    });
  }

  /**
   * Create a new visitor record in database
   */
  async create(data: Prisma.VisitorCreateInput): Promise<Visitor> {
    return prisma.visitor.create({
      data,
    });
  }

  /**
   * Update an existing visitor record by ID
   */
  async update(id: string, data: Prisma.VisitorUpdateInput): Promise<Visitor> {
    return prisma.visitor.update({
      where: { id },
      data,
    });
  }

  /**
   * List visitors with pagination and optional search query
   */
  async list(params: {
    skip?: number;
    take?: number;
    search?: string;
    blacklisted?: boolean;
  }): Promise<{ visitors: Visitor[]; count: number }> {
    const { skip = 0, take = 20, search, blacklisted } = params;

    const where: Prisma.VisitorWhereInput = {};

    if (blacklisted !== undefined) {
      where.blacklisted = blacklisted;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { idNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [visitors, count] = await prisma.$transaction([
      prisma.visitor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.visitor.count({ where }),
    ]);

    return { visitors, count };
  }
}

export default VisitorRepository;
