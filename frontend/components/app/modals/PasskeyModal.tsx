import React from 'react';
import { useConnect, useConnectors, useConnection } from 'wagmi';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import type { User } from '../../../lib/types';

export const PasskeyModal: React.FC<{ user: User | null }> = ({ user }) => {
  const connect = useConnect();
  const [connector] = useConnectors();
  const connection = useConnection();

  const address = (connection as any)?.address as string | undefined;

  // Don't show modal if user is not logged in.
  if (!user) return null;

  // If wallet is connected, we can hide the modal.
  if (address) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <Card title="Activate Tempo Wallet (Passkey)" className="relative">
          <div className="space-y-5">
            <p className="text-sm text-aurora-textMuted">
              To hold stablecoins and sign transactions on Tempo, you need to create or sign in to
              a secure Passkey wallet. Your email is used for KYC only:{' '}
              <span className="font-mono text-aurora-text">{user.email}</span>.
            </p>

            {(connect as any).isPending && (
              <p className="text-sm text-aurora-primary">
                Waiting for passkey confirmation on your device (FaceID / TouchID / biometrics)...
              </p>
            )}

            {(connect as any).error && (
              <p className="text-xs text-red-400">
                {(connect as any).error?.message || 'Passkey sign-in failed. Please try again.'}
              </p>
            )}

            <div className="space-y-3">
              <div className="text-xs text-aurora-textMuted">Choose one option:</div>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full"
                  glow
                  onClick={() =>
                    (connect as any).connect({
                      connector,
                      capabilities: { type: 'sign-up' },
                    })
                  }
                  disabled={!connector || (connect as any).isPending}
                >
                  Create new Tempo Passkey
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() =>
                    (connect as any).connect({
                      connector,
                      capabilities: { type: 'sign-in', selectAccount: true },
                    })
                  }
                  disabled={!connector || (connect as any).isPending}
                >
                  Sign in with existing Passkey
                </Button>
              </div>
            </div>

            <p className="text-xs text-aurora-textMuted">
              Passkeys are stored in your device&apos;s secure storage / password manager. On
              testnet, you can delete and recreate them anytime.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};


