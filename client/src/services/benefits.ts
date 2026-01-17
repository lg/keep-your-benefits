import type {
  Benefit,
  BenefitDefinition,
  BenefitPeriod,
  BenefitPeriodDefinition,
  BenefitPeriodUserState,
  BenefitUserState,
  CreditCard,
  Stats,
  UpdateBenefitRequest,
} from '../../../shared/types';
import { api } from '../api/client';
import {
  getDefaultUserState,
  getUserBenefitsData,
  updateUserState,
} from '../storage/userBenefits';

function mergePeriods(
  periods: BenefitPeriodDefinition[] | undefined,
  userPeriods: Record<string, BenefitPeriodUserState> | undefined
): BenefitPeriod[] | undefined {
  if (!periods?.length) {
    return undefined;
  }

  return periods.map((period) => {
    const userPeriod = userPeriods?.[period.id];
    const transactions = userPeriod?.transactions ?? [];
    const usedAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return {
      ...period,
      usedAmount,
      status: userPeriod?.status ?? 'pending',
      transactions,
    };
  });
}

function mergeBenefit(
  definition: BenefitDefinition,
  userState?: BenefitUserState
): Benefit {
  const resolvedUserState = userState ?? getDefaultUserState(definition);
  const mergedPeriods = mergePeriods(definition.periods, resolvedUserState.periods);

  // For multi-period benefits, currentUsed is the sum of all period amounts
  // For single-period benefits, derive from transactions
  const currentUsed = mergedPeriods?.length
    ? mergedPeriods.reduce((sum, p) => sum + p.usedAmount, 0)
    : (resolvedUserState.transactions?.reduce((sum, tx) => sum + tx.amount, 0) ?? resolvedUserState.currentUsed);

  return {
    ...definition,
    ...resolvedUserState,
    currentUsed,
    periods: mergedPeriods,
    transactions: resolvedUserState.transactions,
  };
}

export async function getCards(): Promise<CreditCard[]> {
  return api.getCards();
}

export async function getBenefits(
  cardId?: string,
  includeIgnored?: boolean
): Promise<Benefit[]> {
  const definitions = await api.getBenefitDefinitions(cardId);
  const userData = getUserBenefitsData();

  const merged = definitions.map((def) =>
    mergeBenefit(def, userData.benefits[def.id])
  );

  if (includeIgnored) {
    return merged;
  }

  return merged.filter((b) => !b.ignored);
}

export async function getBenefit(id: string): Promise<Benefit | undefined> {
  const definitions = await api.getBenefitDefinitions();
  const definition = definitions.find((d) => d.id === id);

  if (!definition) {
    return undefined;
  }

  const userData = getUserBenefitsData();
  return mergeBenefit(definition, userData.benefits[id]);
}

export function updateBenefit(
  id: string,
  definition: BenefitDefinition,
  updates: UpdateBenefitRequest
): Benefit {
  const userStateUpdates: Partial<BenefitUserState> = {};

  if (updates.status !== undefined) {
    userStateUpdates.status = updates.status;
  }
  if (updates.ignored !== undefined) {
    userStateUpdates.ignored = updates.ignored;
  }

  const updatedState = updateUserState(id, userStateUpdates);
  return mergeBenefit(definition, updatedState);
}

export function toggleActivation(
  id: string,
  definition: BenefitDefinition
): Benefit {
  const userData = getUserBenefitsData();
  const existing = userData.benefits[id];
  const currentValue = existing?.activationAcknowledged ?? false;

  const updatedState = updateUserState(id, {
    activationAcknowledged: !currentValue,
  });

  return mergeBenefit(definition, updatedState);
}

export async function getUpcomingExpirations(
  days: number = 30,
  includeIgnored?: boolean
): Promise<Benefit[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  let benefits = await getBenefits(undefined, true);

  benefits = benefits.filter((benefit) => {
    const endDate = new Date(benefit.endDate);
    return endDate > now && endDate <= cutoff && benefit.status === 'pending';
  });

  if (!includeIgnored) {
    benefits = benefits.filter((b) => !b.ignored);
  }

  return benefits.sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  );
}

export async function getStats(): Promise<Stats> {
  const benefits = await getBenefits(undefined, false);

  return {
    totalBenefits: benefits.length,
    totalValue: benefits.reduce((sum, b) => sum + b.creditAmount, 0),
    usedValue: benefits.reduce((sum, b) => sum + b.currentUsed, 0),
    completedCount: benefits.filter((b) => b.status === 'completed').length,
    pendingCount: benefits.filter((b) => b.status === 'pending').length,
    missedCount: benefits.filter((b) => b.status === 'missed').length,
  };
}
