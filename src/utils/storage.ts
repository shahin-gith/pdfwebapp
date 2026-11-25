import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Language, StoredFile, ThemeMode } from '../types/pdf';

const DB_NAME = 'redleaf_pdf_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

const THEME_KEY = 'redleaf_theme';
const LANG_KEY = 'redleaf_language';
const RATING_KEY = 'redleaf_rating';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Unable to open offline database'));
  });
}

export async function listStoredFiles(): Promise<StoredFile[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredFile[]) || [];
        rows.sort((a, b) => b.createdAt - a.createdAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to load stored files'));
    });
  } catch {
    return [];
  }
}

export async function saveStoredFile(file: Omit<StoredFile, 'id' | 'createdAt'>): Promise<StoredFile> {
  const entry: StoredFile = {
    ...file,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save file offline'));
  });
  return entry;
}

export async function deleteStoredFile(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete file'));
  });
}

export async function clearAllStoredFiles(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear files'));
  });
}

export function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light';
}

export function persistTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'bn') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

export function persistLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export function loadSavedRating(): number {
  try {
    const raw = localStorage.getItem(RATING_KEY);
    const num = raw ? Number(raw) : 0;
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
}

export function persistSavedRating(stars: number): void {
  try {
    localStorage.setItem(RATING_KEY, String(stars));
  } catch {
    // ignore
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(''));
}

export function triggerFileDownload(bytes: Uint8Array, filename: string, mimeType: string): void {
  if (Capacitor.isNativePlatform()) {
    const base64Data = uint8ArrayToBase64(bytes);
    Filesystem.writeFile({
      path: `RedLeafPDF/${filename}`,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    })
      .then((res) => Share.share({ title: filename, url: res.uri }))
      .catch(() => {
        // Fallback to cache + share if Documents permission is unavailable
        Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        }).then((res) => Share.share({ title: filename, url: res.uri }));
      });
    return;
  }

  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareOrDownloadFile(
  bytes: Uint8Array,
  filename: string,
  mimeType: string
): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const base64Data = uint8ArrayToBase64(bytes);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: written.uri,
    });
    return 'shared';
  }

  const copy = new Uint8Array(bytes);
  const file = new File([copy], filename, { type: mimeType });
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: filename,
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared';
      }
    }
  }
  triggerFileDownload(bytes, filename, mimeType);
  return 'downloaded';
}
