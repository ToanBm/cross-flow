'use client';

import React, { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Button } from '../../ui/Button';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userAddress?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userAddress,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: userEmail,
          userAddress,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setError(null);
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-aurora-bg border border-aurora-border rounded-sm w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-aurora-border">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-aurora-primary" />
            <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em]">
              Feedback
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-aurora-textMuted hover:text-aurora-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-500 text-lg">✓</span>
                <span className="text-aurora-text">Thank you! Your feedback has been submitted.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-aurora-textMuted">
                Help us improve Acrosspay. Share your thoughts, report bugs, or suggest features.
              </p>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                className="w-full bg-aurora-input border border-aurora-border rounded-sm px-4 py-3 text-sm text-aurora-text placeholder:text-aurora-textMuted focus:outline-none focus:border-aurora-primary resize-none font-mono"
              />

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  glow
                  onClick={handleSubmit}
                  disabled={isSubmitting || !message.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

