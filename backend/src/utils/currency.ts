/**
 * BrajMart Centralized Currency & Financial Utility
 * All internal money calculations MUST use integer paise.
 * 1 Rupee = 100 Paise.
 */

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  // Round to nearest integer to avoid JS floating point discrepancies
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number): number {
  if (!paise || isNaN(paise)) return 0;
  return paise / 100;
}

export function formatINR(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
