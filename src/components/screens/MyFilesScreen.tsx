import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Share2,
  Download,
  Trash2,
  Search,
  FolderOpen,
  X,
} from 'lucide-react';
import type { Language, StoredFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { filterStoredFiles, formatFileSize } from '../../utils/pdfLogic';

interface MyFilesScreenProps {
  language: Language;
  t: UIStrings;
  files: StoredFile[];
  onOpenFile: (file: StoredFile) => void;
  onShareFile: (file: StoredFile) => void;
  onSaveFile: (file: StoredFile) => void;
  onDeleteFile: (file: StoredFile) => void;
}

export const MyFilesScreen: React.FC<MyFilesScreenProps> = ({
  language,
  t,
  files,
  onOpenFile,
  onShareFile,
  onSaveFile,
  onDeleteFile,
}) => {
  const [query, setQuery] = useState('');
  const filtered = filterStoredFiles(query, files);
  const toolCopy = TOOL_TRANSLATIONS[language];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-24 md:pb-12 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t.navFiles}
          </h1>
          <p className="mt-0.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            {files.length} {t.storageCount.toLowerCase()}
          </p>
        </div>

        {files.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full h-11 pl-10 pr-9 rounded-2xl bg-[#F3F4F6] dark:bg-[#1A1C1E] border border-transparent focus:border-[#D32F2F] dark:focus:border-red-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((file) => {
            const toolLabel =
              file.toolUsed !== 'imported' ? toolCopy[file.toolUsed]?.name : 'PDF';
            return (
              <div
                key={file.id}
                className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] p-4 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>{formatFileSize(file.size)}</span>
                      {file.pageCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {file.pageCount} {file.pageCount === 1 ? t.page : t.pages}
                          </span>
                        </>
                      )}
                      {toolLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{toolLabel}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-[#2E3136]">
                  <button
                    type="button"
                    onClick={() => onOpenFile(file)}
                    className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>{t.open}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareFile(file)}
                    aria-label={`${t.share} ${file.name}`}
                    className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] hover:bg-slate-100 dark:hover:bg-[#2E3136] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    <span>{t.share}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveFile(file)}
                    aria-label={`${t.save} ${file.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] hover:bg-slate-100 dark:hover:bg-[#2E3136] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFile(file)}
                    aria-label={`${t.delete} ${file.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-600 hover:text-[#D32F2F] dark:text-slate-300 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-200/70 dark:bg-[#242629] text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <FolderOpen className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            {query.trim() ? t.emptySearchTitle : t.emptyFilesTitle}
          </h2>
          <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {query.trim() ? t.emptySearchDesc : t.emptyFilesDesc}
          </p>
        </div>
      )}
    </div>
  );
};
