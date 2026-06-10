import { Prisma, EntryLog } from '@prisma/client';
import { prisma } from '../config/database';

export class EntryLogRepository {
  /**
   * Log a new entry/exit action
   */
  async create(data: Prisma.EntryLogUncheckedCreateInput): Promise<EntryLog> {
    return prisma.entryLog.create({
      data,
      include: {
        pass: {
          include: { visitor: true },
        },
      },
    });
  }

  /**
   * Find last entry log for a specific pass (used to match entry with exit)
   */
  async findLastLogByPassId(passId: string): Promise<EntryLog | null> {
    return prisma.entryLog.findFirst({
      where: { passId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an entry log (e.g. to set exit time and calculate dwell minutes)
   */
  async update(id: string, data: Prisma.EntryLogUpdateInput): Promise<EntryLog> {
    return prisma.entryLog.update({
      where: { id },
      data,
      include: {
        pass: {
          include: { visitor: true },
        },
      },
    });
  }

  /**
   * Retrieve entry logs with pagination and filters
   */
  async list(params: {
    skip?: number;
    take?: number;
    gate?: string;
    logType?: string;
    passId?: string;
  }): Promise<{ logs: EntryLog[]; count: number }> {
    const { skip = 0, take = 20, gate, logType, passId } = params;

    const where: Prisma.EntryLogWhereInput = {};

    if (gate) {
      where.gate = gate;
    }
    if (logType) {
      where.logType = logType as any;
    }
    if (passId) {
      where.passId = passId;
    }

    const [logs, count] = await prisma.$transaction([
      prisma.entryLog.findMany({
        where,
        include: {
          pass: {
            include: { visitor: true, requester: true },
          },
          guard: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.entryLog.count({ where }),
    ]);

    return { logs, count };
  }
}

export default EntryLogRepository;
