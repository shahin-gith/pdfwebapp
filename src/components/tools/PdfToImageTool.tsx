import React, { useState } from 'react';
import { Images, Download, Share2, Check, RotateCcw } from 'lucide-react';
import type { Language, ProcessProgress } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import {
  createSamplePdf,
  dataUrlToUint8Array,
  loadPdfJsDocument,
  renderPageToDataUrl,
} from '../../utils/pdfWorker';
import { buildOutputFilename, formatFileSize, parsePageRanges } from '../../utils/pdfLogic';
import { shareOrDownloadFile, triggerFileDownload } from '../../utils/storage';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface ExportedImage {
  page: number;
  name: string;
  dataUrl: string;
  bytes: Uint8Array;
  mimeType: 'image/jpeg' | 'image/png';
}

interface PdfToImageToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
}

export const PdfToImageTool: React.FC<PdfToImageToolProps> = ({ language, t, onBack }) => {
  const copy = TOOL_TRANSLATIONS[language]['pdf-to-image'];
  const [step, setStep] = useState<FlowStep>('pick');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [rangeText, setRangeText] = useState('1');
  const [thumbnails, setThumbnails] = useState<Array<{ page: number; dataUrl: string }>>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState<ExportedImage[]>([]);

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setError(null);
    try {
      const pdfDoc = await loadPdfJsDocument(bytes);
      const count = pdfDoc.numPages;
      setFileName(name);
      setFileBytes(bytes);
      setTotalPages(count);
      setRangeText(count > 1 ? `1-${count}` : '1');
      setSelectedPages(Array.from({ length: count }, (_, i) => i + 1));
      setStep('options');

      const thumbs: Array<{ page: number; dataUrl: string }> = [];
      for (let p = 1; p <= Math.min(count, 24); p++) {
        const res = await renderPageToDataUrl(pdfDoc, p, 0.3, 'image/jpeg', 0.7);
        thumbs.push({ page: p, dataUrl: res.dataUrl });
      }
      setThumbnails(thumbs);
      await pdfDoc.cleanup();
    } catch {
      setError('Could not load this PDF file. Please verify it is not corrupted or password-locked.');
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    await loadSource(file.name, new Uint8Array(await file.arrayBuffer()));
  };

  const handleTrySample = async () => {
    const sample = await createSamplePdf('Presentation Slides', 3);
    await loadSource(sample.name, sample.bytes);
  };

  const handleExport = async () => {
    if (!fileBytes) return;
    setError(null);

    let pages: number[] = [];
    try {
      if (pageScope === 'all') {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
      } else if (selectedPages.length > 0 && thumbnails.length === totalPages) {
        pages = [...selectedPages].sort((a, b) => a - b);
      } else {
        pages = parsePageRanges(rangeText, totalPages);
      }
      if (pages.length === 0) throw new Error('Select at least one page to convert.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid page selection.');
      return;
    }

    setStep('processing');
    setProgress({ percent: 10, label: 'Rendering pages...' });

    try {
      const pdfDoc = await loadPdfJsDocument(fileBytes);
      const mimeType: 'image/jpeg' | 'image/png' = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? 'png' : 'jpg';
      const out: ExportedImage[] = [];

      for (let i = 0; i < pages.length; i++) {
        const pageNum = pages[i];
        setProgress({
          percent: Math.round(15 + (i / pages.length) * 80),
          label: `Rendering page ${pageNum} (${i + 1}/${pages.length})...`,
        });
        const rendered = await renderPageToDataUrl(pdfDoc, pageNum, 2.0, mimeType, 0.92);
        out.push({
          page: pageNum,
          name: buildOutputFilename(fileName, `page_${pageNum}`, ext),
          dataUrl: rendered.dataUrl,
          bytes: dataUrlToUint8Array(rendered.dataUrl),
          mimeType,
        });
      }

      await pdfDoc.cleanup();
      setExported(out);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF pages.');
      setStep('options');
    }
  };

  const handleSaveAll = () => {
    exported.forEach((img, idx) => {
      setTimeout(() => {
        triggerFileDownload(img.bytes, img.name, img.mimeType);
      }, idx * 150);
    });
  };

  const handleReset = () => {
    setFileName('');
    setFileBytes(null);
    setThumbnails([]);
    setExported([]);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="pdf-to-image"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${totalPages} ${t.pages}` : copy.shortDesc}
      step={step}
      onBack={onBack}
      t={t}
      progress={progress}
      error={error}
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

      {step === 'options' && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Image Format
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#242629] max-w-xs">
                {(['jpg', 'png'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`min-h-[44px] rounded-xl text-xs font-semibold uppercase ${
                      format === fmt
                        ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Pages to Export
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#242629] max-w-sm mb-3">
                <button
                  type="button"
                  onClick={() => setPageScope('all')}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                    pageScope === 'all'
                      ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All Pages ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => setPageScope('custom')}
                  className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                    pageScope === 'custom'
                      ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Choose Pages
                </button>
              </div>

              {pageScope === 'custom' && (
                <div className="space-y-3">
                  {thumbnails.length === totalPages ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {thumbnails.map((thumb) => {
                        const active = selectedPages.includes(thumb.page);
                        return (
                          <button
                            key={thumb.page}
                            type="button"
                            onClick={() =>
                              setSelectedPages((prev) =>
                                prev.includes(thumb.page)
                                  ? prev.filter((p) => p !== thumb.page)
                                  : [...prev, thumb.page].sort((a, b) => a - b)
                              )
                            }
                            className={`relative rounded-2xl p-1.5 border-2 ${
                              active
                                ? 'border-[#D32F2F] bg-red-50/60 dark:bg-red-950/30'
                                : 'border-slate-200 dark:border-[#3A3E45] bg-white dark:bg-[#242629]'
                            }`}
                          >
                            <img
                              src={thumb.dataUrl}
                              alt={`Page ${thumb.page}`}
                              className="w-full aspect-[3/4] object-contain rounded-lg bg-white"
                            />
                            <div className="mt-1 text-xs font-mono tabular-nums">{thumb.page}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={rangeText}
                      onChange={(e) => setRangeText(e.target.value)}
                      placeholder="1-3, 5"
                      className="w-full h-11 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-mono"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Images className="w-5 h-5" />
            <span>Convert to {format.toUpperCase()}</span>
          </button>
        </div>
      )}

      {/* Custom Result Gallery for Exported Images */}
      {step === 'result' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {exported.length} {format.toUpperCase()} {exported.length === 1 ? 'image' : 'images'} ready
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.privacyBanner}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAll}
                className="min-h-[44px] px-4 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save All ({exported.length})</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] px-3.5 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.startAnother}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {exported.map((img) => (
              <div
                key={img.page}
                className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-3 space-y-3"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full aspect-[3/4] object-contain rounded-2xl bg-white border border-slate-200/70"
                />
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums px-1">
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {img.name}
                  </span>
                  <span>{formatFileSize(img.bytes.byteLength)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => shareOrDownloadFile(img.bytes, img.name, img.mimeType)}
                    className="min-h-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{t.share}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(img.bytes, img.name, img.mimeType)}
                    className="min-h-[44px] rounded-xl bg-[#D32F2F] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.save}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolFlowShell>
  );
};
