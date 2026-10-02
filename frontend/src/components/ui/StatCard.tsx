import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant: 'positive' | 'warning' | 'danger' | 'neutral';
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  className = '',
}) => {
  const badgeColors = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200/60',
  };

  return (
    <div
      className={`bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm transition-all hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </span>
        {icon && <div className="text-neutral-400 p-1.5 rounded-lg bg-neutral-50">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
          {value}
        </span>
        {badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColors[badge.variant]}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-neutral-500 font-normal leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};
