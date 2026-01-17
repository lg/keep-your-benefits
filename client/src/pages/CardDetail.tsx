import type { Benefit, CreditCard } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { CardHeader } from '../components/CardHeader';
import { EditModal } from '../components/EditModal';
import { useEditModal } from '../hooks/useEditModal';
import { calculateStats } from '@shared/utils';

interface CardDetailProps {
  card: CreditCard;
  benefits: Benefit[];
  allBenefits: Benefit[];
  onBack: () => void;
  onUpdateBenefit: (id: string, data: { currentUsed?: number; ignored?: boolean; activationAcknowledged?: boolean; periods?: Record<string, number> }) => void;
  onToggleIgnored: (id: string, data: { ignored: boolean }) => void;
}

export function CardDetail ({ 
  card, 
  benefits, 
  allBenefits,
  onBack, 
  onUpdateBenefit,
  onToggleIgnored
}: CardDetailProps) {
  const { editingBenefit, isModalOpen, initialPeriodId, handleEdit, handleEditPeriod, handleClose } = useEditModal();

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
    </div>
  );
}
