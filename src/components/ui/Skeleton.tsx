import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'circle' | 'rect' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  lineGap?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rect',
  width,
  height,
  lines,
  lineGap = 'gap-3',
  style,
  ...props
}) => {
  const base =
    'shimmer rounded-lg bg-white/[0.06] animate-shimmer';

  const variantStyles: Record<string, string> = {
    line:   'h-4 rounded-md',
    circle: 'rounded-full',
    rect:   'rounded-lg',
    card:   'rounded-2xl',
  };

  const resolvedStyle: React.CSSProperties = {
    width:  width  !== undefined ? (typeof width  === 'number' ? `${width}px`  : width)  : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    ...style,
  };

  if (lines && lines > 1) {
    return (
      <div className={cn('flex flex-col', lineGap, className)} {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(base, variantStyles.line)}
            style={{ width: i === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(base, variantStyles[variant], className)}
      style={resolvedStyle}
      {...props}
    />
  );
};

/* ── Pre-built skeleton layouts ──────────────────────── */

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => (
  <Skeleton lines={lines} className={className} />
);

export const SkeletonAvatar: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 40, className }) => (
  <Skeleton variant="circle" width={size} height={size} className={className} />
);
