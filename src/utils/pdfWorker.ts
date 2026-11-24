import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjsLib };

export async function loadPdfJsDocument(
  bytes: Uint8Array,
  password?: string
): Promise<pdfjsLib.PDFDocumentProxy> {
  const dataCopy = new Uint8Array(bytes);
  const task = pdfjsLib.getDocument({
    data: dataCopy,
    password,
    useWorkerFetch: false,
  });
  return task.promise;
}

export async function closePdfJsDocument(doc: pdfjsLib.PDFDocumentProxy | null | undefined): Promise<void> {
  if (!doc) return;
  try {
    await doc.cleanup();
  } catch {
    // ignore cleanup errors
  }
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    const pdf = await loadPdfJsDocument(bytes);
    const count = pdf.numPages;
    await closePdfJsDocument(pdf);
    return count;
  }
}

export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable.');

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  return { width: canvas.width, height: canvas.height };
}

export async function renderPageToDataUrl(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 0.5,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.85
): Promise<{ dataUrl: string; width: number; height: number }> {
  const canvas = document.createElement('canvas');
  const dims = await renderPageToCanvas(pdfDoc, pageNumber, canvas, scale);
  const dataUrl = canvas.toDataURL(mimeType, quality);
  return { dataUrl, ...dims };
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a real valid multi-page sample PDF purely offline using pdf-lib.
 */
export async function createSamplePdf(
  title = 'RedLeaf Sample Document',
  pageCount = 3
): Promise<{ name: string; bytes: Uint8Array; pageCount: number }> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 40,
      y: height - 110,
      width: width - 80,
      height: 60,
      color: rgb(0.827, 0.184, 0.184),
    });

    page.drawText(title, {
      x: 56,
      y: height - 78,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Page ${i} of ${pageCount}`, {
      x: 56,
      y: height - 98,
      size: 11,
      font: fontRegular,
      color: rgb(1, 0.85, 0.85),
    });

    page.drawText(`Offline Document Preview — Section ${i}`, {
      x: 48,
      y: height - 165,
      size: 15,
      font: fontBold,
      color: rgb(0.12, 0.14, 0.18),
    });

    const lines = [
      'Processed 100% locally in your browser without any server uploads.',
      'Use Merge, Split, Compress, Rotate, Organize, or Lock tools on this file.',
      `Generated locally for offline testing · Page index #${i}.`,
    ];

    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: 48,
        y: height - 205 - idx * 24,
        size: 11.5,
        font: fontRegular,
        color: rgb(0.28, 0.32, 0.38),
      });
    });

    page.drawRectangle({
      x: 48,
      y: 260,
      width: width - 96,
      height: 220,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 0.99),
    });

    page.drawText(`Diagram Block ${i}`, {
      x: 68,
      y: 365,
      size: 14,
      font: fontBold,
      color: rgb(0.827, 0.184, 0.184),
    });
  }

  const bytes = await doc.save();
  return {
    name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`,
    bytes: new Uint8Array(bytes),
    pageCount,
  };
}

/**
 * Generates sample PNG images locally via canvas for quick Image-to-PDF testing.
 */
export async function createSampleImages(): Promise<Array<{ name: string; dataUrl: string; bytes: Uint8Array }>> {
  const labels = [
    { title: 'Invoice #104', bg: '#FFF5F5', accent: '#D32F2F' },
    { title: 'Field Notes', bg: '#F8FAFC', accent: '#1E293B' },
  ];
  return labels.map((item, idx) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 840;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = item.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = item.accent;
    ctx.fillRect(48, 56, canvas.width - 96, 84);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(item.title, 72, 110);
    ctx.fillStyle = '#334155';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Sample image ${idx + 1} created offline`, 56, 200);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 250, canvas.width - 96, 480);
    const dataUrl = canvas.toDataURL('image/png');
    return {
      name: `sample_page_${idx + 1}.png`,
      dataUrl,
      bytes: dataUrlToUint8Array(dataUrl),
    };
  });
}
