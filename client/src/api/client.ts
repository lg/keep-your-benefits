import type { BenefitDefinition, BenefitsStaticData, CreditCard } from '../../../shared/types';

async function fetchStaticData(): Promise<BenefitsStaticData> {
  const response = await fetch(`${import.meta.env.BASE_URL}benefits.json`);
  if (!response.ok) {
    throw new Error('Failed to load benefits data');
  }
  return response.json();
}

export const api = {
  getCards: async (): Promise<CreditCard[]> => {
    const data = await fetchStaticData();
    return data.cards;
  },

  getBenefitDefinitions: async (cardId?: string): Promise<BenefitDefinition[]> => {
    const data = await fetchStaticData();
    if (cardId) {
      return data.benefits.filter((b) => b.cardId === cardId);
    }
    return data.benefits;
  },
};
