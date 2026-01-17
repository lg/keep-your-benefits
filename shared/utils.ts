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
  return {
    totalValue: benefits.reduce((sum, b) => sum + b.creditAmount, 0),
    usedValue: benefits.reduce((sum, b) => sum + b.currentUsed, 0),
    completedCount: benefits.filter(b => b.status === 'completed').length,
    pendingCount: benefits.filter(b => b.status === 'pending').length,
    missedCount: benefits.filter(b => b.status === 'missed').length,
  };
}

export function calculateBenefitStatus(benefit: Benefit): 'pending' | 'completed' | 'missed' {
  const now = new Date();
  const endDate = new Date(benefit.endDate);
  
  if (benefit.currentUsed >= benefit.creditAmount) {
    return 'completed';
  }
  
  if (endDate < now) {
    return 'missed';
  }
  
  return 'pending';
}

export function calculatePeriodStatus(period: { usedAmount: number; creditAmount: number; endDate: string; }): 'pending' | 'completed' | 'missed' {
  const now = new Date();
  const endDate = new Date(period.endDate);
  
  if (period.usedAmount >= period.creditAmount) {
    return 'completed';
  }
  
  if (endDate < now) {
    return 'missed';
  }
  
  return 'pending';
}
