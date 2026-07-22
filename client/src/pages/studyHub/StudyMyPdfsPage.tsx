import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  LockClosedIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useLocalPdfLibrary } from '../../hooks/useLocalPdfLibrary';
import { type LocalPdfEntry } from '../../utils/localPdfLibrary';
import { getStudyPdfReaderHref } from '../../utils/studyPdfReader';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const Spinner = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const StudyMyPdfsPage = () => {
  const navigate = useNavigate();
  const { pdfs, isLoading, importFiles, deletePdf, openPdf } = useLocalPdfLibrary();
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleView = async (entry: LocalPdfEntry) => {
    if (openingId) return;
    setOpeningId(entry.id);
    try {
      const url = await openPdf(entry.id);
      if (url) {
        const href = getStudyPdfReaderHref(url, entry.name, '/app/my-pdfs');
        navigate(href);
      }
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-2 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="study-control-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-950 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            My PDFs
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            <LockClosedIcon className="h-3 w-3" aria-hidden="true" />
            <span>Stored only on this device · Never uploaded</span>
          </div>
        </div>
      </div>

      {/* Import dropzone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        disabled={isImporting}
        className={[
          'group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
          isDragOver
            ? 'border-cyan-500 bg-cyan-500/5 scale-[1.005]'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.10] dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]',
          isImporting ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60 transition-opacity duration-300 group-hover:opacity-90"
          style={{
            background: 'radial-gradient(60% 100% at 50% 0%, rgba(6,182,212,0.10) 0%, transparent 70%)',
          }}
        />

        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-sky-500/10 shadow-inner dark:from-cyan-400/10 dark:to-sky-400/10">
          {isImporting ? (
            <Spinner className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
          ) : (
            <ArrowUpTrayIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
          )}
        </div>

        <div className="relative">
          <p className="text-sm font-black text-slate-800 dark:text-slate-100">
            {isImporting ? 'Importing…' : 'Import a PDF'}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
            Click to browse or drag & drop · PDF only
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </button>

      {/* PDF list */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.05]"
              />
            ))}
          </div>
        ) : pdfs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/70 bg-white py-16 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 dark:bg-white/[0.04]">
              <DocumentTextIcon className="h-8 w-8 text-slate-200 dark:text-white/[0.14]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-600 dark:text-slate-300">No PDFs yet</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                Import a file above to start reading offline
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pdfs.map((entry) => (
              <div
                key={entry.id}
                className="group relative flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none dark:hover:border-white/[0.14] dark:hover:bg-white/[0.045]"
              >
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
                  <DocumentTextIcon className="h-6 w-6 text-red-500 dark:text-red-400" aria-hidden="true" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {entry.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {formatBytes(entry.size)} · Added {formatDate(entry.addedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleView(entry)}
                    disabled={openingId === entry.id}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
                  >
                    {openingId === entry.id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleDelete(e, entry.id)}
                    disabled={deletingId === entry.id}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    aria-label={`Delete ${entry.name}`}
                  >
                    {deletingId === entry.id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyMyPdfsPage;