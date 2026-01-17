import type {
  Benefit,
  BenefitDefinition,
  BenefitPeriod,
  BenefitPeriodDefinition,
  BenefitPeriodUserState,
  BenefitUserState,
  Stats,
  UpdateBenefitRequest,
} from '../../../shared/types';
import { calculateStats } from '../../../shared/utils';
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

export async function getStats(): Promise<Stats> {
  const benefits = await getBenefits(undefined, false);
  const cardStats = calculateStats(benefits);

  return {
    totalBenefits: benefits.length,
    totalValue: cardStats.totalValue,
    usedValue: cardStats.usedValue,
    currentPeriodCompletedCount: cardStats.currentPeriodCompletedCount,
    ytdCompletedPeriods: cardStats.ytdCompletedPeriods,
    ytdTotalPeriods: cardStats.ytdTotalPeriods,
    pendingCount: cardStats.pendingCount,
    missedCount: cardStats.missedCount,
  };
}
