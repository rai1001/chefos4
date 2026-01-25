import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation.middleware';
import { registerSchema, loginSchema } from '@/utils/validators';
import rateLimit from 'express-rate-limit';

const router = Router();
const authController = new AuthController();

// Rate limiter para prevenir brute force en login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por ventana
    message: 'Too many login attempts from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many login attempts',
            retryAfter: '15 minutes'
        });
    }
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user + create organization
 * @access  Public
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (blacklist token)
 * @access  Private
 */
router.post('/logout', authController.logout);

export default router;
