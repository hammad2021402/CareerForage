import React from 'react';
import { Skeleton } from './Skeleton';

export const SkeletonStat: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-3 shimmer">
      {/* Icon placeholder */}
      <Skeleton variant="rect" width={36} height={36} className="rounded-xl" />
      
      {/* Value placeholder */}
      <Skeleton variant="line" width="50%" height={28} className="rounded-md" />
      
      {/* Label placeholder */}
      <Skeleton variant="line" width="30%" height={14} className="rounded-md" />
    </div>
  );
};

export default SkeletonStat;
