import type { StoredFile, ToolDefinition, ToolId } from '../types/pdf';

export const TOOLS_CATALOG: ToolDefinition[] = [
  {
    id: 'viewer',
    category: 'view',
    featuredOnHome: true,
    accentBgLight: 'bg-red-50',
    accentBgDark: 'dark:bg-red-950/50',
    accentTextLight: 'text-[#D32F2F]',
    accentTextDark: 'dark:text-red-400',
  },
  {
    id: 'merge',
    category: 'edit',
    featuredOnHome: true,
    accentBgLight: 'bg-rose-50',
    accentBgDark: 'dark:bg-rose-950/50',
    accentTextLight: 'text-rose-700',
    accentTextDark: 'dark:text-rose-300',
  },
  {
    id: 'split',
    category: 'edit',
    featuredOnHome: true,
    accentBgLight: 'bg-orange-50',
    accentBgDark: 'dark:bg-orange-950/50',
    accentTextLight: 'text-orange-700',
    accentTextDark: 'dark:text-orange-300',
  },
  {
    id: 'image-to-pdf',
    category: 'convert',
    featuredOnHome: true,
    accentBgLight: 'bg-amber-50',
    accentBgDark: 'dark:bg-amber-950/50',
    accentTextLight: 'text-amber-700',
    accentTextDark: 'dark:text-amber-300',
  },
  {
    id: 'pdf-to-image',
    category: 'convert',
    featuredOnHome: true,
    accentBgLight: 'bg-emerald-50',
    accentBgDark: 'dark:bg-emerald-950/50',
    accentTextLight: 'text-emerald-700',
    accentTextDark: 'dark:text-emerald-300',
  },
  {
    id: 'compress',
    category: 'edit',
    featuredOnHome: true,
    accentBgLight: 'bg-sky-50',
    accentBgDark: 'dark:bg-sky-950/50',
    accentTextLight: 'text-sky-700',
    accentTextDark: 'dark:text-sky-300',
  },
  {
    id: 'organize',
    category: 'edit',
    featuredOnHome: true,
    accentBgLight: 'bg-indigo-50',
    accentBgDark: 'dark:bg-indigo-950/50',
    accentTextLight: 'text-indigo-700',
    accentTextDark: 'dark:text-indigo-300',
  },
  {
    id: 'lock-unlock',
    category: 'security',
    featuredOnHome: true,
    accentBgLight: 'bg-purple-50',
    accentBgDark: 'dark:bg-purple-950/50',
    accentTextLight: 'text-purple-700',
    accentTextDark: 'dark:text-purple-300',
  },
  {
    id: 'scan',
    category: 'scanner',
    featuredOnHome: false,
    accentBgLight: 'bg-teal-50',
    accentBgDark: 'dark:bg-teal-950/50',
    accentTextLight: 'text-teal-700',
    accentTextDark: 'dark:text-teal-300',
  },
  {
    id: 'ocr-scan',
    category: 'scanner',
    featuredOnHome: false,
    accentBgLight: 'bg-cyan-50',
    accentBgDark: 'dark:bg-cyan-950/50',
    accentTextLight: 'text-cyan-700',
    accentTextDark: 'dark:text-cyan-300',
  },
  {
    id: 'qr-scanner',
    category: 'scanner',
    featuredOnHome: false,
    accentBgLight: 'bg-red-50',
    accentBgDark: 'dark:bg-red-950/50',
    accentTextLight: 'text-[#D32F2F]',
    accentTextDark: 'dark:text-red-400',
  },
  {
    id: 'watermark',
    category: 'edit',
    featuredOnHome: false,
    accentBgLight: 'bg-violet-50',
    accentBgDark: 'dark:bg-violet-950/50',
    accentTextLight: 'text-violet-700',
    accentTextDark: 'dark:text-violet-300',
  },
];

/**
 * Parses a human page range string such as "1-3, 5, 7-9" into sorted unique
 * 1-based page numbers, validating bounds against totalPages.
 */
export function parsePageRanges(input: string, totalPages: number): number[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error('Document has no valid pages.');
  }
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Enter at least one page number or range (for example: 1-3, 5).');
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Enter a valid page range such as 1-3, 5.');
  }

  const selected = new Set<number>();

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > totalPages) {
        throw new Error(`Page ${page} is out of range (1–${totalPages}).`);
      }
      selected.add(page);
    } else if (/^\d+\s*-\s*\d+$/.test(part)) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Number(startStr);
      const end = Number(endStr);
      if (start < 1 || end > totalPages || start > end) {
        throw new Error(`Invalid range "${part}". Valid pages are 1–${totalPages}.`);
      }
      for (let p = start; p <= end; p++) {
        selected.add(p);
      }
    } else {
      throw new Error(`Could not understand "${part}". Use numbers or ranges like 1-3, 5.`);
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Formats byte sizes into clean human-readable strings.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Immutably moves an item in an array from one index to another.
 */
export function reorderArray<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Validates password inputs for Lock PDF. Returns null if valid, else error message.
 */
export function validatePasswordPair(password: string, confirmPassword: string): string | null {
  if (!password || password.length < 4) {
    return 'Password must be at least 4 characters long.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

/**
 * Builds a clean output filename without duplicate extensions.
 */
export function buildOutputFilename(baseName: string, suffix: string, ext = 'pdf'): string {
  const cleaned = baseName.replace(/\.[^/.]+$/, '').trim() || 'document';
  const safe = cleaned.replace(/[\\/:*?"<>|]/g, '_');
  return `${safe}_${suffix}.${ext}`;
}

/**
 * Filters tools by search query across English and Bengali names/descriptions.
 */
export function filterToolIds(
  query: string,
  catalog: readonly ToolDefinition[],
  getText: (id: ToolId) => { name: string; shortDesc: string }
): ToolDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...catalog];
  return catalog.filter((tool) => {
    const t = getText(tool.id);
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortDesc.toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q)
    );
  });
}

/**
 * Filters stored files by filename search query.
 */
export function filterStoredFiles(query: string, files: readonly StoredFile[]): StoredFile[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...files];
  return files.filter((file) => file.name.toLowerCase().includes(q));
}

/**
 * Calculates percentage saved for compression display (clamped >= 0).
 */
export function calculateCompressionSavings(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0 || compressedBytes >= originalBytes) return 0;
  return Math.round(((originalBytes - compressedBytes) / originalBytes) * 100);
}
