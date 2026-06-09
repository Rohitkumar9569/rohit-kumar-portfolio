import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  FolderPlusIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  createAdminStudyCard,
  uploadAdminStudyCardFiles,
  type StudyCardPayload,
} from '../../studyHubApi';
import { getStudyCardVisual, inferStudyIconKey, type StudyTone } from './StudyVisualCards';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const inferCardStyle = (name: string, mode: 'heading' | 'child'): { iconKey: string; tone: StudyTone } => {
  if (mode === 'heading') return { iconKey: 'heading', tone: 'indigo' };
  const iconKey = inferStudyIconKey(name, 'folder');
  const visual = getStudyCardVisual(iconKey, undefined, name);
  return { iconKey, tone: visual.tone };
};

interface InlineStudyAdminToolsProps {
  workspaceSlug: string;
  parentId: string | null;
  mode: 'heading' | 'child';
  title: string;
  allowFileUpload?: boolean;
  onChanged: () => void | Promise<void>;
}

const InlineStudyAdminTools = ({
  workspaceSlug,
  parentId,
  mode,
  title,
  allowFileUpload = Boolean(parentId),
  onChanged,
}: InlineStudyAdminToolsProps) => {
  const [activePanel, setActivePanel] = useState<'card' | 'file' | null>(null);
  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const resetCardForm = () => {
    setName('');
  };

  const resetFileForm = () => {
    setFileName('');
    setFiles([]);
  };

  const closePanel = () => {
    setActivePanel(null);
    resetCardForm();
    resetFileForm();
  };

  const handleCreateCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const safeName = name.trim();
    if (!safeName) return;
    const style = inferCardStyle(safeName, mode);

    const payload: StudyCardPayload = {
      workspaceSlug,
      parentId,
      name: safeName,
      slug: slugify(safeName),
      iconKey: style.iconKey,
      tone: style.tone,
      order: 0,
      status: 'published',
      visibility: 'public',
    };

    await toast.promise(createAdminStudyCard(payload), {
      loading: mode === 'heading' ? 'Creating heading...' : 'Creating folder...',
      success: mode === 'heading' ? 'Heading created' : 'Folder created',
      error: 'Create failed',
    });

    closePanel();
    await onChanged();
  };

  const handleUploadFiles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parentId || !files.length) return;

    const names = files.map((file, index) => (index === 0 ? fileName.trim() : '') || file.name.replace(/\.[^/.]+$/, ''));
    await toast.promise(uploadAdminStudyCardFiles(parentId, files, names), {
      loading: 'Uploading files...',
      success: 'Files uploaded',
      error: 'Upload failed',
    });

    closePanel();
    await onChanged();
  };

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 dark:bg-cyan-400/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-xs font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
          {title}
        </span>
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'card' ? null : 'card')}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-cyan-700"
        >
          {mode === 'heading' ? <PlusIcon className="h-4 w-4" aria-hidden="true" /> : <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />}
          {mode === 'heading' ? 'Add heading' : 'Add folder'}
        </button>
        {allowFileUpload && parentId && (
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'file' ? null : 'file')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            Upload file
          </button>
        )}
        {activePanel && (
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-white transition hover:bg-slate-600"
            aria-label="Close admin tools"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {activePanel === 'card' && (
        <form onSubmit={handleCreateCard} className="mt-3 grid gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
              {mode === 'heading' ? 'Heading name' : 'Folder/card name'}
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={mode === 'heading' ? 'Heading name' : 'Folder name'}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
              required
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2 font-black text-white transition hover:bg-cyan-700">
            Create
          </button>
        </form>
      )}

      {activePanel === 'file' && parentId && (
        <form onSubmit={handleUploadFiles} className="mt-3 grid gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 lg:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="First file display name"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
          <input
            type="file"
            multiple
            accept="application/pdf"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-white"
          />
          <button
            disabled={!files.length}
            className="rounded-md bg-emerald-600 px-4 py-2 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Upload
          </button>
        </form>
      )}
    </div>
  );
};

export default InlineStudyAdminTools;
