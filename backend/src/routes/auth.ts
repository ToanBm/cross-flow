import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', authController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

export default router;
