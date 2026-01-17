import {
  useState,
  useCallback,
  useMemo,
  type MouseEvent,
  type KeyboardEvent,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import type { BenefitDefinition } from '@shared/types';
import type { ImportResult, CardType, ParsedTransaction, MatchedCredit } from '../types/import';
import { parseAmexCredits } from '../services/amexParser';
import { matchCredits, aggregateCredits } from '../services/benefitMatcher';

interface ImportModalProps {
  isOpen: boolean;
  cardId: string;
  cardName: string;
  benefits: BenefitDefinition[];
  onClose: () => void;
  onImport: (
    aggregated: Map<
      string,
      {
        currentUsed: number;
        periods?: Record<string, { usedAmount: number; transactions?: { date: string; description: string; amount: number }[] }>;
        transactions?: { date: string; description: string; amount: number }[];
      }
    >
  ) => void;
}

type ImportStep = 'upload' | 'preview';

// Unified row type for display
interface DisplayRow {
  date: Date;
  description: string;
  benefitName: string | null;
  amount: number;
  isMatched: boolean;
}

export function ImportModal({
  isOpen,
  cardId,
  cardName,
  benefits,
  onClose,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setError(null);
    setImportResult(null);
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      try {
        const content = await file.text();

        // Parse based on card type
        let credits;
        if (cardId.startsWith('amex')) {
          credits = parseAmexCredits(content);
        } else {
          // TODO: Add Chase parser
          setError('Chase import is not yet supported');
          return;
        }

        if (credits.length === 0) {
          setError(
            'No statement credits found in the CSV. Make sure you exported the correct file.'
          );
          return;
        }

        // Match credits to benefits
        const result = matchCredits(
          credits,
          cardId as CardType,
          benefits
        );

        setImportResult(result);
        setStep('preview');
      } catch (err) {
        setError(`Failed to parse CSV: ${(err as Error).message}`);
      }
    },
    [cardId, benefits]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleImport = useCallback(() => {
    if (!importResult) return;

    // Aggregate all matched credits
    const aggregated = aggregateCredits(importResult.matchedCredits, benefits);

    onImport(aggregated);
    handleClose();
  }, [importResult, benefits, onImport, handleClose]);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  // Combine matched and unmatched credits into a single display list
  const displayRows = useMemo((): DisplayRow[] => {
    if (!importResult) return [];

    const matchedRows: DisplayRow[] = importResult.matchedCredits.map(
      (credit: MatchedCredit) => ({
        date: credit.transaction.date,
        description: credit.transaction.description,
        benefitName: credit.benefitName,
        amount: credit.creditAmount,
        isMatched: true,
      })
    );

    const unmatchedRows: DisplayRow[] = importResult.unmatchedCredits.map(
      (credit: ParsedTransaction) => ({
        date: credit.date,
        description: credit.description,
        benefitName: null,
        amount: Math.abs(credit.amount),
        isMatched: false,
      })
    );

    // Combine and sort by date (newest first)
    return [...matchedRows, ...unmatchedRows].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [importResult]);

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const totalMatchedAmount = importResult
    ? importResult.matchedCredits.reduce((sum, c) => sum + c.creditAmount, 0)
    : 0;

  const totalCredits = importResult
    ? importResult.totalMatched + importResult.totalUnmatched
    : 0;

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="presentation"
      tabIndex={0}
    >
      <div
        className="modal-content max-w-2xl"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl font-bold mb-4">
          Import {cardName} Statement
        </h2>

        {step === 'upload' && (
          <>
            <p className="text-sm text-slate-400 mb-4">
              Upload your Amex statement CSV to automatically import your
              benefit credits.
            </p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <div className="mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-12 w-12 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-slate-300 mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-slate-500 text-sm mb-4">or</p>
              <label className="btn-primary cursor-pointer">
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <div className="mt-6 text-xs text-slate-500">
              <p className="font-medium mb-1">How to export from Amex:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to your Amex account</li>
                <li>Go to Statements & Activity</li>
                <li>Click "Download" and select CSV format</li>
                <li>Upload the downloaded file here</li>
              </ol>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'preview' && importResult && (
          <>
            <p className="text-sm text-slate-400 mb-4">
              {importResult.totalMatched} of {totalCredits} credits matched
              {importResult.totalMatched > 0 && (
                <span className="text-emerald-400">
                  {' '}({formatAmount(totalMatchedAmount)} will be imported)
                </span>
              )}
            </p>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left">Benefit</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-slate-700 ${
                        row.isMatched
                          ? 'hover:bg-slate-800/50'
                          : 'text-slate-500'
                      }`}
                    >
                      <td className={`p-2 ${row.isMatched ? 'text-slate-400' : ''}`}>
                        {formatDate(row.date)}
                      </td>
                      <td className={`p-2 ${row.isMatched ? 'text-slate-300' : ''}`}>
                        {row.description}
                      </td>
                      <td className={`p-2 ${row.isMatched ? 'text-emerald-400' : ''}`}>
                        {row.benefitName ?? '—'}
                      </td>
                      <td className={`p-2 text-right ${row.isMatched ? 'text-emerald-400' : ''}`}>
                        {formatAmount(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                {importResult.totalMatched === 0 ? (
                  <span className="text-amber-400">No credits matched</span>
                ) : (
                  <>
                    <span className="text-emerald-400 font-medium">
                      {formatAmount(totalMatchedAmount)}
                    </span>
                    {' '}from {importResult.totalMatched} credits
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('upload')}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importResult.totalMatched === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
