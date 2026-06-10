import { PassStatus, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { socketService } from '../services/socket.service';
import { NotificationService } from '../services/notification.service';

const notificationService = new NotificationService();

export const overstayAlertJob = async () => {
  try {
    const now = new Date();

    // Fetch passes that are currently checked in (ACTIVE) but validity has ended
    const overstayingPasses = await prisma.pass.findMany({
      where: {
        status: PassStatus.ACTIVE,
        validTo: {
          lt: now,
        },
      },
      include: {
        visitor: true,
      },
    });

    for (const pass of overstayingPasses) {
      const diffMs = now.getTime() - new Date(pass.validTo).getTime();
      const minutesOverstayed = Math.round(diffMs / 60000);

      logger.warn(`⚠️ Overstay detected: Pass ${pass.passNumber} for ${pass.visitor.name} has overstayed by ${minutesOverstayed} minutes.`);

      // Emit WebSocket alert to security administrators and guards
      socketService.emitToRole(UserRole.SECURITY_ADMIN, 'alert:overstay', {
        passId: pass.id,
        passNumber: pass.passNumber,
        visitorName: pass.visitor.name,
        minutesOverstayed,
      });

      socketService.emitToRole(UserRole.SECURITY_GUARD, 'alert:overstay', {
        passId: pass.id,
        passNumber: pass.passNumber,
        visitorName: pass.visitor.name,
        minutesOverstayed,
      });

      // Find security admin users to create system notifications
      const securityAdmins = await prisma.user.findMany({
        where: {
          role: UserRole.SECURITY_ADMIN,
        },
      });

      for (const admin of securityAdmins) {
        await notificationService.createNotification(
          admin.id,
          '⚠️ Visitor Overstay Alert',
          `Visitor ${pass.visitor.name} (Pass: ${pass.passNumber}) has overstayed on campus by ${minutesOverstayed} mins.`,
          'SECURITY_ALERT',
          pass.id
        );
      }
    }
  } catch (error) {
    logger.error('❌ Error executing overstayAlertJob:', error);
  }
};

export default overstayAlertJob;
