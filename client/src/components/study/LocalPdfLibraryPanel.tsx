import { useCallback, useRef, useState } from 'react';
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useLocalPdfLibrary } from '../../hooks/useLocalPdfLibrary';
import { type LocalPdfEntry } from '../../utils/localPdfLibrary';

interface LocalPdfLibraryPanelProps {
  onOpen: (blobUrl: string, title: string) => void;
  isCollapsed?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

const Spinner = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const LocalPdfLibraryPanel = ({
  onOpen,
  isCollapsed = false,
}: LocalPdfLibraryPanelProps) => {
  const { pdfs, isLoading, importFiles, deletePdf, openPdf } = useLocalPdfLibrary();
  const [isImporting, setIsImporting] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsImporting(true);
      try {
        await importFiles(files);
      } finally {
        setIsImporting(false);
      }
    },
    [importFiles],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  };

  const handleOpenPdf = async (entry: LocalPdfEntry) => {
    if (openingId) return;
    setOpeningId(entry.id);
    try {
      const url = await openPdf(entry.id);
      if (url) onOpen(url, entry.name);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deletePdf(id);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Collapsed mode — only show import icon button ──────────────────────
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          title="Import PDF (local only)"
          className="group flex h-9 w-9 items-center justify-center rounded-[1rem] text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {isImporting ? (
            <Spinner className="h-5 w-5 text-cyan-500" />
          ) : (
            <ArrowUpTrayIcon className="h-5 w-5" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    );
  }

  // ── Expanded mode ───────────────────────────────────────────────────────
  return (
    <div className="mt-3 space-y-2">
      {/* Section label */}
      <div className="px-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          My PDFs
        </p>
      </div>

      {/* Drop / Import zone */}
      <div className="px-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          disabled={isImporting}
          className={[
            'flex w-full items-center gap-2.5 rounded-xl border border-dashed px-2.5 py-2 text-left text-xs font-semibold transition',
            isDragOver
              ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 dark:text-cyan-300'
              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200',
            isImporting ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
        >
          {isImporting ? (
            <Spinner className="h-4 w-4 shrink-0 text-cyan-500" />
          ) : (
            <ArrowUpTrayIcon className="h-4 w-4 shrink-0" />
          )}
          <span>{isImporting ? 'Importing…' : 'Import PDF'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* PDF list */}
      {isLoading ? (
        <div className="space-y-1 px-1">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : pdfs.length === 0 ? (
        <p className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-600">
          No PDFs yet
        </p>
      ) : (
        <div className="space-y-0.5 px-1">
          {pdfs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => void handleOpenPdf(entry)}
              disabled={openingId === entry.id}
              className="group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {/* Icon */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
                {openingId === entry.id ? (
                  <Spinner className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <DocumentIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                )}
              </span>

              {/* Text */}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {entry.name}
                </span>
                <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {formatBytes(entry.size)} · {formatDate(entry.addedAt)}
                </span>
              </span>

              {/* Delete button */}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => void handleDelete(e as unknown as React.MouseEvent, entry.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleDelete(e as unknown as React.MouseEvent, entry.id);
                  }
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                aria-label={`Delete ${entry.name}`}
              >
                {deletingId === entry.id ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <TrashIcon className="h-3 w-3" />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Privacy note */}
      {pdfs.length > 0 && (
        <p className="px-2.5 text-[10px] font-medium text-slate-400 dark:text-slate-600">
          🔒 Device only · Never uploaded
        </p>
      )}
    </div>
  );
};