import { Benefit, CreditCard, Stats } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Request failed');
  }

  return result.data;
}

export const api = {
  getCards: () => fetchApi<CreditCard[]>('/cards'),
  
  getBenefits: (cardId?: string) => {
    const query = cardId ? `?cardId=${cardId}` : '';
    return fetchApi<Benefit[]>(`/benefits${query}`);
  },
  
  getBenefit: (id: string) => fetchApi<Benefit>(`/benefits/${id}`),
  
  updateBenefit: (id: string, data: Partial<Benefit>) => 
    fetchApi<Benefit>(`/benefits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  toggleActivation: (id: string) =>
    fetchApi<Benefit>(`/benefits/${id}/activate`, {
      method: 'PATCH',
    }),
  
  getReminders: (days: number = 30) =>
    fetchApi<Benefit[]>(`/reminders?days=${days}`),
  
  getStats: () => fetchApi<Stats>('/stats'),
};
