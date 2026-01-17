import { useState, useCallback, memo } from 'react';
import type { CreditCard, Benefit, CardStats } from '../types';

interface CardHeaderProps {
  card: CreditCard;
  stats?: CardStats;
  allBenefits: Benefit[];
  onUpdateBenefit: (id: string) => void;
  onImportClick?: () => void;
}

function CardHeaderComponent({ card, stats, allBenefits, onUpdateBenefit, onImportClick }: CardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const percentUsed = stats 
    ? Math.min((stats.usedValue / stats.totalValue) * 100, 100) 
    : 0;

  const ignoredCount = allBenefits.filter(b => b.ignored).length;

  const handleToggle = useCallback((benefit: Benefit) => {
    onUpdateBenefit(benefit.id);
  }, [onUpdateBenefit]);

  return (
    <div 
      className="rounded-lg p-6 mb-6 relative"
      style={{ backgroundColor: `${card.color}20`, borderLeft: `4px solid ${card.color}` }}
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{card.name}</h2>
          <p className="text-slate-400">${card.annualFee}/year annual fee</p>
        </div>
        <div className="flex items-center gap-2">
          {onImportClick && (
            <button
              onClick={onImportClick}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Import statement"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
          )}
          {ignoredCount > 0 && (
            <span className="text-xs text-amber-400">
              {ignoredCount} ignored
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Manage benefits"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </button>
              {dropdownOpen && (
                <>
                   <button
                     className="fixed inset-0 z-10 bg-transparent border-0 cursor-default"
                     onClick={() => setDropdownOpen(false)}
                     onKeyDown={(e) => e.key === 'Escape' && setDropdownOpen(false)}
                     tabIndex={0}
                     aria-label="Close dropdown"
                   />
                   <div 
                     className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto"
                     role="menu"
                   >
                   <div className="p-2">
                     <p className="text-xs text-slate-500 px-2 py-1">Toggle benefits visibility</p>
                     {allBenefits.map(benefit => (
                       <label
                         key={benefit.id}
                         className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 rounded cursor-pointer"
                         role="menuitem"
                       >
                         <input
                           type="checkbox"
                           checked={!benefit.ignored}
                           onChange={() => handleToggle(benefit)}
                           className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                         />
                         <span className="text-sm truncate flex-1">{benefit.name}</span>
                       </label>
                     ))}
                   </div>
                 </div>
              </>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Value Used</span>
            <span className="text-slate-300">
              ${stats.usedValue.toFixed(0)} / ${stats.totalValue}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-emerald-400">
              Current: {stats.currentPeriodCompletedCount}/{stats.totalBenefits}
            </span>
            <span className="text-emerald-400">
              YTD: {stats.ytdCompletedPeriods}/{stats.ytdTotalPeriods}
            </span>
            <span className="text-amber-400">◐ {stats.pendingCount} pending</span>
            <span className="text-red-400">✗ {stats.missedCount} missed</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const CardHeader = memo(CardHeaderComponent);
