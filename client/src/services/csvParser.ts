// Generic CSV parsing utilities with support for quoted fields and multi-line values

export interface CsvParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
}

/**
 * Parse CSV content into an array of objects using header row as keys
 */
export function parseCsv<T extends Record<string, string>>(
  content: string,
  options: CsvParseOptions = {}
): T[] {
  const { delimiter = ',', hasHeader = true } = options;

  const rows = parseCsvRows(content, delimiter);

  if (rows.length === 0) {
    return [];
  }

  if (!hasHeader) {
    // Return rows as objects with numeric keys
    return rows.map((row) => {
      const obj: Record<string, string> = {};
      row.forEach((val, idx) => {
        obj[String(idx)] = val;
      });
      return obj as T;
    });
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? '';
    });
    return obj as T;
  });
}

/**
 * Parse CSV content into a 2D array of strings
 * Handles quoted fields with commas and newlines inside them
 */
export function parseCsvRows(content: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      // Regular character inside quotes (including newlines)
      currentField += char;
      i++;
      continue;
    }

    // Not in quotes
    if (char === '"') {
      // Start of quoted field
      inQuotes = true;
      i++;
      continue;
    }

    if (char === delimiter) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if (char === '\r' && nextChar === '\n') {
      // Windows line ending
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((f) => f !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      i += 2;
      continue;
    }

    if (char === '\n' || char === '\r') {
      // Unix or old Mac line ending
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((f) => f !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    // Regular character
    currentField += char;
    i++;
  }

  // Handle last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse a date string in MM/DD/YYYY format
 */
export function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const month = parseInt(match[1], 10) - 1; // JS months are 0-indexed
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const date = new Date(Date.UTC(year, month, day));

  // Validate the date
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Parse an amount string (handles negative values and currency symbols)
 */
export function parseAmount(amountStr: string): number {
  // Remove currency symbols, commas, and whitespace
  const cleaned = amountStr.replace(/[$,\s]/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}
