// Chase-specific CSV parsing and credit extraction

import type { ParsedTransaction } from '../types/import';
import { parseCsv, parseDate, parseAmount } from './csvParser';

/**
 * Decode HTML entities commonly found in Chase CSV exports
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Parse Chase CSV content into ParsedTransaction array
 * Chase columns: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
 */
export function parseChaseCsv(csvContent: string): ParsedTransaction[] {
  const rows = parseCsv(csvContent);

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateStr = row['Transaction Date'] ?? '';
    const date = parseDate(dateStr);
    if (!date) {
      continue;
    }

    const description = decodeHtmlEntities(row['Description'] ?? '');
    const amount = parseAmount(row['Amount'] ?? '0');

    transactions.push({
      date,
      description,
      amount,
      category: row['Category'],
      // Store Type in extendedDetails for filtering
      extendedDetails: row['Type'],
    });
  }

  return transactions;
}

/**
 * Extract only credit transactions from Chase statement
 * Chase credits are POSITIVE amounts (opposite of Amex)
 * Exclude payments and returns
 */
export function extractChaseCredits(
  transactions: ParsedTransaction[]
): ParsedTransaction[] {
  return transactions.filter((t) => {
    // Credits are positive amounts in Chase
    if (t.amount <= 0) {
      return false;
    }

    const type = t.extendedDetails?.toLowerCase() ?? '';

    // Exclude payments
    if (type === 'payment') {
      return false;
    }

    // Exclude returns (refunds, not benefit credits)
    if (type === 'return') {
      return false;
    }

    // Adjustments are typically benefit credits
    return true;
  });
}

/**
 * Convenience function to parse and extract credits in one step
 */
export function parseChaseCredits(csvContent: string): ParsedTransaction[] {
  const transactions = parseChaseCsv(csvContent);
  return extractChaseCredits(transactions);
}
