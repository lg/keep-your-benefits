export interface CreditCard {
  id: string;
  name: string;
  annualFee: number;
  resetBasis: 'calendar-year' | 'anniversary';
  color: string;
}

export interface BenefitPeriod {
  id: string;
  startDate: string;
  endDate: string;
  usedAmount: number;
  status: 'pending' | 'completed' | 'missed';
}

export interface Benefit {
  id: string;
  cardId: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  creditAmount: number;
  currentUsed: number;
  resetFrequency: 'annual' | 'twice-yearly' | 'quarterly' | 'monthly';
  activationRequired: boolean;
  activationAcknowledged: boolean;
  startDate: string;
  endDate: string;
  notes: string;
  status: 'pending' | 'completed' | 'missed';
  category: string;
  periods?: BenefitPeriod[];
}

export interface BenefitsData {
  cards: CreditCard[];
  benefits: Benefit[];
}

export interface UpdateBenefitRequest {
  currentUsed?: number;
  notes?: string;
  status?: 'pending' | 'completed' | 'missed';
}

export interface UpdatePeriodRequest {
  usedAmount?: number;
  status?: 'pending' | 'completed' | 'missed';
}
