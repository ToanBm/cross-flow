// Test email service configuration
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { sendOtpEmail, isEmailConfigured } from '../utils/email';

async function testEmail() {
  console.log('=== Testing Email Service ===\n');

  // Check configuration
  console.log('Configuration:');
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`- EMAIL_FROM: ${process.env.EMAIL_FROM || 'onboarding@resend.dev (default)'}`);
  console.log(`- APP_NAME: ${process.env.APP_NAME || 'Tempo Remittance (default)'}`);
  console.log(`- isEmailConfigured(): ${isEmailConfigured()}\n`);

  if (!isEmailConfigured()) {
    console.error('❌ Email service is NOT configured!');
    console.error('Please set RESEND_API_KEY in .env file');
    process.exit(1);
  }

  // Test email
  // Note: With onboarding@resend.dev, you can only send to your registered Resend account email
  // To send to other emails, you need to verify a domain
  const testEmail = process.env.TEST_EMAIL || process.env.RESEND_TEST_EMAIL;
  
  if (!testEmail) {
    console.error('❌ TEST_EMAIL or RESEND_TEST_EMAIL not set in .env');
    console.error('\n⚠️  Important: With onboarding@resend.dev, you can only send emails to:');
    console.error('   - Your registered Resend account email (the email you used to sign up)');
    console.error('\nTo send to other emails, you need to:');
    console.error('   1. Verify a domain in Resend Dashboard');
    console.error('   2. Use an email from that domain (e.g., noreply@yourdomain.com)');
    console.error('\nFor testing, set TEST_EMAIL in .env to your registered email:');
    console.error('   TEST_EMAIL=your-registered-email@example.com');
    process.exit(1);
  }
  
  const testOtp = '123456';

  console.log(`Sending test OTP to: ${testEmail}`);
  console.log(`Test OTP: ${testOtp}`);
  console.log(`\n⚠️  Note: If using onboarding@resend.dev, this must be your registered Resend email\n`);

  try {
    const result = await sendOtpEmail(testEmail, testOtp, 5);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Check your email inbox (and spam folder)');
    } else {
      console.error('❌ Failed to send email:');
      console.error(`Error: ${result.error}`);
      if (result.details) {
        console.error('Details:', JSON.stringify(result.details, null, 2));
      }
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Exception:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEmail();
