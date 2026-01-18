import type {
  Benefit,
  BenefitDefinition,
  BenefitPeriod,
  BenefitPeriodDefinition,
  BenefitPeriodUserState,
  BenefitUserState,
  Stats,
  StoredTransaction,
  UpdateBenefitRequest,
} from '../../../shared/types';
import { calculateStats } from '../../../shared/utils';
import { api } from '../api/client';
import {
  getDefaultUserState,
  getUserBenefitsData,
  updateUserState,
} from '../storage/userBenefits';

function getUtcYearRange(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function alignDateToYear(dateString: string, year: number): Date {
  const date = new Date(dateString);
  return new Date(Date.UTC(
    year,
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));
}

function alignDefinitionToYear(definition: BenefitDefinition, year: number): BenefitDefinition {
  const startDate = alignDateToYear(definition.startDate, year).toISOString();
  const endDate = alignDateToYear(definition.endDate, year).toISOString();
  const periods = definition.periods?.map((period) => ({
    ...period,
    startDate: alignDateToYear(period.startDate, year).toISOString(),
    endDate: alignDateToYear(period.endDate, year).toISOString(),
  }));

  return {
    ...definition,
    startDate,
    endDate,
    periods,
  };
}

function filterTransactionsByYear(
  transactions: BenefitPeriodUserState['transactions'],
  year?: number
): StoredTransaction[] {
  if (!year) return transactions ?? [];
  const { start, end } = getUtcYearRange(year);
  return (transactions ?? []).filter((tx) => {
    const date = new Date(tx.date);
    return date >= start && date < end;
  });
}

function mergeTransactions(
  primary: StoredTransaction[] | undefined,
  secondary: StoredTransaction[] | undefined
): StoredTransaction[] {
  const merged = new Map<string, StoredTransaction>();
  for (const tx of primary ?? []) {
    merged.set(`${tx.date}-${tx.description}-${tx.amount}`, tx);
  }
  for (const tx of secondary ?? []) {
    const key = `${tx.date}-${tx.description}-${tx.amount}`;
    if (!merged.has(key)) {
      merged.set(key, tx);
    }
  }
  return Array.from(merged.values());
}

function combineTransactions(
  benefitTransactions: StoredTransaction[] | undefined,
  periodTransactions: Record<string, BenefitPeriodUserState> | undefined
): StoredTransaction[] {
  const merged = new Map<string, StoredTransaction>();

  for (const tx of benefitTransactions ?? []) {
    merged.set(`${tx.date}-${tx.description}-${tx.amount}`, tx);
  }

  if (periodTransactions) {
    for (const periodState of Object.values(periodTransactions)) {
      for (const tx of periodState.transactions ?? []) {
        const key = `${tx.date}-${tx.description}-${tx.amount}`;
        if (!merged.has(key)) {
          merged.set(key, tx);
        }
      }
    }
  }

  return Array.from(merged.values());
}

function transactionsInPeriod(
  transactions: StoredTransaction[] | undefined,
  period: BenefitPeriodDefinition
): StoredTransaction[] {
  if (!transactions?.length) return [];
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  return transactions.filter((tx) => {
    const date = new Date(tx.date);
    return date >= start && date <= end;
  });
}

function normalizePeriodsWithUsage(
  periods: BenefitPeriod[] | undefined,
  totalUsed: number,
  segmentValue: number
): BenefitPeriod[] | undefined {
  if (!periods || periods.length === 0) {
    return periods;
  }

  const hasAnyUsage = periods.some((period) => period.usedAmount > 0);
  if (hasAnyUsage || totalUsed <= 0) {
    return periods;
  }

  let remaining = totalUsed;
  const reversed = [...periods].reverse();
  const normalized = reversed.map((period) => {
    if (remaining <= 0) {
      return period;
    }
    const inferredUse = Math.min(segmentValue, remaining);
    remaining -= inferredUse;
    return {
      ...period,
      usedAmount: inferredUse,
      status: inferredUse >= segmentValue ? 'completed' : period.status,
    };
  });

  return normalized.reverse();
}

function getTransactionYears(state: BenefitUserState, definition: BenefitDefinition): number[] {
  const years = new Set<number>();

  if (definition.periods?.length) {
    for (const period of definition.periods) {
      const periodState = state.periods?.[period.id];
      if (!periodState?.transactions) continue;
      for (const tx of periodState.transactions) {
        years.add(new Date(tx.date).getUTCFullYear());
      }
    }
  }

  if (state.transactions?.length) {
    for (const tx of state.transactions) {
      years.add(new Date(tx.date).getUTCFullYear());
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

function getClaimedElsewhereYear(
  claimYears: number[],
  selectedYear: number | undefined,
  hasYearTransactions: boolean | undefined
): number | null {
  if (!selectedYear || hasYearTransactions) return null;
  const currentYear = new Date().getUTCFullYear();
  if (selectedYear >= currentYear) return null;
  const priorYear = claimYears
    .filter((year) => year < selectedYear)
    .sort((a, b) => b - a)[0];
  return priorYear ?? null;
}

function getReferenceDate(year?: number): Date {
  const now = new Date();
  if (!year) return now;
  const { start, end } = getUtcYearRange(year);
  if (year > now.getUTCFullYear()) return start;
  if (year < now.getUTCFullYear()) return end;
  return now;
}

function getYearStatus(
  baseStatus: BenefitUserState['status'],
  definition: BenefitDefinition,
  periods: BenefitPeriod[] | undefined,
  currentUsed: number,
  year?: number
): BenefitUserState['status'] {
  if (!year) return baseStatus;
  const { start, end } = getUtcYearRange(year);
  const referenceDate = getReferenceDate(year);

  if (periods && periods.length > 0) {
    const segmentValue = definition.creditAmount / periods.length;
    let pending = false;
    let missed = false;
    let completed = true;

    for (const period of periods) {
      const endDate = new Date(period.endDate);
      const isPast = referenceDate > endDate;
      const isComplete = period.usedAmount >= segmentValue;

      if (!isComplete && isPast) {
        missed = true;
      } else if (!isComplete) {
        pending = true;
      }

      if (!isComplete) {
        completed = false;
      }
    }

    if (completed) return 'completed';
    if (missed) return 'missed';
    if (pending) return 'pending';
  }

  const benefitStart = new Date(definition.startDate);
  const benefitEnd = new Date(definition.endDate);
  const inYear = benefitStart >= start && benefitEnd < end;
  if (!inYear) return baseStatus;

  if (currentUsed >= definition.creditAmount) return 'completed';
  if (referenceDate > benefitEnd) return 'missed';
  return 'pending';
}

function mergePeriods(
  periods: BenefitPeriodDefinition[] | undefined,
  userPeriods: Record<string, BenefitPeriodUserState> | undefined,
  benefitTransactions: StoredTransaction[] | undefined,
  year?: number
): BenefitPeriod[] | undefined {
  if (!periods?.length) {
    return undefined;
  }

  const yearTransactions = filterTransactionsByYear(benefitTransactions, year);

  return periods.map((period) => {
    const userPeriod = userPeriods?.[period.id];
    const periodTransactions = filterTransactionsByYear(userPeriod?.transactions ?? [], year);
    const fallbackTransactions = transactionsInPeriod(yearTransactions, period);
    const transactions = mergeTransactions(periodTransactions, fallbackTransactions);
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
  userState: BenefitUserState | undefined,
  year?: number
): Benefit {
  const resolvedUserState = userState ?? getDefaultUserState(definition);
  const effectiveDefinition = year ? alignDefinitionToYear(definition, year) : definition;
  const combinedTransactions = combineTransactions(resolvedUserState.transactions, resolvedUserState.periods);
  const mergedPeriods = mergePeriods(
    effectiveDefinition.periods,
    resolvedUserState.periods,
    combinedTransactions,
    year
  );
  const yearTransactions = filterTransactionsByYear(combinedTransactions, year);
  const claimYears = getTransactionYears(resolvedUserState, definition);
  const yearTransactionTotal = yearTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const currentYear = new Date().getUTCFullYear();
  const legacyYearTotal = year !== undefined && year < currentYear && claimYears.length === 0
    ? resolvedUserState.currentUsed
    : 0;

  const segmentValue = effectiveDefinition.periods?.length
    ? effectiveDefinition.creditAmount / effectiveDefinition.periods.length
    : effectiveDefinition.creditAmount;

  const yearTotalForNormalization = year !== undefined
    ? (yearTransactionTotal || legacyYearTotal)
    : resolvedUserState.currentUsed;
  const normalizedPeriods = normalizePeriodsWithUsage(
    mergedPeriods,
    yearTotalForNormalization,
    segmentValue
  );

  const hasYearTransactions = yearTransactions.length > 0
    || (normalizedPeriods?.some((period) => (period.transactions?.length ?? 0) > 0) ?? false);
  const claimedElsewhereYear = getClaimedElsewhereYear(claimYears, year, hasYearTransactions);

  const periodTotal = normalizedPeriods?.length
    ? normalizedPeriods.reduce((sum, period) => sum + period.usedAmount, 0)
    : 0;
  const yearUsed = normalizedPeriods?.length
    ? periodTotal
    : (yearTransactionTotal || legacyYearTotal);

  const rawStatus = getYearStatus(
    resolvedUserState.status,
    effectiveDefinition,
    normalizedPeriods,
    yearUsed,
    year
  );

  const adjustedPeriods = claimedElsewhereYear && normalizedPeriods?.length
    ? normalizedPeriods.map((period) => ({
        ...period,
        usedAmount: segmentValue,
        status: 'completed' as const,
      }))
    : normalizedPeriods;

  // For multi-period benefits, currentUsed is the sum of all period amounts
  // For single-period benefits, derive from transactions
  const transactionTotal = yearTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const baseUsed = year !== undefined
    ? (transactionTotal || legacyYearTotal)
    : (transactionTotal || resolvedUserState.currentUsed);
  const currentUsed = claimedElsewhereYear
    ? effectiveDefinition.creditAmount
    : adjustedPeriods?.length
      ? periodTotal
      : baseUsed;

  const status = claimedElsewhereYear
    ? 'completed'
    : rawStatus;

  return {
    ...effectiveDefinition,
    ...resolvedUserState,
    currentUsed,
    periods: adjustedPeriods,
    status,
    claimedElsewhereYear: claimedElsewhereYear ?? undefined,
    transactions: yearTransactions,
  };
}

export async function getBenefits(
  cardId?: string,
  includeIgnored?: boolean,
  year?: number
): Promise<Benefit[]> {
  const definitions = await api.getBenefitDefinitions(cardId);
  const userData = getUserBenefitsData();

  const merged = definitions.map((def) =>
    mergeBenefit(def, userData.benefits[def.id], year)
  );


  if (includeIgnored) {
    return merged;
  }

  return merged.filter((benefit) => !benefit.ignored);
}

export function updateBenefit(
  id: string,
  definition: BenefitDefinition,
  updates: UpdateBenefitRequest,
  year?: number
): Benefit {
  const userStateUpdates: Partial<BenefitUserState> = {};

  if (updates.status !== undefined) {
    userStateUpdates.status = updates.status;
  }
  if (updates.ignored !== undefined) {
    userStateUpdates.ignored = updates.ignored;
  }

  const updatedState = updateUserState(id, userStateUpdates);
  return mergeBenefit(definition, updatedState, year);
}

export function toggleActivation(
  id: string,
  definition: BenefitDefinition,
  year?: number
): Benefit {
  const userData = getUserBenefitsData();
  const existing = userData.benefits[id];
  const currentValue = existing?.activationAcknowledged ?? false;

  const updatedState = updateUserState(id, {
    activationAcknowledged: !currentValue,
  });

  return mergeBenefit(definition, updatedState, year);
}

export async function getStats(year?: number): Promise<Stats> {
  const benefits = await getBenefits(undefined, false, year);
  const cardStats = calculateStats(benefits, year);

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
