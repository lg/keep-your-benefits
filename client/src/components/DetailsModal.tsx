import { useState, useEffect, useRef, useLayoutEffect, type MouseEvent, type KeyboardEvent } from 'react';
import type { Benefit } from '../types';
import type { StoredTransaction } from '../../../shared/types';

interface DetailsModalProps {
  benefit: Benefit | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleActivation: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  initialPeriodId?: string;
}

export function DetailsModal({ benefit, isOpen, onClose, onToggleActivation, onToggleVisibility, initialPeriodId }: DetailsModalProps) {
  const periodTabsRef = useRef<HTMLDivElement>(null);
  const [visiblePeriods, setVisiblePeriods] = useState<{ id: string }[]>([]);
  const [targetPeriodId, setTargetPeriodId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  useEffect(() => {
    if (benefit) {
      const now = new Date();
      const periods = (benefit.periods ?? [])
        .filter(period => new Date(period.startDate) <= now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setVisiblePeriods(periods);

      const periodId = initialPeriodId && periods.some(p => p.id === initialPeriodId)
        ? initialPeriodId
        : (() => {
            const currentPeriod = periods.find(period => {
              const start = new Date(period.startDate);
              const end = new Date(period.endDate);
              return now >= start && now <= end;
            });
            return currentPeriod?.id ?? periods[0]?.id ?? '';
          })();

      setSelectedPeriodId(periodId);
      setTargetPeriodId(periodId);
    }
  }, [benefit, initialPeriodId]);

  useLayoutEffect(() => {
    if (!periodTabsRef.current || !targetPeriodId || visiblePeriods.length === 0) return;
    const container = periodTabsRef.current;
    container.scrollLeft = container.scrollWidth;
  }, [targetPeriodId, visiblePeriods, isOpen]);

  useEffect(() => {
    if (!periodTabsRef.current || !targetPeriodId || visiblePeriods.length === 0) return;
    const container = periodTabsRef.current;
    const targetIndex = visiblePeriods.findIndex((p: { id: string }) => p.id === targetPeriodId);
    if (targetIndex >= 0) {
      const timer = setTimeout(() => {
        const tabElements = container.querySelectorAll('button');
        const targetTab = tabElements[targetIndex] as HTMLElement;
        if (targetTab) {
          targetTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [targetPeriodId, visiblePeriods, isOpen]);

  if (!isOpen || !benefit) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  const periodValue = benefit.periods?.length
    ? benefit.creditAmount / benefit.periods.length
    : benefit.creditAmount;

  const now = new Date();
  const periodEntries = benefit.periods ?? [];
  const displayPeriods = periodEntries
    .filter(period => new Date(period.startDate) <= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const selectedPeriod = displayPeriods.find(period => period.id === selectedPeriodId) ?? displayPeriods[0];
  const selectedPeriodIdValue = selectedPeriod?.id ?? '';

  const formatPeriodLabel = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPeriodTransactions = (): StoredTransaction[] => {
    if (selectedPeriodId && benefit.periods) {
      const period = benefit.periods.find(p => p.id === selectedPeriodId);
      return period?.transactions ?? [];
    }
    return benefit.transactions ?? [];
  };

  const getPeriodUsedAmount = (): number => {
    if (selectedPeriodId && benefit.periods) {
      const period = benefit.periods.find(p => p.id === selectedPeriodId);
      return period?.usedAmount ?? 0;
    }
    return benefit.currentUsed;
  };

  const transactions = getPeriodTransactions();
  const usedAmount = getPeriodUsedAmount();

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="presentation"
      tabIndex={0}
    >
      <div className="modal-content" role="dialog" aria-modal="true">
        <h2 className="text-xl font-bold mb-4">{benefit.name}</h2>

        {displayPeriods.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Segment Transactions</div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="text-sm text-slate-400">Period</div>
                <div
                  ref={periodTabsRef}
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
                >
                  {displayPeriods.map(period => {
                    const isSelected = period.id === selectedPeriodIdValue;
                    const periodUsed = period.usedAmount;
                    const hasTransactions = period.transactions && period.transactions.length > 0;
                    const isComplete = hasTransactions && periodUsed >= periodValue;
                    const endDate = new Date(period.endDate);
                    const isPast = now > endDate;
                    const borderClass = isComplete
                      ? 'border-emerald-400'
                      : isPast
                        ? 'border-red-400'
                        : 'border-amber-400';
                    const spentTextClass = isComplete
                      ? 'text-emerald-300'
                      : isPast
                        ? 'text-red-300'
                        : 'text-amber-300';

                    return (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => setSelectedPeriodId(period.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${borderClass} ${
                          isSelected
                            ? 'bg-slate-200 text-slate-900'
                            : 'bg-slate-900 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span>{formatPeriodLabel(period.startDate, period.endDate)}</span>
                          <span className={isSelected ? 'text-slate-700' : spentTextClass}>
                            ${periodUsed.toFixed(0)} of ${periodValue.toFixed(0)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedPeriod && (
                <div className="grid gap-2 pl-4 border-l border-slate-700">
                  <div className="text-sm text-slate-400">
                    Transactions ({formatPeriodLabel(selectedPeriod.startDate, selectedPeriod.endDate)})
                  </div>
                  {transactions.length > 0 ? (
                    <div className="space-y-1">
                      {transactions.map((tx, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span className="text-slate-300">
                            {formatDate(tx.date)} {tx.description}
                          </span>
                          <span className="text-emerald-300">${tx.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm py-2 border-t border-slate-700 font-medium">
                        <span className="text-slate-300">Total</span>
                        <span className="text-slate-100">${usedAmount.toFixed(2)} of ${periodValue.toFixed(0)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic">
                      No transactions imported yet. Import your statement to track usage.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {displayPeriods.length === 0 && (
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Transactions</div>
            {transactions.length > 0 ? (
              <div className="space-y-1">
                {transactions.map((tx, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span className="text-slate-300">
                      {formatDate(tx.date)} {tx.description}
                    </span>
                    <span className="text-emerald-300">${tx.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm py-2 border-t border-slate-700 font-medium">
                  <span className="text-slate-300">Total</span>
                  <span className="text-slate-100">${usedAmount.toFixed(2)} of ${benefit.creditAmount}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">
                No transactions imported yet. Import your statement to track usage.
              </div>
            )}
          </div>
        )}

        {benefit.activationRequired && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={benefit.activationAcknowledged}
                onChange={() => onToggleActivation(benefit.id)}
                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Enrolled/activated benefit</span>
            </label>
          </div>
        )}

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!benefit.ignored}
              onChange={() => onToggleVisibility(benefit.id)}
              className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm">Show in list (uncheck to hide)</span>
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
