import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  glow = false,
  className = '',
  ...props
}) => {
  const base =
    'px-6 py-3 font-mono font-semibold text-sm tracking-[0.2em] uppercase transition-all duration-300 ease-out flex items-center justify-center gap-2 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-aurora-primary/10 border border-aurora-primary text-aurora-primary hover:bg-aurora-primary hover:text-aurora-bg',
    secondary:
      'bg-transparent border border-aurora-border text-aurora-textMuted hover:border-aurora-primary hover:text-aurora-primary',
    ghost:
      'bg-transparent text-aurora-primary hover:text-aurora-text hover:bg-aurora-primary/5',
  };

  const glowClass = glow ? 'shadow-neon hover:shadow-neon-strong' : '';

  return (
    <button
      className={`${base} ${variants[variant]} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};


