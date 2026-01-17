import { getBenefits, getBenefitById, updateBenefit } from '../models/storage';
import { calculateBenefitStatus, calculateStats } from '@shared/utils';

export function updateBenefitUsage(
  id: string,
  used: number,
  ignored?: boolean
) {
  const benefit = getBenefitById(id);
  if (!benefit) {
    throw new Error('Benefit not found');
  }

  const status = calculateBenefitStatus({ ...benefit, currentUsed: used });

  const updateData: {
    currentUsed: number;
    status: 'pending' | 'completed' | 'missed';
    ignored?: boolean;
  } = {
    currentUsed: used,
    status
  };

  if (ignored !== undefined) {
    updateData.ignored = ignored;
  }

  return updateBenefit(id, updateData);
}

export function toggleActivation(id: string) {
  const benefit = getBenefitById(id);
  if (!benefit) {
    throw new Error('Benefit not found');
  }
  
  if (!benefit.activationRequired) {
    throw new Error('This benefit does not require activation');
  }
  
  return updateBenefit(id, {
    activationAcknowledged: !benefit.activationAcknowledged
  });
}

export function getStats() {
  const benefits = getBenefits();
  const stats = calculateStats(benefits);
  
  return {
    totalBenefits: benefits.length,
    ...stats
  };
}
