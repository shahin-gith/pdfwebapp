import React, { useRef, useState } from 'react';
import { Upload, FileText, Sparkles } from 'lucide-react';
import type { UIStrings } from '../i18n/translations';

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  title: string;
  hint: string;
  onFilesSelected: (files: File[]) => void;
  onTrySample?: () => void;
  sampleLabel?: string;
  error?: string | null;
  t: UIStrings;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  multiple = false,
  title,
  hint,
  onFilesSelected,
  onTrySample,
  sampleLabel,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      onFilesSelected(Array.from(fileList));
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-3xl border-2 border-dashed p-8 md:p-10 text-center transition-colors ${
          isDragging
            ? 'border-[#D32F2F] bg-red-50/70 dark:bg-red-950/30'
            : 'border-slate-300 dark:border-[#3A3E45] bg-[#F8F9FA] dark:bg-[#1A1C1E]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
          aria-label={title}
        />
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center">
          <Upload className="w-7 h-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>{title}</span>
          </button>

          {onTrySample && sampleLabel && (
            <button
              type="button"
              onClick={onTrySample}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2C2F33] text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#D32F2F] dark:text-red-400" aria-hidden="true" />
              <span>{sampleLabel}</span>
            </button>
          )}
        </div>
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
  );
};
