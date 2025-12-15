import { Request, Response } from 'express';
import { sendOtpEmail, isEmailConfigured } from '../utils/email';

// In-memory OTP store (for development/testnet)
// In production, should use Redis or database
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

/**
 * POST /api/auth/send-otp
 * Send OTP to user's email
 */
export async function sendOtp(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore.set(normalizedEmail, { otp, expiresAt });

    // Send email
    const emailResult = await sendOtpEmail(normalizedEmail, otp, 5);

    if (!emailResult.success) {
      console.error('[Auth] Failed to send OTP email:', emailResult.error);
      console.error('[Auth] Error details:', emailResult.details);
      
      // Provide more helpful error message
      let userMessage = 'Unable to send OTP email. Please try again later.';
      
      if (emailResult.error?.includes('not configured')) {
        userMessage = 'Email service is not configured. Please contact support.';
      } else if (emailResult.error?.includes('domain') || emailResult.error?.includes('verify') || emailResult.error?.includes('onboarding@resend.dev')) {
        userMessage = emailResult.error; // Use the detailed error message from email service
      }
      
      return res.status(500).json({ 
        error: userMessage,
        details: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    // NEVER return OTP in response - security best practice
    // OTP is only sent via email
    res.json({
      success: true,
      email: normalizedEmail,
      expiresInSeconds: 300,
      emailSent: true,
      message: 'OTP was sent to your email. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('[Auth] Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP
 */
export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ error: 'OTP not found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }

    if (record.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP. Please check and try again.' });
    }

    // OTP verified successfully - delete it
    otpStore.delete(normalizedEmail);

    // In production, you would create/update user session here
    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error: any) {
    console.error('[Auth] Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

/**
 * Get OTP store (for testing/debugging)
 */
export function getOtpStore() {
  return otpStore;
}
