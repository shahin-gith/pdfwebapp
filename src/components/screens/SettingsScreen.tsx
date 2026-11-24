import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Languages,
  ShieldCheck,
  Star,
  Download,
  Trash2,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import type { Language, ThemeMode } from '../../types/pdf';
import type { UIStrings } from '../../i18n/translations';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface SettingsScreenProps {
  t: UIStrings;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  fileCount: number;
  onClearLibrary: () => void;
  savedRating: number;
  onSaveRating: (stars: number) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  t,
  theme,
  onSetTheme,
  language,
  onSetLanguage,
  fileCount,
  onClearLibrary,
  savedRating,
  onSaveRating,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(savedRating || 5);
  const [rateSuccess, setRateSuccess] = useState(false);

  const handleRatingSubmit = () => {
    onSaveRating(pendingRating);
    setRateSuccess(true);
    setTimeout(() => {
      setShowRateModal(false);
      setRateSuccess(false);
    }, 900);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-24 md:pb-12 space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
        {t.navSettings}
      </h1>

      {/* Appearance & Language */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          {t.settingsAppearance}
        </h2>
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] divide-y divide-slate-200/70 dark:divide-[#2E3136]">
          {/* Dark Mode Toggle */}
          <div className="p-4 md:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-slate-200/70 dark:bg-[#242629] text-slate-800 dark:text-amber-400 flex items-center justify-center shrink-0">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.darkMode}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.darkModeDesc}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label={t.darkMode}
              onClick={() => onSetTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative w-14 h-8 rounded-full transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-[#D32F2F] ${
                theme === 'dark' ? 'bg-[#D32F2F]' : 'bg-slate-300 dark:bg-[#3A3E45]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Language Switch: English / বাংলা */}
          <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center shrink-0">
                <Languages className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.languageLabel}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.languageDesc}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#242629] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onSetLanguage('en')}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  language === 'en'
                    ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onSetLanguage('bn')}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  language === 'bn'
                    ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Offline Storage */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          {t.privacySection}
        </h2>
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] p-4 md:p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t.privacyNoteTitle}
              </h3>
              <p className="mt-1 text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.privacyNoteBody}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/70 dark:border-[#2E3136] flex items-center justify-between gap-3">
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              {t.storageCount}: <strong className="text-slate-900 dark:text-slate-100">{fileCount}</strong>
            </div>
            <button
              type="button"
              disabled={fileCount === 0}
              onClick={onClearLibrary}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-[#D32F2F] dark:hover:bg-red-950/40 dark:hover:text-red-400 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.clearLibrary}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Install PWA & Rate App */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          {t.aboutSection}
        </h2>
        <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200/80 dark:border-[#2E3136] divide-y divide-slate-200/70 dark:divide-[#2E3136]">
          {/* PWA Install Row */}
          <div className="p-4 md:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 text-[#D32F2F] dark:text-red-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.installApp}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.installAppDesc}
                </div>
              </div>
            </div>

            {isInstalled ? (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.installedBadge}</span>
              </span>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={install}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t.installBtn}</span>
              </button>
            ) : isIOS ? (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap"
              >
                {t.installBtn}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2E3136] whitespace-nowrap"
              >
                {t.installBtn}
              </button>
            )}
          </div>

          {/* Rate App Row */}
          <button
            type="button"
            onClick={() => setShowRateModal(true)}
            className="w-full p-4 md:p-5 flex items-center justify-between gap-4 text-left hover:bg-white/60 dark:hover:bg-[#242629]/60 rounded-b-3xl transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.rateApp}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {savedRating > 0 ? `${savedRating}/5 ★ · ${t.rateThanks}` : t.rateAppDesc}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-amber-500 shrink-0" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= savedRating ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
              ))}
            </div>
          </button>
        </div>
      </section>

      {/* Install Guide Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-6 shadow-xl">
            <h3 id="install-guide-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t.installApp}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isIOS
                ? '1. Tap the Share icon in Safari.\n2. Scroll down and select "Add to Home Screen".'
                : 'Open your browser menu and select "Install app" or "Add to Home screen" to run RedLeaf PDF offline anytime.'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}

      {/* Rate App Modal */}
      {showRateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rate-modal-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-6 shadow-xl text-center">
            <h3 id="rate-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t.rateModalTitle}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.rateModalDesc}
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setPendingRating(star)}
                  aria-label={`Rate ${star} stars`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= pendingRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            {rateSuccess ? (
              <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {t.rateThanks}
              </p>
            ) : (
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="flex-1 min-h-[44px] rounded-2xl bg-[#F3F4F6] dark:bg-[#242629] text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleRatingSubmit}
                  className="flex-1 min-h-[44px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
                >
                  {t.rateSubmit}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
