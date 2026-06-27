import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium rounded-full transition-colors select-none',
  {
    variants: {
      variant: {
        default:  'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
        violet:   'bg-violet-500/15 text-violet-300 border border-violet-500/30',
        cyan:     'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
        success:  'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
        warning:  'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        error:    'bg-red-500/15 text-red-300 border border-red-500/30',
        gradient: 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white border-0', /* intentional: gradient badge */
        outline:  'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-mid)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  size,
  dot,
  dotColor,
  icon,
  children,
  ...props
}) => (
  <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
    {dot && (
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: dotColor ?? (
            variant === 'success' ? '#10b981' :
            variant === 'error'   ? '#ef4444' :
            variant === 'warning' ? '#f59e0b' :
            variant === 'cyan'    ? '#06b6d4' :
            '#8b5cf6'
          ),
        }}
      />
    )}
    {icon && <span className="flex-shrink-0">{icon}</span>}
    {children}
  </span>
);

Badge.displayName = 'Badge';
