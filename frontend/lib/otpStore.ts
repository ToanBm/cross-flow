export type OtpRecord = {
  otp: string;
  expiresAt: number;
};

// In-memory OTP store dùng chung giữa các route (dev / testnet)
export const otpStore = new Map<string, OtpRecord>();


