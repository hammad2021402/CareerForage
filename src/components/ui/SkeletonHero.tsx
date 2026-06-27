import React from 'react';
import { Skeleton } from './Skeleton';

export const SkeletonHero: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[var(--surface-card)] border border-[var(--border-subtle)] min-h-[160px] shimmer">
      <div className="flex items-start gap-4">
        {/* Icon shape */}
        <Skeleton variant="rect" width={48} height={48} className="rounded-2xl flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Title line */}
          <Skeleton variant="line" width="30%" height={24} className="rounded-md" />
          
          {/* Description line */}
          <Skeleton variant="line" width="60%" height={16} className="rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonHero;
