import { Router } from 'express';
import {
  createSecurityPass,
  getApprovers,
  listSecurityPasses,
  respondToSecurityPass,
} from '../controllers/securityPass.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validateRequest, parseMultipartForm } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import { auditLogger } from '../middleware/audit.middleware';
import {
  createSecurityPassSchema,
  respondSecurityPassSchema,
  searchSecurityPassQuerySchema,
} from '../validators/securityPass.validator';

const router = Router();

// Public: approver clicks Approve/Reject link from email, may not be authenticated
router.get(
  '/respond',
  validateRequest(respondSecurityPassSchema),
  respondToSecurityPass
);

// Everything else requires authentication
router.use(authenticateJWT);

// Create a Security Pass for a walk-in/unknown visitor (Security Guard / Security Admin / Super Admin only)
router.post(
  '/',
  requirePermission('create_security_pass'),
  upload.fields([{ name: 'govIdPhoto', maxCount: 1 }, { name: 'visitorPhoto', maxCount: 1 }]),
  parseMultipartForm,
  validateRequest(createSecurityPassSchema),
  auditLogger('Create security pass for walk-in visitor'),
  createSecurityPass
);

// Dynamically configured approver email list (from .env) for the "Send Approval To" selector
router.get(
  '/approvers',
  requirePermission('create_security_pass'),
  getApprovers
);

// List Security Passes (creator sees own, admins see all)
router.get(
  '/',
  validateRequest(searchSecurityPassQuerySchema),
  listSecurityPasses
);

export default router;
