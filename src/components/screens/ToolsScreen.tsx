import React, { useState } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import type { Language, ToolId } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { TOOLS_CATALOG, filterToolIds } from '../../utils/pdfLogic';
import { ToolIcon } from '../ToolIcon';

interface ToolsScreenProps {
  language: Language;
  t: UIStrings;
  onSelectTool: (id: ToolId) => void;
}

type CategoryFilter = 'all' | 'edit' | 'convert' | 'scanner' | 'security';

export const ToolsScreen: React.FC<ToolsScreenProps> = ({ language, t, onSelectTool }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const toolCopy = TOOL_TRANSLATIONS[language];

  const categories: Array<{ id: CategoryFilter; label: string }> = [
    { id: 'all', label: t.categoryAll },
    { id: 'edit', label: t.categoryEdit },
    { id: 'convert', label: t.categoryConvert },
    { id: 'scanner', label: t.categoryScanner },
    { id: 'security', label: t.categorySecurity },
  ];

  const byCategory = TOOLS_CATALOG.filter((item) => {
    if (category === 'all') return true;
    if (category === 'edit') return item.category === 'edit' || item.category === 'view';
    return item.category === category;
  });

  const filtered = filterToolIds(query, byCategory, (id) => toolCopy[id]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-24 md:pb-12 space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t.allTools}
        </h1>
        <p className="mt-0.5 text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {t.privacyBanner}
        </p>
      </div>

      {/* Search & Category Tabs */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full h-11 pl-12 pr-10 rounded-2xl bg-[#F3F4F6] dark:bg-[#1A1C1E] border border-transparent focus:border-[#D32F2F] dark:focus:border-red-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#F3F4F6] dark:bg-[#1A1C1E] overflow-x-auto">
          {categories.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-white dark:bg-[#242629] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full List of Tools */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((tool) => {
            const copy = toolCopy[tool.id];
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool.id)}
                className="group text-left rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] hover:bg-white dark:hover:bg-[#242629] border border-slate-200/80 dark:border-[#2E3136] hover:border-[#D32F2F]/40 dark:hover:border-red-400/40 p-4 md:p-5 flex items-center gap-4 transition-all duration-150 shadow-xs hover:shadow-md active:scale-[0.99] min-h-[88px]"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${tool.accentBgLight} ${tool.accentBgDark} ${tool.accentTextLight} ${tool.accentTextDark} flex items-center justify-center shrink-0`}
                >
                  <ToolIcon id={tool.id} className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {copy.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {copy.longDesc}
                  </div>
                </div>
                <ChevronRight
                  className="w-5 h-5 text-slate-400 group-hover:text-[#D32F2F] dark:group-hover:text-red-400 shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] p-10 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t.emptySearchTitle}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.emptySearchDesc}
          </p>
        </div>
      )}
    </div>
  );
};
