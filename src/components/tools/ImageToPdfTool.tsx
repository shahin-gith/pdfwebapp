import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { ArrowUp, ArrowDown, Trash2, Plus, ImagePlus, GripVertical } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { createSampleImages } from '../../utils/pdfWorker';
import { buildOutputFilename, reorderArray } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

type PageSizeOption = 'a4' | 'letter' | 'fit';
type MarginOption = 'none' | 'small' | 'large';
type OrientationOption = 'auto' | 'portrait' | 'landscape';

interface ImageToPdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

function readImageDimensions(file: File): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 1000,
        });
      };
      img.onerror = () => reject(new Error(`Unable to decode image "${file.name}".`));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(`Unable to read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language]['image-to-pdf'];
  const [step, setStep] = useState<FlowStep>('pick');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [margin, setMargin] = useState<MarginOption>('small');
  const [orientation, setOrientation] = useState<OrientationOption>('auto');
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    const loaded: ImageItem[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a supported image (JPG, PNG, WebP).`);
        return;
      }
      try {
        loaded.push(await readImageDimensions(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image.');
        return;
      }
    }
    if (loaded.length > 0) {
      setImages((prev) => [...prev, ...loaded]);
      setStep('options');
    }
  };

  const handleTrySample = async () => {
    const samples = await createSampleImages();
    setImages(
      samples.map((s, i) => ({
        id: `sample-${i}`,
        name: s.name,
        dataUrl: s.dataUrl,
        width: 640,
        height: 840,
      }))
    );
    setStep('options');
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setError('Add at least one image.');
      return;
    }
    setError(null);
    setStep('processing');
    setProgress({ percent: 15, label: 'Creating PDF document...' });

    try {
      const marginPt = margin === 'none' ? 0 : margin === 'small' ? 24 : 48;
      let doc: jsPDF | null = null;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setProgress({
          percent: Math.round(20 + (i / images.length) * 68),
          label: `Embedding image ${i + 1} of ${images.length}...`,
        });

        const imgOrientation: 'p' | 'l' =
          orientation === 'auto'
            ? img.width > img.height
              ? 'l'
              : 'p'
            : orientation === 'landscape'
            ? 'l'
            : 'p';

        let pageW = 595.28;
        let pageH = 841.89;
        if (pageSize === 'letter') {
          pageW = 612;
          pageH = 792;
        } else if (pageSize === 'fit') {
          pageW = img.width * 0.75 + marginPt * 2;
          pageH = img.height * 0.75 + marginPt * 2;
        }

        if (pageSize !== 'fit' && imgOrientation === 'l' && pageW < pageH) {
          [pageW, pageH] = [pageH, pageW];
        } else if (pageSize !== 'fit' && imgOrientation === 'p' && pageW > pageH) {
          [pageW, pageH] = [pageH, pageW];
        }

        if (!doc) {
          doc = new jsPDF({
            orientation: pageW > pageH ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [pageW, pageH],
            compress: true,
          });
        } else {
          doc.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
        }

        const availW = Math.max(10, pageW - marginPt * 2);
        const availH = Math.max(10, pageH - marginPt * 2);
        const ratio = Math.min(availW / img.width, availH / img.height);
        const drawW = img.width * ratio;
        const drawH = img.height * ratio;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        const fmt = img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(img.dataUrl, fmt, x, y, drawW, drawH, undefined, 'FAST');
      }

      setProgress({ percent: 94, label: 'Generating PDF file...' });
      const arrayBuf = doc!.output('arraybuffer');
      const outBytes = new Uint8Array(arrayBuf);
      const output: ToolOutputFile = {
        name: buildOutputFilename(images[0].name, 'images_to_pdf'),
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: images.length,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert images to PDF.');
      setStep('options');
    }
  };

  const handleReset = () => {
    setImages([]);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="image-to-pdf"
      title={copy.name}
      subtitle={copy.shortDesc}
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
          accept="image/png,image/jpeg,image/webp,image/*"
          multiple
          title={t.pickImagesTitle}
          hint={t.dropHint}
          onFilesSelected={handleFilesSelected}
          onTrySample={handleTrySample}
          sampleLabel={t.trySampleImages}
          error={error}
          t={t}
        />
      )}

      {step === 'options' && (
        <div className="space-y-5">
          {/* Reorderable Image List */}
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                Images ({images.length}) — Drag or tap arrows to reorder
              </h2>
              <input
                ref={addMoreRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                  e.target.value = '';
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => addMoreRef.current?.click()}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-[#D32F2F] dark:text-red-400 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addMoreFiles}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== idx) {
                      setImages((prev) => reorderArray(prev, dragIdx, idx));
                    }
                    setDragIdx(null);
                  }}
                  className="rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] p-2.5 flex items-center justify-between gap-2.5 cursor-grab"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-11 h-14 object-cover rounded-lg border border-slate-200 dark:border-[#3A3E45] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {img.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {img.width} × {img.height} px
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => setImages((prev) => reorderArray(prev, idx, idx - 1))}
                      aria-label={`Move ${img.name} up`}
                      className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 dark:hover:bg-[#2E3136] disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => setImages((prev) => reorderArray(prev, idx, idx + 1))}
                      aria-label={`Move ${img.name} down`}
                      className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 dark:hover:bg-[#2E3136] disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => {
                          const next = prev.filter((x) => x.id !== img.id);
                          if (next.length === 0) setStep('pick');
                          return next;
                        })
                      }
                      aria-label={`Remove ${img.name}`}
                      className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-red-50 text-slate-500 hover:text-[#D32F2F] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Page Size, Margin, Orientation Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Page Size
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {(['a4', 'letter', 'fit'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPageSize(opt)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold uppercase ${
                        pageSize === opt
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Margin
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {(['none', 'small', 'large'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMargin(opt)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize ${
                        margin === opt
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Orientation
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#242629]">
                  {(['auto', 'portrait', 'landscape'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOrientation(opt)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize truncate px-1 ${
                        orientation === opt
                          ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConvert}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <ImagePlus className="w-5 h-5" />
            <span>Create PDF ({images.length} {images.length === 1 ? 'image' : 'images'})</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
