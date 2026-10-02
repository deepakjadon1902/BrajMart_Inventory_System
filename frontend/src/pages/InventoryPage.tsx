import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Edit, Plus, RefreshCw } from 'lucide-react';
import { Product, Category } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { SearchInput } from '../components/ui/SearchInput.js';
import { TableSkeleton } from '../components/ui/LoadingSkeleton.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { StockInModal } from '../features/inventory/StockInModal.js';
import { StockOutModal } from '../features/inventory/StockOutModal.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatINR } from '../utils/currency.js';

export const InventoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalType, setModalType] = useState<'stockIn' | 'stockOut' | null>(null);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => apiClient<{ data: Category[] }>('/api/categories'),
  });

  const queryParams = new URLSearchParams({
    page: '1',
    limit: '100',
    sortBy: 'name',
    sortOrder: 'asc',
    ...(search ? { search } : {}),
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(Object.fromEntries(queryParams)),
    queryFn: () =>
      apiClient<{
        data: Product[];
        pagination: { page: number; limit: number; total: number; pages: number };
      }>(`/api/products?${queryParams.toString()}`),
  });

  const categories = categoriesQuery.data?.data || [];
  const products = productsQuery.data?.data || [];

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const aCategory = typeof a.categoryId === 'object' ? a.categoryId : undefined;
        const bCategory = typeof b.categoryId === 'object' ? b.categoryId : undefined;
        const serialA = aCategory?.serialNumber ?? 999999;
        const serialB = bCategory?.serialNumber ?? 999999;
        if (serialA !== serialB) return serialA - serialB;
        return a.name.localeCompare(b.name);
      }),
    [products]
  );

  const totals = useMemo(
    () =>
      sortedProducts.reduce(
        (sum, product) => ({
          units: sum.units + product.currentQuantity,
          cost: sum.cost + product.inventoryCostPaise,
          selling: sum.selling + product.sellingValuePaise,
          profit: sum.profit + product.potentialProfitPaise,
        }),
        { units: 0, cost: 0, selling: 0, profit: 0 }
      ),
    [sortedProducts]
  );

  const openStock = (type: 'stockIn' | 'stockOut', product: Product) => {
    setActiveProduct(product);
    setModalType(type);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Add products, reduce stock for delivery, and totals update automatically.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => productsQuery.refetch()}
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
          <p className="text-xs text-neutral-500">Total Units</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{totals.units}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
          <p className="text-xs text-neutral-500">Total Cost</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatINR(totals.cost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
          <p className="text-xs text-neutral-500">Selling Total</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatINR(totals.selling)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-4">
          <p className="text-xs text-neutral-500">Profit</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatINR(totals.profit)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200/80 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search product name..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="w-full text-sm bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.serialNumber ? `${category.serialNumber}. ` : ''}
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {productsQuery.isLoading ? (
        <TableSkeleton rows={8} columns={10} />
      ) : productsQuery.isError ? (
        <ErrorState
          title="Could not load inventory."
          message={productsQuery.error.message}
          onRetry={() => productsQuery.refetch()}
        />
      ) : sortedProducts.length === 0 ? (
        <EmptyState
          title="No products yet."
          description="Create a category, add products, then use Delivery Out when stock leaves."
          actionLabel="Add Product"
          onAction={() => (window.location.href = '/inventory/new')}
        />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 w-16">S. No.</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Stock</th>
                  <th className="px-3 py-3 text-right">Cost to Company</th>
                  <th className="px-3 py-3 text-right">Total Cost</th>
                  <th className="px-3 py-3 text-right">Selling Price</th>
                  <th className="px-3 py-3 text-right">Selling Total</th>
                  <th className="px-3 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sortedProducts.map((product) => {
                  const category =
                    typeof product.categoryId === 'object' ? product.categoryId : undefined;
                  return (
                    <tr key={product._id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3 font-bold tabular-nums">
                        {category?.serialNumber || '—'}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {category?.name || 'Uncategorized'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-neutral-900">
                        <NavLink to={`/inventory/${product._id}`} className="hover:text-brand-700">
                          {product.name}
                        </NavLink>
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {product.currentQuantity} {product.unitType}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatINR(product.costPerUnitPaise)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {formatINR(product.inventoryCostPaise)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatINR(product.sellingPricePerUnitPaise)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-800">
                        {formatINR(product.sellingValuePaise)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {formatINR(product.potentialProfitPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Add stock"
                            onClick={() => openStock('stockIn', product)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>
                          <button
                            title="Delivery out"
                            onClick={() => openStock('stockOut', product)}
                            className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <NavLink
                            title="Edit product"
                            to={`/inventory/${product._id}/edit`}
                            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
                          >
                            <Edit className="w-4 h-4" />
                          </NavLink>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StockInModal
        product={activeProduct}
        isOpen={modalType === 'stockIn'}
        onClose={() => {
          setModalType(null);
          setActiveProduct(null);
        }}
      />

      <StockOutModal
        product={activeProduct}
        isOpen={modalType === 'stockOut'}
        onClose={() => {
          setModalType(null);
          setActiveProduct(null);
        }}
      />
    </div>
  );
};
