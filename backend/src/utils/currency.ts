/**
 * PayFlow Currency Utilities
 *
 * All monetary amounts in PayFlow are strictly stored and computed as integer Paise (1 INR = 100 Paise).
 * Floating point operations are strictly prohibited for financial calculations.
 */

export const MAX_SAFE_TRANSFER_PAISE = 100_00_000_00; // ₹1,00,00,000 (1 Crore INR = 100M Paise)
export const MIN_TRANSFER_PAISE = 100; // ₹1.00 (100 Paise minimum)

/**
 * Validates that an amount is a strictly positive integer within permitted fintech bounds.
 */
export function isValidPaiseAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    amount >= MIN_TRANSFER_PAISE &&
    amount <= MAX_SAFE_TRANSFER_PAISE
  );
}

/**
 * Converts INR (e.g. from user input) to integer paise safely using rounding to avoid IEEE 754 precision issues.
 */
export function inrToPaise(inrAmount: number): number {
  if (typeof inrAmount !== 'number' || isNaN(inrAmount) || inrAmount <= 0) {
    throw new Error('Invalid INR amount provided for conversion');
  }
  return Math.round(inrAmount * 100);
}

/**
 * Converts integer paise to INR decimal.
 */
export function paiseToInr(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new Error('Paise must be an integer');
  }
  return paise / 100;
}

/**
 * Formats integer paise into a standard Indian Rupee string (e.g. "₹1,234.50").
 */
export function formatPaiseToINR(paise: number): string {
  const inr = paiseToInr(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(inr);
}

