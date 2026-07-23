import React from 'react';
import { cn } from './utils';

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ className, fallback, size = 'md', src, alt, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-2xl'
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center overflow-hidden bg-gray-800 rounded-full shrink-0", sizeClasses[size], className)}>
      {!error && src ? (
        <img
          src={src}
          alt={alt || "Avatar"}
          onError={() => setError(true)}
          className="w-full h-full object-cover"
          {...props}
        />
      ) : (
        <span className="font-medium text-gray-400">
          {fallback || alt?.charAt(0).toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}
