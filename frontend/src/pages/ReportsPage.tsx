import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, RefreshCw, Star, AlertTriangle, TrendingUp, Boxes } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { TableSkeleton } from '../components/ui/LoadingSkeleton.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatINR } from '../utils/currency.js';

interface SmartProduct {
  productId: string;
  name: string;
  categoryName: string;
  serialNumber?: number;
  stockUnits: number;
  costToCompanyPaise: number;
  sellingPricePaise: number;
  totalCostPaise: number;
  sellingTotalPaise: number;
  profitPaise: number;
  soldUnits: number;
  soldUnits30Days: number;
  predicted30DaySales: number;
  averageDailySales: number;
  daysOfStockCover: number | null;
  reorderSuggestion: number;
  risk: 'OUT_OF_STOCK' | 'REORDER_SOON' | 'SLOW_MOVING' | 'HEALTHY';
  action: string;
}

interface SmartCategory {
  categoryName: string;
  serialNumber?: number;
  productCount: number;
  stockUnits: number;
  totalCostPaise: number;
  sellingTotalPaise: number;
  profitPaise: number;
  soldUnits: number;
}

interface SmartReport {
  engine: string;
  libraries: {
    pandas: boolean;
    numpy: boolean;
  };
  summary: {
    productCount: number;
    categoryCount: number;
    stockUnits: number;
    totalCostPaise: number;
    sellingTotalPaise: number;
    profitPaise: number;
    predicted30DaySales: number;
    reorderProducts: number;
  };
  bestSellers: SmartProduct[];
  products: SmartProduct[];
  categories: SmartCategory[];
  generatedAt: string;
}

const riskClass = {
  OUT_OF_STOCK: 'bg-rose-50 text-rose-700 border-rose-200',
  REORDER_SOON: 'bg-amber-50 text-amber-700 border-amber-200',
  SLOW_MOVING: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  HEALTHY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const riskLabel = {
  OUT_OF_STOCK: 'Out',
  REORDER_SOON: 'Reorder',
  SLOW_MOVING: 'Watch',
  HEALTHY: 'Healthy',
};

export const ReportsPage: React.FC = () => {
  const smartQuery = useQuery({
    queryKey: queryKeys.reports.smart(),
    queryFn: () => apiClient<{ data: SmartReport }>('/api/reports/smart'),
  });

  const report = smartQuery.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Smart Report</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Automatic stock prediction, best sellers, reorder advice, and category totals.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => smartQuery.refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {smartQuery.isLoading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : smartQuery.isError ? (
        <ErrorState
          title="Could not load smart report."
          message={smartQuery.error.message}
          onRetry={() => smartQuery.refetch()}
        />
      ) : !report || report.products.length === 0 ? (
        <EmptyState
          title="No report data yet."
          description="Add categories, products, and delivery-out entries to generate smart predictions."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Products</p>
                <Boxes className="w-4 h-4 text-brand-600" />
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">{report.summary.productCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Predicted 30-Day Sales</p>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {report.summary.predicted30DaySales}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Need Reorder</p>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {report.summary.reorderProducts}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Profit</p>
                <Brain className="w-4 h-4 text-brand-600" />
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatINR(report.summary.profitPaise)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-1 bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-neutral-900">Best Sellers</h2>
              </div>
              <div className="divide-y divide-neutral-100">
                {report.bestSellers.length === 0 ? (
                  <div className="p-4 text-sm text-neutral-500">No sales history yet.</div>
                ) : (
                  report.bestSellers.map((product, index) => (
                    <div key={product.productId} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {index + 1}. {product.name}
                        </p>
                        <p className="text-xs text-neutral-500">{product.categoryName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">{product.soldUnits}</p>
                        <p className="text-[11px] text-neutral-400">sold</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="xl:col-span-2 bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <h2 className="text-sm font-bold text-neutral-900">Category Report</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                    <tr>
                      <th className="px-4 py-3">S. No.</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3 text-right">Products</th>
                      <th className="px-3 py-3 text-right">Stock</th>
                      <th className="px-3 py-3 text-right">Sold</th>
                      <th className="px-3 py-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {report.categories.map((category) => (
                      <tr key={`${category.serialNumber}-${category.categoryName}`}>
                        <td className="px-4 py-3 font-bold tabular-nums">
                          {category.serialNumber || '—'}
                        </td>
                        <td className="px-3 py-3 font-semibold">{category.categoryName}</td>
                        <td className="px-3 py-3 text-right">{category.productCount}</td>
                        <td className="px-3 py-3 text-right">{category.stockUnits}</td>
                        <td className="px-3 py-3 text-right">{category.soldUnits}</td>
                        <td className="px-3 py-3 text-right font-bold">
                          {formatINR(category.profitPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100">
              <h2 className="text-sm font-bold text-neutral-900">Product Intelligence</h2>
              <p className="text-xs text-neutral-500">
                Forecast is based on delivery/sale movement history. More history means smarter predictions.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3 text-right">Stock</th>
                    <th className="px-3 py-3 text-right">Sold</th>
                    <th className="px-3 py-3 text-right">Next 30 Days</th>
                    <th className="px-3 py-3 text-right">Cover</th>
                    <th className="px-3 py-3 text-right">Reorder</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {report.products.map((product) => (
                    <tr key={product.productId} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{product.name}</td>
                      <td className="px-3 py-3 text-neutral-600">{product.categoryName}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {product.stockUnits}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{product.soldUnits}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {product.predicted30DaySales}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {product.daysOfStockCover === null
                          ? '—'
                          : `${product.daysOfStockCover} days`}
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {product.reorderSuggestion}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex border rounded-full px-2 py-0.5 text-[11px] font-semibold ${riskClass[product.risk]}`}
                        >
                          {riskLabel[product.risk]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{product.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400">
            Engine: {report.engine}. Python libraries detected: pandas{' '}
            {report.libraries.pandas ? 'yes' : 'no'}, numpy{' '}
            {report.libraries.numpy ? 'yes' : 'no'}.
          </p>
        </>
      )}
    </div>
  );
};
