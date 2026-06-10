import { Router } from 'express';
import { 
  registerUser, 
  loginUser, 
  refreshSession, 
  logoutUser, 
  forgotPassword, 
  resetPassword 
} from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../validators/auth.validator';

const router = Router();

// Apply sliding window rate limits on login/register endpoints (max 10 requests per 15 mins to mitigate brute force)
const authRateLimiter = rateLimiter(15 * 60 * 1000, 10);

router.post('/register', authRateLimiter, validateRequest(registerSchema), registerUser);
router.post('/login', authRateLimiter, validateRequest(loginSchema), loginUser);
router.post('/refresh', refreshSession); // HttpOnly Cookie based refresh
router.post('/logout', authenticateJWT, logoutUser);
router.post('/forgot-password', authRateLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validateRequest(resetPasswordSchema), resetPassword);

export default router;
