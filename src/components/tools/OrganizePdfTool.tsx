import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { createSamplePdf, loadPdfJsDocument, renderPageToDataUrl } from '../../utils/pdfWorker';
import { buildOutputFilename, reorderArray } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface OrganizedPage {
  id: string;
  originalIndex: number; // 0-based
  rotation: number; // 0, 90, 180, 270
  thumbUrl: string;
}

interface OrganizePdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

export const OrganizePdfTool: React.FC<OrganizePdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language].organize;
  const [step, setStep] = useState<FlowStep>('pick');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<OrganizedPage[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setError(null);
    try {
      const pdfDoc = await loadPdfJsDocument(bytes);
      const list: OrganizedPage[] = [];
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const rendered = await renderPageToDataUrl(pdfDoc, p, 0.38, 'image/jpeg', 0.78);
        list.push({
          id: `p-${p}-${Math.random().toString(36).slice(2, 6)}`,
          originalIndex: p - 1,
          rotation: 0,
          thumbUrl: rendered.dataUrl,
        });
      }
      await pdfDoc.cleanup();
      setFileName(name);
      setFileBytes(bytes);
      setPages(list);
      setStep('options');
    } catch {
      setError('Could not load pages from this PDF.');
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
    const sample = await createSamplePdf('Design Deck', 4);
    await loadSource(sample.name, sample.bytes);
  };

  const rotatePage = (idx: number) => {
    setPages((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const deletePage = (idx: number) => {
    if (pages.length <= 1) {
      setError('A PDF must keep at least 1 page.');
      return;
    }
    setError(null);
    setPages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveChanges = async () => {
    if (!fileBytes || pages.length === 0) return;
    setError(null);
    setStep('processing');
    setProgress({ percent: 20, label: 'Rebuilding PDF pages...' });

    try {
      const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(
        srcDoc,
        pages.map((p) => p.originalIndex)
      );

      copied.forEach((copiedPage, idx) => {
        const extraRot = pages[idx].rotation;
        if (extraRot !== 0) {
          const base = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((base + extraRot) % 360));
        }
        outDoc.addPage(copiedPage);
      });

      setProgress({ percent: 90, label: 'Saving organized PDF...' });
      const outBytes = new Uint8Array(await outDoc.save());
      const output: ToolOutputFile = {
        name: buildOutputFilename(fileName, 'organized'),
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: pages.length,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save organized PDF.');
      setStep('options');
    }
  };

  const handleReset = () => {
    setFileName('');
    setFileBytes(null);
    setPages([]);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="organize"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${pages.length} ${t.pages}` : copy.shortDesc}
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

      {step === 'options' && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-4">
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
              Rotate, reorder, or delete pages below ({pages.length} pages remaining).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== idx) {
                      setPages((prev) => reorderArray(prev, dragIdx, idx));
                    }
                    setDragIdx(null);
                  }}
                  className="rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] p-2.5 space-y-2 cursor-grab"
                >
                  <div className="relative aspect-[3/4] rounded-xl bg-slate-100 dark:bg-[#16181A] overflow-hidden flex items-center justify-center">
                    <img
                      src={page.thumbUrl}
                      alt={`Page ${idx + 1}`}
                      className="max-w-full max-h-full object-contain transition-transform duration-150"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono tabular-nums">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => setPages((prev) => reorderArray(prev, idx, idx - 1))}
                      aria-label={`Move page ${idx + 1} left`}
                      className="min-h-[38px] min-w-[34px] rounded-lg hover:bg-slate-100 dark:hover:bg-[#2E3136] disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(idx)}
                      aria-label={`Rotate page ${idx + 1}`}
                      className="min-h-[38px] min-w-[34px] rounded-lg hover:bg-slate-100 dark:hover:bg-[#2E3136] flex items-center justify-center text-slate-700 dark:text-slate-200"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(idx)}
                      aria-label={`Delete page ${idx + 1}`}
                      className="min-h-[38px] min-w-[34px] rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-[#D32F2F] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={() => setPages((prev) => reorderArray(prev, idx, idx + 1))}
                      aria-label={`Move page ${idx + 1} right`}
                      className="min-h-[38px] min-w-[34px] rounded-lg hover:bg-slate-100 dark:hover:bg-[#2E3136] disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveChanges}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Save Organized PDF ({pages.length} {pages.length === 1 ? t.page : t.pages})</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
