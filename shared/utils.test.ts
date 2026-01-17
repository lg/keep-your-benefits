import { describe, it, expect } from 'bun:test';
import { calculateStats } from './utils';
import type { Benefit } from './types';

function createBenefit(overrides: Partial<Benefit> = {}): Benefit {
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const twoMonthsLater = new Date(now);
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

  return {
    id: 'test-benefit',
    cardId: 'test-card',
    name: 'Test Benefit',
    shortDescription: 'Test description',
    fullDescription: 'Full test description',
    creditAmount: 100,
    resetFrequency: 'annual',
    activationRequired: false,
    startDate: lastMonth.toISOString(),
    endDate: twoMonthsLater.toISOString(),
    category: 'test',
    currentUsed: 0,
    activationAcknowledged: true,
    status: 'pending',
    ignored: false,
    ...overrides,
  };
}

describe('calculateStats', () => {
  describe('single-period benefits', () => {
    it('counts a completed benefit when current period is complete', () => {
      const benefit = createBenefit({
        currentUsed: 100,
        creditAmount: 100,
        periods: undefined,
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.currentPeriodCompletedCount).toBe(1);
      expect(stats.ytdCompletedPeriods).toBe(1);
      expect(stats.ytdTotalPeriods).toBe(1);
      expect(stats.pendingCount).toBe(0);
      expect(stats.missedCount).toBe(0);
    });

    it('counts a pending benefit when current period is not complete', () => {
      const benefit = createBenefit({
        currentUsed: 50,
        creditAmount: 100,
        periods: undefined,
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.currentPeriodCompletedCount).toBe(0);
      expect(stats.ytdCompletedPeriods).toBe(0);
      expect(stats.ytdTotalPeriods).toBe(1);
      expect(stats.pendingCount).toBe(1);
      expect(stats.missedCount).toBe(0);
    });

    it('does not count future benefits in ytd totals', () => {
      const now = new Date();
      const futureStart = new Date(now);
      futureStart.setDate(futureStart.getDate() + 60);
      const futureEnd = new Date(now);
      futureEnd.setDate(futureEnd.getDate() + 120);

      const benefit = createBenefit({
        startDate: futureStart.toISOString(),
        endDate: futureEnd.toISOString(),
        currentUsed: 0,
        creditAmount: 100,
        periods: undefined,
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.ytdTotalPeriods).toBe(0);
      expect(stats.ytdCompletedPeriods).toBe(0);
    });

    it('counts a missed benefit when expired and not complete', () => {
      const now = new Date();
      const pastEnd = new Date(now);
      pastEnd.setDate(pastEnd.getDate() - 1);

      const pastStart = new Date(now);
      pastStart.setDate(pastStart.getDate() - 60);

      const benefit = createBenefit({
        startDate: pastStart.toISOString(),
        endDate: pastEnd.toISOString(),
        currentUsed: 50,
        creditAmount: 100,
        periods: undefined,
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.currentPeriodCompletedCount).toBe(0);
      expect(stats.ytdTotalPeriods).toBe(1);
      expect(stats.ytdCompletedPeriods).toBe(0);
      expect(stats.missedCount).toBe(1);
      expect(stats.pendingCount).toBe(0);
    });
  });

  describe('multi-period benefits (quarterly)', () => {
    it('counts completed periods correctly', () => {
      const now = new Date();

      const q1Start = new Date(now);
      q1Start.setDate(q1Start.getDate() - 270);
      const q1End = new Date(now);
      q1End.setDate(q1End.getDate() - 180);

      const q2Start = new Date(now);
      q2Start.setDate(q2Start.getDate() - 180);
      const q2End = new Date(now);
      q2End.setDate(q2End.getDate() - 90);

      const q3Start = new Date(now);
      q3Start.setDate(q3Start.getDate() - 90);
      const q3End = new Date(now);
      q3End.setDate(q3End.getDate() + 90);

      const q4Start = new Date(now);
      q4Start.setDate(q4Start.getDate() + 90);
      const q4End = new Date(now);
      q4End.setDate(q4End.getDate() + 180);

      const benefit: Benefit = createBenefit({
        id: 'quarterly-benefit',
        creditAmount: 400,
        periods: [
          { id: 'q1', startDate: q1Start.toISOString(), endDate: q1End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q2', startDate: q2Start.toISOString(), endDate: q2End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q3', startDate: q3Start.toISOString(), endDate: q3End.toISOString(), usedAmount: 50, status: 'pending' },
          { id: 'q4', startDate: q4Start.toISOString(), endDate: q4End.toISOString(), usedAmount: 0, status: 'pending' },
        ],
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.currentPeriodCompletedCount).toBe(0);
      expect(stats.ytdCompletedPeriods).toBe(2);
      expect(stats.ytdTotalPeriods).toBe(3);
      expect(stats.pendingCount).toBe(1);
      expect(stats.missedCount).toBe(0);
    });

    it('marks current period as completed when used amount meets threshold', () => {
      const now = new Date();

      const q1Start = new Date(now);
      q1Start.setDate(q1Start.getDate() - 270);
      const q1End = new Date(now);
      q1End.setDate(q1End.getDate() - 180);

      const q2Start = new Date(now);
      q2Start.setDate(q2Start.getDate() - 180);
      const q2End = new Date(now);
      q2End.setDate(q2End.getDate() - 90);

      const q3Start = new Date(now);
      q3Start.setDate(q3Start.getDate() - 90);
      const q3End = new Date(now);
      q3End.setDate(q3End.getDate() + 90);

      const q4Start = new Date(now);
      q4Start.setDate(q4Start.getDate() + 90);
      const q4End = new Date(now);
      q4End.setDate(q4End.getDate() + 180);

      const benefit: Benefit = createBenefit({
        id: 'quarterly-benefit',
        creditAmount: 400,
        periods: [
          { id: 'q1', startDate: q1Start.toISOString(), endDate: q1End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q2', startDate: q2Start.toISOString(), endDate: q2End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q3', startDate: q3Start.toISOString(), endDate: q3End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q4', startDate: q4Start.toISOString(), endDate: q4End.toISOString(), usedAmount: 0, status: 'pending' },
        ],
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.currentPeriodCompletedCount).toBe(1);
      expect(stats.ytdCompletedPeriods).toBe(3);
      expect(stats.ytdTotalPeriods).toBe(3);
      expect(stats.pendingCount).toBe(0);
      expect(stats.missedCount).toBe(0);
    });

    it('counts a missed period when past and not complete', () => {
      const now = new Date();

      const q1Start = new Date(now);
      q1Start.setDate(q1Start.getDate() - 270);
      const q1End = new Date(now);
      q1End.setDate(q1End.getDate() - 180);

      const q2Start = new Date(now);
      q2Start.setDate(q2Start.getDate() - 180);
      const q2End = new Date(now);
      q2End.setDate(q2End.getDate() - 90);

      const q3Start = new Date(now);
      q3Start.setDate(q3Start.getDate() - 90);
      const q3End = new Date(now);
      q3End.setDate(q3End.getDate() + 90);

      const q4Start = new Date(now);
      q4Start.setDate(q4Start.getDate() + 90);
      const q4End = new Date(now);
      q4End.setDate(q4End.getDate() + 180);

      const benefit: Benefit = createBenefit({
        id: 'quarterly-benefit',
        creditAmount: 400,
        periods: [
          { id: 'q1', startDate: q1Start.toISOString(), endDate: q1End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q2', startDate: q2Start.toISOString(), endDate: q2End.toISOString(), usedAmount: 0, status: 'missed' },
          { id: 'q3', startDate: q3Start.toISOString(), endDate: q3End.toISOString(), usedAmount: 50, status: 'pending' },
          { id: 'q4', startDate: q4Start.toISOString(), endDate: q4End.toISOString(), usedAmount: 0, status: 'pending' },
        ],
      });

      const stats = calculateStats([benefit]);

      expect(stats.totalBenefits).toBe(1);
      expect(stats.currentPeriodCompletedCount).toBe(0);
      expect(stats.ytdCompletedPeriods).toBe(1);
      expect(stats.ytdTotalPeriods).toBe(3);
      expect(stats.pendingCount).toBe(1);
      expect(stats.missedCount).toBe(1);
    });
  });

  describe('multiple benefits', () => {
    it('aggregates stats across multiple benefits', () => {
      const now = new Date();

      const benefit1 = createBenefit({
        id: 'benefit-1',
        creditAmount: 100,
        currentUsed: 100,
        periods: undefined,
      });

      const q1Start = new Date(now);
      q1Start.setDate(q1Start.getDate() - 270);
      const q1End = new Date(now);
      q1End.setDate(q1End.getDate() - 180);

      const q2Start = new Date(now);
      q2Start.setDate(q2Start.getDate() - 180);
      const q2End = new Date(now);
      q2End.setDate(q2End.getDate() - 90);

      const q3Start = new Date(now);
      q3Start.setDate(q3Start.getDate() - 90);
      const q3End = new Date(now);
      q3End.setDate(q3End.getDate() + 90);

      const q4Start = new Date(now);
      q4Start.setDate(q4Start.getDate() + 90);
      const q4End = new Date(now);
      q4End.setDate(q4End.getDate() + 180);

      const benefit2: Benefit = createBenefit({
        id: 'benefit-2',
        creditAmount: 400,
        currentUsed: 200,
        periods: [
          { id: 'q1', startDate: q1Start.toISOString(), endDate: q1End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q2', startDate: q2Start.toISOString(), endDate: q2End.toISOString(), usedAmount: 100, status: 'completed' },
          { id: 'q3', startDate: q3Start.toISOString(), endDate: q3End.toISOString(), usedAmount: 50, status: 'pending' },
          { id: 'q4', startDate: q4Start.toISOString(), endDate: q4End.toISOString(), usedAmount: 0, status: 'pending' },
        ],
      });

      const benefit3 = createBenefit({
        id: 'benefit-3',
        creditAmount: 50,
        currentUsed: 25,
        periods: undefined,
      });

      const stats = calculateStats([benefit1, benefit2, benefit3]);

      expect(stats.totalBenefits).toBe(3);
      expect(stats.totalValue).toBe(550);
      expect(stats.usedValue).toBe(325);
      expect(stats.currentPeriodCompletedCount).toBe(1);
      expect(stats.ytdCompletedPeriods).toBe(3);
      expect(stats.ytdTotalPeriods).toBe(5);
      expect(stats.pendingCount).toBe(2);
      expect(stats.missedCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty benefits array', () => {
      const stats = calculateStats([]);

      expect(stats.totalBenefits).toBe(0);
      expect(stats.totalValue).toBe(0);
      expect(stats.usedValue).toBe(0);
      expect(stats.currentPeriodCompletedCount).toBe(0);
      expect(stats.ytdCompletedPeriods).toBe(0);
      expect(stats.ytdTotalPeriods).toBe(0);
      expect(stats.pendingCount).toBe(0);
      expect(stats.missedCount).toBe(0);
    });
  });
});
