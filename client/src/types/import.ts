// Types for CSV import functionality

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // Original amount (negative for credits in Amex)
  extendedDetails?: string;
  category?: string;
  reference?: string;
}

export interface MatchedCredit {
  transaction: ParsedTransaction;
  benefitId: string | null; // null if unmatched
  benefitName: string | null;
  periodId: string | null; // For period-based benefits
  creditAmount: number; // Positive value (absolute of negative amount)
  confidence: 'high' | 'low'; // How confident the match is
}

export interface ImportResult {
  matchedCredits: MatchedCredit[];
  unmatchedCredits: ParsedTransaction[];
  totalMatched: number;
  totalUnmatched: number;
}

export interface ImportUsage {
  currentUsed: number;
  periods?: Record<string, number>;
}

export type CardType = 'amex-platinum' | 'chase-sapphire-reserve';
