/**
 * Currency formatting utilities
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₱0.00";
  }
  return `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₱0";
  }
  return `₱${amount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₱,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

