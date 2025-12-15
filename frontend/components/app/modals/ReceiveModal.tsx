import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

export const ReceiveModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  address: string;
}> = ({ isOpen, onClose, address }) => {
  if (!isOpen || !address) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <Card className="relative" noPadding>
          <div className="px-6 py-4 border-b border-aurora-border">
            <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center">
              Receive Payment
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-sm">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="w-full">
                <p className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em] mb-2 text-center">
                  Wallet Address
                </p>
                <div className="bg-aurora-input border border-aurora-border rounded-sm p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-mono text-aurora-text break-all flex-1">
                    {address}
                  </p>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-aurora-primary hover:text-aurora-text transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(address).catch(() => {
                        // ignore
                      });
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <Button onClick={onClose} variant="secondary" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};


