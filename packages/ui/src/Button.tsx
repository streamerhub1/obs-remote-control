import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', fullWidth, ...props },
    ref,
  ) => {
    const variants = {
      primary:
        'bg-purple-600 text-white hover:bg-purple-500 border border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.1)]',
      secondary:
        'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700',
      danger:
        'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20',
      ghost: 'bg-transparent text-gray-300 hover:bg-white/5 hover:text-white',
      outline:
        'bg-transparent border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-3 text-base rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
