import React from 'react';
import { cn } from '@/utils/cn';

export interface PageHeroProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  extraActions?: React.ReactNode;
  className?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({
  icon,
  title,
  description,
  extraActions,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-[var(--glow-effect)]',
        'bg-gradient-to-r from-[var(--violet)]/10 via-[var(--cyan)]/5 to-[var(--bg)]',
        className
      )}
    >
      {/* Background glow highlights */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 120% at -5% 50%, rgba(124, 92, 252, 0.15), transparent)',
        }}
      />
      <div
        className="absolute top-0 right-0 w-72 h-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at 110% 30%, rgba(0, 212, 255, 0.08), transparent)',
        }}
      />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-2xl flex-shrink-0">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight font-display">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed max-w-2xl">
              {description}
            </p>
          </div>
        </div>

        {extraActions && (
          <div className="flex items-center gap-3 self-start md:self-center flex-shrink-0">
            {extraActions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHero;
