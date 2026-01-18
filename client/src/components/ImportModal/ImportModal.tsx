import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  type MouseEvent,
  type KeyboardEvent,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import type { BenefitDefinition } from '@shared/types';
import type { ImportResult, CardType, ParsedTransaction } from '../../types/import';
import { parseAmexCsv, extractAmexCredits } from '../../services/amexParser';
import { matchCredits, aggregateCredits } from '../../services/benefitMatcher';
import { getImportNote, saveImportNote } from '../../storage/userBenefits';
import type { DisplayRow } from './types';
import { UploadStep } from './UploadStep';
import { PreviewStep } from './PreviewStep';

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
        periods?: Record<string, { usedAmount: number; transactions?: { date: string; description: string; amount: number }[] }>;
        transactions?: { date: string; description: string; amount: number }[];
      }
    >
  ) => void;
}

export default function ImportModal({
  isOpen,
  cardId,
  cardName,
  benefits,
  onClose,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [allTransactions, setAllTransactions] = useState<ParsedTransaction[]>([]);
  const [importNote, setImportNote] = useState('');

  const resetState = useCallback(() => {
    setStep('upload');
    setError(null);
    setImportResult(null);
    setAllTransactions([]);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isOpen && cardId) {
      setImportNote(getImportNote(cardId));
    }
  }, [isOpen, cardId]);

  const persistImportNote = useCallback(() => {
    if (!cardId) return;
    saveImportNote(cardId, importNote.trim());
  }, [cardId, importNote]);

  const handleClose = useCallback(() => {
    persistImportNote();
    resetState();
    onClose();
  }, [persistImportNote, onClose, resetState]);

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
        let parsedTransactions: ParsedTransaction[] = [];
        let credits: ParsedTransaction[] = [];
        if (cardId.startsWith('amex')) {
          parsedTransactions = parseAmexCsv(content);
          credits = extractAmexCredits(parsedTransactions);
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
        setAllTransactions(parsedTransactions);
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

    persistImportNote();

    // Aggregate all matched credits
    const aggregated = aggregateCredits(importResult.matchedCredits, benefits);

    onImport(aggregated);
    handleClose();
  }, [importResult, benefits, onImport, handleClose, persistImportNote]);

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

  const handleBack = useCallback(() => {
    setStep('upload');
  }, []);

  // Combine all transactions into a single display list with matching info
  const displayRows = useMemo((): DisplayRow[] => {
    if (!importResult) return [];

    // Build a set of credit transaction keys for quick lookup
    const creditKeys = new Set<string>();
    for (const credit of importResult.matchedCredits) {
      const key = `${credit.transaction.date.getTime()}-${credit.transaction.description}-${Math.abs(credit.transaction.amount)}`;
      creditKeys.add(key);
    }
    for (const credit of importResult.unmatchedCredits) {
      const key = `${credit.date.getTime()}-${credit.description}-${Math.abs(credit.amount)}`;
      creditKeys.add(key);
    }

    const rows: DisplayRow[] = [];

    // Add matched credits
    for (const credit of importResult.matchedCredits) {
      rows.push({
        date: credit.transaction.date,
        description: credit.transaction.extendedDetails ?? credit.transaction.description,
        benefitName: credit.benefitName,
        amount: credit.transaction.amount,
        rowType: 'matched',
      });
    }

    // Add unmatched credits
    for (const credit of importResult.unmatchedCredits) {
      rows.push({
        date: credit.date,
        description: credit.extendedDetails ?? credit.description,
        benefitName: null,
        amount: credit.amount,
        rowType: 'credit',
      });
    }

    // Add non-credit transactions (purchases, payments, etc.)
    for (const transaction of allTransactions) {
      const key = `${transaction.date.getTime()}-${transaction.description}-${Math.abs(transaction.amount)}`;
      if (!creditKeys.has(key)) {
        rows.push({
          date: transaction.date,
          description: transaction.extendedDetails ?? transaction.description,
          benefitName: null,
          amount: transaction.amount,
          rowType: 'transaction',
        });
      }
    }

    // Sort by date (newest first)
    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [importResult, allTransactions]);

  const totalMatchedAmount = importResult
    ? -importResult.matchedCredits.reduce((sum, c) => sum + c.creditAmount, 0)
    : 0;

  const totalCredits = importResult
    ? importResult.totalMatched + importResult.totalUnmatched
    : 0;

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="presentation"
      tabIndex={0}
    >
      <div
        className={`modal-content ${step === 'preview' ? 'w-[700px]' : 'w-[90vw] max-w-[560px]'}`}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl font-bold mb-4">
          Import {cardName} Statement
        </h2>

        {step === 'upload' && (
          <UploadStep
            error={error}
            isDragging={isDragging}
            importNote={importNote}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
            onImportNoteChange={setImportNote}
            onImportNoteBlur={persistImportNote}
            onClose={handleClose}
          />
        )}

        {step === 'preview' && importResult && (
          <PreviewStep
            totalMatched={importResult.totalMatched}
            displayRows={displayRows}
            totalMatchedAmount={totalMatchedAmount}
            totalCredits={totalCredits}
            onBack={handleBack}
            onImport={handleImport}
          />
        )}
      </div>
    </div>
  );
}
