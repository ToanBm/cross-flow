import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import type { User } from '../../../lib/types';

export type BankAccount = {
  bankAccountId: string;
  connectedAccountId: string;
  currency: string;
  country: string;
  accountHolderName: string;
};

export const BankConnectModal: React.FC<{
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (account: BankAccount) => void;
}> = ({ user, isOpen, onClose, onCreated }) => {
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
  const [country, setCountry] = useState('');
  const [existingConnectedAccountId, setExistingConnectedAccountId] = useState('');
  const [existingBankAccountId, setExistingBankAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setMode('create');
      setEmail(user.email);
      const parts = user.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setExistingConnectedAccountId('');
      setExistingBankAccountId('');
      setCurrency('USD');
      setCountry('');
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);

      if (mode === 'link') {
        const connectedAccountId = existingConnectedAccountId.trim();
        const bankAccountId = existingBankAccountId.trim();

        if (!connectedAccountId.startsWith('acct_')) {
          throw new Error('Please enter a valid Connected Account ID (acct_...)');
        }
        if (!bankAccountId.startsWith('ba_')) {
          throw new Error('Please enter a valid Bank Account ID (ba_...)');
        }

        onCreated({
          bankAccountId,
          connectedAccountId,
          // Backend will infer these from Stripe using acct_ + ba_
          currency: '',
          country: '',
          accountHolderName: '',
        });
        onClose();
        return;
      }

      const resp = await fetch('/api/cashout/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          currency: currency.toLowerCase(),
          country,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to create bank account');
      }

      const account: BankAccount = {
        bankAccountId: data.bankAccountId,
        connectedAccountId: data.connectedAccountId,
        currency: data.currency,
        country: data.country,
        accountHolderName: data.accountHolderName,
      };

      onCreated(account);
      onClose();
    } catch (err: any) {
      console.error('[BankConnectModal] error', err);
      setError(err.message || 'Failed to create bank account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <Card className="relative" noPadding>
          <div className="px-6 py-4 border-b border-aurora-border">
            <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center">
              Connect bank account
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-aurora-textMuted">
                Connect a bank account to enable cashout functionality.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`flex-1 px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] border rounded-sm transition-all ${
                    mode === 'create'
                      ? 'bg-aurora-primary text-aurora-bg border-aurora-primary shadow-neon'
                      : 'bg-aurora-input text-aurora-textMuted border-aurora-border hover:text-aurora-text'
                  }`}
                >
                  Create new
                </button>
                <button
                  type="button"
                  onClick={() => setMode('link')}
                  className={`flex-1 px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] border rounded-sm transition-all ${
                    mode === 'link'
                      ? 'bg-aurora-primary text-aurora-bg border-aurora-primary shadow-neon'
                      : 'bg-aurora-input text-aurora-textMuted border-aurora-border hover:text-aurora-text'
                  }`}
                >
                  I already have one
                </button>
              </div>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />

              {mode === 'create' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    label="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              )}

              {mode === 'link' && (
                <>
                  <p className="text-xs text-aurora-textMuted">
                    Paste the IDs from Stripe dashboard (Test mode): Connected account (<span className="font-mono">acct_...</span>)
                    and External bank account (<span className="font-mono">ba_...</span>).
                  </p>
                  <Input
                    label="Connected Account ID"
                    placeholder="acct_..."
                    value={existingConnectedAccountId}
                    onChange={(e) => setExistingConnectedAccountId(e.target.value)}
                  />
                  <Input
                    label="Bank Account ID"
                    placeholder="ba_..."
                    value={existingBankAccountId}
                    onChange={(e) => setExistingBankAccountId(e.target.value)}
                  />
                </>
              )}

              {mode === 'create' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
                      Currency
                    </label>
                    <select
                      className="w-full bg-aurora-input border border-aurora-border text-aurora-text px-4 py-3 rounded-sm focus:outline-none focus:border-aurora-primary/50 focus:shadow-neon transition-all placeholder-aurora-textMuted/50 font-light text-sm"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR')}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <Input
                    label="Country (optional)"
                    placeholder="US / DE / FR ..."
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  glow
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Connecting...' : 'Connect bank'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};


