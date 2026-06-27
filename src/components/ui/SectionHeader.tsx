import React from 'react';
import { cn } from '@/utils/cn';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="h-9 w-9 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--violet)]">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight font-display">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium leading-none">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;
