/**
 * Formats paise integer to Indian Rupee currency string
 * e.g., 24845000 paise -> ₹2,48,450.00
 */
export function formatINR(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return '₹0.00';
  }
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Converts rupees input to integer paise
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise to rupees
 */
export function paiseToRupees(paise: number | undefined | null): number {
  if (!paise || isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Formats quantity with unit
 * e.g. (100, 'pcs') -> '100 pcs'
 */
export function formatQuantity(quantity: number | undefined | null, unitType: string = 'pcs'): string {
  const qty = quantity ?? 0;
  return `${new Intl.NumberFormat('en-IN').format(qty)} ${unitType}`;
}
