import React from 'react';
import { Skeleton } from './Skeleton';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 space-y-4 shimmer">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="line" width="60%" height={14} />
          <Skeleton variant="line" width="40%" height={12} />
        </div>
      </div>
      <Skeleton lines={3} />
      <Skeleton variant="rect" height={36} className="w-full rounded-xl" />
    </div>
  );
};

export default SkeletonCard;
