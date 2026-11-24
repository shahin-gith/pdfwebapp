import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Minimize2 } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { createSamplePdf, loadPdfJsDocument, renderPageToDataUrl } from '../../utils/pdfWorker';
import { buildOutputFilename, formatFileSize } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

type CompressionLevel = 'low' | 'medium' | 'high';

interface CompressPdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

export const CompressPdfTool: React.FC<CompressPdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language].compress;
  const [step, setStep] = useState<FlowStep>('pick');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<CompressionLevel>('medium');
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setError(null);
    try {
      const pdfDoc = await loadPdfJsDocument(bytes);
      setFileName(name);
      setFileBytes(bytes);
      setPageCount(pdfDoc.numPages);
      await pdfDoc.cleanup();
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
    const sample = await createSamplePdf('Large Brochures', 4);
    await loadSource(sample.name, sample.bytes);
  };

  const handleCompress = async () => {
    if (!fileBytes) return;
    setError(null);
    setStep('processing');
    setProgress({ percent: 10, label: 'Analyzing document...' });

    try {
      const settings: Record<CompressionLevel, { scale: number; quality: number }> = {
        low: { scale: 1.5, quality: 0.82 },
        medium: { scale: 1.15, quality: 0.62 },
        high: { scale: 0.85, quality: 0.42 },
      };
      const cfg = settings[level];

      const pdfDoc = await loadPdfJsDocument(fileBytes);
      let outDoc: jsPDF | null = null;

      for (let p = 1; p <= pdfDoc.numPages; p++) {
        setProgress({
          percent: Math.round(15 + (p / pdfDoc.numPages) * 70),
          label: `Optimizing page ${p} of ${pdfDoc.numPages}...`,
        });
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const rendered = await renderPageToDataUrl(pdfDoc, p, cfg.scale, 'image/jpeg', cfg.quality);

        if (!outDoc) {
          outDoc = new jsPDF({
            orientation: vp.width > vp.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [vp.width, vp.height],
            compress: true,
          });
        } else {
          outDoc.addPage([vp.width, vp.height], vp.width > vp.height ? 'landscape' : 'portrait');
        }
        outDoc.addImage(rendered.dataUrl, 'JPEG', 0, 0, vp.width, vp.height, undefined, 'FAST');
      }
      await pdfDoc.cleanup();

      let compressedBytes = new Uint8Array(outDoc!.output('arraybuffer'));

      // Also check lossless object-stream optimization if rasterization exceeded original size
      if (compressedBytes.byteLength >= fileBytes.byteLength) {
        const libDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        const streamBytes = new Uint8Array(await libDoc.save({ useObjectStreams: true }));
        if (streamBytes.byteLength < compressedBytes.byteLength) {
          compressedBytes = streamBytes;
        }
      }

      const output: ToolOutputFile = {
        name: buildOutputFilename(fileName, `compressed_${level}`),
        bytes: compressedBytes,
        mimeType: 'application/pdf',
        pageCount,
        originalSize: fileBytes.byteLength,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF.');
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

  const levels: Array<{ id: CompressionLevel; title: string; desc: string }> = [
    { id: 'low', title: 'Low Compression', desc: 'High visual clarity · Moderate size reduction' },
    { id: 'medium', title: 'Medium Compression', desc: 'Balanced clarity & file size (Recommended)' },
    { id: 'high', title: 'High Compression', desc: 'Smallest file size · Fast sharing' },
  ];

  return (
    <ToolFlowShell
      toolId="compress"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${fileBytes ? formatFileSize(fileBytes.byteLength) : ''}` : copy.shortDesc}
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
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{fileName}</span>
              <span>
                {pageCount} {pageCount === 1 ? t.page : t.pages} · {formatFileSize(fileBytes.byteLength)}
              </span>
            </div>

            <div className="space-y-2.5">
              {levels.map((item) => {
                const active = level === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLevel(item.id)}
                    aria-pressed={active}
                    className={`w-full text-left rounded-2xl p-4 border-2 transition-colors ${
                      active
                        ? 'border-[#D32F2F] bg-red-50/60 dark:bg-red-950/30'
                        : 'border-slate-200 dark:border-[#3A3E45] bg-white dark:bg-[#242629]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompress}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
            <span>Compress PDF</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
