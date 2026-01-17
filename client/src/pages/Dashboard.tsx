import { useMemo, useState, useCallback } from 'react';
import type { Benefit, Stats, CreditCard, BenefitDefinition } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { CardHeader } from '../components/CardHeader';
import { EditModal } from '../components/EditModal';
import { ImportModal } from '../components/ImportModal';
import { useEditModal } from '../hooks/useEditModal';
import { calculateStats } from '@shared/utils';

interface DashboardProps {
  benefits: Benefit[];
  cards: CreditCard[];
  allBenefits: Benefit[];
  definitions: BenefitDefinition[];
  stats: Stats | null;
  onUpdateBenefit: (id: string, data: { currentUsed?: number; ignored?: boolean; activationAcknowledged?: boolean; periods?: Record<string, number> }) => void;
  onToggleIgnored: (id: string, data: { ignored: boolean }) => void;
  onImport: (cardId: string, aggregated: Map<string, { currentUsed: number; periods?: Record<string, number> }>) => void;
}

export function Dashboard({ 
  benefits, 
  cards, 
  allBenefits,
  definitions,
  stats, 
  onUpdateBenefit,
  onToggleIgnored,
  onImport
}: DashboardProps) {
  const { editingBenefit, isModalOpen, initialPeriodId, handleEdit, handleEditPeriod, handleClose } = useEditModal();
  
  // Import modal state
  const [importCardId, setImportCardId] = useState<string | null>(null);
  
  const importCard = importCardId ? cards.find(c => c.id === importCardId) : null;
  const importCardDefinitions = importCardId 
    ? definitions.filter(d => d.cardId === importCardId) 
    : [];

  const handleImportClick = useCallback((cardId: string) => {
    setImportCardId(cardId);
  }, []);

  const handleImportClose = useCallback(() => {
    setImportCardId(null);
  }, []);

  const handleImportConfirm = useCallback((aggregated: Map<string, { currentUsed: number; periods?: Record<string, number> }>) => {
    if (importCardId) {
      onImport(importCardId, aggregated);
    }
    setImportCardId(null);
  }, [importCardId, onImport]);

  const benefitsByCard = useMemo(() => 
    cards.map(card => ({
      card,
      benefits: benefits.filter(b => b.cardId === card.id),
      allBenefits: allBenefits.filter(b => b.cardId === card.id)
    })),
    [cards, benefits, allBenefits]
  );

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

      {benefitsByCard.map(({ card, benefits: cardBenefits, allBenefits: cardAllBenefits }) => (
        cardBenefits.length > 0 && (
          <div key={card.id} className="mb-8">
            <CardHeader 
              card={card} 
              stats={calculateStats(cardBenefits)}
              allBenefits={cardAllBenefits}
              onUpdateBenefit={onToggleIgnored}
              onImportClick={() => handleImportClick(card.id)}
            />
            <div className="grid gap-4 md:grid-cols-2">
              {cardBenefits.map(benefit => (
                <BenefitCard
                  key={benefit.id}
                  benefit={benefit}
                  onEdit={handleEdit}
                  onSegmentEdit={handleEditPeriod}
                />
              ))}
            </div>
          </div>
        )
      ))}

      <EditModal
        benefit={editingBenefit}
        isOpen={isModalOpen}
        onClose={handleClose}
        onSave={onUpdateBenefit}
        initialPeriodId={initialPeriodId}
      />

      <ImportModal
        isOpen={importCardId !== null}
        cardId={importCardId ?? ''}
        cardName={importCard?.name ?? ''}
        benefits={importCardDefinitions}
        onClose={handleImportClose}
        onImport={handleImportConfirm}
      />
    </div>
  );
}
