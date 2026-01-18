import type {
  BenefitDefinition,
  BenefitPeriodUserState,
  BenefitUserState,
} from '../../../shared/types';
import {
  getUserBenefitsData,
  saveUserBenefitsData,
} from '../hooks/useUserBenefitsStore';

// Re-export for convenience
export { getUserBenefitsData, saveUserBenefitsData } from '../hooks/useUserBenefitsStore';
export { useUserBenefitsStore } from '../hooks/useUserBenefitsStore';

export function getImportNote(cardId: string): string {
  const data = getUserBenefitsData();
  return data.importNotes?.[cardId] ?? '';
}

export function saveImportNote(cardId: string, note: string): void {
  const data = getUserBenefitsData();
  if (!data.importNotes) {
    data.importNotes = {};
  }
  data.importNotes[cardId] = note;
  saveUserBenefitsData(data);
}

export function getDefaultUserState(benefit: BenefitDefinition): BenefitUserState {
  const periodStates = benefit.periods?.reduce<Record<string, BenefitPeriodUserState>>(
    (acc, period) => {
      acc[period.id] = {};
      return acc;
    },
    {}
  );

  return {
    enrolled: !benefit.enrollmentRequired,
    ignored: false,
    periods: periodStates,
  };
}

export function updateUserState(
  benefitId: string,
  updates: Partial<BenefitUserState>
): BenefitUserState {
  const data = getUserBenefitsData();
  const existing = data.benefits[benefitId] ?? {
    enrolled: false,
    ignored: false,
  };

  const updated: BenefitUserState = {
    ...existing,
    ...updates,
    periods: updates.periods ?? existing.periods,
  };

  data.benefits[benefitId] = updated;
  saveUserBenefitsData(data);

  return updated;
}

export function importBenefitUsage(
  imports: Map<string, { periods?: Record<string, { usedAmount: number; transactions?: { date: string; description: string; amount: number }[] }>; transactions?: { date: string; description: string; amount: number }[] }>,
  benefitDefinitions: BenefitDefinition[]
): void {
  const data = getUserBenefitsData();

  // Create lookup for benefit definitions
  const benefitDefMap = new Map<string, BenefitDefinition>();
  for (const def of benefitDefinitions) {
    benefitDefMap.set(def.id, def);
  }

  for (const [benefitId, usage] of imports) {
    const benefitDef = benefitDefMap.get(benefitId);
    if (!benefitDef) continue;

    // Get existing state or create default
    const existing = data.benefits[benefitId] ?? getDefaultUserState(benefitDef);

    const periodTransactions = usage.periods
      ? Object.values(usage.periods).flatMap((period) => period.transactions ?? [])
      : [];

    const mergedTransactions = [...(usage.transactions ?? []), ...periodTransactions];

    if (mergedTransactions.length > 0) {
      existing.transactions = mergedTransactions;
    }

    if (usage.periods) {
      existing.periods = Object.fromEntries(
        Object.entries(usage.periods).map(([periodId, periodUsage]) => [
          periodId,
          { transactions: periodUsage.transactions ?? [] },
        ])
      );
    }

    data.benefits[benefitId] = existing;
  }

  saveUserBenefitsData(data);
}
