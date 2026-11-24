import React from 'react';
import { Home, Grid, FolderOpen, Settings, Moon, Sun, Languages } from 'lucide-react';
import type { Language, NavTab, ThemeMode } from '../types/pdf';
import type { UIStrings } from '../i18n/translations';
import { RedLeafLogo } from './ToolIcon';

interface NavigationShellProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  t: UIStrings;
  theme: ThemeMode;
  onToggleTheme: () => void;
  language: Language;
  onToggleLanguage: () => void;
  fileCount: number;
}

export const TopHeader: React.FC<NavigationShellProps> = ({
  activeTab,
  onSelectTab,
  t,
  theme,
  onToggleTheme,
  language,
  onToggleLanguage,
}) => {
  const navItems: Array<{ id: NavTab; label: string }> = [
    { id: 'home', label: t.navHome },
    { id: 'tools', label: t.navTools },
    { id: 'files', label: t.navFiles },
    { id: 'settings', label: t.navSettings },
  ];

  return (
    <header className="sticky top-0 z-30 h-12 md:h-16 bg-white/90 dark:bg-[#111214]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#2E3136]">
      <div className="max-w-6xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#D32F2F] rounded-lg min-h-[44px]"
        >
          <RedLeafLogo className="w-7 h-7 md:w-8 md:h-8 shrink-0" />
          <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {t.appName}
          </span>
        </button>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 px-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#D32F2F] ${
                  active
                    ? 'text-[#D32F2F] dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D32F2F] dark:bg-red-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Quick Theme / Language Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={language === 'en' ? 'Switch language to বাংলা' : 'Switch language to English'}
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242629] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Languages className="w-4 h-4 text-[#D32F2F] dark:text-red-400" aria-hidden="true" />
            <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242629] transition-colors flex items-center justify-center shrink-0"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export const BottomNav: React.FC<{
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  t: UIStrings;
  fileCount: number;
}> = ({ activeTab, onSelectTab, t, fileCount }) => {
  const tabs: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'tools', label: t.navTools, icon: Grid },
    { id: 'files', label: t.navFiles, icon: FolderOpen },
    { id: 'settings', label: t.navSettings, icon: Settings },
  ];

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1A1C1E]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#2E3136] pb-safe"
    >
      <div className="grid grid-cols-4 h-16 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center h-full min-h-[44px] gap-0.5 focus-visible:outline-2 focus-visible:outline-[#D32F2F]"
            >
              <span
                className={`px-4 py-1 rounded-full transition-colors duration-150 flex items-center justify-center ${
                  active
                    ? 'bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span
                className={`text-[11px] leading-tight whitespace-nowrap ${
                  active
                    ? 'font-semibold text-[#D32F2F] dark:text-red-400'
                    : 'font-medium text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
                {tab.id === 'files' && fileCount > 0 ? ` (${fileCount})` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
