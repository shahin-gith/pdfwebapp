export type NavTab = 'home' | 'tools' | 'files' | 'settings';

export type ToolId =
  | 'viewer'
  | 'merge'
  | 'split'
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'compress'
  | 'organize'
  | 'lock-unlock'
  | 'scan'
  | 'ocr-scan'
  | 'qr-scanner'
  | 'watermark';

export type Language = 'en' | 'bn';
export type ThemeMode = 'light' | 'dark';

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  createdAt: number;
  toolUsed: ToolId | 'imported';
  mimeType: string;
  bytes: Uint8Array;
}

export interface ToolDefinition {
  id: ToolId;
  category: 'view' | 'edit' | 'convert' | 'security' | 'scanner';
  featuredOnHome: boolean;
  accentBgLight: string;
  accentBgDark: string;
  accentTextLight: string;
  accentTextDark: string;
}

export interface ProcessProgress {
  percent: number;
  label: string;
}

export interface ToolOutputFile {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
  pageCount: number;
  originalSize?: number;
}
