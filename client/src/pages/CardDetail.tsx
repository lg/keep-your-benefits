import React from 'react';
import { Benefit, CreditCard } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { CardHeader } from '../components/CardHeader';
import { EditModal } from '../components/EditModal';

interface CardDetailProps {
  card: CreditCard;
  benefits: Benefit[];
  onBack: () => void;
  onEditBenefit: (benefit: Benefit) => void;
  onUpdateBenefit: (id: string, data: { currentUsed: number; notes: string }) => void;
  onToggleActivation: (id: string) => void;
}

export function CardDetail ({ 
  card, 
  benefits, 
  onBack, 
  onUpdateBenefit,
  onToggleActivation 
}: CardDetailProps) {
  const [editingBenefit, setEditingBenefit] = React.useState<Benefit | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const stats = {
    totalValue: benefits.reduce((sum, b) => sum + b.creditAmount, 0),
    usedValue: benefits.reduce((sum, b) => sum + b.currentUsed, 0),
    completedCount: benefits.filter(b => b.status === 'completed').length,
    pendingCount: benefits.filter(b => b.status === 'pending').length,
    missedCount: benefits.filter(b => b.status === 'missed').length,
  };

  const handleEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setIsModalOpen(true);
  };

  const handleSave = (id: string, data: { currentUsed: number; notes: string }) => {
    onUpdateBenefit(id, data);
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
      >
        ← Back to Dashboard
      </button>

      <CardHeader card={card} stats={stats} />

      <div className="grid gap-4 md:grid-cols-2">
        {benefits.map(benefit => (
          <BenefitCard
            key={benefit.id}
            benefit={benefit}
            onEdit={handleEdit}
            onToggleActivation={onToggleActivation}
          />
        ))}
      </div>

      <EditModal
        benefit={editingBenefit}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
