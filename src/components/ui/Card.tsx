import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  glow?: boolean;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'ghost' | 'gradient-border';
}

const paddingMap = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
  xl:   'p-10',
} as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      glow = false,
      hover = false,
      padding = 'md',
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-2xl relative overflow-hidden';

    const variantStyles = {
      default:
        'bg-[var(--surface-card)] border border-[var(--border-subtle)]',
      elevated:
        'bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--glow-effect)]',
      ghost:
        'bg-transparent border border-[var(--border-subtle)]',
      'gradient-border': [
        'bg-[var(--surface-card)]',
        'before:absolute before:inset-0 before:rounded-2xl before:p-px',
        'before:bg-gradient-to-br before:from-violet-600/40 before:via-transparent before:to-cyan-500/40',
        'before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]',
        'before:[mask-composite:exclude]',
        'before:pointer-events-none',
      ].join(' '),
    };

    const glowStyles = glow
      ? 'shadow-[0_0_32px_rgba(139,92,246,0.20),0_0_64px_rgba(6,182,212,0.08)]'
      : '';

    const hoverStyles = hover
      ? 'transition-all duration-250 hover:-translate-y-0.5 hover:scale-[1.005] hover:shadow-[0_8px_32px_rgba(0,0,0,0.40),0_0_16px_rgba(139,92,246,0.20)] cursor-pointer'
      : '';

    return (
      <motion.div
        ref={ref}
        initial={false}
        whileHover={
          hover
            ? {
                y: -2,
                scale: 1.005,
                transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
              }
            : undefined
        }
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingMap[padding],
          glowStyles,
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

/* ── Subcomponents ───────────────────────────────────── */

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('mb-4', className)}>{children}</div>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3 className={cn('text-base font-semibold text-[var(--text-primary)] tracking-tight', className)}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={cn('mt-1 text-sm text-[var(--text-secondary)] leading-relaxed', className)}>
    {children}
  </p>
);

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn(className)}>{children}</div>
);

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('mt-4 flex items-center gap-3', className)}>{children}</div>
);
