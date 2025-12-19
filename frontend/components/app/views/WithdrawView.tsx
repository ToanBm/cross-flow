import React from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';

export type BankAccount = {
  bankAccountId: string;
  connectedAccountId: string;
  currency: string;
  country: string;
  accountHolderName: string;
};

export const WithdrawView: React.FC<{
  onBack: () => void;
  selectedToken: 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD';
  setSelectedToken: (v: 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD') => void;
  amount: string;
  setAmount: (v: string) => void;
  bankAccounts: BankAccount[];
  withdrawTxHash: string | null;
  onWithdraw: () => void;
  isLoading: boolean;
}> = ({
  onBack,
  selectedToken,
  setSelectedToken,
  amount,
  setAmount,
  bankAccounts,
  withdrawTxHash,
  onWithdraw,
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
              Bank Transfer
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                    Asset
                  </label>
                  <select
                    className="w-full bg-aurora-input border border-aurora-border text-aurora-text px-4 py-3 rounded-sm focus:outline-none focus:border-aurora-primary/50 focus:shadow-neon transition-all placeholder-aurora-textMuted/50 font-light text-sm"
                    value={selectedToken}
                    onChange={(e) =>
                      setSelectedToken(e.target.value as 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD')
                    }
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
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                  Destination bank
                </label>
                <div className="border border-aurora-border p-3 rounded-sm flex items-center gap-3 bg-aurora-input">
                  <Building2 size={20} className="text-aurora-textMuted" />
                  <div className="flex-1">
                    {bankAccounts.length === 0 ? (
                      <>
                        <p className="text-sm text-aurora-text">No bank connected</p>
                        <p className="text-xs text-aurora-textMuted">
                          Connect a bank account on the dashboard first.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-aurora-text">
                          {bankAccounts[0].accountHolderName}
                        </p>
                        <p className="text-xs text-aurora-textMuted">
                          {bankAccounts[0].currency} • {bankAccounts[0].country} •{' '}
                          {bankAccounts[0].bankAccountId}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {withdrawTxHash && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span className="text-aurora-text">Transfer confirmed</span>
                  <span className="text-aurora-textMuted">—</span>
                  <a
                    href={`https://explorer.tempo.xyz/tx/${withdrawTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-aurora-primary hover:underline font-mono"
                  >
                    View on Explorer
                  </a>
                </div>
              )}

              <Button className="w-full" glow onClick={onWithdraw} disabled={isLoading}>
                {isLoading ? 'Processing transfer...' : 'Bank Transfer'}
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


