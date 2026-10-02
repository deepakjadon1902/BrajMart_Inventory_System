import React, { useEffect } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  AlertTriangle,
  Calculator,
  Save,
  Info,
} from 'lucide-react';
import { UNIT_TYPES, Category, Product } from '../types/index.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Button } from '../components/ui/Button.js';
import { useToast } from '../hooks/useToast.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatINR, paiseToRupees } from '../utils/currency.js';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  sku: z.string().trim().max(50).optional(),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.string().min(1, 'Please select a category'),
  unitType: z.enum(UNIT_TYPES),
  openingQuantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').default(0),
  costPerUnit: z.coerce.number().min(0, 'Cost price cannot be negative'),
  sellingPricePerUnit: z.coerce.number().min(0, 'Selling price cannot be negative'),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level cannot be negative').default(10),
  reason: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Query: Existing Product (if edit mode)
  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id || ''),
    queryFn: () => apiClient<{ data: Product }>(`/api/products/${id}`),
    enabled: isEdit,
  });

  // Query: Categories
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => apiClient<{ data: Category[] }>('/api/categories'),
  });

  const categories = categoriesQuery.data?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      unitType: 'pcs',
      openingQuantity: 0,
      costPerUnit: 0,
      sellingPricePerUnit: 0,
      reorderLevel: 10,
    },
  });

  // Watch fields for live financial preview
  const watchedQty = watch('openingQuantity') || 0;
  const watchedCost = watch('costPerUnit') || 0;
  const watchedSell = watch('sellingPricePerUnit') || 0;
  const watchedUnit = watch('unitType') || 'pcs';

  // Populate form if edit mode
  useEffect(() => {
    if (productQuery.data?.data) {
      const p = productQuery.data.data;
      const catId = typeof p.categoryId === 'object' ? p.categoryId._id : p.categoryId;
      reset({
        name: p.name,
        sku: p.sku,
        description: p.description || '',
        categoryId: catId,
        unitType: p.unitType,
        openingQuantity: p.currentQuantity,
        costPerUnit: paiseToRupees(p.costPerUnitPaise),
        sellingPricePerUnit: paiseToRupees(p.sellingPricePerUnitPaise),
        reorderLevel: p.reorderLevel,
      });
    }
  }, [productQuery.data, reset]);

  // Unsaved changes listener (Rule #73)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Live financial preview calculations
  const previewQuantity = isEdit ? productQuery.data?.data.currentQuantity ?? 0 : watchedQty;
  const previewCostPaise = Math.round(previewQuantity * (watchedCost * 100));
  const previewSellingPaise = Math.round(previewQuantity * (watchedSell * 100));
  const previewProfitPaise = previewSellingPaise - previewCostPaise;
  const previewMargin =
    previewSellingPaise > 0
      ? Number(((previewProfitPaise / previewSellingPaise) * 100).toFixed(1))
      : 0;

  const isSellingBelowCost = watchedSell > 0 && watchedSell < watchedCost;

  // Mutation: Create or Update
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEdit) {
        return apiClient(`/api/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        return apiClient('/api/products', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: (res: any) => {
      const saved = res.data;
      success(
        isEdit
          ? `Product "${saved.name}" updated successfully.`
          : `Product "${saved.name}" created successfully with opening stock.`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/inventory/${saved._id}`);
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save product');
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <NavLink
          to="/inventory"
          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </NavLink>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className="text-xs text-neutral-500">
            {isEdit
              ? 'Update product details and prices'
              : 'Enter product stock, cost, and selling price'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Basic Information */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                Basic Information
              </h2>

              <Input
                label="Product Name"
                required
                {...register('name')}
                placeholder="Enter product name"
                error={errors.name?.message}
              />

              {isEdit && (
                <Input
                  label="Product Code"
                  {...register('sku')}
                  placeholder="Auto generated"
                  error={errors.sku?.message}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Category"
                  required
                  {...register('categoryId')}
                  error={errors.categoryId?.message}
                  options={[
                    { label: 'Select a category...', value: '' },
                    ...categories.map((c) => ({ label: c.name, value: c._id })),
                  ]}
                />

                <Select
                  label="Unit"
                  required
                  {...register('unitType')}
                  error={errors.unitType?.message}
                  options={UNIT_TYPES.map((u) => ({ label: u, value: u }))}
                />
              </div>

              <div className="space-y-1.5 hidden">
                <label className="block text-xs font-medium text-neutral-700">
                  Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Optional details, dimensions, material or source notes..."
                />
              </div>
            </div>

            {/* Section 2: Inventory Stock Parameters */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                Stock
              </h2>

              {isEdit ? (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900">
                      Current Stock:{' '}
                      {productQuery.data?.data.currentQuantity}{' '}
                      {productQuery.data?.data.unitType}
                    </span>
                    <p className="mt-0.5 text-neutral-500">
                      Use Add Stock or Delivery Out from the inventory table to change stock.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Opening Stock"
                    type="number"
                    min="0"
                    {...register('openingQuantity')}
                    suffixText={watchedUnit}
                    helperText="Quantity currently in shop"
                    error={errors.openingQuantity?.message}
                  />

                  <Input
                    label="Low Stock Alert"
                    type="number"
                    min="0"
                    {...register('reorderLevel')}
                    suffixText={watchedUnit}
                    helperText="Warn when stock is low"
                    error={errors.reorderLevel?.message}
                  />
                </div>
              )}

              {isEdit && (
                <Input
                  label="Low Stock Alert"
                  type="number"
                  min="0"
                  {...register('reorderLevel')}
                  suffixText={watchedUnit}
                  helperText="Warn when stock is low"
                  error={errors.reorderLevel?.message}
                />
              )}
            </div>

            {/* Section 3: Pricing */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2">
                Price
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Cost to Company"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  prefixText="₹"
                  {...register('costPerUnit')}
                  helperText="Your cost per unit"
                  error={errors.costPerUnit?.message}
                />

                <Input
                  label="Selling Price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  prefixText="₹"
                  {...register('sellingPricePerUnit')}
                  helperText="Customer price per unit"
                  error={errors.sellingPricePerUnit?.message}
                />
              </div>

              {/* Rule #36: Selling price below cost warning */}
              {isSellingBelowCost && (
                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Selling price is below cost.</span>
                    <p className="mt-0.5 text-amber-700">Please review before saving.</p>
                  </div>
                </div>
              )}

              {isEdit && (
                <Input
                  label="Reason for price change"
                  {...register('reason')}
                  placeholder="e.g. Supplier price revision / festive promotion"
                />
              )}
            </div>
          </div>

          {/* Right Column: Live Calculation Preview (Rule #34, #68) */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center gap-2 text-neutral-900 font-bold text-sm border-b border-neutral-100 pb-3">
                <Calculator className="w-4 h-4 text-brand-600" />
                Auto Calculation
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Stock:</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {previewQuantity} {watchedUnit}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>Cost:</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    ₹{Number(watchedCost || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>Selling:</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    ₹{Number(watchedSell || 0).toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-neutral-100 pt-2 flex justify-between font-medium">
                  <span className="text-neutral-700">Total Cost:</span>
                  <span className="text-neutral-900 font-bold tabular-nums">
                    {formatINR(previewCostPaise)}
                  </span>
                </div>

                <div className="flex justify-between font-medium">
                  <span className="text-neutral-700">Selling Total:</span>
                  <span className="text-emerald-700 font-bold tabular-nums">
                    {formatINR(previewSellingPaise)}
                  </span>
                </div>

                <div className="border-t border-neutral-100 pt-2 flex justify-between font-medium">
                  <span className="text-neutral-700">Profit:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      previewProfitPaise >= 0 ? 'text-neutral-900' : 'text-rose-600'
                    }`}
                  >
                    {formatINR(previewProfitPaise)}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>Margin:</span>
                  <span className="font-semibold tabular-nums text-neutral-700">
                    {previewMargin}%
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={mutation.isPending}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  {isEdit ? 'Save Changes' : 'Create Product'}
                </Button>

                <NavLink to="/inventory" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
