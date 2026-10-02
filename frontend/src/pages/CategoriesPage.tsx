import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderTree, RefreshCw, Edit2 } from 'lucide-react';
import { Category } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { TableSkeleton } from '../components/ui/LoadingSkeleton.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { useToast } from '../hooks/useToast.js';
import { apiClient } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { formatDate } from '../utils/dates.js';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [serialNumber, setSerialNumber] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => apiClient<{ data: Category[] }>('/api/categories?includeInactive=true'),
  });

  const categories = categoriesQuery.data?.data || [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Category name is required');
      const payload = {
        serialNumber: serialNumber === '' ? undefined : serialNumber,
        name: name.trim(),
        description: description.trim() || undefined,
      };
      if (editingCategory) {
        return apiClient(`/api/categories/${editingCategory._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        return apiClient('/api/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      success(
        editingCategory
          ? `Category updated successfully.`
          : `Category created successfully.`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() });
      handleCloseModal();
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save category');
      setErrorMsg(err.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setSerialNumber('');
    setName('');
    setDescription('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setSerialNumber(cat.serialNumber || '');
    setName(cat.name);
    setDescription(cat.description || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setSerialNumber('');
    setName('');
    setDescription('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Category name is required');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Categories
          </h1>
          <p className="mt-1 text-xs md:text-sm text-neutral-500 font-normal">
            Add numbered categories, then add products inside them.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => categoriesQuery.refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      {categoriesQuery.isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : categoriesQuery.isError ? (
        <ErrorState
          title="Could not load categories."
          message={categoriesQuery.error.message}
          onRetry={() => categoriesQuery.refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories defined."
          description="Create your first category to organize real inventory items."
          actionLabel="Add Category"
          onAction={handleOpenCreate}
          icon={<FolderTree className="w-7 h-7" />}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-neutral-600 font-semibold select-none">
                <th className="py-3.5 px-4 w-24">S. No.</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold tabular-nums text-neutral-900">
                    {cat.serialNumber || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-neutral-900">
                    {cat.name}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-600 max-w-sm truncate">
                    {cat.description || '—'}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        cat.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-500 whitespace-nowrap">
                    {formatDate(cat.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        description="Use a serial number to keep categories in your preferred order"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Serial Number"
            type="number"
            min="1"
            value={serialNumber}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : Number(e.target.value);
              setSerialNumber(Number.isNaN(value as number) ? '' : value);
              setErrorMsg('');
            }}
            placeholder="Auto if blank"
            helperText="Example: 1, 2, 3..."
          />

          <Input
            label="Category Name"
            required
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrorMsg('');
            }}
            placeholder="Enter category name"
            error={errorMsg}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-700">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Optional notes for this category"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={mutation.isPending}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
