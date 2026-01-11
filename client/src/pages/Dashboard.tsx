import { useState } from 'react';
import { Benefit, Stats } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { EditModal } from '../components/EditModal';

interface DashboardProps {
  benefits: Benefit[];
  cards: { id: string; name: string; color: string }[];
  stats: Stats | null;
  onEditBenefit: (benefit: Benefit) => void;
  onUpdateBenefit: (id: string, data: { currentUsed: number; notes: string }) => void;
  onToggleActivation: (id: string) => void;
}

export function Dashboard({ 
  benefits, 
  cards, 
  stats, 
  onUpdateBenefit,
  onToggleActivation 
}: DashboardProps) {
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setIsModalOpen(true);
  };

  const handleSave = (id: string, data: { currentUsed: number; notes: string }) => {
    onUpdateBenefit(id, data);
  };

  const benefitsByCard = cards.map(card => ({
    card,
    benefits: benefits.filter(b => b.cardId === card.id)
  }));

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold">${stats.totalValue}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Used</p>
            <p className="text-2xl font-bold text-emerald-400">${stats.usedValue.toFixed(0)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Remaining</p>
            <p className="text-2xl font-bold text-amber-400">
              ${(stats.totalValue - stats.usedValue).toFixed(0)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">
              {stats.completedCount}/{stats.totalBenefits}
            </p>
          </div>
        </div>
      )}

      {benefitsByCard.map(({ card, benefits: cardBenefits }) => (
        cardBenefits.length > 0 && (
          <div key={card.id} className="mb-8">
            <div 
              className="rounded-lg p-4 mb-4"
              style={{ backgroundColor: `${card.color}20`, borderLeft: `4px solid ${card.color}` }}
            >
              <h2 className="text-xl font-bold">{card.name}</h2>
              <p className="text-slate-400 text-sm">
                {cardBenefits.filter(b => b.status === 'completed').length} of {cardBenefits.length} benefits completed
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {cardBenefits.map(benefit => (
                <BenefitCard
                  key={benefit.id}
                  benefit={benefit}
                  onEdit={handleEdit}
                  onToggleActivation={onToggleActivation}
                />
              ))}
            </div>
          </div>
        )
      ))}

      <EditModal
        benefit={editingBenefit}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
