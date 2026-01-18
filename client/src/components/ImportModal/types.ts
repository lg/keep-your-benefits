import type { DragEvent, ChangeEvent } from 'react';

export type ImportRowType = 'matched' | 'credit' | 'transaction';

export interface DisplayRow {
  date: Date;
  description: string;
  benefitName: string | null;
  amount: number;
  rowType: ImportRowType;
}

export interface UploadStepProps {
  error: string | null;
  isDragging: boolean;
  importNote: string;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onImportNoteChange: (note: string) => void;
  onImportNoteBlur: () => void;
  onClose: () => void;
}

export interface PreviewStepProps {
  totalMatched: number;
  displayRows: DisplayRow[];
  totalMatchedAmount: number;
  totalCredits: number;
  onBack: () => void;
  onImport: () => void;
}
