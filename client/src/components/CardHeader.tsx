import { CreditCard } from '../types';

interface CardHeaderProps {
  card: CreditCard;
  stats?: {
    totalValue: number;
    usedValue: number;
    completedCount: number;
    pendingCount: number;
    missedCount: number;
  };
}

export function CardHeader({ card, stats }: CardHeaderProps) {
  const percentUsed = stats 
    ? Math.min((stats.usedValue / stats.totalValue) * 100, 100) 
    : 0;

  return (
    <div 
      className="rounded-lg p-6 mb-6"
      style={{ backgroundColor: `${card.color}20`, borderLeft: `4px solid ${card.color}` }}
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{card.name}</h2>
          <p className="text-slate-400">${card.annualFee}/year annual fee</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">
            {card.resetBasis === 'calendar-year' ? 'Calendar Year' : 'Anniversary'} Reset
          </p>
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
            <span className="text-emerald-400">✓ {stats.completedCount} completed</span>
            <span className="text-amber-400">◐ {stats.pendingCount} pending</span>
            <span className="text-red-400">✗ {stats.missedCount} missed</span>
          </div>
        </div>
      )}
    </div>
  );
}
