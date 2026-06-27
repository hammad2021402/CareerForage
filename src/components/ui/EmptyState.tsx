import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center h-full min-h-[220px] rounded-2xl border transition-all duration-250',
        'bg-[var(--surface-glass)] border-[var(--border)] backdrop-blur-md',
        className
      )}
    >
      <div className="text-3xl mb-3.5 flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--violet)] flex-shrink-0">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 leading-none font-display">
        {title}
      </h3>
      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-[280px] mb-4">
        {description}
      </p>

      {/* Render new action prop if provided, otherwise fallback to actionLabel/onAction */}
      {action ? (
        <div className="flex justify-center">{action}</div>
      ) : (
        actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] hover:opacity-95 active:scale-[0.98] text-[var(--text-inverse)] text-xs font-semibold shadow-md transition-all font-display"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
};

export default EmptyState;
