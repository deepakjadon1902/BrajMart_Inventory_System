import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../types/index.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { useToast } from '../../hooks/useToast.js';
import { apiClient } from '../../api/client.js';
import { queryKeys } from '../../api/queryKeys.js';
import { ArrowDownLeft } from 'lucide-react';

interface StockInModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const currentQty = product?.currentQuantity ?? 0;
  const addQty = typeof quantity === 'number' ? quantity : 0;
  const newQty = currentQty + addQty;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      if (!addQty || addQty <= 0) {
        throw new Error('Please enter a valid quantity greater than 0');
      }
      return apiClient(`/api/products/${product._id}/stock-in`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: addQty,
          reason: reason.trim() || undefined,
          reference: reference.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      success(`Successfully added ${addQty} ${product?.unitType || 'pcs'} to ${product?.name}`);
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
      error(err.message || 'Failed to add stock');
      setErrorMsg(err.message);
    },
  });

  const handleClose = () => {
    setQuantity('');
    setReason('');
    setReference('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQty || addQty <= 0) {
      setErrorMsg('Quantity to add must be at least 1');
      return;
    }
    mutation.mutate();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Stock"
      description={`Add new stock for ${product.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Snapshot Info */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs space-y-1.5">
          <div className="flex justify-between text-neutral-600">
            <span>Product:</span>
            <span className="font-semibold text-neutral-900">{product.name}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Current Stock:</span>
            <span className="font-bold text-neutral-900">
              {currentQty} {product.unitType}
            </span>
          </div>
        </div>

        <Input
          label="Add Quantity"
          type="number"
          min="1"
          required
          autoFocus
          value={quantity}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
            setQuantity(isNaN(val as number) ? '' : val);
            setErrorMsg('');
          }}
          placeholder="e.g. 20"
          suffixText={product.unitType}
          error={errorMsg}
        />

        {/* Live Calculation Preview */}
        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/70 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-emerald-800">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Stock After Add:</span>
          </div>
          <span className="font-bold text-emerald-900 tabular-nums">
            {newQty} {product.unitType}
          </span>
        </div>

        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Purchase, return, or note"
        />

        <Input
          label="Invoice No. / Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. INV-1042 / PO-883"
        />

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={!addQty || addQty <= 0}
          >
            Add Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};
