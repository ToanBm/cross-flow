'use client';

import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface FeedbackButtonProps {
  onClick: () => void;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-aurora-primary/10 border border-aurora-primary text-aurora-primary hover:bg-aurora-primary hover:text-aurora-bg transition-all duration-300 flex items-center justify-center shadow-neon hover:shadow-neon-strong"
      title="Send Feedback"
    >
      <MessageSquarePlus size={20} />
    </button>
  );
};

