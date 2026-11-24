import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Lock, Unlock } from 'lucide-react';
import type { Language, ProcessProgress, ToolOutputFile } from '../../types/pdf';
import { TOOL_TRANSLATIONS, type UIStrings } from '../../i18n/translations';
import { createSamplePdf, loadPdfJsDocument, renderPageToDataUrl } from '../../utils/pdfWorker';
import { buildOutputFilename, formatFileSize, validatePasswordPair } from '../../utils/pdfLogic';
import { ToolFlowShell, type FlowStep } from '../ToolFlowShell';
import { FileDropzone } from '../FileDropzone';

interface LockUnlockPdfToolProps {
  language: Language;
  t: UIStrings;
  onBack: () => void;
  onResultReady: (output: ToolOutputFile) => Promise<void>;
  onOpenResult: (output: ToolOutputFile) => void;
  onShareResult: (output: ToolOutputFile) => void;
  onSaveResult: (output: ToolOutputFile) => void;
}

export const LockUnlockPdfTool: React.FC<LockUnlockPdfToolProps> = ({
  language,
  t,
  onBack,
  onResultReady,
  onOpenResult,
  onShareResult,
  onSaveResult,
}) => {
  const copy = TOOL_TRANSLATIONS[language]['lock-unlock'];
  const [step, setStep] = useState<FlowStep>('pick');
  const [mode, setMode] = useState<'lock' | 'unlock'>('lock');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [progress, setProgress] = useState<ProcessProgress>({ percent: 0, label: '' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolOutputFile | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    setFileName(file.name);
    setFileBytes(bytes);
    setError(null);
    setPassword('');
    setConfirmPassword('');

    // Auto-detect if encrypted by attempting passwordless open with pdf.js
    try {
      const doc = await loadPdfJsDocument(bytes);
      await doc.cleanup();
      setMode('lock');
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e?.name === 'PasswordException') {
        setMode('unlock');
      }
    }
    setStep('options');
  };

  const handleTrySample = async () => {
    const sample = await createSamplePdf('Confidential Memo', 2);
    setFileName(sample.name);
    setFileBytes(sample.bytes);
    setMode('lock');
    setError(null);
    setStep('options');
  };

  const handleProcess = async () => {
    if (!fileBytes) return;
    setError(null);

    if (mode === 'lock') {
      const validationError = validatePasswordPair(password, confirmPassword);
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!password) {
      setError('Enter the current PDF password to unlock it.');
      return;
    }

    setStep('processing');
    setProgress({
      percent: 15,
      label: mode === 'lock' ? 'Encrypting PDF on device...' : 'Decrypting PDF on device...',
    });

    try {
      const pdfDoc = await loadPdfJsDocument(fileBytes, mode === 'unlock' ? password : undefined);
      const count = pdfDoc.numPages;

      let outDoc: jsPDF | null = null;
      for (let p = 1; p <= count; p++) {
        setProgress({
          percent: Math.round(20 + (p / count) * 70),
          label: `Processing page ${p} of ${count}...`,
        });
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const rendered = await renderPageToDataUrl(pdfDoc, p, 1.8, 'image/jpeg', 0.9);

        if (!outDoc) {
          outDoc = new jsPDF({
            orientation: vp.width > vp.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [vp.width, vp.height],
            compress: true,
            ...(mode === 'lock'
              ? {
                  encryption: {
                    userPassword: password,
                    ownerPassword: password,
                    userPermissions: ['print', 'modify', 'copy', 'annot-forms'],
                  },
                }
              : {}),
          });
        } else {
          outDoc.addPage([vp.width, vp.height], vp.width > vp.height ? 'landscape' : 'portrait');
        }
        outDoc.addImage(rendered.dataUrl, 'JPEG', 0, 0, vp.width, vp.height, undefined, 'FAST');
      }
      await pdfDoc.cleanup();

      const outBytes = new Uint8Array(outDoc!.output('arraybuffer'));
      const output: ToolOutputFile = {
        name: buildOutputFilename(fileName, mode === 'lock' ? 'locked' : 'unlocked'),
        bytes: outBytes,
        mimeType: 'application/pdf',
        pageCount: count,
      };
      await onResultReady(output);
      setResult(output);
      setProgress({ percent: 100, label: 'Done' });
      setStep('result');
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      if (errObj?.name === 'PasswordException') {
        setError('Incorrect password or PDF requires a password. Switch to Unlock and enter the right password.');
      } else {
        setError(errObj?.message || 'Unable to process this PDF.');
      }
      setStep('options');
    }
  };

  const handleReset = () => {
    setFileName('');
    setFileBytes(null);
    setPassword('');
    setConfirmPassword('');
    setResult(null);
    setError(null);
    setStep('pick');
  };

  return (
    <ToolFlowShell
      toolId="lock-unlock"
      title={copy.name}
      subtitle={fileName ? `${fileName} · ${fileBytes ? formatFileSize(fileBytes.byteLength) : ''}` : copy.shortDesc}
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
          <div className="rounded-3xl bg-[#F8F9FA] dark:bg-[#1A1C1E] border border-slate-200 dark:border-[#2E3136] p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#242629]">
              <button
                type="button"
                onClick={() => {
                  setMode('lock');
                  setError(null);
                }}
                className={`min-h-[44px] rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 ${
                  mode === 'lock'
                    ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Lock PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('unlock');
                  setError(null);
                }}
                className={`min-h-[44px] rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 ${
                  mode === 'unlock'
                    ? 'bg-white dark:bg-[#111214] text-[#D32F2F] dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock PDF</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="pdf-password-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {mode === 'lock' ? 'Set Password (min 4 characters)' : 'Enter Current Password'}
                </label>
                <input
                  id="pdf-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F]"
                />
              </div>

              {mode === 'lock' && (
                <div>
                  <label
                    htmlFor="pdf-password-confirm"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="pdf-password-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-[#242629] border border-slate-200 dark:border-[#3A3E45] text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#D32F2F]"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleProcess}
            className="w-full min-h-[52px] rounded-2xl bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm md:text-base font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            {mode === 'lock' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            <span>{mode === 'lock' ? 'Protect PDF with Password' : 'Remove Password Protection'}</span>
          </button>
        </div>
      )}
    </ToolFlowShell>
  );
};
