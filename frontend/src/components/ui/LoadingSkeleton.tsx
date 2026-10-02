import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 8,
}) => {
  return (
    <div className="w-full bg-white rounded-xl border border-neutral-200/80 overflow-hidden animate-pulse">
      <div className="h-12 bg-neutral-100 border-b border-neutral-200/80" />
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="h-14 flex items-center px-4 gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-4 bg-neutral-200/60 rounded"
                style={{ width: `${Math.max(40, 100 - cIdx * 10)}px` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-32 bg-white rounded-xl border border-neutral-200/80 p-5 space-y-3"
        >
          <div className="h-3 w-24 bg-neutral-200/80 rounded" />
          <div className="h-7 w-32 bg-neutral-200 rounded" />
          <div className="h-3 w-40 bg-neutral-100 rounded" />
        </div>
      ))}
    </div>
  );
};
