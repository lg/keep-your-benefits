// Shared utility functions used by both backend and frontend

import type { Benefit, CardStats } from './types';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getDaysUntilExpiry(endDate: string): number {
  const now = new Date();
  const expiry = new Date(endDate);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getTimeProgress(startDate: string, endDate: string): number {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now <= start) return 0;
  if (now >= end) return 100;

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return (elapsed / totalDuration) * 100;
}

export function calculateStats(benefits: Benefit[], year?: number): CardStats {
  const now = new Date();
  const totalBenefits = benefits.length;
  const endOfYear = year ? new Date(Date.UTC(year + 1, 0, 1)) : null;
  const referenceDate = year
    ? year > now.getUTCFullYear()
      ? new Date(Date.UTC(year, 0, 1))
      : year < now.getUTCFullYear()
        ? new Date(Date.UTC(year + 1, 0, 1))
        : now
    : now;

  let totalValue = 0;
  let usedValue = 0;
  let currentPeriodCompletedCount = 0;
  let ytdCompletedPeriods = 0;
  let ytdTotalPeriods = 0;
  let pendingCount = 0;
  let missedCount = 0;

  for (const benefit of benefits) {
    totalValue += benefit.creditAmount;
    usedValue += benefit.currentUsed;

    if (benefit.periods && benefit.periods.length > 0) {
      const segmentValue = benefit.creditAmount / benefit.periods.length;
      const isClaimedElsewhere = Boolean(benefit.claimedElsewhereYear);

      for (const period of benefit.periods) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const isFuture = referenceDate < start;
        const isPast = referenceDate > end;
        const isCurrent = !isFuture && !isPast;
        const isComplete = isClaimedElsewhere || period.usedAmount >= segmentValue;

        if (!isFuture) {
          ytdTotalPeriods++;

          if (isComplete) {
            ytdCompletedPeriods++;
          } else if (isPast) {
            missedCount++;
          } else if (isCurrent) {
            pendingCount++;
          }
        }

        if (isCurrent && isComplete) {
          currentPeriodCompletedCount++;
        }
      }

      continue;
    }

    if (year && endOfYear && new Date(benefit.endDate) <= endOfYear) {
      const isComplete = Boolean(benefit.claimedElsewhereYear)
        || benefit.currentUsed >= benefit.creditAmount;

      const isPast = endOfYear > new Date(benefit.endDate);

      ytdTotalPeriods++;
      if (isComplete) {
        ytdCompletedPeriods++;
        if (!isPast) {
          currentPeriodCompletedCount++;
        }
      } else if (isPast) {
        missedCount++;
      } else {
        pendingCount++;
      }

      continue;
    }

    const isComplete = benefit.currentUsed >= benefit.creditAmount;
    const isPast = referenceDate > new Date(benefit.endDate);
    const hasStarted = referenceDate >= new Date(benefit.startDate);
    const isCurrent = hasStarted && !isPast;

    if (isCurrent) {
      ytdTotalPeriods++;
      if (isComplete) {
        ytdCompletedPeriods++;
        currentPeriodCompletedCount++;
      } else {
        pendingCount++;
      }
    } else if (isPast) {
      ytdTotalPeriods++;
      if (isComplete) {
        ytdCompletedPeriods++;
      } else {
        missedCount++;
      }
    }
  }

  return {
    totalBenefits,
    totalValue,
    usedValue,
    currentPeriodCompletedCount,
    ytdCompletedPeriods,
    ytdTotalPeriods,
    pendingCount,
    missedCount,
  };
}
