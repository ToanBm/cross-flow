import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resend = resendApiKey && resendApiKey.length > 0 ? new Resend(resendApiKey) : null;

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_NAME = process.env.APP_NAME || 'Tempo Remittance';

/**
 * Send OTP email to user
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  expiresInMinutes: number = 5
): Promise<{ success: boolean; error?: string; details?: any }> {
  // Check if Resend is configured
  if (!resend) {
    const errorMsg = 'Email service not configured. Please set RESEND_API_KEY in .env file.';
    console.error(`[Email] ${errorMsg}`);
    console.error(`[Email] Current FROM_EMAIL: ${FROM_EMAIL}`);
    console.error(`[Email] RESEND_API_KEY is: ${resendApiKey ? 'SET (but invalid?)' : 'NOT SET'}`);
    return { 
      success: false, 
      error: errorMsg,
      details: 'RESEND_API_KEY is missing or invalid'
    };
  }

  try {
    console.log(`[Email] Attempting to send OTP to ${email} from ${FROM_EMAIL}`);
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your ${APP_NAME} Verification Code`,
      html: generateOtpEmailTemplate(otp, expiresInMinutes),
      text: generateOtpEmailText(otp, expiresInMinutes),
    });

    if (error) {
      console.error('[Email] Resend API error:', JSON.stringify(error, null, 2));
      
      // Check for domain verification error or testing email restriction
      const errorMessage = error.message || '';
      const isDomainError = 
        errorMessage.toLowerCase().includes('domain') ||
        errorMessage.toLowerCase().includes('verify') ||
        errorMessage.toLowerCase().includes('not verified') ||
        errorMessage.toLowerCase().includes('unauthorized');
      
      const isTestingEmailRestriction = 
        errorMessage.toLowerCase().includes('only send testing emails') ||
        errorMessage.toLowerCase().includes('your own email address');
      
      let userFriendlyError = error.message || 'Failed to send email';
      
      if (isTestingEmailRestriction) {
        // Extract the allowed email from error message
        const emailMatch = errorMessage.match(/\(([^)]+@[^)]+)\)/);
        const allowedEmail = emailMatch ? emailMatch[1] : 'your registered email';
        userFriendlyError = `With onboarding@resend.dev, you can only send emails to ${allowedEmail}. To send to other addresses, verify a domain in the Resend Dashboard.`;
      } else if (isDomainError) {
        userFriendlyError = 'Email domain is not verified. Please verify your domain in the Resend Dashboard or use the email address associated with your Resend account.';
      }
      
      return { 
        success: false, 
        error: userFriendlyError,
        details: error
      };
    }

    console.log(`[Email] ✅ OTP sent successfully to ${email}, email ID: ${data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Exception when sending OTP:', error);
    console.error('[Email] Error stack:', error.stack);
    return { 
      success: false, 
      error: error.message || 'Failed to send email',
      details: error.toString()
    };
  }
}

/**
 * Generate HTML email template for OTP
 */
function generateOtpEmailTemplate(otp: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${APP_NAME}</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Your Verification Code</h2>
    
    <p style="color: #6b7280; font-size: 16px; margin: 20px 0;">
      Use this code to verify your email address:
    </p>
    
    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
        ${otp}
      </div>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
      This code will expire in <strong>${expiresInMinutes} minutes</strong>.
    </p>
    
    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you didn't request this code, please ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for OTP
 */
function generateOtpEmailText(otp: string, expiresInMinutes: number): string {
  return `
${APP_NAME} - Verification Code

Your verification code is: ${otp}

This code will expire in ${expiresInMinutes} minutes.

If you didn't request this code, please ignore this email.
  `.trim();
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return resend !== null && !!resendApiKey;
}
