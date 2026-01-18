// Amex-specific CSV parsing and credit extraction

import type { ParsedTransaction } from '../types/import';
import { parseCsv, parseDate, parseAmount } from './csvParser';

/**
 * Parse Amex CSV content into ParsedTransaction array
 */
export function parseAmexCsv(csvContent: string): ParsedTransaction[] {
  const rows = parseCsv(csvContent);

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateStr = row['Date'] ?? '';
    const date = parseDate(dateStr);
    if (!date) {
      continue;
    }

    const description = row['Description'] ?? '';
    const rawAmount = parseAmount(row['Amount'] ?? '0');
    const amount = rawAmount < 0 ? Math.abs(rawAmount) : rawAmount;

    transactions.push({
      date,
      description,
      amount,
      extendedDetails: row['Extended Details'],
      category: row['Category'],
      reference: row['Reference']?.replace(/'/g, ''),
    });
  }

  return transactions;
}

/**
 * Extract only credit transactions from Amex statement
 * Credits are:
 * - Negative amounts (reduce balance)
 * - Description contains "Credit" (to distinguish from payments)
 * - NOT payment transactions
 */
export function extractAmexCredits(
  transactions: ParsedTransaction[]
): ParsedTransaction[] {
  return transactions.filter((t) => {
    const descLower = t.description.toLowerCase();
    const detailsLower = t.extendedDetails?.toLowerCase() ?? '';
    const combinedText = `${descLower} ${detailsLower}`.trim();

    // Exclude payment transactions
    if (combinedText.includes('payment') || combinedText.includes('autopay')) {
      return false;
    }

    if (combinedText.includes('airline fee reimbursement')) {
      return true;
    }

    // Include if description contains "credit"
    if (combinedText.includes('credit')) {
      return true;
    }

    return false;
  });
}

/**
 * Convenience function to parse and extract credits in one step
 */
export function parseAmexCredits(csvContent: string): ParsedTransaction[] {
  const transactions = parseAmexCsv(csvContent);
  return extractAmexCredits(transactions);
}
