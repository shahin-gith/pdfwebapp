import React, { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { jsPDF } from 'jspdf';
import { Camera, Copy, Check, FileText, ScanText, Sparkles, Upload } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';

interface OcrScanToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

function createSampleTextImageDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 520;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('INVOICE #2026-409', 64, 96);

  ctx.font = '24px sans-serif';
  ctx.fillText('Date: November 25, 2026', 64, 160);
  ctx.fillText('Item: RedLeaf Offline PDF License', 64, 212);
  ctx.fillText('Status: Paid in Full ($0.00 Free)', 64, 264);
  ctx.fillText('Notes: Processed 100% locally on device.', 64, 330);

  return canvas.toDataURL('image/png');
}

export const OcrScanTool: React.FC<OcrScanToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language]['ocr-scan'];
  const [step, setStep] = useState<FlowStep>('pick');
  const [cameraActive, setCameraActive] = useState(false);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [fontSize, setFontSize] = useState<11 | 12 | 14>(12);
  const [pageFormat, setPageFormat] = useState<'a4' | 'letter'>('a4');
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const runOfflineOcr = async (imageDataUrl: string) => {
    setError(null);
    setSourceImageUrl(imageDataUrl);
    setStep('processing');
    setProgress({ percent: 10, label: 'Starting offline OCR engine...' });

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      worker = await createWorker('eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/tesseract-core-lstm.wasm.js',
        langPath: '/tesseract/lang-data',
        gzip: true,
        logger: (m) => {
          if (typeof m.progress === 'number') {
            setProgress({
              percent: Math.min(95, Math.max(12, Math.round(15 + m.progress * 80))),
              label: m.status ? `OCR: ${m.status}...` : 'Recognizing text offline...',
            });
          }
        },
      });

      const { data } = await worker.recognize(imageDataUrl);
      const cleaned = data.text.trim();
      setExtractedText(
        cleaned || 'No readable text detected. Try cropping closer or taking a sharper photo.'
      );
      setStep('options');
    } catch (err) {
      setError(
        err instanceof Error
          ? `Offline OCR failed: ${err.message}`
          : 'Could not scan text from that image.'
      );
      setStep('pick');
    } finally {
      await worker?.terminate().catch(() => {});
    }
  };

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera unavailable. Choose or snap a photo instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setError('Camera permission denied or unavailable. Choose an image file below.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    runOfflineOcr(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        runOfflineOcr(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleMakePdf = async () => {
    if (!extractedText.trim()) {
      setError('Enter or scan some text before creating a PDF.');
      return;
    }
    setError(null);
    setStep('processing');
    setProgress({ percent: 45, label: 'Creating searchable text PDF...' });

    try {
      const doc = new jsPDF({ unit: 'pt', format: pageFormat });
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const lineHeight = fontSize * 1.45;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);

      const lines = doc.splitTextToSize(extractedText, pageW - margin * 2) as string[];
      let y = margin + fontSize;

      lines.forEach((line) => {
        if (y > pageH - margin) {
          doc.addPage(pageFormat);
          y = margin + fontSize;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      const bytes = new Uint8Array(doc.output('arraybuffer'));
      const output: ToolOutputFile = {
        name: `scanned_text_${new Date().toISOString().slice(0, 10)}.pdf`,
        bytes,
        mimeType: 'application/pdf',
        pageCount: doc.getNumberOfPages(),
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDF from text.');
      setStep('options');
    }
  };

  const handleReset = () => {
    stopCamera();
    setSourceImageUrl(null);
    setExtractedText('');
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="ocr-scan"
      title={copy.name}
      subtitle={copy.shortDesc}
      step={step}
      onBack={() => {
        stopCamera();
        onBack();
      }}
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
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-6 md:p-8 text-center space-y-5">
            {cameraActive ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-black max-w-md mx-auto">
                  <video ref={videoRef} playsInline muted className="w-full max-h-[50vh] object-cover" />
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[48px] px-5 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-semibold"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="min-h-[48px] px-6 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap & Scan Text</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                  <ScanText className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Scan Printed Text from Photo (100% Offline)
                  </h2>
                  <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    Use your camera or choose a photo · 100% offline OCR
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[48px] px-5 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runOfflineOcr(createSampleTextImageDataUrl())}
                    className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[#D32F2F] dark:text-red-400" />
                    <span>Try Sample Text Photo</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 px-4 py-3 text-sm text-red-800 dark:text-red-200"
            >
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'options' && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-4">
            {sourceImageUrl && (
              <div className="rounded-2xl bg-slate-200/60 dark:bg-[#111214] p-2.5 flex justify-center">
                <img
                  src={sourceImageUrl}
                  alt="Scanned source"
                  className="max-h-40 object-contain rounded-lg bg-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ocr-extracted-textarea"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Extracted Text (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="min-h-[38px] px-3 rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            <textarea
              id="ocr-extracted-textarea"
              rows={8}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F] leading-relaxed"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Page Size
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {(['a4', 'letter'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPageFormat(sz)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold uppercase ${
                        pageFormat === sz
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Text Size
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {([11, 12, 14] as const).map((fs) => (
                    <button
                      key={fs}
                      type="button"
                      onClick={() => setFontSize(fs)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                        fontSize === fs
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {fs} pt
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMakePdf}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <FileText className="w-5 h-5" />
            <span>Make PDF from Text</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
