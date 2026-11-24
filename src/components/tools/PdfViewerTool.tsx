import React, { useEffect, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  FilePlus2,
  Lock,
} from 'lucide-react';
import type { pdfjsLib } from '../../utils/pdfWorker';
import type { Language, StoredFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { loadPdfJsDocument, renderPageToCanvas, createSamplePdf } from '../../utils/pdfWorker';
import { formatFileSize } from '../../utils/pdfLogic';
import { ToolFlowShell } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface PdfViewerToolProps {
  language: Language;
  t: UIStrings;
  initialFile?: StoredFile | null;
  onBack: () => void;
  onFileOpened: (file: { name: string; bytes: Uint8Array; pageCount: number }) => Promise<void>;
}

export const PdfViewerTool: React.FC<PdfViewerToolProps> = ({
  language,
  t,
  initialFile,
  onBack,
  onFileOpened,
}) => {
  const copy = TOOL_TRANSLATIONS[language].viewer;
  const [fileName, setFileName] = useState<string>(initialFile?.name || '');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(initialFile?.bytes || null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState('1');
  const [zoom, setZoom] = useState(1.25);
  const [nightMode, setNightMode] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const openBytes = async (
    name: string,
    bytes: Uint8Array,
    password?: string,
    recordInLibrary = true
  ) => {
    setError(null);
    try {
      const doc = await loadPdfJsDocument(bytes, password);
      setPdfDoc((prev) => {
        prev?.cleanup().catch(() => {});
        return doc;
      });
      setFileName(name);
      setFileBytes(bytes);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setJumpInput('1');
      setNeedsPassword(false);
      setPasswordInput('');
      if (recordInLibrary) {
        await onFileOpened({ name, bytes, pageCount: doc.numPages });
      }
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      if (errObj?.name === 'PasswordException') {
        setFileName(name);
        setFileBytes(bytes);
        setNeedsPassword(true);
        if (password) {
          setError('Incorrect password. Please try again.');
        }
      } else {
        setError(errObj?.message || 'Unable to read this PDF file. Please try another file.');
      }
    }
  };

  useEffect(() => {
    if (initialFile) {
      openBytes(initialFile.name, initialFile.bytes, undefined, false);
    }
    return () => {
      pdfDoc?.cleanup().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile?.id]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      setRendering(true);
      try {
        await renderPageToCanvas(pdfDoc, currentPage, canvasRef.current, zoom);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render page.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, zoom]);

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid .pdf file.');
      return;
    }
    const buffer = await file.arrayBuffer();
    await openBytes(file.name, new Uint8Array(buffer), undefined, true);
  };

  const handleTrySample = async () => {
    const sample = await createSamplePdf('RedLeaf Reader Sample', 4);
    await openBytes(sample.name, sample.bytes, undefined, true);
  };

  const goToPage = (page: number) => {
    const clamped = Math.min(numPages, Math.max(1, page));
    setCurrentPage(clamped);
    setJumpInput(String(clamped));
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!Number.isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setJumpInput(String(currentPage));
    }
  };

  return (
    <ToolFlowShell
      toolId="viewer"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${fileBytes ? formatFileSize(fileBytes.byteLength) : ''}` : copy.shortDesc}
      step={pdfDoc ? 'options' : 'pick'}
      onBack={onBack}
      t={t}
      hideSteps
      error={error}
    >
      {needsPassword && fileBytes ? (
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-6 md:p-8 max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Password Required
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter the password to open <strong>{fileName}</strong> locally on your device.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openBytes(fileName, fileBytes, passwordInput, true);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter PDF password"
              aria-label="PDF password"
              className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-300 dark:border-[#3A3E45] text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F]"
            />
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
            >
              Unlock & View
            </button>
          </form>
        </div>
      ) : !pdfDoc ? (
        <FileDropzone
          accept=".pdf,application/pdf"
          title={t.pickPdfTitle}
          hint={t.dropHint}
          onFilesSelected={handleFilesSelected}
          onTrySample={handleTrySample}
          sampleLabel={t.trySamplePdf}
          error={error}
          t={t}
        />
      ) : (
        <div className="space-y-4">
          {/* Reader Toolbar */}
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-3 flex flex-wrap items-center justify-between gap-2">
            {/* Page Jump Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onBlur={() => {
                    const p = parseInt(jumpInput, 10);
                    if (!Number.isNaN(p)) goToPage(p);
                  }}
                  aria-label="Jump to page number"
                  className="w-14 h-11 text-center rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pr-1">
                  / {numPages}
                </span>
              </form>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                aria-label="Next page"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom + Night Mode + Open Another */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                disabled={zoom <= 0.5}
                aria-label="Zoom out"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                disabled={zoom >= 2.5}
                aria-label="Zoom in"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setNightMode((n) => !n)}
                aria-pressed={nightMode}
                aria-label="Toggle reader night mode"
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  nightMode
                    ? 'bg-slate-900 text-amber-300 border-slate-700'
                    : 'bg-white dark:bg-[#242629] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#3A3E45]'
                }`}
              >
                {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">Night</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  pdfDoc.cleanup().catch(() => {});
                  setPdfDoc(null);
                  setFileName('');
                  setFileBytes(null);
                }}
                aria-label="Open different PDF"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-slate-700 dark:text-slate-200 flex items-center justify-center"
              >
                <FilePlus2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            className={`rounded-3xl border border-slate-200 dark:border-[#2E3136] p-3 md:p-6 overflow-auto max-h-[72vh] flex justify-center transition-colors ${
              nightMode ? 'bg-[#0F1115]' : 'bg-slate-100 dark:bg-[#16181A]'
            }`}
          >
            <div className="relative inline-block shadow-md rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                data-testid="pdf-viewer-canvas"
                className="block max-w-full h-auto transition-[filter] duration-150"
                style={nightMode ? { filter: 'invert(0.92) hue-rotate(180deg)' } : undefined}
              />
              {rendering && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/30 flex items-center justify-center">
                  <div className="w-7 h-7 border-[3px] border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolFlowShell>
  );
};
