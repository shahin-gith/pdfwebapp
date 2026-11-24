import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Scissors, Check } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import {
  createSamplePdf,
  loadPdfJsDocument,
  renderPageToDataUrl,
} from '../../utils/pdfWorker';
import { buildOutputFilename, formatFileSize, parsePageRanges } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface SplitPdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

export const SplitPdfTool: React.FC<SplitPdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language].split;
  const [step, setStep] = useState<FlowStep>('pick');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [mode, setMode] = useState<'range' | 'select'>('range');
  const [rangeText, setRangeText] = useState('1');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<Array<{ page: number; dataUrl: string }>>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const loadSourcePdf = async (name: string, bytes: Uint8Array) => {
    setError(null);
    try {
      const pdfDoc = await loadPdfJsDocument(bytes);
      const count = pdfDoc.numPages;
      setFileName(name);
      setFileBytes(bytes);
      setTotalPages(count);
      setRangeText(count > 1 ? `1-${Math.min(2, count)}` : '1');
      setSelectedPages([1]);
      setStep('options');

      setLoadingThumbs(true);
      const thumbs: Array<{ page: number; dataUrl: string }> = [];
      for (let p = 1; p <= Math.min(count, 40); p++) {
        const rendered = await renderPageToDataUrl(pdfDoc, p, 0.35, 'image/jpeg', 0.75);
        thumbs.push({ page: p, dataUrl: rendered.dataUrl });
      }
      setThumbnails(thumbs);
      await pdfDoc.cleanup();
    } catch {
      setError('Could not open this PDF. Make sure it is a valid, unlocked PDF file.');
    } finally {
      setLoadingThumbs(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    await loadSourcePdf(file.name, bytes);
  };

  const handleTrySample = async () => {
    const sample = await createSamplePdf('Quarterly Booklet', 5);
    await loadSourcePdf(sample.name, sample.bytes);
  };

  const togglePageSelection = (page: number) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page].sort((a, b) => a - b)
    );
  };

  const handleSplit = async () => {
    if (!fileBytes) return;
    setError(null);

    let pagesToExtract: number[] = [];
    try {
      if (mode === 'range') {
        pagesToExtract = parsePageRanges(rangeText, totalPages);
      } else {
        if (selectedPages.length === 0) {
          throw new Error('Select at least one page thumbnail to extract.');
        }
        pagesToExtract = [...selectedPages].sort((a, b) => a - b);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid page selection.');
      return;
    }

    setStep('processing');
    setProgress({ percent: 20, label: 'Loading source PDF...' });

    try {
      const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      setProgress({ percent: 55, label: `Extracting ${pagesToExtract.length} pages...` });

      const zeroIndexed = pagesToExtract.map((p) => p - 1);
      const copied = await outDoc.copyPages(srcDoc, zeroIndexed);
      copied.forEach((p) => outDoc.addPage(p));

      setProgress({ percent: 90, label: 'Saving split PDF...' });
      const outBytes = new Uint8Array(await outDoc.save());

      const output: ToolOutputFile = {
        name: buildOutputFilename(fileName, 'split'),
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: pagesToExtract.length,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF.');
      setStep('options');
    }
  };

  const handleReset = () => {
    setFileName('');
    setFileBytes(null);
    setThumbnails([]);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="split"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${totalPages} ${t.pages}` : copy.shortDesc}
      step={step}
      onBack={onBack}
      t={t}
      progress={progress}
      error={error}
      result={result}
      onOpenResult={onOpenResult}
      onShareResult={onShareResult}
      onSaveResult={onSaveResult}
      onReset={handleReset}
    >
      {step === 'pick' && (
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
      )}

      {step === 'options' && fileBytes && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{fileName}</span>
              <span>
                {totalPages} {totalPages === 1 ? t.page : t.pages} · {formatFileSize(fileBytes.byteLength)}
              </span>
            </div>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#242629]">
              <button
                type="button"
                onClick={() => setMode('range')}
                className={`min-h-[44px] rounded-xl text-xs md:text-sm font-semibold transition-colors ${
                  mode === 'range'
                    ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                By Page Range
              </button>
              <button
                type="button"
                onClick={() => setMode('select')}
                className={`min-h-[44px] rounded-xl text-xs md:text-sm font-semibold transition-colors ${
                  mode === 'select'
                    ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Select Pages
              </button>
            </div>

            {mode === 'range' ? (
              <div className="space-y-2">
                <label
                  htmlFor="split-range-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Pages or ranges (e.g. 1-3, 5) — Total {totalPages} pages
                </label>
                <input
                  id="split-range-input"
                  type="text"
                  value={rangeText}
                  onChange={(e) => setRangeText(e.target.value)}
                  placeholder="1-3, 5"
                  className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F]"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Tap pages to extract ({selectedPages.length} selected)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i + 1))}
                      className="text-xs font-semibold text-[#D32F2F] dark:text-red-400 px-2 py-1"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPages([])}
                      className="text-xs font-semibold text-slate-500 px-2 py-1"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loadingThumbs ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Rendering page thumbnails...</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {thumbnails.map((thumb) => {
                      const active = selectedPages.includes(thumb.page);
                      return (
                        <button
                          key={thumb.page}
                          type="button"
                          onClick={() => togglePageSelection(thumb.page)}
                          aria-pressed={active}
                          aria-label={`Select page ${thumb.page}`}
                          className={`relative rounded-2xl p-1.5 border-2 transition-all text-center ${
                            active
                              ? 'border-[#D32F2F] bg-red-50/70 dark:bg-red-950/30'
                              : 'border-slate-200 dark:border-[#3A3E45] bg-white dark:bg-[#242629]'
                          }`}
                        >
                          <img
                            src={thumb.dataUrl}
                            alt={`Page ${thumb.page}`}
                            className="w-full aspect-[3/4] object-contain rounded-lg bg-white"
                          />
                          <div className="mt-1 text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                            {thumb.page}
                          </div>
                          {active && (
                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#D32F2F] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSplit}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Scissors className="w-5 h-5" />
            <span>Split PDF</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
