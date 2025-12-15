import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  noPadding = false,
}) => {
  return (
    <div className={`glass-panel rounded-sm relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-aurora-primary/50 to-transparent opacity-50" />

      {title && (
        <div className="px-6 py-4 border-b border-aurora-border">
          <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center">
            {title}
          </h3>
        </div>
      )}

      {noPadding ? children : <div className="p-6">{children}</div>}
    </div>
  );
};


