import { memo } from 'react';
import type { ProgressSegment } from '../types';
import { Tooltip } from './Tooltip';

interface ProgressBarProps {
  segments: ProgressSegment[];
  segmentsCount: number;
  onSegmentClick?: (segment: ProgressSegment) => void;
}

const segmentClass = (status: ProgressSegment['status']) => {
  switch (status) {
    case 'completed':
      return 'progress-segment completed';
    case 'partial':
      return 'progress-segment partial';
    case 'missed':
      return 'progress-segment missed';
    default:
      return 'progress-segment pending';
  }
};

function ProgressBarComponent({ segments, segmentsCount, onSegmentClick }: ProgressBarProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: segmentsCount }).map((_, index) => {
        const segment = segments[index];
        const isClickable = segment && segment.status !== 'pending' && !!onSegmentClick;
        return (
          <div
            key={index}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            className={`flex-1 relative ${segment ? segmentClass(segment.status) : 'bg-slate-700'} ${isClickable ? 'cursor-pointer' : ''}`}
            {...(isClickable ? {
              onClick: () => onSegmentClick(segment),
              onKeyDown: e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSegmentClick(segment);
                }
              },
              'aria-label': segment.label || `Segment ${index + 1}`,
            } : {})}
          >
            <Tooltip content={segment?.label || `Segment ${index + 1}`}>
              <div className="w-full h-full" />
            </Tooltip>
            {segment && segment.isCurrent && segment.timeProgress !== undefined && segment.daysLeft !== undefined ? (
              <div
                className="absolute -top-1 -bottom-1 w-1 bg-white border border-slate-800 rounded-sm z-10"
                style={{ left: `${segment.timeProgress}%` }}
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3">
                  <Tooltip
                    content={
                      <div>
                        <div>{Math.round(segment.timeProgress)}% complete</div>
                        <div>{segment.daysLeft} days left</div>
                      </div>
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const ProgressBar = memo(ProgressBarComponent);
