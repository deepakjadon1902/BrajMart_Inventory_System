import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Boxes, Layers, CircleDollarSign, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard.js';
import { Button } from '../components/ui/Button.js';
import { CardSkeleton } from '../components/ui/LoadingSkeleton.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { DashboardSummary, InventoryTransaction } from '../types/index.js';
import { formatINR } from '../utils/currency.js';
import { formatRelativeTime } from '../utils/dates.js';

export const DashboardPage: React.FC = () => {
  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => apiClient<{ data: DashboardSummary }>('/api/dashboard/summary'),
  });

  const recentQuery = useQuery({
    queryKey: queryKeys.dashboard.recent(5),
    queryFn: () =>
      apiClient<{ data: InventoryTransaction[] }>('/api/dashboard/recent-activity?limit=5'),
  });

  if (summaryQuery.isError) {
    return (
      <ErrorState
        title="Unable to load dashboard."
        message={summaryQuery.error.message}
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  const summary = summaryQuery.data?.data;
  const recentTransactions = recentQuery.data?.data || [];
  const isEmpty = !summaryQuery.isLoading && (summary?.totalProducts ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Live inventory summary from MongoDB</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              summaryQuery.refetch();
              recentQuery.refetch();
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <NavLink to="/inventory/new">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Product
            </Button>
          </NavLink>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Products"
            value={summary?.totalProducts ?? 0}
            subtitle="Active items"
            icon={<Boxes className="w-4 h-4 text-brand-600" />}
          />
          <StatCard
            title="Units"
            value={new Intl.NumberFormat('en-IN').format(summary?.totalUnits ?? 0)}
            subtitle="Current stock"
            icon={<Layers className="w-4 h-4 text-brand-600" />}
          />
          <StatCard
            title="Inventory Value"
            value={formatINR(summary?.inventoryCostPaise)}
            subtitle="Cost value"
            icon={<CircleDollarSign className="w-4 h-4 text-brand-600" />}
          />
          <StatCard
            title="Low Stock"
            value={summary?.lowStockProducts ?? 0}
            subtitle="Needs attention"
            icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          />
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          title="No products yet."
          description="Add products from the panel and they will appear here from the database."
          actionLabel="Add Product"
          onAction={() => (window.location.href = '/inventory/new')}
        />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Recent Activity</h2>
              <p className="text-xs text-neutral-500">Latest stock movements</p>
            </div>
            <NavLink to="/transactions" className="text-xs text-brand-700 font-semibold">
              View All
            </NavLink>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="px-5 py-10 text-sm text-neutral-500">No stock movements recorded yet.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentTransactions.map((tx) => {
                const isPositive = tx.quantityDelta > 0;
                return (
                  <div key={tx._id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {tx.productId?.name || 'Item'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {tx.reason || tx.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${tx.quantityDelta}` : tx.quantityDelta}{' '}
                        {tx.productId?.unitType || 'pcs'}
                      </p>
                      <p className="text-[11px] text-neutral-400">{formatRelativeTime(tx.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
