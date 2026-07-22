// ─── Local PDF Library — IndexedDB only, zero server storage ──────────────

export interface LocalPdfEntry {
  id: string;
  name: string;
  size: number;
  addedAt: number;
}

const DB_NAME = 'studyhub-local-pdfs-v1';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

// ✅ Module-level URL cache — survives React component unmount/remount/navigation
// Blob URLs are ONLY revoked when user explicitly deletes the PDF
const blobUrlCache = new Map<string, string>();

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const localPdfLibrary = {
  async save(file: File): Promise<LocalPdfEntry> {
    const id = `localpdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const entry: LocalPdfEntry = {
      id,
      name: file.name.replace(/\.pdf$/i, '').trim() || 'Untitled PDF',
      size: file.size,
      addedAt: Date.now(),
    };
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ ...entry, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return entry;
  },

  async list(): Promise<LocalPdfEntry[]> {
    const db = await openDb();
    const rows = await new Promise<LocalPdfEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () =>
        resolve(
          (req.result as Array<LocalPdfEntry & { blob?: Blob }>).map(
            ({ id, name, size, addedAt }) => ({ id, name, size, addedAt }),
          ),
        );
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => b.addedAt - a.addedAt);
  },

  // ✅ Cache-first: ek baar banaya URL tab tak valid rahega jab tak delete na ho
  async getObjectUrl(id: string): Promise<string | null> {
    // Return cached URL if available — no re-creation needed
    const cached = blobUrlCache.get(id);
    if (cached) return cached;

    const db = await openDb();
    const row = await new Promise<(LocalPdfEntry & { blob?: Blob }) | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result as LocalPdfEntry & { blob?: Blob });
        req.onerror = () => reject(req.error);
      },
    );
    db.close();

    if (!row?.blob) return null;

    const url = URL.createObjectURL(row.blob);
    // Store in module-level cache — persists across component lifecycle
    blobUrlCache.set(id, url);
    return url;
  },

  // ✅ Delete karte waqt cached URL bhi revoke karo
  async delete(id: string): Promise<void> {
    // Revoke blob URL if cached
    const cached = blobUrlCache.get(id);
    if (cached) {
      URL.revokeObjectURL(cached);
      blobUrlCache.delete(id);
    }

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  },

  // ✅ Utility: check karo koi URL cached hai ya nahi
  getCachedUrl(id: string): string | undefined {
    return blobUrlCache.get(id);
  },

  // ✅ Manual cleanup — sirf tab use karo jab pura app close ho
  revokeAllCachedUrls(): void {
    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();
  },
};