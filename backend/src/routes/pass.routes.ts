import { Router } from 'express';
import { 
  createPass, 
  getPass, 
  listPasses, 
  reviewPass, 
  revokePass,
  resendPassEmail
} from '../controllers/pass.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validateRequest, parseMultipartForm } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import { auditLogger } from '../middleware/audit.middleware';
import { 
  createPassSchema, 
  approvePassSchema, 
  revokePassSchema, 
  getPassSchema, 
  searchPassQuerySchema 
} from '../validators/pass.validator';

const router = Router();

// Protect all pass routes with JWT authentication
router.use(authenticateJWT);

// Create a pass (handles upload of visitor ID photo)
router.post(
  '/', 
  upload.single('idPhoto'), 
  parseMultipartForm,
  validateRequest(createPassSchema), 
  auditLogger('Request gate pass'),
  createPass
);

// List scoped passes
router.get(
  '/', 
  validateRequest(searchPassQuerySchema), 
  listPasses
);

// Get specific pass details
router.get(
  '/:id', 
  validateRequest(getPassSchema), 
  getPass
);

// Approve or reject a pass request (restricted to faculty/warden/admins)
router.post(
  '/:id/review', 
  requirePermission('approve_pass'),
  validateRequest(approvePassSchema), 
  auditLogger('Review gate pass request'),
  reviewPass
);

// Revoke an active pass (restricted to requester owner or admins/warden)
router.post(
  '/:id/revoke', 
  validateRequest(revokePassSchema), 
  auditLogger('Revoke active gate pass'),
  revokePass
);

// Resend approved pass email (restricted to admins/approvers)
router.post(
  '/:id/resend-email',
  requirePermission('approve_pass'),
  auditLogger('Resend visitor pass approved email'),
  resendPassEmail
);

export default router;
