import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  FileText,
  Eye,
  Share2,
  Trash2,
  ArrowRight,
  X,
} from 'lucide-react';
import type { Language, StoredFile, ToolId } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import {
  TOOLS_CATALOG,
  filterStoredFiles,
  filterToolIds,
  formatFileSize,
} from '../../utils/pdfLogic';
import { ToolIcon } from '../ToolIcon';

interface HomeScreenProps {
  language: Language;
  t: UIStrings;
  recentFiles: StoredFile[];
  onSelectTool: (id: ToolId) => void;
  onSeeAllTools: () => void;
  onOpenFile: (file: StoredFile) => void;
  onShareFile: (file: StoredFile) => void;
  onDeleteFile: (file: StoredFile) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  language,
  t,
  recentFiles,
  onSelectTool,
  onSeeAllTools,
  onOpenFile,
  onShareFile,
  onDeleteFile,
}) => {
  const [query, setQuery] = useState('');
  const toolCopy = TOOL_TRANSLATIONS[language];

  const homeCatalog = query.trim()
    ? filterToolIds(query, TOOLS_CATALOG, (id) => toolCopy[id])
    : TOOLS_CATALOG.filter((tool) => tool.featuredOnHome);

  const scannerTools = TOOLS_CATALOG.filter((tool) => tool.category === 'scanner');

  const filteredFiles = filterStoredFiles(query, recentFiles).slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-24 md:pb-12 space-y-6">
      {/* Top Search Bar + Privacy Guarantee */}
      <section className="space-y-3">
        <div className="relative">
          <Search
            className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full h-12 md:h-13 pl-12 pr-11 rounded-2xl bg-[#F3F4F6] dark:bg-[#1A1C1E] border border-transparent focus:border-[#D32F2F] dark:focus:border-red-400 focus:bg-white dark:focus:bg-[#242629] text-sm md:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] text-xs md:text-sm text-slate-700 dark:text-slate-300">
          <ShieldCheck
            className="w-4 h-4 text-[#D32F2F] dark:text-red-400 shrink-0"
            aria-hidden="true"
          />
          <span className="font-medium">{t.privacyBanner}</span>
        </div>
      </section>

      {/* Camera, OCR & QR Scanners Strip */}
      {!query.trim() && (
        <section aria-labelledby="camera-scanners-heading">
          <h2
            id="camera-scanners-heading"
            className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 mb-3"
          >
            {t.cameraScannersTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scannerTools.map((tool) => {
              const copy = toolCopy[tool.id];
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className="group text-left rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] hover:bg-white dark:hover:bg-[#242629] border border-slate-200/80 dark:border-[#2E3136] hover:border-[#D32F2F]/40 dark:hover:border-red-400/40 p-4 flex items-center gap-3.5 min-h-[76px] transition-all duration-150 shadow-xs hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#D32F2F]"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl ${tool.accentBgLight} ${tool.accentBgDark} ${tool.accentTextLight} ${tool.accentTextDark} flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105`}
                  >
                    <ToolIcon id={tool.id} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {copy.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {copy.shortDesc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Grid of 8 Big Tool Cards */}
      <section aria-labelledby="quick-tools-heading">
        <div className="flex items-center justify-between mb-3.5">
          <h2
            id="quick-tools-heading"
            className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100"
          >
            {t.quickTools}
          </h2>
          <button
            type="button"
            onClick={onSeeAllTools}
            className="min-h-[44px] px-2 text-xs md:text-sm font-semibold text-[#D32F2F] dark:text-red-400 hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            <span>{t.seeAllTools}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {homeCatalog.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {homeCatalog.map((tool) => {
              const copy = toolCopy[tool.id];
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className="group text-left rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] hover:bg-white dark:hover:bg-[#242629] border border-slate-200/80 dark:border-[#2E3136] hover:border-[#D32F2F]/40 dark:hover:border-red-400/40 p-4 md:p-5 min-h-[124px] flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#D32F2F]"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl ${tool.accentBgLight} ${tool.accentBgDark} ${tool.accentTextLight} ${tool.accentTextDark} flex items-center justify-center transition-transform duration-150 group-hover:scale-105`}
                  >
                    <ToolIcon id={tool.id} className="w-6 h-6" />
                  </div>
                  <div className="mt-3">
                    <div className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {copy.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                      {copy.shortDesc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] p-8 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.emptySearchTitle}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.emptySearchDesc}
            </p>
          </div>
        )}
      </section>

      {/* Recent Files List */}
      <section aria-labelledby="recent-files-heading">
        <h2
          id="recent-files-heading"
          className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 mb-3.5"
        >
          {t.recentFiles}
        </h2>

        {filteredFiles.length > 0 ? (
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] divide-y divide-slate-200/70 dark:divide-[#2E3136] overflow-hidden">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-3.5 md:px-5 md:py-4 flex items-center justify-between gap-3 hover:bg-white/70 dark:hover:bg-[#242629]/70 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpenFile(file)}
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left min-h-[44px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>{formatFileSize(file.size)}</span>
                      {file.pageCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {file.pageCount} {file.pageCount === 1 ? t.page : t.pages}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenFile(file)}
                    aria-label={`${t.open} ${file.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#2E3136] flex items-center justify-center transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareFile(file)}
                    aria-label={`${t.share} ${file.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#2E3136] flex items-center justify-center transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFile(file)}
                    aria-label={`${t.delete} ${file.name}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-[#D32F2F] dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-200/70 dark:bg-[#242629] text-slate-500 dark:text-slate-400 flex items-center justify-center">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {query.trim() ? t.emptySearchTitle : t.emptyRecentTitle}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {query.trim() ? t.emptySearchDesc : t.emptyRecentDesc}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
