import React from 'react';
import { BookOpen, Wallet } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';

export const SendView: React.FC<{
  onBack: () => void;
  recipient: string;
  setRecipient: (v: string) => void;
  canOpenRecipients: boolean;
  onOpenRecipients: () => void;
  saveRecipient: boolean;
  setSaveRecipient: (v: boolean) => void;
  selectedToken: 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD';
  setSelectedToken: (v: 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD') => void;
  alphaUsdBalance: number | undefined;
  betaUsdBalance: number | undefined;
  thetaUsdBalance: number | undefined;
  amount: string;
  setAmount: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
}> = ({
  onBack,
  recipient,
  setRecipient,
  canOpenRecipients,
  onOpenRecipients,
  saveRecipient,
  setSaveRecipient,
  selectedToken,
  setSelectedToken,
  alphaUsdBalance,
  betaUsdBalance,
  thetaUsdBalance,
  amount,
  setAmount,
  memo,
  setMemo,
  onSend,
  isSending,
}) => {
  return (
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <Button variant="ghost" onClick={onBack} className="pl-0">
          ← Back to Dashboard
        </Button>
        <Card className="relative" noPadding>
          <div className="px-6 py-4 border-b border-aurora-border">
            <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center">
              Send Stablecoins
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <Input
                label="Recipient (Wallet Address)"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                icon={<BookOpen size={18} />}
                onIconClick={() => {
                  if (canOpenRecipients) onOpenRecipients();
                }}
              />

              <div className="flex items-center gap-2" style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="saveRecipient"
                  checked={saveRecipient}
                  onChange={(e) => setSaveRecipient(e.target.checked)}
                  className="w-4 h-4 rounded border-aurora-border bg-aurora-input text-aurora-primary focus:ring-aurora-primary focus:ring-2 cursor-pointer"
                />
                <label
                  htmlFor="saveRecipient"
                  className="text-xs font-mono text-aurora-textMuted cursor-pointer"
                >
                  Save to contacts
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                      Asset
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Wallet size={14} className="text-aurora-textMuted" />
                      <span className="text-xs font-mono text-aurora-text">
                        {selectedToken === 'AlphaUSD' && alphaUsdBalance !== undefined
                          ? alphaUsdBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : selectedToken === 'BetaUSD' && betaUsdBalance !== undefined
                            ? betaUsdBalance.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : selectedToken === 'ThetaUSD' && thetaUsdBalance !== undefined
                              ? thetaUsdBalance.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '...'}
                      </span>
                    </div>
                  </div>
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

              <Input
                label="Memo (optional)"
                placeholder="Payment reference, invoice ID, or note"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />

              <Button className="w-full" glow onClick={onSend} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send Payment'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};


