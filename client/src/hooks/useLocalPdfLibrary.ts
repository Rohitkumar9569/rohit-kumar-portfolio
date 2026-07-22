import { useCallback, useEffect, useState } from 'react';
import { localPdfLibrary, type LocalPdfEntry } from '../utils/localPdfLibrary';

export interface UseLocalPdfLibraryReturn {
  pdfs: LocalPdfEntry[];
  isLoading: boolean;
  importFiles: (files: FileList | File[]) => Promise<LocalPdfEntry[]>;
  deletePdf: (id: string) => Promise<void>;
  openPdf: (id: string) => Promise<string | null>;
}

export const useLocalPdfLibrary = (): UseLocalPdfLibraryReturn => {
  const [pdfs, setPdfs] = useState<LocalPdfEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await localPdfLibrary.list();
      setPdfs(list);
    } catch {
      setPdfs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // ✅ No cleanup — blob URLs live in localPdfLibrary module-level cache
    // Navigation se URLs revoke nahi honge
  }, [refresh]);

  const importFiles = useCallback(
    async (files: FileList | File[]): Promise<LocalPdfEntry[]> => {
      const arr = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      );
      if (!arr.length) return [];
      const saved: LocalPdfEntry[] = [];
      for (const file of arr) {
        saved.push(await localPdfLibrary.save(file));
      }
      await refresh();
      return saved;
    },
    [refresh],
  );

  const deletePdf = useCallback(
    async (id: string) => {
      // localPdfLibrary.delete() khud blob URL revoke karta hai
      await localPdfLibrary.delete(id);
      await refresh();
    },
    [refresh],
  );

  const openPdf = useCallback(
    async (id: string): Promise<string | null> =>
      localPdfLibrary.getObjectUrl(id),
    [],
  );

  return { pdfs, isLoading, importFiles, deletePdf, openPdf };
};