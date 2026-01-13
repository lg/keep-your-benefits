import { getCards, getBenefits, getBenefitById, updateBenefit } from '../models/storage';
import { calculateBenefitStatus } from '../utils/dates';

export function getCardsWithBenefits() {
  const cards = getCards();
  return cards.map(card => {
    const benefits = getBenefits(card.id);
    const totalValue = benefits.reduce((sum, b) => sum + b.creditAmount, 0);
    const usedValue = benefits.reduce((sum, b) => sum + b.currentUsed, 0);
    const completedCount = benefits.filter(b => b.status === 'completed').length;
    const pendingCount = benefits.filter(b => b.status === 'pending').length;
    const missedCount = benefits.filter(b => b.status === 'missed').length;
    
    return {
      ...card,
      benefits,
      stats: {
        totalBenefits: benefits.length,
        totalValue,
        usedValue,
        completedCount,
        pendingCount,
        missedCount
      }
    };
  });
}

export function getAllBenefitsWithCards(includeIgnored?: boolean) {
  const cards = getCards();
  const benefits = getBenefits(undefined, includeIgnored);
  
  return benefits.map(benefit => {
    const card = cards.find(c => c.id === benefit.cardId);
    return {
      ...benefit,
      card
    };
  });
}

export function updateBenefitUsage(id: string, used: number, notes?: string, ignored?: boolean) {
  const benefit = getBenefitById(id);
  if (!benefit) {
    throw new Error('Benefit not found');
  }
  
  const status = calculateBenefitStatus({ ...benefit, currentUsed: used });
  
  const updateData: { currentUsed: number; notes?: string; status: 'pending' | 'completed' | 'missed'; ignored?: boolean } = {
    currentUsed: used,
    notes: notes ?? benefit.notes,
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
  
  return {
    totalBenefits: benefits.length,
    totalValue: benefits.reduce((sum, b) => sum + b.creditAmount, 0),
    usedValue: benefits.reduce((sum, b) => sum + b.currentUsed, 0),
    completedCount: benefits.filter(b => b.status === 'completed').length,
    pendingCount: benefits.filter(b => b.status === 'pending').length,
    missedCount: benefits.filter(b => b.status === 'missed').length
  };
}
