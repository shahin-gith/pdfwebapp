import React, { useState } from 'react';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { Stamp } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { createSamplePdf, getPdfPageCount } from '../../utils/pdfWorker';
import { buildOutputFilename, formatFileSize } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface WatermarkPdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

export const WatermarkPdfTool: React.FC<WatermarkPdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language].watermark;
  const [step, setStep] = useState<FlowStep>('pick');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [addPageNumbers, setAddPageNumbers] = useState(true);
  const [tone, setTone] = useState<'red' | 'slate'>('red');
  const [opacity, setOpacity] = useState<0.2 | 0.4 | 0.65>(0.2);
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setError(null);
    try {
      const count = await getPdfPageCount(bytes);
      setFileName(name);
      setFileBytes(bytes);
      setPageCount(count);
      setStep('options');
    } catch {
      setError('Could not open this PDF. Make sure it is valid and unlocked.');
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
    const sample = await createSamplePdf('Client Proposal', 3);
    await loadSource(sample.name, sample.bytes);
  };

  const handleApply = async () => {
    if (!fileBytes) return;
    if (!watermarkText.trim() && !addPageNumbers) {
      setError('Enter watermark text or enable page numbers.');
      return;
    }
    setError(null);
    setStep('processing');
    setProgress({ percent: 25, label: 'Applying watermark & page numbers...' });

    try {
      const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const stampColor = tone === 'red' ? rgb(0.827, 0.184, 0.184) : rgb(0.25, 0.3, 0.38);

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        if (watermarkText.trim()) {
          const text = watermarkText.trim();
          const size = Math.max(24, Math.min(54, width / Math.max(6, text.length * 0.75)));
          const textW = fontBold.widthOfTextAtSize(text, size);
          page.drawText(text, {
            x: Math.max(24, (width - textW * 0.7) / 2),
            y: height / 2 - size / 2,
            size,
            font: fontBold,
            color: stampColor,
            opacity,
            rotate: degrees(32),
          });
        }

        if (addPageNumbers) {
          const label = `${idx + 1} / ${pages.length}`;
          const labelW = fontRegular.widthOfTextAtSize(label, 10);
          page.drawText(label, {
            x: (width - labelW) / 2,
            y: 22,
            size: 10,
            font: fontRegular,
            color: rgb(0.35, 0.4, 0.48),
          });
        }
      });

      const outBytes = new Uint8Array(await doc.save());
      const output: ToolOutputFile = {
        name: buildOutputFilename(fileName, 'watermarked'),
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: pages.length,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stamp PDF.');
      setStep('options');
    }
  };

  const handleReset = () => {
    setFileName('');
    setFileBytes(null);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="watermark"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${pageCount} ${t.pages}` : copy.shortDesc}
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
                {pageCount} {pageCount === 1 ? t.page : t.pages} · {formatFileSize(fileBytes.byteLength)}
              </span>
            </div>

            <div>
              <label
                htmlFor="watermark-text-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Watermark Text (leave blank for page numbers only)
              </label>
              <input
                id="watermark-text-input"
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="CONFIDENTIAL"
                className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Color
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {(['red', 'slate'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTone(c)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize ${
                        tone === c
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Opacity
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {([0.2, 0.4, 0.65] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOpacity(op)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold tabular-nums ${
                        opacity === op
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {Math.round(op * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Add footer page numbers (1 / {pageCount})
              </span>
              <input
                type="checkbox"
                checked={addPageNumbers}
                onChange={(e) => setAddPageNumbers(e.target.checked)}
                className="w-5 h-5 accent-[#D32F2F]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <Stamp className="w-5 h-5" />
            <span>Apply to PDF</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
