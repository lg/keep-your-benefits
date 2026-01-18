export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatAmount(amount: number): string {
  const formatted = `$${Math.abs(amount).toFixed(2)}`;
  return amount < 0 ? `-${formatted}` : formatted;
}
