import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Middleware to auto-log successful state-modifying requests (POST, PUT, PATCH, DELETE)
 */
export const auditLogger = (actionDescription?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', async () => {
      try {
        const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        
        // Log only successful write transactions by authenticated users
        if (!isWriteMethod || res.statusCode >= 400 || !req.user) {
          return;
        }

        const action = actionDescription || `${req.method} ${req.originalUrl || req.url}`;
        const resource = req.baseUrl ? req.baseUrl.split('/').pop() || 'unknown' : 'unknown';

        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            resource,
            resourceId: req.params.id || null,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            // Deep state changes (beforeState/afterState) are updated programmatically in services,
            // this captures the request-level modification audit trail.
            afterState: req.body && Object.keys(req.body).length > 0 ? req.body : null,
          },
        });
      } catch (error) {
        logger.error('❌ Failed to create auto audit log:', error);
      }
    });

    next();
  };
};

export default auditLogger;
