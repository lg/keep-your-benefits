import { useState, useCallback } from 'react';
import type { Benefit, CreditCard, BenefitDefinition } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { CardHeader } from '../components/CardHeader';
import { ImportModal } from '../components/ImportModal';
import { calculateStats } from '@shared/utils';

interface CardDetailProps {
  card: CreditCard;
  benefits: Benefit[];
  allBenefits: Benefit[];
  definitions: BenefitDefinition[];
  selectedYear: number;
  onBack: () => void;
  onToggleEnrollment: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onImport: (cardId: string, aggregated: Map<string, {
    periods?: Record<string, { usedAmount: number; transactions?: { date: string; description: string; amount: number }[] }>;
    transactions?: { date: string; description: string; amount: number }[];
  }>) => void;
}

export function CardDetail({
  card,
  benefits,
  allBenefits,
  definitions,
  selectedYear,
  onBack,
  onToggleEnrollment,
  onToggleVisibility,
  onImport
}: CardDetailProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleImportClick = useCallback(() => {
    setIsImportOpen(true);
  }, []);

  const handleImportClose = useCallback(() => {
    setIsImportOpen(false);
  }, []);

  const handleImportConfirm = useCallback((aggregated: Map<string, {
    periods?: Record<string, { usedAmount: number; transactions?: { date: string; description: string; amount: number }[] }>;
    transactions?: { date: string; description: string; amount: number }[];
  }>) => {
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
        stats={calculateStats(benefits, selectedYear)} 
        allBenefits={allBenefits}
        selectedYear={selectedYear}
        onUpdateBenefit={onToggleVisibility}
        onImportClick={handleImportClick}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {benefits.map(benefit => (
          <BenefitCard
            key={benefit.id}
            benefit={benefit}
            selectedYear={selectedYear}
            onToggleEnrollment={onToggleEnrollment}
          />
        ))}
      </div>

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
