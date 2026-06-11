import { Notification, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { socketService } from './socket.service';

export class NotificationService {
  /**
   * Create an in-app notification and broadcast it in real time via WebSockets
   */
  async createNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    passId: string | null = null
  ): Promise<Notification> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          passId,
        },
      });

      // Emit real-time WebSocket alert using socketService to avoid circular dependency crash
      try {
        socketService.emitToUser(userId, 'notification', notification);
      } catch (wsError) {
        logger.warn('⚠️ WebSocket dispatch skipped:', wsError);
      }

      return notification;
    } catch (error) {
      logger.error('❌ Failed to create/emit notification:', error);
      throw error;
    }
  }

  /**
   * Get recent notifications list for a specific user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all unread notifications of a user as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }
}

export default NotificationService;
