import React from 'react';
import { cn } from '@/utils/cn';

export interface AppPageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AppPageLayout: React.FC<AppPageLayoutProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className="min-h-screen bg-[var(--bg)] pb-28 relative overflow-x-hidden transition-colors duration-250">
      {/* Background glow effects */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 5% 0%, var(--bg-dots) 0%, transparent 55%)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 95% 90%, rgba(0, 212, 255, 0.05) 0%, transparent 50%)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        className={cn(
          'relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 space-y-6 sm:space-y-8',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

export default AppPageLayout;
