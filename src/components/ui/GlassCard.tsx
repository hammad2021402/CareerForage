import React from 'react';
import { cn } from '@/utils/cn';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: boolean;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glow = false,
  hover = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden transition-all duration-250',
        glow && 'shadow-[var(--glow-xs)] border-[var(--border-strong)]',
        hover && 'hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--glow-effect)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
