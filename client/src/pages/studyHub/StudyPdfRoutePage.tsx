import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import StudyPdfReaderFrame from '../../components/study/StudyPdfReaderFrame';
import { addRecentStudyFileView } from '../../utils/studyActivity';
import {
  getStudyPdfDisplayUrl,
  getStudyPdfPreflightUrl,
  isStudyBookPackageUrl,
  isStudyPdfUrl,
  isStudyReadableDocumentUrl,
} from '../../utils/studyPdfReader';

type ReaderPreflightState = {
  ready: boolean;
  status: string;
  percent: number;
  message: string;
  error?: string;
};

const StudyPdfRoutePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileUrl = searchParams.get('url') || '';
  const title = searchParams.get('title') || 'PDF document';
  const returnTo = searchParams.get('returnTo');

  const isLocalBlob = fileUrl.startsWith('blob:');
  const isPdf = isLocalBlob || isStudyPdfUrl(fileUrl);
  const isReadable = isLocalBlob || isStudyReadableDocumentUrl(fileUrl);
  const isBookPackage = !isLocalBlob && isStudyBookPackageUrl(fileUrl);
  const displayUrl = isLocalBlob ? fileUrl : getStudyPdfDisplayUrl(fileUrl);

  const [preflight, setPreflight] = useState<ReaderPreflightState>({
    ready: !isBookPackage,
    status: isBookPackage ? 'queued' : 'ready',
    percent: isBookPackage ? 4 : 100,
    message: isBookPackage ? 'Preparing NCERT book.' : 'Document is ready.',
  });

  useEffect(() => {
    if (!fileUrl || isLocalBlob) return;
    addRecentStudyFileView({ name: title, url: fileUrl, mimeType: isPdf ? 'application/pdf' : 'application/octet-stream' }, title);
  }, [fileUrl, isPdf, isLocalBlob, title]);

  useEffect(() => {
    if (!fileUrl || !isBookPackage) {
      setPreflight({
        ready: true,
        status: 'ready',
        percent: 100,
        message: 'Document is ready.',
      });
      return undefined;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(getStudyPdfPreflightUrl(fileUrl), {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('NCERT book could not be prepared.');
        const data = await response.json() as Partial<ReaderPreflightState>;
        if (cancelled) return;

        const nextState: ReaderPreflightState = {
          ready: Boolean(data.ready),
          status: data.status || 'queued',
          percent: Math.max(4, Math.min(100, Math.round(Number(data.percent) || 4))),
          message: data.message || 'Preparing NCERT book.',
        };
        setPreflight(nextState);

        if (!nextState.ready) {
          timer = window.setTimeout(poll, nextState.status === 'queued' ? 850 : 1400);
        }
      } catch (error) {
        if (cancelled) return;
        setPreflight({
          ready: false,
          status: 'error',
          percent: 100,
          message: error instanceof Error ? error.message : 'NCERT book could not be prepared.',
          error: 'Reader preparation failed.',
        });
      }
    };

    setPreflight({
      ready: false,
      status: 'queued',
      percent: 4,
      message: 'Preparing NCERT book.',
    });
    void poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [fileUrl, isBookPackage]);

  const handleClose = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate(-1);
  };

  if (!fileUrl) {
    return (
      <div className="study-shell flex h-[100dvh] items-center justify-center p-6 text-center text-slate-950 dark:text-white">
        <div className="study-panel-surface max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-white/10 dark:text-cyan-200">
            <DocumentTextIcon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-black">PDF not available</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            This file link is missing. Go back and open the file again.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!isReadable) {
    return (
      <div className="study-shell flex h-[100dvh] items-center justify-center p-6 text-center text-slate-950 dark:text-white">
        <div className="study-panel-surface max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/10 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
            <ArrowDownTrayIcon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-black">Download package</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            This file is not available as an in-app reader document yet.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          </div>
        </div>
      </div>
    );
  }

  const shouldDeferReader = isBookPackage && !preflight.ready && preflight.status !== 'error';

  return (
    <div className="study-shell h-[100dvh] overflow-hidden">
      <StudyPdfReaderFrame
        title={title}
        fileUrl={displayUrl}
        downloadUrl={isLocalBlob ? undefined : fileUrl}
        onClose={handleClose}
        isPreparing={shouldDeferReader}
        preparingProgress={preflight.percent}
      />
    </div>
  );
};

export default StudyPdfRoutePage;