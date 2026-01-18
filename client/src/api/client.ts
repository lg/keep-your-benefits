import type { BenefitDefinition, BenefitsStaticData, CreditCard } from '../../../shared/types';

// Cache the promise to avoid fetching benefits.json multiple times
let cachedPromise: Promise<BenefitsStaticData> | null = null;

function fetchStaticData(): Promise<BenefitsStaticData> {
  if (!cachedPromise) {
    cachedPromise = fetch(`${import.meta.env.BASE_URL}benefits.json`).then(
      (response) => {
        if (!response.ok) {
          // Clear cache on error so retry works
          cachedPromise = null;
          throw new Error('Failed to load benefits data');
        }
        return response.json();
      }
    );
  }
  return cachedPromise;
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
