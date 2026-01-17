import { useState, useCallback } from 'react';
import type { Benefit, CreditCard, BenefitDefinition } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { CardHeader } from '../components/CardHeader';
import { EditModal } from '../components/EditModal';
import { ImportModal } from '../components/ImportModal';
import { useEditModal } from '../hooks/useEditModal';
import { calculateStats } from '@shared/utils';

interface CardDetailProps {
  card: CreditCard;
  benefits: Benefit[];
  allBenefits: Benefit[];
  definitions: BenefitDefinition[];
  onBack: () => void;
  onUpdateBenefit: (id: string, data: { currentUsed?: number; ignored?: boolean; activationAcknowledged?: boolean; periods?: Record<string, number> }) => void;
  onToggleIgnored: (id: string, data: { ignored: boolean }) => void;
  onImport: (cardId: string, aggregated: Map<string, { currentUsed: number; periods?: Record<string, number> }>) => void;
}

export function CardDetail ({ 
  card, 
  benefits, 
  allBenefits,
  definitions,
  onBack, 
  onUpdateBenefit,
  onToggleIgnored,
  onImport
}: CardDetailProps) {
  const { editingBenefit, isModalOpen, initialPeriodId, handleEdit, handleEditPeriod, handleClose } = useEditModal();
  
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleImportClick = useCallback(() => {
    setIsImportOpen(true);
  }, []);

  const handleImportClose = useCallback(() => {
    setIsImportOpen(false);
  }, []);

  const handleImportConfirm = useCallback((aggregated: Map<string, { currentUsed: number; periods?: Record<string, number> }>) => {
    onImport(card.id, aggregated);
    setIsImportOpen(false);
  }, [card.id, onImport]);

  return (
    <div>
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
      >
        ← Back to Dashboard
      </button>

      <CardHeader 
        card={card} 
        stats={calculateStats(benefits)} 
        allBenefits={allBenefits}
        onUpdateBenefit={onToggleIgnored}
        onImportClick={handleImportClick}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {benefits.map(benefit => (
<BenefitCard
              key={benefit.id}
              benefit={benefit}
              onEdit={handleEdit}
              onSegmentEdit={handleEditPeriod}
            />
        ))}
      </div>

      <EditModal
        benefit={editingBenefit}
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={onUpdateBenefit}
        initialPeriodId={initialPeriodId}
      />

      <ImportModal
        isOpen={isImportOpen}
        cardId={card.id}
        cardName={card.name}
        benefits={definitions}
        onClose={handleImportClose}
        onImport={handleImportConfirm}
      />
    </div>
  );
}
