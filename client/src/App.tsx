import { useState, useCallback, useEffect, useRef } from 'react';
import type { CreditCard, Benefit, BenefitDefinition, Stats } from './types';
import { Dashboard } from './pages/Dashboard';
import { CardDetail } from './pages/CardDetail';
import { ErrorBoundary } from './components/ErrorBoundary';
import * as benefitsService from './services/benefits';
import { api } from './api/client';

function App() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [definitions, setDefinitions] = useState<BenefitDefinition[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [allBenefits, setAllBenefits] = useState<Benefit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Use ref to track mounted state for async operations
  const isMountedRef = useRef(true);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      
      // Fetch cards and definitions from static JSON
      const [cardsData, definitionsData] = await Promise.all([
        api.getCards(),
        api.getBenefitDefinitions(),
      ]);
      
      // Check if aborted before continuing
      if (signal?.aborted) return;
      
      // Fetch all benefits once, then filter for non-ignored
      const allBenefitsData = await benefitsService.getBenefits(undefined, true);
      const benefitsData = allBenefitsData.filter(b => !b.ignored);
      const statsData = await benefitsService.getStats();
      
      // Only update state if still mounted
      if (signal?.aborted) return;
      
      setCards(cardsData);
      setDefinitions(definitionsData);
      setBenefits(benefitsData);
      setAllBenefits(allBenefitsData);
      setStats(statsData);
    } catch (err) {
      if (signal?.aborted) return;
      setError((err as Error).message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const loadAllBenefitsForCard = useCallback(async (cardId: string) => {
    if (!isMountedRef.current) return;
    const allBenefitsData = await benefitsService.getBenefits(cardId, true);
    if (!isMountedRef.current) return;
    setAllBenefits(prev => {
      const otherBenefits = prev.filter(b => b.cardId !== cardId);
      return [...otherBenefits, ...allBenefitsData];
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadData]);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCardId) {
      loadAllBenefitsForCard(selectedCardId);
    }
  }, [selectedCardId, loadAllBenefitsForCard]);

  const handleUpdateBenefit = useCallback(async (
    id: string,
    data: { currentUsed?: number; ignored?: boolean; activationAcknowledged?: boolean; periods?: Record<string, number> }
  ) => {
    try {
      const definition = definitions.find(d => d.id === id);
      if (!definition) {
        throw new Error('Benefit not found');
      }

      const { activationAcknowledged, ...updateData } = data;
      let updated = benefitsService.updateBenefit(id, definition, updateData);

      if (activationAcknowledged !== undefined && activationAcknowledged !== updated.activationAcknowledged) {
        updated = benefitsService.toggleActivation(id, definition);
      }

      setAllBenefits(prev => prev.map(b => b.id === id ? updated : b));
      if (updated.ignored) {
        setBenefits(prev => prev.filter(b => b.id !== id));
      } else {
        setBenefits(prev => {
          const exists = prev.find(b => b.id === id);
          if (exists) {
            return prev.map(b => b.id === id ? updated : b);
          }
          return [...prev, updated];
        });
      }
      const statsData = await benefitsService.getStats();
      setStats(statsData);
      setUpdateError(null);
    } catch (err) {
      setUpdateError(`Failed to update benefit: ${(err as Error).message}`);
    }
  }, [definitions]);

  const handleToggleIgnored = useCallback(async (id: string, data: { ignored: boolean }) => {
    try {
      const definition = definitions.find(d => d.id === id);
      if (!definition) {
        throw new Error('Benefit not found');
      }

      const updated = benefitsService.updateBenefit(id, definition, data);
      setAllBenefits(prev => prev.map(b => b.id === id ? updated : b));
      
      // Fetch non-ignored benefits and stats
      const allBenefitsData = await benefitsService.getBenefits(undefined, true);
      const benefitsData = allBenefitsData.filter(b => !b.ignored);
      const statsData = await benefitsService.getStats();
      
      setBenefits(benefitsData);
      setStats(statsData);
      setUpdateError(null);
    } catch (err) {
      setUpdateError(`Failed to toggle visibility: ${(err as Error).message}`);
    }
  }, [definitions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading benefits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button onClick={() => loadData()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedCard = selectedCardId ? cards.find(c => c.id === selectedCardId) : null;
  const selectedCardBenefits = selectedCardId 
    ? benefits.filter(b => b.cardId === selectedCardId)
    : [];
  const selectedCardAllBenefits = selectedCardId
    ? allBenefits.filter(b => b.cardId === selectedCardId)
    : [];

  return (
    <div className="min-h-screen bg-slate-900">
      {updateError && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{updateError}</span>
          <button 
            onClick={() => setUpdateError(null)}
            className="text-white hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedCardId(null)}
                className={`font-bold text-xl ${!selectedCardId ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Keep Your Benefits
              </button>
            </div>
            <nav className="flex gap-2">
              <button
                onClick={() => setSelectedCardId(null)}
                className={`px-3 py-1 rounded ${
                  !selectedCardId ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Cards
              </button>
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    selectedCardId === card.id ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  style={{ 
                    backgroundColor: selectedCardId === card.id ? card.color : undefined 
                  }}
                >
                  {card.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ErrorBoundary>
          {selectedCard ? (
              <CardDetail
                card={selectedCard}
                benefits={selectedCardBenefits}
                allBenefits={selectedCardAllBenefits}
                onBack={() => setSelectedCardId(null)}
                onUpdateBenefit={handleUpdateBenefit}
                onToggleIgnored={handleToggleIgnored}
              />

          ) : (
            <Dashboard
              benefits={benefits}
              cards={cards}
              allBenefits={allBenefits}
              stats={stats}
              onUpdateBenefit={handleUpdateBenefit}
              onToggleIgnored={handleToggleIgnored}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
