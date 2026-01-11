import { Benefit } from '../types';
import { ProgressBar } from './ProgressBar';
import { formatDate, getDaysUntilExpiry } from '../utils/dateUtils';

interface StatusBadgeProps {
  status: 'pending' | 'completed' | 'missed';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    pending: 'bg-amber-400 text-slate-900',
    completed: 'bg-emerald-500 text-white',
    missed: 'bg-red-500 text-white',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface BenefitCardProps {
  benefit: Benefit;
  onEdit: (benefit: Benefit) => void;
  onToggleActivation: (id: string) => void;
}

export function BenefitCard({ benefit, onEdit, onToggleActivation }: BenefitCardProps) {
  const daysUntilExpiry = getDaysUntilExpiry(benefit.endDate);
  const progressPercent = Math.min((benefit.currentUsed / benefit.creditAmount) * 100, 100);
  
  const segmentsCount = () => {
    switch (benefit.resetFrequency) {
      case 'quarterly':
        return 4;
      case 'twice-yearly':
        return 2;
      case 'annual':
        return 1;
      default:
        return 1;
    }
  };

  interface ProgressSegment {
    id: string;
    status: 'pending' | 'completed' | 'missed';
    label?: string;
  }

  const getSegments = (): ProgressSegment[] => {
    if (benefit.periods && benefit.periods.length > 0) {
      return benefit.periods.map(p => ({
        id: p.id,
        status: p.status as 'pending' | 'completed' | 'missed',
        label: `${formatDate(p.startDate)} - ${formatDate(p.endDate)}`
      }));
    }
    
    const count = segmentsCount();
    const segmentUsed = benefit.creditAmount / count;
    const currentSegmentIndex = Math.floor(benefit.currentUsed / segmentUsed);
    
    return Array.from({ length: count }).map((_, i): ProgressSegment => ({
      id: `seg-${i}`,
      status: i < currentSegmentIndex 
        ? 'completed' 
        : i === currentSegmentIndex && benefit.currentUsed < benefit.creditAmount
        ? 'pending'
        : 'missed',
      label: `Segment ${i + 1}`
    }));
  };

  const activationClass = () => {
    if (!benefit.activationRequired) return 'border-l-emerald-500';
    return benefit.activationAcknowledged ? 'border-l-emerald-500' : 'border-l-amber-400';
  };

  return (
    <div className={`benefit-card ${activationClass()}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{benefit.name}</h3>
          <p className="text-slate-400 text-sm">{benefit.shortDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={benefit.status} />
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Progress</span>
          <span className="text-slate-300">
            ${benefit.currentUsed.toFixed(0)} / ${benefit.creditAmount}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              benefit.status === 'completed' ? 'bg-emerald-500' :
              benefit.status === 'missed' ? 'bg-red-500' : 'bg-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {benefit.periods && benefit.periods.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1">Periods:</p>
          <ProgressBar segments={getSegments()} segmentsCount={segmentsCount()} />
        </div>
      )}

      <div className="flex justify-between items-center text-sm">
        <div className="text-slate-500">
          Expires: {formatDate(benefit.endDate)}
          {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
            <span className="text-amber-400 ml-1">
              ({daysUntilExpiry} days left)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {benefit.activationRequired && (
            <button
              onClick={() => onToggleActivation(benefit.id)}
              className={`text-xs px-2 py-1 rounded ${
                benefit.activationAcknowledged
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-400/20 text-amber-400'
              }`}
            >
              {benefit.activationAcknowledged ? 'Activated' : 'Needs Activation'}
            </button>
          )}
          <button
            onClick={() => onEdit(benefit)}
            className="btn-secondary text-xs px-3 py-1"
          >
            Edit
          </button>
        </div>
      </div>

      {benefit.notes && (
        <div className="mt-2 p-2 bg-slate-900 rounded text-sm text-slate-400">
          📝 {benefit.notes}
        </div>
      )}
    </div>
  );
}
