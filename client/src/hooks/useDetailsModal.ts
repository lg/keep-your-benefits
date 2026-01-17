import { useState, useCallback } from 'react';
import type { Benefit } from '../types';

export function useDetailsModal() {
  const [viewingBenefitId, setViewingBenefitId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialPeriodId, setInitialPeriodId] = useState<string | undefined>(undefined);

  const handleViewDetails = useCallback((benefit: Benefit) => {
    setViewingBenefitId(benefit.id);
    setIsModalOpen(true);
    setInitialPeriodId(undefined);
  }, []);

  const handleViewPeriod = useCallback((benefit: Benefit, periodId: string) => {
    setViewingBenefitId(benefit.id);
    setIsModalOpen(true);
    setInitialPeriodId(periodId);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setInitialPeriodId(undefined);
  }, []);

  return { viewingBenefitId, isModalOpen, initialPeriodId, handleViewDetails, handleViewPeriod, handleClose };
}
