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
  selectedToken: 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD';
  setSelectedToken: (t: 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD') => void;
  exchangeRate: number | undefined; // Fiat → Stablecoin rate
  amount: string; // Amount in stablecoin
  setAmount: (v: string) => void;
  onDeposit: () => void;
  isLoading: boolean;
}> = ({
  onBack,
  depositCurrency,
  setDepositCurrency,
  selectedToken,
  setSelectedToken,
  exchangeRate,
  amount,
  setAmount,
  onDeposit,
  isLoading,
}) => {
    // Calculate USD/EUR needed based on stablecoin amount and exchange rate
    const fiatAmount = amount && exchangeRate && !Number.isNaN(Number(amount))
      ? (Number(amount) / exchangeRate).toFixed(2)
      : '0.00';
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
                {/* Currency selector (USD/EUR) */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-1 bg-aurora-input border border-aurora-border rounded-sm p-1">
                    <button
                      type="button"
                      onClick={() => setDepositCurrency('USD')}
                      className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] transition-all rounded-sm ${depositCurrency === 'USD'
                          ? 'bg-aurora-primary text-aurora-bg shadow-neon'
                          : 'text-aurora-textMuted hover:text-aurora-text'
                        }`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositCurrency('EUR')}
                      className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] transition-all rounded-sm ${depositCurrency === 'EUR'
                          ? 'bg-aurora-primary text-aurora-bg shadow-neon'
                          : 'text-aurora-textMuted hover:text-aurora-text'
                        }`}
                    >
                      EUR
                    </button>
                  </div>
                  <p className="font-mono text-sm text-aurora-text">
                    1 {depositCurrency} = {exchangeRate && !isNaN(exchangeRate) ? exchangeRate.toFixed(4) : '1.0000'} {selectedToken}
                  </p>
                </div>

                {/* Select token, Amount, and You will pay - side by side */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                      Access
                    </label>
                    <select
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value as 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD')}
                      className="w-full border border-aurora-border rounded-sm bg-aurora-input px-3 h-[46px] font-mono text-sm text-aurora-text focus:outline-none focus:ring-2 focus:ring-aurora-primary"
                    >
                      <option value="AlphaUSD">AlphaUSD</option>
                      <option value="BetaUSD">BetaUSD</option>
                      <option value="ThetaUSD">ThetaUSD</option>
                    </select>
                  </div>
                  <Input
                    label="Amount"
                    placeholder="0.00"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                      Pay ({depositCurrency})
                    </label>
                    <input
                      className="w-full bg-aurora-input border border-aurora-border text-aurora-text px-4 py-3 rounded-sm focus:outline-none focus:border-aurora-primary/50 focus:shadow-neon transition-all placeholder-aurora-textMuted/50 font-light text-sm"
                      type="text"
                      value={fiatAmount}
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                    Payment method
                  </label>
                  <div className="border border-aurora-border p-3 rounded-sm bg-aurora-input">
                    <div className="font-mono text-sm text-aurora-textMuted">
                      Visa 4242 4242 4242 4242 MM/YY 12/34 CVC 123
                    </div>
                    <div className="font-mono text-sm text-aurora-textMuted mt-2">
                      Mastercard 5555 5555 5555 4444 MM/YY 12/34 CVC 123
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
                  {isLoading ? 'Creating payment...' : `Buy ${selectedToken}`}
                </Button>

                <div className="flex items-center justify-center gap-2 text-aurora-textMuted text-sm mt-4">
                  <ShieldCheck size={12} />
                  <span>Power by <span className="font-bold">Stripe</span></span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };


