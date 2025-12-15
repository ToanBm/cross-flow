import React from 'react';
import { X } from 'lucide-react';
import { Card } from '../../ui/Card';

export type RecipientRow = {
  id: number;
  recipient_address?: string;
  recipient_name?: string;
  recipient_email?: string;
};

export const RecipientsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  recipients: RecipientRow[];
  onSelect: (address: string) => void;
}> = ({ isOpen, onClose, recipients, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <Card className="relative" noPadding>
          <div className="px-6 py-4 border-b border-aurora-border flex items-center justify-between">
            <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em]">
              Saved Contacts
            </h3>
            <button
              onClick={onClose}
              className="text-aurora-textMuted hover:text-aurora-text transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[500px] overflow-y-auto">
            {recipients.length === 0 ? (
              <p className="text-sm text-aurora-textMuted text-center py-8">
                No saved recipients yet
              </p>
            ) : (
              <div className="space-y-2">
                {recipients.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      if (rec.recipient_address) {
                        onSelect(rec.recipient_address);
                        onClose();
                      }
                    }}
                    className="p-4 border border-aurora-border rounded-sm hover:border-aurora-primary/50 hover:bg-aurora-primary/5 transition-all cursor-pointer"
                  >
                    {rec.recipient_name && (
                      <p className="text-sm font-medium text-aurora-text mb-1">
                        {rec.recipient_name}
                      </p>
                    )}
                    {rec.recipient_email && (
                      <p className="text-xs text-aurora-textMuted mb-1">
                        {rec.recipient_email}
                      </p>
                    )}
                    {rec.recipient_address && (
                      <p className="text-xs font-mono text-aurora-primary break-all">
                        {rec.recipient_address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};


