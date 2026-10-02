import React, { useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Archive,
  History,
  Boxes,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';
import { Product, InventoryTransaction } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { StatCard } from '../components/ui/StatCard.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { StockInModal } from '../features/inventory/StockInModal.js';
import { StockOutModal } from '../features/inventory/StockOutModal.js';
import { AdjustStockModal } from '../features/inventory/AdjustStockModal.js';
import { ArchiveModal } from '../features/inventory/ArchiveModal.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatINR } from '../utils/currency.js';
import { formatDateTime } from '../utils/dates.js';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [modalType, setModalType] = useState<
    'stockIn' | 'stockOut' | 'adjust' | 'archive' | null
  >(null);

  // Query: Product detail
  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id || ''),
    queryFn: () => apiClient<{ data: Product }>(`/api/products/${id}`),
    enabled: Boolean(id),
  });

  // Query: Product transaction history
  const historyQuery = useQuery({
    queryKey: queryKeys.products.history(id || ''),
    queryFn: () =>
      apiClient<{
        data: InventoryTransaction[];
        pagination: { page: number; limit: number; total: number; pages: number };
      }>(`/api/products/${id}/history?limit=50`),
    enabled: Boolean(id),
  });

  if (productQuery.isError) {
    return (
      <ErrorState
        title="Product not found"
        message={productQuery.error.message}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  const product = productQuery.data?.data;
  const transactions = historyQuery.data?.data || [];

  if (productQuery.isLoading || !product) {
    return <div className="p-12 text-center text-sm text-neutral-500">Loading product details...</div>;
  }

  const categoryName =
    typeof product.categoryId === 'object' && product.categoryId !== null
      ? product.categoryId.name
      : 'Uncategorized';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header (Rule #38) */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <NavLink
            to="/inventory"
            className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </NavLink>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {product.name}
              </h1>
              <StatusBadge status={product.stockStatus} />
              {product.isArchived && (
                <span className="px-2 py-0.5 rounded text-xs bg-neutral-200 text-neutral-700">
                  Archived
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
              <span>
                SKU: <strong className="font-mono text-neutral-700">{product.sku}</strong>
              </span>
              <span>•</span>
              <span>
                Category: <strong className="text-neutral-700">{categoryName}</strong>
              </span>
              <span>•</span>
              <span>
                Unit: <strong className="text-neutral-700">{product.unitType}</strong>
              </span>
            </div>
            {product.description && (
              <p className="mt-2 text-xs text-neutral-600 max-w-2xl leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalType('stockIn')}
            leftIcon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          >
            Add Stock
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalType('stockOut')}
            leftIcon={<ArrowUpRight className="w-4 h-4 text-rose-600" />}
          >
            Delivery Out
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalType('adjust')}
            leftIcon={<Scale className="w-4 h-4 text-amber-600" />}
          >
            Adjust Stock
          </Button>

          <NavLink to={`/inventory/${product._id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit className="w-4 h-4 text-neutral-600" />}
            >
              Edit
            </Button>
          </NavLink>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalType('archive')}
            leftIcon={<Archive className="w-4 h-4 text-neutral-500" />}
          >
            {product.isArchived ? 'Restore' : 'Archive'}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Stock"
          value={`${product.currentQuantity} ${product.unitType}`}
          subtitle={`Reorder threshold: ${product.reorderLevel} ${product.unitType}`}
          icon={<Boxes className="w-4 h-4 text-brand-600" />}
        />

        <StatCard
          title="Unit Price"
          value={formatINR(product.costPerUnitPaise)}
          subtitle={`Selling: ${formatINR(product.sellingPricePerUnitPaise)}`}
          icon={<CircleDollarSign className="w-4 h-4 text-brand-600" />}
        />

        <StatCard
          title="Total Cost"
          value={formatINR(product.inventoryCostPaise)}
          subtitle="Stock x cost to company"
          icon={<CircleDollarSign className="w-4 h-4 text-neutral-600" />}
        />

        <StatCard
          title="Selling Total"
          value={formatINR(product.sellingValuePaise)}
          subtitle={`Profit: ${formatINR(product.potentialProfitPaise)} (${product.marginPercentage}% margin)`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Product Chronological Transaction History (Rule #40) */}
      <div id="history" className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-700" />
            <h2 className="text-sm font-bold text-neutral-900">
              Stock Movement History
            </h2>
          </div>
          <span className="text-xs text-neutral-500 tabular-nums">
            {transactions.length} verified database transactions
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No stock transactions recorded yet for this product.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-neutral-600 font-semibold select-none">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Previous Qty</th>
                  <th className="py-3 px-3 text-right">Change</th>
                  <th className="py-3 px-3 text-right">New Qty</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-4">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((tx) => {
                  const isPositive = tx.quantityDelta > 0;
                  return (
                    <tr key={tx._id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-800">
                        {tx.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-neutral-600">
                        {tx.previousQuantity} {product.unitType}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">
                        <span
                          className={isPositive ? 'text-emerald-700' : 'text-rose-700'}
                        >
                          {isPositive ? `+${tx.quantityDelta}` : tx.quantityDelta}{' '}
                          {product.unitType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-neutral-900">
                        {tx.newQuantity} {product.unitType}
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
        )}
      </div>

      {/* Operation Modals */}
      <StockInModal
        product={product}
        isOpen={modalType === 'stockIn'}
        onClose={() => setModalType(null)}
      />

      <StockOutModal
        product={product}
        isOpen={modalType === 'stockOut'}
        onClose={() => setModalType(null)}
      />

      <AdjustStockModal
        product={product}
        isOpen={modalType === 'adjust'}
        onClose={() => setModalType(null)}
      />

      <ArchiveModal
        product={product}
        isOpen={modalType === 'archive'}
        onClose={() => setModalType(null)}
      />
    </div>
  );
};
