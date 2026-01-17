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

export function calculateStats(benefits: Benefit[]): CardStats {
  const now = new Date();
  const totalBenefits = benefits.length;

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

      for (const period of benefit.periods) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const isFuture = now < start;
        const isPast = now > end;
        const isCurrent = !isFuture && !isPast;
        const isComplete = period.usedAmount >= segmentValue;

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
    } else {
      const isComplete = benefit.currentUsed >= benefit.creditAmount;
      const isPast = now > new Date(benefit.endDate);
      const hasStarted = now >= new Date(benefit.startDate);
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
