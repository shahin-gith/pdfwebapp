import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { WifiOff } from 'lucide-react';
import type {
  Language,
  NavTab,
  StoredFile,
  ThemeMode,
  ToolId,
  ToolOutputFile,
} from './types/pdf';
import { UI_STRINGS } from './i18n/translations';
import {
  clearAllStoredFiles,
  deleteStoredFile,
  listStoredFiles,
  loadLanguage,
  loadSavedRating,
  loadTheme,
  persistLanguage,
  persistSavedRating,
  persistTheme,
  saveStoredFile,
  shareOrDownloadFile,
  triggerFileDownload,
} from './utils/storage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { SplashScreen } from './components/SplashScreen';
import { BottomNav, TopHeader } from './components/BottomNav';
import { HomeScreen } from './components/screens/HomeScreen';
import { ToolsScreen } from './components/screens/ToolsScreen';
import { MyFilesScreen } from './components/screens/MyFilesScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { PdfViewerTool } from './components/tools/PdfViewerTool';
import { MergePdfTool } from './components/tools/MergePdfTool';
import { SplitPdfTool } from './components/tools/SplitPdfTool';
import { ImageToPdfTool } from './components/tools/ImageToPdfTool';
import { PdfToImageTool } from './components/tools/PdfToImageTool';
import { CompressPdfTool } from './components/tools/CompressPdfTool';
import { OrganizePdfTool } from './components/tools/OrganizePdfTool';
import { LockUnlockPdfTool } from './components/tools/LockUnlockPdfTool';
import { ScanToPdfTool } from './components/tools/ScanToPdfTool';

export default function App() {
  const skipSplash =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [showSplash, setShowSplash] = useState(!skipSplash);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [viewerFile, setViewerFile] = useState<StoredFile | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [savedRating, setSavedRating] = useState<number>(() => loadSavedRating());
  const [toast, setToast] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const t = UI_STRINGS[language];

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast((curr) => (curr === message ? null : curr));
    }, 2800);
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 950);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    persistLanguage(language);
  }, [language]);

  const refreshFiles = useCallback(async () => {
    const list = await listStoredFiles();
    setFiles(list);
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const handleSaveToolOutput = useCallback(
    async (toolId: ToolId, output: ToolOutputFile) => {
      await saveStoredFile({
        name: output.name,
        size: output.bytes.byteLength,
        pageCount: output.pageCount,
        toolUsed: toolId,
        mimeType: output.mimeType,
        bytes: output.bytes,
      });
      await refreshFiles();
    },
    [refreshFiles]
  );

  const handleOpenResultInViewer = useCallback((output: ToolOutputFile) => {
    const tempFile: StoredFile = {
      id: `result-${Date.now()}`,
      name: output.name,
      size: output.bytes.byteLength,
      pageCount: output.pageCount,
      createdAt: Date.now(),
      toolUsed: 'viewer',
      mimeType: output.mimeType,
      bytes: output.bytes,
    };
    setViewerFile(tempFile);
    setActiveTool('viewer');
  }, []);

  const handleOpenStoredFile = useCallback((file: StoredFile) => {
    setViewerFile(file);
    setActiveTool('viewer');
  }, []);

  const handleShareBytes = useCallback(
    async (bytes: Uint8Array, name: string, mimeType: string) => {
      const outcome = await shareOrDownloadFile(bytes, name, mimeType);
      if (outcome === 'downloaded') {
        showToast(t.shareUnsupported);
      }
    },
    [showToast, t.shareUnsupported]
  );

  const handleDeleteFile = useCallback(
    async (file: StoredFile) => {
      await deleteStoredFile(file.id);
      await refreshFiles();
      showToast(t.confirmDelete);
    },
    [refreshFiles, showToast, t.confirmDelete]
  );

  const handleClearLibrary = useCallback(async () => {
    await clearAllStoredFiles();
    await refreshFiles();
    showToast(t.clearLibraryConfirm);
  }, [refreshFiles, showToast, t.clearLibraryConfirm]);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTool(null);
    setViewerFile(null);
    setActiveTab(tab);
  };

  const handleSelectTool = (toolId: ToolId) => {
    setViewerFile(null);
    setActiveTool(toolId);
  };

  const renderActiveTool = () => {
    if (!activeTool) return null;
    const goBack = () => {
      setActiveTool(null);
      setViewerFile(null);
    };

    switch (activeTool) {
      case 'viewer':
        return (
          <PdfViewerTool
            language={language}
            t={t}
            initialFile={viewerFile}
            onBack={goBack}
            onFileOpened={async ({ name, bytes, pageCount }) => {
              await saveStoredFile({
                name,
                size: bytes.byteLength,
                pageCount,
                toolUsed: 'viewer',
                mimeType: 'application/pdf',
                bytes,
              });
              await refreshFiles();
            }}
          />
        );
      case 'merge':
        return (
          <MergePdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('merge', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
      case 'split':
        return (
          <SplitPdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('split', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
      case 'image-to-pdf':
        return (
          <ImageToPdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('image-to-pdf', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
      case 'pdf-to-image':
        return <PdfToImageTool language={language} t={t} onBack={goBack} />;
      case 'compress':
        return (
          <CompressPdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('compress', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
      case 'organize':
        return (
          <OrganizePdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('organize', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
      case 'lock-unlock':
        return (
          <LockUnlockPdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('lock-unlock', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
      case 'scan':
        return (
          <ScanToPdfTool
            language={language}
            t={t}
            onBack={goBack}
            onResultReady={(out) => handleSaveToolOutput('scan', out)}
            onOpenResult={handleOpenResultInViewer}
            onShareResult={(out) => handleShareBytes(out.bytes, out.name, out.mimeType)}
            onSaveResult={(out) => triggerFileDownload(out.bytes, out.name, out.mimeType)}
          />
        );
    }
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-[#111214] text-slate-900 dark:text-slate-100 transition-colors duration-150"
      data-theme={theme}
      data-lang={language}
    >
      <AnimatePresence>
        {showSplash && <SplashScreen appName={t.appName} tagline={t.tagline} />}
      </AnimatePresence>

      <TopHeader
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        t={t}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        language={language}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'))}
        fileCount={files.length}
      />

      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t.offlineBanner}</span>
        </div>
      )}

      <main>
        {activeTool ? (
          renderActiveTool()
        ) : activeTab === 'home' ? (
          <HomeScreen
            language={language}
            t={t}
            recentFiles={files}
            onSelectTool={handleSelectTool}
            onSeeAllTools={() => setActiveTab('tools')}
            onOpenFile={handleOpenStoredFile}
            onShareFile={(file) => handleShareBytes(file.bytes, file.name, file.mimeType)}
            onDeleteFile={handleDeleteFile}
          />
        ) : activeTab === 'tools' ? (
          <ToolsScreen language={language} t={t} onSelectTool={handleSelectTool} />
        ) : activeTab === 'files' ? (
          <MyFilesScreen
            language={language}
            t={t}
            files={files}
            onOpenFile={handleOpenStoredFile}
            onShareFile={(file) => handleShareBytes(file.bytes, file.name, file.mimeType)}
            onSaveFile={(file) => triggerFileDownload(file.bytes, file.name, file.mimeType)}
            onDeleteFile={handleDeleteFile}
          />
        ) : (
          <SettingsScreen
            t={t}
            theme={theme}
            onSetTheme={setTheme}
            language={language}
            onSetLanguage={setLanguage}
            fileCount={files.length}
            onClearLibrary={handleClearLibrary}
            savedRating={savedRating}
            onSaveRating={(stars) => {
              setSavedRating(stars);
              persistSavedRating(stars);
            }}
          />
        )}
      </main>

      {!activeTool && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          t={t}
          fileCount={files.length}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-lg whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
