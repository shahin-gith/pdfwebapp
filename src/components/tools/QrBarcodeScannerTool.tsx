import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, EncodeHintType, QRCodeWriter } from '@zxing/library';
import { jsPDF } from 'jspdf';
import {
  Camera,
  Copy,
  Check,
  ExternalLink,
  FileText,
  QrCode,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';

interface ScannedCodeItem {
  id: string;
  text: string;
  format: string;
  scannedAt: number;
  previewUrl?: string;
}

interface QrBarcodeScannerToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function generateSampleQrDataUrl(payload: string): string {
  const writer = new QRCodeWriter();
  const hints = new Map();
  hints.set(EncodeHintType.MARGIN, 2);
  const matrix = writer.encode(payload, BarcodeFormat.QR_CODE, 320, 320, hints);
  const canvas = document.createElement('canvas');
  canvas.width = matrix.getWidth();
  canvas.height = matrix.getHeight();
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (matrix.get(x, y)) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas.toDataURL('image/png');
}

export const QrBarcodeScannerTool: React.FC<QrBarcodeScannerToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language]['qr-scanner'];
  const [step, setStep] = useState<FlowStep>('pick');
  const [cameraActive, setCameraActive] = useState(false);
  const [scans, setScans] = useState<ScannedCodeItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const recordScan = (text: string, format: string, previewUrl?: string) => {
    setScans((prev) => {
      if (prev[0]?.text === text && Date.now() - prev[0].scannedAt < 2500) {
        return prev;
      }
      return [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text,
          format,
          scannedAt: Date.now(),
          previewUrl,
        },
        ...prev,
      ];
    });
    setStep('options');
  };

  const startCameraScan = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera is unavailable here. Use "Scan from Photo" instead.');
      return;
    }
    try {
      setCameraActive(true);
      const reader = new BrowserMultiFormatReader();
      await new Promise((r) => setTimeout(r, 80));
      if (!videoRef.current) return;
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current,
        (res) => {
          if (res) {
            const fmt = BarcodeFormat[res.getBarcodeFormat()] || 'CODE';
            recordScan(res.getText(), fmt);
            stopCamera();
          }
        }
      );
    } catch {
      stopCamera();
      setError('Camera permission denied or unavailable. You can scan from an image instead.');
    }
  };

  const scanImageDataUrl = async (dataUrl: string) => {
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const res = await reader.decodeFromImageUrl(dataUrl);
      const fmt = BarcodeFormat[res.getBarcodeFormat()] || 'CODE';
      recordScan(res.getText(), fmt, dataUrl);
    } catch {
      setError('No QR code or barcode was detected in that image. Try a clearer, well-lit photo.');
    }
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        scanImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTrySampleQr = async () => {
    const sampleUrl = generateSampleQrDataUrl('RedLeaf PDF Offline Verified · Document #2026-841');
    await scanImageDataUrl(sampleUrl);
  };

  const handleCopy = async (item: ScannedCodeItem) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((curr) => (curr === item.id ? null : curr)), 1800);
    } catch {
      // ignore clipboard errors in restricted contexts
    }
  };

  const handleExportPdf = async () => {
    if (scans.length === 0) {
      setError('Scan at least one QR code or barcode first.');
      return;
    }
    setError(null);
    setStep('processing');
    setProgress({ percent: 35, label: 'Formatting QR & barcode report...' });

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      let y = 60;

      doc.setFillColor(211, 47, 47);
      doc.rect(margin, y - 28, pageW - margin * 2, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('RedLeaf PDF — QR & Barcode Scan Report', margin + 16, y - 2);

      y += 42;
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated offline · ${new Date().toLocaleString()}`, margin, y);
      y += 28;

      scans.forEach((item, idx) => {
        if (y > 740) {
          doc.addPage('a4');
          y = 60;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 47, 47);
        doc.text(`${idx + 1}. ${item.format} · ${new Date(item.scannedAt).toLocaleTimeString()}`, margin, y);
        y += 16;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        const wrapped = doc.splitTextToSize(item.text, pageW - margin * 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 15 + 16;
      });

      const bytes = new Uint8Array(doc.output('arraybuffer'));
      const output: ToolOutputFile = {
        name: `qr_barcode_report_${new Date().toISOString().slice(0, 10)}.pdf`,
        bytes,
        mimeType: 'application/pdf',
        pageCount: doc.getNumberOfPages(),
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build PDF report.');
      setStep('options');
    }
  };

  const handleReset = () => {
    stopCamera();
    setScans([]);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="qr-scanner"
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
      {(step === 'pick' || step === 'options') && (
        <div className="space-y-5">
          {/* Scanner Input Card */}
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-5 md:p-7 text-center space-y-4">
            {cameraActive ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black max-w-md mx-auto">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full max-h-[46vh] object-cover"
                  />
                  <div className="absolute inset-8 border-2 border-[#D32F2F] rounded-2xl pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="min-h-[48px] px-6 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-semibold"
                >
                  {t.cancel}
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Scan QR Code or Barcode Offline
                  </h2>
                  <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    Use your camera or pick an image · 100% offline on device
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={startCameraScan}
                    className="min-h-[48px] px-5 py-3 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[48px] px-5 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Scan from Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTrySampleQr}
                    className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[#D32F2F] dark:text-red-400" />
                    <span>Try Sample QR</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {error && step === 'pick' && (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 px-4 py-3 text-sm text-red-800 dark:text-red-200"
            >
              {error}
            </div>
          )}

          {/* Scanned Results List */}
          {scans.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] divide-y divide-slate-200/70 dark:divide-[#2E3136]">
                {scans.map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.previewUrl && (
                        <img
                          src={item.previewUrl}
                          alt={item.format}
                          className="w-12 h-12 rounded-xl border border-slate-200 bg-white object-contain shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-[#D32F2F] dark:text-red-400 font-semibold">
                          {item.format} · {new Date(item.scannedAt).toLocaleTimeString()}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSafeHttpUrl(item.text) && (
                        <a
                          href={item.text}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open scanned link"
                          className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-200/70 dark:hover:bg-[#2E3136] flex items-center justify-center text-slate-700 dark:text-slate-200"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        aria-label="Copy scanned text"
                        className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-200/70 dark:hover:bg-[#2E3136] flex items-center justify-center text-slate-700 dark:text-slate-200"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setScans((prev) => {
                            const next = prev.filter((s) => s.id !== item.id);
                            if (next.length === 0) setStep('pick');
                            return next;
                          })
                        }
                        aria-label="Remove scanned code"
                        className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-[#D32F2F] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportPdf}
                className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <FileText className="w-5 h-5" />
                <span>Save Scanned Codes as PDF ({scans.length})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </ToolFlowShell>
  );
};
