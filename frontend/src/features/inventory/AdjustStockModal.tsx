import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../types/index.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { useToast } from '../../hooks/useToast.js';
import { apiClient } from '../../api/client.js';
import { queryKeys } from '../../api/queryKeys.js';
import { Scale } from 'lucide-react';

interface AdjustStockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [actualQuantity, setActualQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const currentQty = product?.currentQuantity ?? 0;
  const actualQtyNum = typeof actualQuantity === 'number' ? actualQuantity : currentQty;
  const difference = actualQtyNum - currentQty;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      if (typeof actualQuantity !== 'number' || actualQuantity < 0) {
        throw new Error('Please enter a valid actual quantity (0 or greater)');
      }
      if (!reason.trim()) {
        throw new Error('Please provide an adjustment reason');
      }
      return apiClient(`/api/products/${product._id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          actualQuantity,
          reason: reason.trim(),
          reference: reference.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      success(`Inventory adjusted for ${product?.name}: new stock is ${actualQuantity} ${product?.unitType}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (product) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(product._id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.products.history(product._id) });
      }
      handleClose();
    },
    onError: (err: any) => {
      error(err.message || 'Failed to adjust stock');
      setErrorMsg(err.message);
    },
  });

  const handleClose = () => {
    setActualQuantity('');
    setReason('');
    setReference('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof actualQuantity !== 'number' || actualQuantity < 0) {
      setErrorMsg('Please specify actual physical stock count');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Reason is required for inventory adjustments');
      return;
    }
    mutation.mutate();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Adjust Stock"
      description={`Reconcile physical stock count for ${product.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Stock */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs space-y-1.5">
          <div className="flex justify-between text-neutral-600">
            <span>Product:</span>
            <span className="font-semibold text-neutral-900">{product.name}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>System Stock Count:</span>
            <span className="font-bold text-neutral-900">
              {currentQty} {product.unitType}
            </span>
          </div>
        </div>

        <Input
          label="Actual Physical Stock Count"
          type="number"
          min="0"
          required
          autoFocus
          value={actualQuantity}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
            setActualQuantity(isNaN(val as number) ? '' : val);
            setErrorMsg('');
          }}
          placeholder="e.g. 47"
          suffixText={product.unitType}
          error={errorMsg}
        />

        {/* Live Calculation Preview of Difference */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-neutral-700">
            <Scale className="w-4 h-4 text-neutral-500" />
            <span className="font-medium">Adjustment Difference:</span>
          </div>
          <span
            className={`font-bold tabular-nums ${
              difference > 0
                ? 'text-emerald-700'
                : difference < 0
                ? 'text-rose-700'
                : 'text-neutral-700'
            }`}
          >
            {difference > 0 ? `+${difference}` : `${difference}`} {product.unitType}
          </span>
        </div>

        <Input
          label="Adjustment Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Physical stock audit correction / broken units found"
        />

        <Input
          label="Reference / Audit ID"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. AUDIT-2026-Q4 / COUNT-12"
        />

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={typeof actualQuantity !== 'number' || actualQuantity < 0}
          >
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
