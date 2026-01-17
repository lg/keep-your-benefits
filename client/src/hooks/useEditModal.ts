import { useState } from 'react';
import type { Benefit } from '../types';

export function useEditModal() {
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialPeriodId, setInitialPeriodId] = useState<string | undefined>(undefined);

  const handleEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setIsModalOpen(true);
    setInitialPeriodId(undefined);
  };

  const handleEditPeriod = (benefit: Benefit, periodId: string) => {
    setEditingBenefit(benefit);
    setIsModalOpen(true);
    setInitialPeriodId(periodId);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setInitialPeriodId(undefined);
  };

  return { editingBenefit, isModalOpen, initialPeriodId, handleEdit, handleEditPeriod, handleClose };
}
