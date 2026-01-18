import { useMemo, useCallback, memo } from 'react';
import { Benefit, ProgressSegment } from '../types';
import { ProgressBar } from './ProgressBar';
import { formatDate } from '../utils/dateUtils';

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
  selectedYear?: number;
  onViewDetails: (benefit: Benefit) => void;
  onViewPeriod?: (benefit: Benefit, periodId: string) => void;
}

function BenefitCardComponent({ benefit, selectedYear, onViewDetails, onViewPeriod }: BenefitCardProps) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const yearStart = selectedYear !== undefined
    ? new Date(Date.UTC(selectedYear, 0, 1))
    : null;
  const yearEnd = selectedYear !== undefined
    ? new Date(Date.UTC(selectedYear + 1, 0, 1))
    : null;
  const referenceDate = selectedYear !== undefined
    ? selectedYear > currentYear
      ? yearStart ?? now
      : selectedYear < currentYear
        ? yearEnd ?? now
        : now
    : now;
  const inSelectedYear = yearStart && yearEnd
    ? new Date(benefit.startDate) >= yearStart && new Date(benefit.endDate) < yearEnd
    : true;
  const isOutOfYearPast = selectedYear !== undefined && selectedYear < currentYear && !inSelectedYear;

  const getDaysUntilExpiryFor = (endDate: string) => {
    const expiry = new Date(endDate);
    const diff = expiry.getTime() - referenceDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getTimeProgressFor = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (referenceDate <= start) return 0;
    if (referenceDate >= end) return 100;

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = referenceDate.getTime() - start.getTime();
    return (elapsed / totalDuration) * 100;
  };

  const daysUntilExpiry = getDaysUntilExpiryFor(benefit.endDate);
  const overallTimeProgress = getTimeProgressFor(benefit.startDate, benefit.endDate);

  const segmentsCount = useMemo(() => 
    benefit.periods && benefit.periods.length > 0 ? benefit.periods.length : 1,
    [benefit.periods]
  );

  const segments = useMemo((): ProgressSegment[] => {
    if (benefit.periods && benefit.periods.length > 0) {
      const segmentValue = benefit.creditAmount / benefit.periods.length;

      return benefit.periods.map(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        const isFuture = referenceDate < start;
        const isPast = referenceDate > end;
        const isCurrent = !isFuture && !isPast;
        const isComplete = Boolean(benefit.claimedElsewhereYear)
          || p.usedAmount >= segmentValue;

        let status: ProgressSegment['status'] = 'pending';
        if (isFuture) {
          status = 'future';
        } else if (isComplete) {
          status = 'completed';
        } else if (isPast) {
          status = 'missed';
        } else {
          status = 'pending';
        }

        return {
          id: p.id,
          status,
          label: `${formatDate(p.startDate)} - ${formatDate(p.endDate)}`,
           timeProgress: isCurrent ? getTimeProgressFor(p.startDate, p.endDate) : undefined,

          startDate: p.startDate,
          endDate: p.endDate,
           daysLeft: isCurrent ? getDaysUntilExpiryFor(p.endDate) : undefined,

          isCurrent
        };
      });
    }

    const isComplete = Boolean(benefit.claimedElsewhereYear)
      || benefit.currentUsed >= benefit.creditAmount;
    const isPast = daysUntilExpiry <= 0 || isOutOfYearPast;
    const status: ProgressSegment['status'] = isComplete ? 'completed' : isPast ? 'missed' : 'pending';
    const isCurrent = !isPast;

    return [
      {
        id: 'overall',
        status,
        label: `${formatDate(benefit.startDate)} - ${formatDate(benefit.endDate)}`,
        timeProgress: isCurrent ? overallTimeProgress : undefined,
        startDate: benefit.startDate,
        endDate: benefit.endDate,
        daysLeft: isCurrent ? daysUntilExpiry : undefined,
        isCurrent
      }
    ];

  }, [benefit, daysUntilExpiry, overallTimeProgress]);

  const activationClass = benefit.activationRequired
    ? (benefit.activationAcknowledged ? 'border-l-emerald-500' : 'border-l-amber-400')
    : 'border-l-emerald-500';

  const handleSegmentClick = useCallback((segment: ProgressSegment) => {
    if (segment.id === 'overall') {
      onViewDetails(benefit);
    } else if (onViewPeriod) {
      onViewPeriod(benefit, segment.id);
    }
  }, [benefit, onViewDetails, onViewPeriod]);

  return (
    <div className={`benefit-card ${activationClass}`}>
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
        <ProgressBar segments={segments} segmentsCount={segmentsCount} onSegmentClick={handleSegmentClick} />
      </div>

      <div className="flex justify-between items-center text-sm">
        <div className="text-slate-500">
          Expires: {formatDate(benefit.endDate)}
          {daysUntilExpiry > 0 && daysUntilExpiry <= 30 ? (
            <span className="text-amber-400 ml-1">
              ({daysUntilExpiry} days left)
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          {benefit.activationRequired ? (
            <span
              className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border leading-tight ${
                benefit.activationAcknowledged
                  ? 'border-emerald-400/50 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-400/60 text-amber-400 bg-amber-400/10'
              }`}
            >
              {benefit.activationAcknowledged ? 'Activated' : 'Needs Activation'}
            </span>
          ) : null}
           <button
             onClick={() => onViewDetails(benefit)}
             className="btn-secondary text-xs px-3 py-1"
           >
             Details
           </button>
        </div>
      </div>
    </div>
  );
}

export const BenefitCard = memo(BenefitCardComponent);
