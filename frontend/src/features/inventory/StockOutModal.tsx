import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../types/index.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Button } from '../../components/ui/Button.js';
import { useToast } from '../../hooks/useToast.js';
import { apiClient } from '../../api/client.js';
import { queryKeys } from '../../api/queryKeys.js';
import { formatINR } from '../../utils/currency.js';
import { ArrowUpRight } from 'lucide-react';

interface StockOutModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [quantity, setQuantity] = useState<number | ''>('');
  const [type, setType] = useState<'STOCK_OUT' | 'SALE' | 'DAMAGED' | 'LOST'>('STOCK_OUT');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const currentQty = product?.currentQuantity ?? 0;
  const removeQty = typeof quantity === 'number' ? quantity : 0;
  const remainingQty = Math.max(0, currentQty - removeQty);
  const remainingCostPaise = product ? remainingQty * product.costPerUnitPaise : 0;
  const remainingSellingPaise = product ? remainingQty * product.sellingPricePerUnitPaise : 0;
  const remainingProfitPaise = remainingSellingPaise - remainingCostPaise;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      if (!removeQty || removeQty <= 0) {
        throw new Error('Please enter a valid quantity greater than 0');
      }
      if (removeQty > currentQty) {
        throw new Error(
          `Unable to reduce stock. Only ${currentQty} ${product.unitType} available.`
        );
      }
      return apiClient(`/api/products/${product._id}/stock-out`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: removeQty,
          type,
          reason: reason.trim() || undefined,
          reference: reference.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      success(`Delivery out saved. ${product?.name} stock is now ${remainingQty} ${product?.unitType || 'pcs'}.`);
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
      error(err.message || 'Failed to reduce stock');
      setErrorMsg(err.message);
    },
  });

  const handleClose = () => {
    setQuantity('');
    setType('STOCK_OUT');
    setReason('');
    setReference('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeQty || removeQty <= 0) {
      setErrorMsg('Quantity to remove must be at least 1');
      return;
    }
    if (removeQty > currentQty) {
      setErrorMsg(`Cannot remove more than available stock (${currentQty} ${product?.unitType})`);
      return;
    }
    mutation.mutate();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delivery Out"
      description={`Minus delivered quantity from ${product.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Snapshot Info */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs space-y-1.5">
          <div className="flex justify-between text-neutral-600">
            <span>Product:</span>
            <span className="font-semibold text-neutral-900">{product.name}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Available Stock:</span>
            <span className="font-bold text-neutral-900">
              {currentQty} {product.unitType}
            </span>
          </div>
        </div>

        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          options={[
            { label: 'Delivery / Stock Out', value: 'STOCK_OUT' },
            { label: 'Sale / Order dispatch', value: 'SALE' },
            { label: 'Damaged', value: 'DAMAGED' },
            { label: 'Lost / Discrepancy', value: 'LOST' },
          ]}
        />

        <Input
          label="Delivery Quantity"
          type="number"
          min="1"
          max={currentQty}
          required
          autoFocus
          value={quantity}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
            setQuantity(isNaN(val as number) ? '' : val);
            setErrorMsg('');
          }}
          placeholder={`1 to ${currentQty}`}
          suffixText={product.unitType}
          error={errorMsg}
        />

        {/* Live Calculation Preview */}
        <div className="p-3.5 bg-neutral-100 rounded-xl border border-neutral-200 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-800">
              <ArrowUpRight className="w-4 h-4 text-neutral-600" />
              <span className="font-medium">Stock After Delivery:</span>
            </div>
            <span className="font-bold text-neutral-900 tabular-nums">
              {remainingQty} {product.unitType}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-neutral-500">Total Cost</p>
              <p className="font-semibold tabular-nums">{formatINR(remainingCostPaise)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Selling Total</p>
              <p className="font-semibold tabular-nums">{formatINR(remainingSellingPaise)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Profit</p>
              <p className="font-semibold tabular-nums">{formatINR(remainingProfitPaise)}</p>
            </div>
          </div>
        </div>

        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Delivery, order, or note"
        />

        <Input
          label="Order No. / Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. ORD-5542 / DISP-109"
        />

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            isLoading={mutation.isPending}
            disabled={!removeQty || removeQty <= 0 || removeQty > currentQty}
          >
            Save Delivery Out
          </Button>
        </div>
      </form>
    </Modal>
  );
};
