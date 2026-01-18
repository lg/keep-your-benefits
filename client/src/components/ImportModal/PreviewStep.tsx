import type { PreviewStepProps } from './types';
import { formatDate, formatAmount } from './utils';

function formatPositiveAmount(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

export function PreviewStep({
  totalMatched,
  displayRows,
  totalMatchedAmount,
  totalCredits,
  onBack,
  onImport,
}: PreviewStepProps) {
  return (
    <>
      <p className="text-sm text-slate-400 mb-4">
        {totalMatched} of {totalCredits} credits matched
        {totalMatched > 0 && (
          <span className="text-emerald-400">
            {' '}({formatPositiveAmount(totalMatchedAmount)} will be imported)
          </span>
        )}
      </p>

      <div className="max-h-[520px] overflow-y-auto overscroll-contain rounded-lg border border-slate-700">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-800 sticky top-0">
            <tr>
              <th className="p-2 text-left w-[90px]">Date</th>
              <th className="p-2 text-left w-[280px]">Description</th>
              <th className="p-2 text-left w-[180px]">Benefit</th>
              <th className="p-2 text-right w-[80px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => (
              <tr
                key={`${row.date.getTime()}-${row.description}-${index}`}
                className={`border-t border-slate-700 ${
                  row.rowType === 'matched'
                    ? 'hover:bg-slate-800/50'
                    : 'text-slate-600'
                }`}
              >
                <td className={`p-2 whitespace-nowrap ${row.rowType === 'matched' ? 'text-slate-400' : ''}`}>
                  {formatDate(row.date)}
                </td>
                <td className={`p-2 ${row.rowType === 'matched' ? 'text-slate-300' : ''}`}>
                  <div className="overflow-x-auto whitespace-nowrap scrollbar-none" title={row.description}>
                    {row.description}
                  </div>
                </td>
                <td className={`p-2 truncate ${row.rowType === 'matched' ? 'text-emerald-400' : ''}`} title={row.benefitName ?? undefined}>
                  {row.benefitName ?? '—'}
                </td>
                <td className={`p-2 text-right whitespace-nowrap ${row.rowType === 'matched' ? 'text-emerald-400' : ''}`}>
                  {formatAmount(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700">
        <div className="text-sm text-slate-400">
          {totalMatched === 0 ? (
            <span className="text-amber-400">No credits matched</span>
          ) : (
            <>
              <span className="text-emerald-400 font-medium">
                {formatPositiveAmount(totalMatchedAmount)}
              </span>
              {' '}from {totalMatched} credits
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            Back
          </button>
          <button
            onClick={onImport}
            disabled={totalMatched === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </>
  );
}
