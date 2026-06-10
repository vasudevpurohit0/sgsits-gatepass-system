import { PassStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const expirePassJob = async () => {
  try {
    const now = new Date();

    // Find all passes that are PENDING_APPROVAL or APPROVED but their validity window has expired
    const expiredPasses = await prisma.pass.updateMany({
      where: {
        status: {
          in: [PassStatus.PENDING_APPROVAL, PassStatus.APPROVED],
        },
        validTo: {
          lt: now,
        },
      },
      data: {
        status: PassStatus.EXPIRED,
      },
    });

    if (expiredPasses.count > 0) {
      logger.info(`⏰ Background Job: Expired ${expiredPasses.count} un-used gate passes past validity window.`);
    }
  } catch (error) {
    logger.error('❌ Error executing expirePassJob:', error);
  }
};

export default expirePassJob;
