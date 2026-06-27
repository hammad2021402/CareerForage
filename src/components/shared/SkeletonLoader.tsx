import React from 'react';

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-dark-800 dark:via-dark-700 dark:to-dark-800 rounded-lg animate-shimmer ${className}`}
      style={{ backgroundSize: '1000px 100%' }}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-dark-800">
      <SkeletonLoader className="h-6 w-3/4 mb-4" />
      <SkeletonLoader className="h-4 w-full mb-2" />
      <SkeletonLoader className="h-4 w-5/6 mb-2" />
      <SkeletonLoader className="h-4 w-4/6" />
    </div>
  );
};