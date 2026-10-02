import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../types/index.js';
import { Modal } from '../../components/ui/Modal.js';
import { Button } from '../../components/ui/Button.js';
import { useToast } from '../../hooks/useToast.js';
import { apiClient } from '../../api/client.js';
import { queryKeys } from '../../api/queryKeys.js';
import { Archive } from 'lucide-react';

interface ArchiveModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const isArchived = product?.isArchived;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      const endpoint = isArchived
        ? `/api/products/${product._id}/restore`
        : `/api/products/${product._id}/archive`;
      return apiClient(endpoint, { method: 'POST' });
    },
    onSuccess: () => {
      success(
        isArchived
          ? `Product "${product?.name}" restored to active inventory.`
          : `Product "${product?.name}" archived successfully.`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      onClose();
    },
    onError: (err: any) => {
      error(err.message || 'Operation failed');
    },
  });

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArchived ? 'Restore Product' : 'Archive Product'}
      description={
        isArchived
          ? `Restore ${product.name} back to active inventory lists.`
          : `Archive ${product.name} from active inventory.`
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <Archive className="w-4 h-4 text-amber-700" />
            Audit & Historical Preservation
          </div>
          {isArchived
            ? 'Restoring this product will make it visible in active catalog views and stock calculations.'
            : 'Archiving hides this product from standard inventory views, but all historical stock transactions and financial records remain permanently preserved in MongoDB.'}
        </div>

        <div className="p-3 bg-neutral-50 rounded-xl text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">Product Name:</span>
            <span className="font-semibold text-neutral-800">{product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">SKU:</span>
            <span className="font-mono text-neutral-800">{product.sku}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Current Stock:</span>
            <span className="font-semibold text-neutral-800">
              {product.currentQuantity} {product.unitType}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isArchived ? 'primary' : 'destructive'}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {isArchived ? 'Restore Product' : 'Confirm Archive'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
