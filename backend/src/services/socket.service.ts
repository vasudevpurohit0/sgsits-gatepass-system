import { Server } from 'socket.io';
import { logger } from '../utils/logger';

class SocketService {
  private io: Server | null = null;

  init(ioInstance: Server) {
    this.io = ioInstance;
    logger.info('🔌 Socket.io instance attached to SocketService');
  }

  getIO(): Server | null {
    return this.io;
  }

  emitToRole(role: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`role:${role}`).emit(event, data);
      logger.info(`🔌 Emitter: Sent event "${event}" to role "${role}"`);
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
      logger.info(`🔌 Emitter: Sent event "${event}" to user "${userId}"`);
    }
  }
  
  emitGlobal(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
      logger.info(`🔌 Emitter: Broadcasted event "${event}" globally`);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
