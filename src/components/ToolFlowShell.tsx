import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Share2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import type { ProcessProgress, ToolId, ToolOutputFile } from '../types/pdf';
import type { UIStrings } from '../i18n/translations';
import { formatFileSize, calculateCompressionSavings } from '../utils/pdfLogic';

export type FlowStep = 'pick' | 'options' | 'processing' | 'result';

interface ToolFlowShellProps {
  toolId: ToolId;
  title: string;
  subtitle: string;
  step: FlowStep;
  onBack: () => void;
  t: UIStrings;
  progress?: ProcessProgress;
  error?: string | null;
  result?: ToolOutputFile | null;
  onOpenResult?: (result: ToolOutputFile) => void;
  onShareResult?: (result: ToolOutputFile) => void;
  onSaveResult?: (result: ToolOutputFile) => void;
  onReset?: () => void;
  hideSteps?: boolean;
  children: React.ReactNode;
}

export const ToolFlowShell: React.FC<ToolFlowShellProps> = ({
  title,
  subtitle,
  step,
  onBack,
  t,
  progress,
  error,
  result,
  onOpenResult,
  onShareResult,
  onSaveResult,
  onReset,
  hideSteps = false,
  children,
}) => {
  const steps: Array<{ key: FlowStep; label: string }> = [
    { key: 'pick', label: t.stepPick },
    { key: 'options', label: t.stepOptions },
    { key: 'processing', label: t.stepProcessing },
    { key: 'result', label: t.stepResult },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 pb-24 md:pb-12">
      {/* Compact Tool Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#F3F4F6] dark:bg-[#1A1C1E] hover:bg-slate-200 dark:hover:bg-[#242629] text-slate-800 dark:text-slate-100 flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Step Progress Strip */}
      {!hideSteps && (
        <div className="grid grid-cols-4 gap-2 mb-6" aria-label="Progress steps">
          {steps.map((s, idx) => {
            const active = idx === currentIdx;
            const completed = idx < currentIdx;
            return (
              <div key={s.key} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    active
                      ? 'bg-[#D32F2F]'
                      : completed
                      ? 'bg-[#D32F2F]/60'
                      : 'bg-slate-200 dark:bg-[#2E3136]'
                  }`}
                />
                <p
                  className={`text-[11px] truncate ${
                    active
                      ? 'font-semibold text-[#D32F2F] dark:text-red-400'
                      : completed
                      ? 'font-medium text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Friendly Error Message */}
      {error && step !== 'pick' && (
        <div
          role="alert"
          className="mb-5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 px-4 py-3.5 flex items-start gap-3 text-sm text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-5 h-5 text-[#D32F2F] dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>{error}</div>
        </div>
      )}

      {/* Step 3: Processing View */}
      {step === 'processing' && (
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-8 md:p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center">
            <div className="w-7 h-7 border-[3px] border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.processingTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {progress?.label || t.privacyBanner}
          </p>
          <div className="mt-6 max-w-md mx-auto">
            <div className="h-3 rounded-full bg-slate-200 dark:bg-[#2E3136] overflow-hidden">
              <div
                className="h-full bg-[#D32F2F] rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(8, progress?.percent ?? 20))}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {Math.round(progress?.percent ?? 0)}%
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Result View (Open / Share / Save) */}
      {step === 'result' && result && (
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
              {t.resultReady}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200 break-all">
              {result.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>{formatFileSize(result.bytes.byteLength)}</span>
              {result.pageCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {result.pageCount} {result.pageCount === 1 ? t.page : t.pages}
                  </span>
                </>
              )}
              {typeof result.originalSize === 'number' && result.originalSize > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    {calculateCompressionSavings(result.originalSize, result.bytes.byteLength)}% smaller
                    ({formatFileSize(result.originalSize)} → {formatFileSize(result.bytes.byteLength)})
                  </span>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t.savedToLibrary}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {onOpenResult && result.mimeType === 'application/pdf' && (
              <button
                type="button"
                onClick={() => onOpenResult(result)}
                className="min-h-[48px] px-4 py-3 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>{t.open}</span>
              </button>
            )}
            {onShareResult && (
              <button
                type="button"
                onClick={() => onShareResult(result)}
                className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] hover:bg-slate-50 dark:hover:bg-[#2E3136] text-slate-800 dark:text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span>{t.share}</span>
              </button>
            )}
            {onSaveResult && (
              <button
                type="button"
                onClick={() => onSaveResult(result)}
                className="min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] hover:bg-slate-50 dark:hover:bg-[#2E3136] text-slate-800 dark:text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{t.save}</span>
              </button>
            )}
          </div>

          {onReset && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onReset}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#D32F2F] dark:hover:text-red-400 inline-flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{t.startAnother}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pick / Options / Custom Result Content */}
      {(step === 'pick' || step === 'options' || (step === 'result' && !result)) && children}
    </div>
  );
};
