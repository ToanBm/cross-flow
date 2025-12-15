import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { CardElement } from '@stripe/react-stripe-js';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';

export const DepositView: React.FC<{
  onBack: () => void;
  depositCurrency: 'USD' | 'EUR';
  setDepositCurrency: (c: 'USD' | 'EUR') => void;
  exchangeRate: number | undefined;
  amount: string;
  setAmount: (v: string) => void;
  onDeposit: () => void;
  isLoading: boolean;
}> = ({
  onBack,
  depositCurrency,
  setDepositCurrency,
  exchangeRate,
  amount,
  setAmount,
  onDeposit,
  isLoading,
}) => {
  return (
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <Button variant="ghost" onClick={onBack} className="pl-0">
          ← Back to Dashboard
        </Button>
        <Card className="relative" noPadding>
          <div className="px-6 py-4 border-b border-aurora-border">
            <h3
              className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center"
              style={{ fontSize: '16px' }}
            >
              Card Payment
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-1 bg-aurora-input border border-aurora-border rounded-sm p-1">
                  <button
                    type="button"
                    onClick={() => setDepositCurrency('USD')}
                    className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] transition-all rounded-sm ${
                      depositCurrency === 'USD'
                        ? 'bg-aurora-primary text-aurora-bg shadow-neon'
                        : 'text-aurora-textMuted hover:text-aurora-text'
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositCurrency('EUR')}
                    className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] transition-all rounded-sm ${
                      depositCurrency === 'EUR'
                        ? 'bg-aurora-primary text-aurora-bg shadow-neon'
                        : 'text-aurora-textMuted hover:text-aurora-text'
                    }`}
                  >
                    EUR
                  </button>
                </div>
                <p className="font-mono text-sm text-aurora-text">
                  1 {depositCurrency} = {exchangeRate ? exchangeRate.toFixed(4) : '1.0000'} USDC
                </p>
              </div>

              <Input
                label={`Amount (${depositCurrency})`}
                placeholder="0.00"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <div className="space-y-2">
                <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                  Payment method
                </label>
                <div className="border border-aurora-border p-3 rounded-sm bg-aurora-input">
                  <div className="font-mono text-sm text-aurora-text">
                    Visa 4242 4242 4242 4242 12/34 123
                  </div>
                  <div className="font-mono text-sm text-aurora-text mt-2">
                    Mastercard 5555 5555 5555 4444 12/34 123
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                  Card details
                </label>
                <div className="border border-aurora-border rounded-sm bg-aurora-input px-3 py-3">
                  <CardElement
                    options={{
                      hidePostalCode: true,
                      style: {
                        base: {
                          fontSize: '14px',
                          color: '#e5e7eb',
                          '::placeholder': { color: '#64748b80' },
                        },
                        invalid: { color: '#f97373' },
                      },
                    }}
                  />
                </div>
              </div>

              <Button className="w-full" glow onClick={onDeposit} disabled={isLoading}>
                {isLoading ? 'Creating payment...' : 'Buy USDC'}
              </Button>

              <div className="flex items-center justify-center gap-2 text-aurora-textMuted text-sm mt-4">
                <ShieldCheck size={12} />
                <span>Power by Stripe</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};


