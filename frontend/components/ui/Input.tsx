import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  onIconClick?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  onIconClick,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-xs font-mono text-aurora-textMuted uppercase tracking-[0.22em]">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className="w-full bg-aurora-input border border-aurora-border text-aurora-text px-4 py-3 rounded-sm focus:outline-none focus:border-aurora-primary/50 focus:shadow-neon transition-all placeholder-aurora-textMuted/50 font-light text-sm"
          {...props}
        />
        {icon && (
          <div 
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-aurora-textMuted group-focus-within:text-aurora-primary transition-colors ${onIconClick ? 'cursor-pointer hover:text-aurora-primary' : ''}`}
            onClick={onIconClick}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};


