import { Router } from 'express';
import { getProfile, updateProfile, listUsers } from '../controllers/user.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { auditLogger } from '../middleware/audit.middleware';

const router = Router();

// Protect all profile endpoints with JWT authentication
router.use(authenticateJWT);

router.get('/', listUsers);
router.get('/profile', getProfile);
router.put('/profile', auditLogger('Update user profile details'), updateProfile);

export default router;
