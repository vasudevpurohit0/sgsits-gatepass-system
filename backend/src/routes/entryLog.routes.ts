import { Router } from 'express';
import { 
  verifyQR, 
  manualOverride, 
  listLogs 
} from '../controllers/entryLog.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { auditLogger } from '../middleware/audit.middleware';
import { 
  verifyQRSchema, 
  manualOverrideSchema, 
  searchEntryLogsQuerySchema 
} from '../validators/entryLog.validator';

const router = Router();

// Protect all entry log routes with JWT authentication
router.use(authenticateJWT);

// Scan and verify QR code (restricted to Security Guard, Security Admin, Super Admin)
router.post(
  '/verify', 
  requirePermission('scan_qr'),
  validateRequest(verifyQRSchema), 
  auditLogger('Scan and verify visitor QR pass'),
  verifyQR
);

// Manual check-in override (restricted to Security Guard, Security Admin, Super Admin)
router.post(
  '/override', 
  requirePermission('manual_override'),
  validateRequest(manualOverrideSchema), 
  auditLogger('Log manual entry override'),
  manualOverride
);

// List/search log history (open to multiple roles based on data visibility scoping)
router.get(
  '/', 
  requirePermission('view_entry_logs'),
  validateRequest(searchEntryLogsQuerySchema), 
  listLogs
);

export default router;
