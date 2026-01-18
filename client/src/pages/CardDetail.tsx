import { useState, useCallback, lazy, Suspense } from 'react';
import type { Benefit, CreditCard } from '../types';
import { BenefitCard } from '../components/BenefitCard';
import { CardHeader } from '../components/CardHeader';
import { useBenefits } from '../context/BenefitsContext';
import { calculateStats } from '@shared/utils';

const ImportModal = lazy(() => import('../components/ImportModal'));

interface CardDetailProps {
  card: CreditCard;
  benefits: Benefit[];
  allBenefits: Benefit[];
  onBack: () => void;
  onImport: (cardId: string, aggregated: Map<string, {
    periods?: Record<string, { usedAmount: number; transactions?: { date: string; description: string; amount: number }[] }>;
    transactions?: { date: string; description: string; amount: number }[];
  }>) => void;
}

export function CardDetail({
  card,
  benefits,
  allBenefits,
  onBack,
  onImport
}: CardDetailProps) {
  const { definitions, selectedYear, onToggleEnrollment, onToggleVisibility } = useBenefits();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const cardDefinitions = definitions.filter(d => d.cardId === card.id);

  const handleImportClick = useCallback((_cardId: string) => {
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
            onToggleEnrollment={onToggleEnrollment}
          />
        ))}
      </div>

      <Suspense fallback={null}>
        <ImportModal
          isOpen={isImportOpen}
          cardId={card.id}
          cardName={card.name}
          benefits={cardDefinitions}
          onClose={handleImportClose}
          onImport={handleImportConfirm}
        />
      </Suspense>
    </div>
  );
}
