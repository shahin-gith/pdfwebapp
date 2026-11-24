import React, { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ArrowUp, ArrowDown, Trash2, Plus, GripVertical, GitMerge } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { getPdfPageCount, createSamplePdf } from '../../utils/pdfWorker';
import { buildOutputFilename, formatFileSize, reorderArray } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface MergeItem {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

interface MergePdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

export const MergePdfTool: React.FC<MergePdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language].merge;
  const [step, setStep] = useState<FlowStep>('pick');
  const [items, setItems] = useState<MergeItem[]>([]);
  const [outputName, setOutputName] = useState('merged_document.pdf');
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const appendFiles = async (files: File[]) => {
    setError(null);
    const loaded: MergeItem[] = [];
    for (const file of files) {
      if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError(`"${file.name}" is not a valid PDF file.`);
        return;
      }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pageCount = await getPdfPageCount(bytes);
        loaded.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          bytes,
          pageCount,
        });
      } catch {
        setError(`Could not read "${file.name}". It may be corrupted or encrypted.`);
        return;
      }
    }
    if (loaded.length > 0) {
      setItems((prev) => {
        const next = [...prev, ...loaded];
        if (prev.length === 0 && next[0]) {
          setOutputName(buildOutputFilename(next[0].name, 'merged'));
        }
        return next;
      });
      setStep('options');
    }
  };

  const handleTrySample = async () => {
    setError(null);
    const s1 = await createSamplePdf('Part 1 Report', 2);
    const s2 = await createSamplePdf('Part 2 Appendix', 2);
    setItems([
      { id: 's1', name: s1.name, bytes: s1.bytes, pageCount: s1.pageCount },
      { id: 's2', name: s2.name, bytes: s2.bytes, pageCount: s2.pageCount },
    ]);
    setOutputName('combined_report_merged.pdf');
    setStep('options');
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setError(null);
    setStep('processing');
    setProgress({ percent: 10, label: 'Preparing merged PDF...' });

    try {
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setProgress({
          percent: Math.round(15 + (i / items.length) * 70),
          label: `Combining ${item.name} (${i + 1}/${items.length})`,
        });
        const srcDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
        totalPages += copiedPages.length;
      }

      setProgress({ percent: 92, label: 'Finalizing PDF...' });
      const outBytes = new Uint8Array(await mergedPdf.save());
      const finalName = outputName.trim().toLowerCase().endsWith('.pdf')
        ? outputName.trim()
        : `${outputName.trim() || 'merged'}.pdf`;

      const output: ToolOutputFile = {
        name: finalName,
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: totalPages,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs.');
      setStep('options');
    }
  };

  const handleReset = () => {
    setItems([]);
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="merge"
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
          accept=".pdf,application/pdf"
          multiple
          title={t.pickPdfsTitle}
          hint={t.dropHint}
          onFilesSelected={appendFiles}
          onTrySample={handleTrySample}
          sampleLabel={t.trySamplePdf}
          error={error}
          t={t}
        />
      )}

      {step === 'options' && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100">
                Drag or tap arrows to reorder ({items.length} files)
              </h2>
              <input
                ref={addInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={(e) => {
                  if (e.target.files) appendFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-[#D32F2F] dark:text-red-400 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addMoreFiles}</span>
              </button>
            </div>

            <div className="space-y-2.5" data-testid="merge-file-list">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== idx) {
                      setItems((prev) => reorderArray(prev, dragIdx, idx));
                    }
                    setDragIdx(null);
                  }}
                  className="rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] p-3 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {item.pageCount} {item.pageCount === 1 ? t.page : t.pages} · {formatFileSize(item.bytes.byteLength)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => setItems((prev) => reorderArray(prev, idx, idx - 1))}
                      aria-label={`Move ${item.name} up`}
                      className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 dark:hover:bg-[#2E3136] disabled:opacity-30 flex items-center justify-center text-slate-600 dark:text-slate-300"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => setItems((prev) => reorderArray(prev, idx, idx + 1))}
                      aria-label={`Move ${item.name} down`}
                      className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 dark:hover:bg-[#2E3136] disabled:opacity-30 flex items-center justify-center text-slate-600 dark:text-slate-300"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItems((prev) => {
                          const next = prev.filter((x) => x.id !== item.id);
                          if (next.length === 0) setStep('pick');
                          return next;
                        });
                      }}
                      aria-label={`Remove ${item.name}`}
                      className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-[#D32F2F] dark:text-slate-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label
                htmlFor="merge-output-name"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Output filename
              </label>
              <input
                id="merge-output-name"
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleMerge}
            disabled={items.length < 2}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] disabled:opacity-50 text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <GitMerge className="w-5 h-5" />
            <span>Merge {items.length} PDFs</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
