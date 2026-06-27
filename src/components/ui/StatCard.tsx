import React from 'react';
import { cn } from '@/utils/cn';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  iconBg?: string;
  glow?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  iconBg,
  glow = false,
  onClick,
  className,
}) => {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] relative overflow-hidden transition-all duration-250',
        glow && 'shadow-[var(--glow-xs)] border-[var(--border-strong)]',
        isClickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-card-hover)]'
          : 'hover:-translate-y-px hover:border-[var(--border-strong)]',
        className
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.02] pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--violet) 0%, transparent 70%)' }} />

      <div className={cn(
        'inline-flex p-2.5 rounded-xl mb-3 border border-[var(--border-subtle)] text-[var(--violet)] bg-[var(--surface-hover)]',
        iconBg
      )}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-display">
        {value}
      </p>
      <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1.5 leading-none">
        {label}
      </p>
      {subtext && (
        <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium leading-none">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default StatCard;
