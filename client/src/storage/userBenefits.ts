import type {
  BenefitDefinition,
  BenefitPeriodUserState,
  BenefitUserState,
  UserBenefitsData,
} from '../../../shared/types';

const STORAGE_KEY = 'user-benefits';

export function getUserBenefitsData(): UserBenefitsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { benefits: {} };
    }
    const parsed = JSON.parse(stored) as UserBenefitsData;
    return { benefits: parsed.benefits ?? {} };
  } catch {
    return { benefits: {} };
  }
}

export function saveUserBenefitsData(data: UserBenefitsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDefaultUserState(benefit: BenefitDefinition): BenefitUserState {
  const periodStates = benefit.periods?.reduce<Record<string, BenefitPeriodUserState>>(
    (acc, period) => {
      acc[period.id] = {
        usedAmount: 0,
        status: 'pending',
      };
      return acc;
    },
    {}
  );

  return {
    currentUsed: 0,
    activationAcknowledged: !benefit.activationRequired,
    status: 'pending',
    ignored: false,
    periods: periodStates,
  };
}

export function getUserState(benefitId: string): BenefitUserState | undefined {
  const data = getUserBenefitsData();
  return data.benefits[benefitId];
}

export function updateUserState(
  benefitId: string,
  updates: Partial<BenefitUserState>
): BenefitUserState {
  const data = getUserBenefitsData();
  const existing = data.benefits[benefitId] ?? {
    currentUsed: 0,
    activationAcknowledged: false,
    status: 'pending' as const,
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

export function updatePeriodState(
  benefitId: string,
  periodId: string,
  updates: Partial<BenefitPeriodUserState>
): BenefitPeriodUserState {
  const data = getUserBenefitsData();
  const existing = data.benefits[benefitId] ?? {
    currentUsed: 0,
    activationAcknowledged: false,
    status: 'pending' as const,
    ignored: false,
    periods: {},
  };

  const existingPeriod = existing.periods?.[periodId] ?? {
    usedAmount: 0,
    status: 'pending' as const,
  };

  const updatedPeriod: BenefitPeriodUserState = {
    ...existingPeriod,
    ...updates,
  };

  data.benefits[benefitId] = {
    ...existing,
    periods: {
      ...existing.periods,
      [periodId]: updatedPeriod,
    },
  };

  saveUserBenefitsData(data);

  return updatedPeriod;
}

export function toggleActivation(benefitId: string): boolean {
  const data = getUserBenefitsData();
  const existing = data.benefits[benefitId];
  const currentValue = existing?.activationAcknowledged ?? false;
  const newValue = !currentValue;

  updateUserState(benefitId, { activationAcknowledged: newValue });

  return newValue;
}

export function clearAllUserData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
