import { useState } from 'react';
import type { Benefit } from '../types';

export function useEditModal() {
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setIsModalOpen(true);
  };

  const handleClose = () => setIsModalOpen(false);

  return { editingBenefit, isModalOpen, handleEdit, handleClose };
}
