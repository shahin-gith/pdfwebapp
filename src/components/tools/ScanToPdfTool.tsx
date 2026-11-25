import React, { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Camera, Crop, ScanLine, Trash2, Upload, Plus } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { createSampleImages } from '../../utils/pdfWorker';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';

type FilterMode = 'original' | 'bw' | 'contrast';

interface ScannedPage {
  id: string;
  rawDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
}

interface ScanToPdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

async function applyCropAndFilter(
  rawDataUrl: string,
  crop: { top: number; bottom: number; left: number; right: number },
  filter: FilterMode
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sx = Math.round((crop.left / 100) * img.width);
      const sy = Math.round((crop.top / 100) * img.height);
      const sw = Math.max(40, Math.round(((100 - crop.left - crop.right) / 100) * img.width));
      const sh = Math.max(40, Math.round(((100 - crop.top - crop.bottom) / 100) * img.height));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      if (filter !== 'original') {
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (filter === 'bw') {
            const val = lum > 142 ? 255 : lum < 85 ? 0 : Math.min(255, Math.max(0, (lum - 85) * 4));
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          } else {
            // High-contrast crisp scan
            const boosted = Math.min(255, Math.max(0, (lum - 128) * 1.45 + 128));
            d[i] = boosted;
            d[i + 1] = boosted;
            d[i + 2] = boosted;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        width: sw,
        height: sh,
      });
    };
    img.onerror = () => reject(new Error('Could not process captured image.'));
    img.src = rawDataUrl;
  });
}

export const ScanToPdfTool: React.FC<ScanToPdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language].scan;
  const [step, setStep] = useState<FlowStep>('pick');
  const [cameraActive, setCameraActive] = useState(false);
  const [rawDraftUrl, setRawDraftUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [filter, setFilter] = useState<FilterMode>('bw');
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    if (!rawDraftUrl) return;
    applyCropAndFilter(rawDraftUrl, crop, filter)
      .then((res) => {
        if (!cancelled) setPreviewUrl(res.dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [rawDraftUrl, crop, filter]);

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera is unavailable in this browser. Use "Capture / Upload Photo" instead.');
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
      setError('Camera permission denied or unavailable. You can still upload or snap a photo below.');
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    setRawDraftUrl(dataUrl);
    setCrop({ top: 4, bottom: 4, left: 4, right: 4 });
    setStep('options');
  };

  const handlePhotoFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      stopCamera();
      setRawDraftUrl(reader.result as string);
      setCrop({ top: 0, bottom: 0, left: 0, right: 0 });
      setStep('options');
    };
    reader.readAsDataURL(file);
  };

  const handleTrySampleScan = async () => {
    const samples = await createSampleImages();
    setRawDraftUrl(samples[0].dataUrl);
    setCrop({ top: 3, bottom: 3, left: 3, right: 3 });
    setStep('options');
  };

  const commitCurrentScan = async (): Promise<ScannedPage[]> => {
    if (!rawDraftUrl) return scannedPages;
    const processed = await applyCropAndFilter(rawDraftUrl, crop, filter);
    const newPage: ScannedPage = {
      id: `${Date.now()}`,
      rawDataUrl: rawDraftUrl,
      processedDataUrl: processed.dataUrl,
      width: processed.width,
      height: processed.height,
    };
    const next = [...scannedPages, newPage];
    setScannedPages(next);
    setRawDraftUrl(null);
    setPreviewUrl(null);
    return next;
  };

  const handleAddAnotherPage = async () => {
    await commitCurrentScan();
    setStep('pick');
  };

  const handleSavePdf = async () => {
    setError(null);
    let pagesToSave = scannedPages;
    if (rawDraftUrl) {
      pagesToSave = await commitCurrentScan();
    }
    if (pagesToSave.length === 0) {
      setError('Capture or select at least one document scan first.');
      return;
    }

    setStep('processing');
    setProgress({ percent: 25, label: 'Building scanned PDF...' });

    try {
      let doc: jsPDF | null = null;
      pagesToSave.forEach((p, idx) => {
        setProgress({
          percent: Math.round(30 + (idx / pagesToSave.length) * 60),
          label: `Adding scan ${idx + 1} of ${pagesToSave.length}...`,
        });
        const pageW = 595.28;
        const pageH = 841.89;
        const margin = 20;
        const ratio = Math.min((pageW - margin * 2) / p.width, (pageH - margin * 2) / p.height);
        const w = p.width * ratio;
        const h = p.height * ratio;
        if (!doc) {
          doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
        } else {
          doc.addPage('a4');
        }
        doc.addImage(p.processedDataUrl, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST');
      });

      const outBytes = new Uint8Array(doc!.output('arraybuffer'));
      const output: ToolOutputFile = {
        name: `scan_${new Date().toISOString().slice(0, 10)}.pdf`,
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: pagesToSave.length,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scanned PDF.');
      setStep('options');
    }
  };

  const handleReset = () => {
    stopCamera();
    setRawDraftUrl(null);
    setPreviewUrl(null);
    setScannedPages([]);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="scan"
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
          {scannedPages.length > 0 && (
            <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {scannedPages.length} scanned {scannedPages.length === 1 ? t.page : t.pages} queued
              </span>
              <button
                type="button"
                onClick={handleSavePdf}
                className="min-h-[44px] px-4 rounded-2xl bg-[#D32F2F] text-white text-xs font-semibold"
              >
                Finish & Save PDF
              </button>
            </div>
          )}

          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-6 md:p-8 text-center space-y-5">
            {cameraActive ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black max-w-md mx-auto">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full max-h-[52vh] object-cover"
                  />
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
                    onClick={captureFrame}
                    className="min-h-[48px] px-6 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capture Page</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center">
                  <ScanLine className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Scan Document with Camera or Photo
                  </h2>
                  <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    Use your camera or choose a photo · 100% offline on device
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoFile(f);
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
                    <span>Open Camera</span>
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
                    onClick={handleTrySampleScan}
                    className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    {t.trySampleImages}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'options' && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-5">
            {previewUrl && (
              <div className="rounded-2xl bg-slate-200/60 dark:bg-[#111214] p-3 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Scanned document preview"
                  className="max-h-[42vh] object-contain rounded-lg shadow-sm bg-white"
                />
              </div>
            )}

            {/* Filter Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Scan Filter
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#242629]">
                {[
                  { id: 'bw' as const, label: 'Black & White' },
                  { id: 'contrast' as const, label: 'Crisp Gray' },
                  { id: 'original' as const, label: 'Original' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                      filter === opt.id
                        ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop Edge Controls */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Crop className="w-4 h-4 text-[#D32F2F] dark:text-red-400" />
                <span>Crop Margins (%)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
                  <label key={edge} className="block text-xs text-slate-600 dark:text-slate-300 capitalize">
                    <div className="flex justify-between mb-1">
                      <span>{edge}</span>
                      <span className="font-mono tabular-nums">{crop[edge]}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={35}
                      value={crop[edge]}
                      onChange={(e) =>
                        setCrop((prev) => ({ ...prev, [edge]: Number(e.target.value) }))
                      }
                      className="w-full accent-[#D32F2F]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {scannedPages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pt-1">
                {scannedPages.map((p, idx) => (
                  <div key={p.id} className="relative shrink-0">
                    <img
                      src={p.processedDataUrl}
                      alt={`Scanned ${idx + 1}`}
                      className="w-14 h-20 object-cover rounded-xl border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setScannedPages((prev) => prev.filter((x) => x.id !== p.id))}
                      aria-label={`Remove scan ${idx + 1}`}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#D32F2F] text-white flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleAddAnotherPage}
              className="min-h-[52px] rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-slate-800 dark:text-slate-100 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Page</span>
            </button>
            <button
              type="button"
              onClick={handleSavePdf}
              className="min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <ScanLine className="w-5 h-5" />
              <span>Save Scan as PDF</span>
            </button>
          </div>
        </div>
      )}
    </ToolFlowShell>
  );
};
