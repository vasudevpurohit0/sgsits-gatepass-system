import { Router } from 'express';
import { 
  registerVisitor, 
  getVisitor, 
  listVisitors, 
  blacklistVisitor,
  getVisitorPhoto
} from '../controllers/visitor.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import { auditLogger } from '../middleware/audit.middleware';
import { 
  createVisitorSchema, 
  blacklistVisitorSchema, 
  getVisitorSchema, 
  searchVisitorQuerySchema 
} from '../validators/visitor.validator';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all routes with JWT authorization
router.use(authenticateJWT);

// Create or fetch visitor (uses multer memory upload)
router.post(
  '/', 
  upload.single('idPhoto'), 
  validateRequest(createVisitorSchema), 
  auditLogger('Register visitor'),
  registerVisitor
);

// List/search visitors
router.get(
  '/', 
  validateRequest(searchVisitorQuerySchema), 
  listVisitors
);

// Get visitor photo directly
router.get(
  '/photo/:id',
  getVisitorPhoto
);

// Fetch specific visitor details
router.get(
  '/:id', 
  validateRequest(getVisitorSchema), 
  getVisitor
);

// Set blacklist status (restricted to Security Admin, University Admin, and Super Admin)
router.post(
  '/:id/blacklist', 
  requireRole([UserRole.SECURITY_ADMIN, UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN]),
  validateRequest(blacklistVisitorSchema), 
  auditLogger('Update visitor blacklist status'),
  blacklistVisitor
);

export default router;
