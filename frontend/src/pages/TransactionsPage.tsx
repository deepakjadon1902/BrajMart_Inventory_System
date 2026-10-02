import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { RefreshCw, History, ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { InventoryTransaction, TRANSACTION_TYPES } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { TableSkeleton } from '../components/ui/LoadingSkeleton.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatDateTime } from '../utils/dates.js';

export const TransactionsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '25',
    ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.list(Object.fromEntries(queryParams)),
    queryFn: () =>
      apiClient<{
        data: InventoryTransaction[];
        pagination: { page: number; limit: number; total: number; pages: number };
      }>(`/api/transactions?${queryParams.toString()}`),
  });

  const transactions = transactionsQuery.data?.data || [];
  const pagination = transactionsQuery.data?.pagination || { page: 1, limit: 25, total: 0, pages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Transactions
          </h1>
          <p className="mt-1 text-xs md:text-sm text-neutral-500 font-normal">
            Authoritative, immutable audit log of every inventory quantity mutation
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => transactionsQuery.refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Log
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center gap-3">
        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs font-medium bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="ALL">All Transaction Types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Date Filters */}
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {(typeFilter !== 'ALL' || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter('ALL');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="text-xs text-neutral-500"
          >
            Clear Filters
          </Button>
        )}

        <div className="ml-auto text-xs text-neutral-400 tabular-nums">
          Showing {transactions.length} of {pagination.total} records
        </div>
      </div>

      {/* Table */}
      {transactionsQuery.isLoading ? (
        <TableSkeleton rows={10} columns={8} />
      ) : transactionsQuery.isError ? (
        <ErrorState
          title="Could not load transaction history."
          message={transactionsQuery.error.message}
          onRetry={() => transactionsQuery.refetch()}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No inventory activity found."
          description={
            typeFilter !== 'ALL' || startDate || endDate
              ? 'No transactions matched your selected filters.'
              : 'Transactions will automatically appear here as stock is received, dispatched, or adjusted.'
          }
          icon={<History className="w-7 h-7" />}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-neutral-600 font-semibold select-none">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-3">Product</th>
                  <th className="py-3.5 px-3">SKU</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3 text-right">Previous</th>
                  <th className="py-3.5 px-3 text-right">Change</th>
                  <th className="py-3.5 px-3 text-right">New Stock</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-3">Reference</th>
                  <th className="py-3.5 px-4">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((tx) => {
                  const isPositive = tx.quantityDelta > 0;
                  const unit = tx.productId?.unitType || 'pcs';

                  return (
                    <tr key={tx._id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-900">
                        {tx.productId ? (
                          <NavLink
                            to={`/inventory/${tx.productId._id}`}
                            className="hover:text-brand-700 underline decoration-neutral-300"
                          >
                            {tx.productId.name}
                          </NavLink>
                        ) : (
                          <span className="text-neutral-400 italic">Deleted Product</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-600">
                        {tx.productId?.sku || '—'}
                      </td>
                      <td className="py-3 px-3 font-medium text-neutral-800">
                        <span className="inline-flex items-center gap-1.5">
                          {tx.type === 'STOCK_IN' || tx.type === 'OPENING_STOCK' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          ) : tx.type === 'STOCK_OUT' || tx.type === 'SALE' ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <Scale className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          {tx.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-neutral-600">
                        {tx.previousQuantity} {unit}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">
                        <span
                          className={isPositive ? 'text-emerald-700' : 'text-rose-700'}
                        >
                          {isPositive ? `+${tx.quantityDelta}` : tx.quantityDelta} {unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-neutral-900">
                        {tx.newQuantity} {unit}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 max-w-xs truncate">
                        {tx.reason || tx.note || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-600">
                        {tx.reference || '—'}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{tx.createdBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
