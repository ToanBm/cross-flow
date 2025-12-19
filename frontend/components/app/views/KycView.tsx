import React from 'react';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';

export const KycView: React.FC<{
  isDark: boolean;
  onToggleTheme: () => void;
  kycEmail: string;
  setKycEmail: (email: string) => void;
  otpRequested: boolean;
  isLoading: boolean;
  onSendOtp: () => void;
  otp: string;
  setOtp: (otp: string) => void;
  onVerify: () => void;
  onChangeEmail: () => void;
  recentEmails: string[];
}> = ({
  isDark,
  onToggleTheme,
  kycEmail,
  setKycEmail,
  otpRequested,
  isLoading,
  onSendOtp,
  otp,
  setOtp,
  onVerify,
  onChangeEmail,
  recentEmails,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-aurora-bg">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-aurora-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="absolute top-6 right-6">
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full hover:bg-aurora-primary/10 text-aurora-textMuted hover:text-aurora-primary transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <Card title="Identity Verification" className="w-full max-w-md z-10">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-aurora-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-aurora-primary/20">
              <ShieldCheck className="w-8 h-8 text-aurora-primary" />
            </div>
            <p className="text-aurora-textMuted text-sm">
              Verify your email to activate your Acrosspay account.
            </p>
          </div>

          {!otpRequested ? (
            <div className="space-y-4 animate-fade-in">
              <Input
                label="Email Address"
                placeholder="you@example.com"
                type="email"
                value={kycEmail}
                onChange={(e) => setKycEmail(e.target.value)}
                autoComplete="email"
                list="tempo-recent-emails"
                className="email-datalist"
              />
              <datalist id="tempo-recent-emails">
                {recentEmails.map((email) => (
                  <option key={email} value={email} />
                ))}
              </datalist>
              <Button className="w-full" onClick={onSendOtp} disabled={isLoading}>
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <label className="text-base font-mono text-aurora-textMuted uppercase">
                  Enter OTP Code
                </label>
                <span className="text-sm text-aurora-primary cursor-pointer" onClick={onChangeEmail}>
                  Change Email
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <input
                    key={idx}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={otp[idx] || ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 1);
                      const next = otp.split('');
                      while (next.length < 6) next.push('');
                      next[idx] = v;
                      const joined = next.join('').slice(0, 6);
                      setOtp(joined);

                      if (v && idx < 5) {
                        const nextEl = document.getElementById(
                          `otp-${idx + 1}`,
                        ) as HTMLInputElement | null;
                        nextEl?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                        const prevEl = document.getElementById(
                          `otp-${idx - 1}`,
                        ) as HTMLInputElement | null;
                        prevEl?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData
                        .getData('text')
                        .replace(/\D/g, '')
                        .slice(0, 6);
                      if (!text) return;
                      setOtp(text);
                      const focusIdx = Math.min(text.length, 6) - 1;
                      const el = document.getElementById(
                        `otp-${focusIdx}`,
                      ) as HTMLInputElement | null;
                      el?.focus();
                    }}
                    id={`otp-${idx}`}
                    className="w-12 h-12 text-center font-mono text-lg bg-aurora-input border border-aurora-border text-aurora-text rounded-sm focus:outline-none focus:border-aurora-primary/50 focus:shadow-neon transition-all"
                  />
                ))}
              </div>
              <Button className="w-full" onClick={onVerify} disabled={isLoading} glow>
                {isLoading ? 'Verifying...' : 'Verify Identity'}
              </Button>
              <p className="text-xs text-aurora-textMuted text-center">
                Please check your email for the OTP code.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};


