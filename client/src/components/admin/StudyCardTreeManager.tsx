import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ChevronRightIcon,
  EyeIcon,
  FolderPlusIcon,
  HomeIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  createAdminStudyCard,
  deleteAdminStudyCard,
  deleteAdminStudyCardFile,
  fetchAdminStudyCard,
  fetchAdminStudyCards,
  updateAdminStudyCard,
  updateAdminStudyCardFile,
  uploadAdminStudyCardFiles,
  type StudyCard,
  type StudyCardPayload,
} from '../../studyHubApi';
import {
  getStudyCardVisual,
  getToneBadgeClass,
  type StudyTone,
} from '../study/StudyVisualCards';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const NEW_ROOT_VALUE = '__new_root__';

const uploadTypeOptions: Array<{ value: string; label: string; iconKey: string; tone: StudyTone; defaultFolder: string }> = [
  { value: 'pyq', label: 'PYQ / Paper', iconKey: 'pyq', tone: 'violet', defaultFolder: 'Previous Year Papers' },
  { value: 'notes', label: 'Notes', iconKey: 'notes', tone: 'blue', defaultFolder: 'Notes' },
  { value: 'material', label: 'Study Material', iconKey: 'folder', tone: 'emerald', defaultFolder: 'Study Material' },
  { value: 'book', label: 'Books', iconKey: 'book', tone: 'emerald', defaultFolder: 'Books' },
  { value: 'syllabus', label: 'Syllabus', iconKey: 'syllabus', tone: 'amber', defaultFolder: 'Syllabus' },
  { value: 'qa', label: 'Interview Q&A', iconKey: 'qa', tone: 'rose', defaultFolder: 'Interview Q&A' },
  { value: 'practice', label: 'Practice Questions', iconKey: 'practice', tone: 'indigo', defaultFolder: 'Practice Questions' },
  { value: 'update', label: 'Updates', iconKey: 'update', tone: 'amber', defaultFolder: 'Updates' },
];

const defaultCardForm: StudyCardPayload = {
  workspaceSlug: PLATFORM_WORKSPACE_SLUG,
  parentId: null,
  name: '',
  slug: '',
  iconKey: 'heading',
  tone: 'indigo',
  order: 0,
  status: 'published',
  visibility: 'public',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const formatBytes = (size?: number) => {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const splitPath = (path: string) =>
  path
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

const inferCardStyle = (name: string, mode: 'heading' | 'child'): { iconKey: string; tone: StudyTone } => {
  if (mode === 'heading') return { iconKey: 'heading', tone: 'indigo' };

  const lower = name.toLowerCase();
  if (lower.includes('physics')) return { iconKey: 'physics', tone: 'blue' };
  if (lower.includes('chemistry')) return { iconKey: 'chemistry', tone: 'amber' };
  if (lower.includes('biology')) return { iconKey: 'biology', tone: 'emerald' };
  if (lower.includes('math')) return { iconKey: 'maths', tone: 'violet' };
  if (lower.includes('aptitude') || lower.includes('csat')) return { iconKey: 'aptitude', tone: 'cyan' };
  if (lower.includes('interview')) return { iconKey: 'interview', tone: 'rose' };
  if (lower.includes('paper') || lower.includes('pyq')) return { iconKey: 'pyq', tone: 'violet' };
  if (lower.includes('note')) return { iconKey: 'notes', tone: 'blue' };
  if (lower.includes('book') || lower.includes('ncert')) return { iconKey: 'book', tone: 'emerald' };
  if (lower.includes('syllabus')) return { iconKey: 'syllabus', tone: 'amber' };
  if (lower.includes('practice') || lower.includes('mock') || lower.includes('dpp')) return { iconKey: 'practice', tone: 'indigo' };
  if (lower.includes('question') || lower.includes('qa')) return { iconKey: 'qa', tone: 'rose' };
  if (lower.includes('formula')) return { iconKey: 'formula', tone: 'violet' };
  if (lower.includes('mind')) return { iconKey: 'mindmap', tone: 'cyan' };
  if (lower.includes('coding')) return { iconKey: 'coding', tone: 'slate' };
  return { iconKey: 'folder', tone: 'blue' };
};

const getBlankCardForm = (parentId: string | null): StudyCardPayload => ({
  ...defaultCardForm,
  parentId,
  iconKey: parentId ? 'folder' : 'heading',
  tone: parentId ? 'blue' : 'indigo',
});

const StudyCardTreeManager = () => {
  const queryClient = useQueryClient();
  const [parentStack, setParentStack] = useState<StudyCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [editingCardId, setEditingCardId] = useState('');
  const [cardForm, setCardForm] = useState<StudyCardPayload>(getBlankCardForm(null));
  const [fileName, setFileName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [quickType, setQuickType] = useState('notes');
  const [quickRootMode, setQuickRootMode] = useState(NEW_ROOT_VALUE);
  const [quickRootName, setQuickRootName] = useState('');
  const [quickPath, setQuickPath] = useState('Physics / Notes');
  const [quickFileName, setQuickFileName] = useState('');
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [editingFileId, setEditingFileId] = useState('');
  const [editingFileName, setEditingFileName] = useState('');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const currentParent = parentStack[parentStack.length - 1];
  const currentParentId = currentParent?._id || null;
  const uploadTargetId = selectedCardId || currentParentId || '';

  const { data: cards = [], isLoading: isLoadingCards } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, currentParentId || 'root'],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: currentParentId || 'root' }),
    staleTime: 1000 * 20,
  });

  const { data: rootCards = [] } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, 'smart-root'],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'root' }),
    staleTime: 1000 * 20,
  });

  const { data: uploadTarget } = useQuery({
    queryKey: ['admin-study-card', uploadTargetId],
    queryFn: () => fetchAdminStudyCard(uploadTargetId),
    enabled: Boolean(uploadTargetId),
    staleTime: 1000 * 10,
  });

  const invalidateCards = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['study-cards'] }),
    ]);
  };

  const resetCardForm = () => {
    setEditingCardId('');
    setCardForm(getBlankCardForm(currentParentId));
  };

  const handleCardChange = (key: keyof StudyCardPayload, value: string | number | null | undefined) => {
    setCardForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'name' && !editingCardId ? { slug: slugify(String(value)) } : {}),
    }));
  };

  const buildPayload = (): StudyCardPayload => {
    const name = cardForm.name.trim();
    const mode = currentParentId ? 'child' : 'heading';
    const inferred = inferCardStyle(name, mode);

    return {
      ...cardForm,
      workspaceSlug: PLATFORM_WORKSPACE_SLUG,
      parentId: editingCardId ? cardForm.parentId ?? currentParentId : currentParentId,
      name,
      slug: cardForm.slug || slugify(name),
      iconKey: editingCardId ? cardForm.iconKey || inferred.iconKey : inferred.iconKey,
      tone: editingCardId ? cardForm.tone || inferred.tone : inferred.tone,
      order: Number(cardForm.order || (editingCardId ? 0 : cards.length + 1)),
      status: cardForm.status || 'published',
      visibility: cardForm.visibility || 'public',
    };
  };

  const handleCardSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload();
    const action = editingCardId
      ? updateAdminStudyCard(editingCardId, payload)
      : createAdminStudyCard(payload);

    await toast.promise(action, {
      loading: editingCardId ? 'Updating card...' : 'Creating card...',
      success: editingCardId ? 'Card updated' : 'Card created',
      error: 'Card save failed',
    });

    resetCardForm();
    await invalidateCards();
  };

  const findOrCreateCard = async ({
    parentId,
    name,
    iconKey,
    tone,
    order,
  }: {
    parentId: string | null;
    name: string;
    iconKey: string;
    tone: StudyTone;
    order: number;
  }) => {
    const children = await fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: parentId || 'root' });
    const slug = slugify(name);
    const existing = children.find((card) => card.slug === slug || card.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    return createAdminStudyCard({
      workspaceSlug: PLATFORM_WORKSPACE_SLUG,
      parentId,
      name,
      slug,
      iconKey,
      tone,
      order,
      status: 'published',
      visibility: 'public',
    });
  };

  const handleSmartUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quickFiles.length) {
      toast.error('Select at least one PDF file.');
      return;
    }

    const typeMeta = uploadTypeOptions.find((type) => type.value === quickType) || uploadTypeOptions[0];
    const rootName = quickRootMode === NEW_ROOT_VALUE
      ? quickRootName.trim()
      : rootCards.find((card) => card._id === quickRootMode)?.name || '';

    if (!rootName) {
      toast.error('Select existing root card or enter new root card name.');
      return;
    }

    await toast.promise((async () => {
      const rootCard = quickRootMode === NEW_ROOT_VALUE
        ? await findOrCreateCard({
          parentId: null,
          name: rootName,
          iconKey: 'heading',
          tone: 'indigo',
          order: rootCards.length + 1,
        })
        : rootCards.find((card) => card._id === quickRootMode);

      if (!rootCard) {
        throw new Error('Root card not found.');
      }

      let targetCard = rootCard;
      const pathParts = splitPath(quickPath || typeMeta.defaultFolder);
      for (let index = 0; index < pathParts.length; index += 1) {
        const name = pathParts[index];
        const isLast = index === pathParts.length - 1;
        const inferred = inferCardStyle(name, 'child');
        targetCard = await findOrCreateCard({
          parentId: targetCard._id,
          name,
          iconKey: isLast ? typeMeta.iconKey : inferred.iconKey,
          tone: isLast ? typeMeta.tone : inferred.tone,
          order: (index + 1) * 10,
        });
      }

      const names = quickFiles.map((file, index) => (index === 0 ? quickFileName.trim() : '') || file.name.replace(/\.[^/.]+$/, ''));
      const uploaded = await uploadAdminStudyCardFiles(targetCard._id, quickFiles, names);
      setSelectedCardId(uploaded._id);
      setQuickRootMode(rootCard._id);
      return uploaded;
    })(), {
      loading: 'Creating path and uploading files...',
      success: 'Path ready and files uploaded',
      error: 'Smart upload failed',
    });

    setQuickRootName('');
    setQuickFileName('');
    setQuickFiles([]);
    await invalidateCards();
  };

  const handleEditCard = (card: StudyCard) => {
    setEditingCardId(card._id);
    setCardForm({
      workspaceSlug: PLATFORM_WORKSPACE_SLUG,
      parentId: card.parentId || null,
      name: card.name,
      slug: card.slug,
      iconKey: card.iconKey || 'folder',
      iconUrl: card.iconUrl || '',
      tone: card.tone || 'blue',
      order: card.order || 0,
      status: card.status || 'published',
      visibility: card.visibility || 'public',
    });
    setSelectedCardId(card._id);
  };

  const handleDeleteCard = async (card: StudyCard) => {
    if (!window.confirm(`Delete "${card.name}" and all nested cards/files inside it?`)) return;

    await toast.promise(deleteAdminStudyCard(card._id), {
      loading: 'Deleting card tree...',
      success: 'Card tree deleted',
      error: 'Delete failed',
    });

    if (selectedCardId === card._id) setSelectedCardId('');
    resetCardForm();
    await invalidateCards();
  };

  const openCard = (card: StudyCard) => {
    setParentStack((current) => [...current, card]);
    setSelectedCardId(card._id);
    resetCardForm();
  };

  const jumpToLevel = (index: number) => {
    const nextStack = index < 0 ? [] : parentStack.slice(0, index + 1);
    setParentStack(nextStack);
    setSelectedCardId(nextStack[nextStack.length - 1]?._id || '');
    resetCardForm();
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadTargetId) {
      toast.error('Open or select a card before uploading files.');
      return;
    }
    if (!selectedFiles.length) {
      toast.error('Select at least one PDF file.');
      return;
    }

    const names = selectedFiles.map((file, index) => (index === 0 ? fileName.trim() : '') || file.name.replace(/\.[^/.]+$/, ''));
    await toast.promise(uploadAdminStudyCardFiles(uploadTargetId, selectedFiles, names), {
      loading: 'Uploading files...',
      success: 'Files uploaded',
      error: 'Upload failed',
    });

    setFileName('');
    setSelectedFiles([]);
    await invalidateCards();
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!uploadTargetId || !window.confirm('Delete this file from the card?')) return;

    await toast.promise(deleteAdminStudyCardFile(uploadTargetId, fileId), {
      loading: 'Deleting file...',
      success: 'File deleted',
      error: 'File delete failed',
    });
    await invalidateCards();
  };

  const startEditingFile = (fileId: string, name: string) => {
    setEditingFileId(fileId);
    setEditingFileName(name);
    setReplacementFile(null);
  };

  const cancelEditingFile = () => {
    setEditingFileId('');
    setEditingFileName('');
    setReplacementFile(null);
  };

  const handleUpdateFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadTargetId || !editingFileId) return;

    await toast.promise(updateAdminStudyCardFile(uploadTargetId, editingFileId, editingFileName, replacementFile), {
      loading: replacementFile ? 'Replacing file...' : 'Updating file...',
      success: replacementFile ? 'File replaced' : 'File updated',
      error: 'File update failed',
    });

    cancelEditingFile();
    await invalidateCards();
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-slate-950/40 sm:p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Study Hub Folder Builder</h2>
          <p className="mt-1 text-sm text-slate-400">
            Create homepage folders, nested subfolders, and PDFs for any exam library structure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-400/20"
          >
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            Student view
          </a>
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-300">
            <PlusCircleIcon className="h-4 w-4" aria-hidden="true" />
            Admin controlled
          </span>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        {[
          { icon: HomeIcon, title: '1. Heading', text: 'Homepage par exam ya category folders.' },
          { icon: FolderPlusIcon, title: '2. Cards / Folders', text: 'Physics, Prelims, Notes, PYQ, Books jaise nested cards.' },
          { icon: ArrowDownTrayIcon, title: '3. Files', text: 'Target card select karke ek ya multiple PDF upload.' },
        ].map((step) => {
          const StepIcon = step.icon;
          return (
            <div key={step.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                <StepIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-black text-white">{step.title}</h3>
              <p className="mt-1 text-sm font-medium text-slate-400">{step.text}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSmartUpload} className="mb-6 rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 shadow-lg shadow-cyan-950/20">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Smart Heading + Card + Upload</h3>
            <p className="text-sm text-slate-400">
              Heading choose karo, card path banao, aur same flow me PYQ, Notes, Material, Books ya Q&A upload karo.
            </p>
          </div>
          <span className="rounded-md bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-300">
            Select or create
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Content type</span>
            <select
              value={quickType}
              onChange={(event) => {
                const nextType = event.target.value;
                const currentDefaultFolders = uploadTypeOptions.map((type) => type.defaultFolder);
                const nextMeta = uploadTypeOptions.find((type) => type.value === nextType);
                setQuickType(nextType);
                if (!quickPath.trim() || currentDefaultFolders.includes(quickPath.trim())) {
                  setQuickPath(nextMeta?.defaultFolder || '');
                }
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            >
              {uploadTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Heading</span>
            <select
              value={quickRootMode}
              onChange={(event) => setQuickRootMode(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            >
              <option value={NEW_ROOT_VALUE}>Create new heading</option>
              {rootCards.map((card) => (
                <option key={card._id} value={card._id}>{card.name}</option>
              ))}
            </select>
          </label>

          {quickRootMode === NEW_ROOT_VALUE && (
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">New heading name</span>
              <input
                value={quickRootName}
                onChange={(event) => setQuickRootName(event.target.value)}
                placeholder="Exam name or category"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none transition focus:border-cyan-500"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Card path</span>
            <input
              value={quickPath}
              onChange={(event) => setQuickPath(event.target.value)}
              placeholder="Physics / Notes / Chapter 1"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">File name</span>
            <input
              value={quickFileName}
              onChange={(event) => setQuickFileName(event.target.value)}
              placeholder="First file display name"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">PDF files</span>
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={(event) => setQuickFiles(Array.from(event.target.files || []))}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-white"
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2 font-bold text-white transition hover:bg-cyan-700">
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            Create + Upload
          </button>
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <form onSubmit={handleCardSubmit} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingCardId ? 'Edit card' : currentParentId ? 'Create card inside heading' : 'Create homepage heading'}
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Parent: {currentParent?.name || 'Study Hub home'}
              </p>
            </div>
            {editingCardId && (
              <button type="button" onClick={resetCardForm} className="text-sm font-bold text-slate-400 hover:text-white">
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">
                {currentParentId ? 'Card / folder name' : 'Homepage heading'}
              </span>
              <input
                value={cardForm.name}
                onChange={(event) => handleCardChange('name', event.target.value)}
                placeholder={currentParentId ? 'Subfolder, notes, paper name' : 'Exam, category, course'}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
                required
              />
            </label>
          </div>

          <button className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-700">
            {editingCardId ? 'Save Card' : currentParentId ? 'Create Card' : 'Create Heading'}
          </button>
        </form>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold">
            <button type="button" onClick={() => jumpToLevel(-1)} className="text-cyan-300 hover:text-cyan-200">
              Headings
            </button>
            {parentStack.map((card, index) => (
              <span key={card._id} className="inline-flex items-center gap-2 text-slate-300">
                <ChevronRightIcon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <button type="button" onClick={() => jumpToLevel(index)} className="hover:text-white">
                  {card.name}
                </button>
              </span>
            ))}
          </div>

          {isLoadingCards ? (
            <p className="text-slate-400">Loading cards...</p>
          ) : cards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm font-semibold text-slate-400">
              No card at this level yet.
            </div>
          ) : (
            <div className="grid overflow-hidden rounded-lg border border-slate-700 bg-slate-950/20 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => {
                const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
                const Icon = visual.icon;
                const iconUrl = card.iconUrl || visual.iconUrl;
                return (
                  <article key={card._id} className="border-b border-r border-slate-800 bg-slate-900 p-3">
                    <button
                      type="button"
                      onClick={() => openCard(card)}
                      className="flex min-h-[118px] w-full flex-col items-center justify-center rounded-md transition hover:bg-slate-800"
                    >
                      <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconUrl ? 'bg-white text-slate-950 dark:bg-slate-950' : getToneBadgeClass(visual.tone)}`}>
                        {iconUrl ? (
                          <img src={iconUrl} alt="" loading="lazy" className="h-8 w-8 object-contain" />
                        ) : (
                          <Icon className="h-7 w-7" aria-hidden="true" />
                        )}
                      </span>
                      <span className="mt-3 line-clamp-2 text-center text-sm font-bold text-white">{card.name}</span>
                    </button>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCardId(card._id)}
                        className="rounded bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
                      >
                        Files
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditCard(card)}
                        className="inline-flex justify-center rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                        aria-label={`Edit ${card.name}`}
                      >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card)}
                        className="inline-flex justify-center rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                        aria-label={`Delete ${card.name}`}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Files in Card</h3>
            <p className="text-sm text-slate-400">
              Target: {uploadTarget?.name || 'Open/select a card'}
            </p>
          </div>
          {uploadTarget && (
            <span className="rounded-md bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
              {uploadTarget.files?.length || 0} files
            </span>
          )}
        </div>

        <form onSubmit={handleUpload} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Add file name</span>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="First file display name"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Add PDF files</span>
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-white"
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2 font-bold text-white transition hover:bg-cyan-700">
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            Add Files
          </button>
        </form>

        <div className="mt-4 grid gap-2">
          {!uploadTarget ? (
            <p className="text-sm text-slate-400">Select a card to upload or manage files.</p>
          ) : uploadTarget.files?.length ? (
            uploadTarget.files.map((file) => (
              <div key={file._id} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <a href={file.url} target="_blank" rel="noreferrer" className="font-bold text-white hover:text-cyan-300">
                      {file.name}
                    </a>
                    <p className="text-xs font-semibold text-slate-400">
                      {[file.mimeType || 'PDF', formatBytes(file.sizeBytes)].filter(Boolean).join(' | ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditingFile(file._id, file.name)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file._id)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingFileId === file._id && (
                  <form onSubmit={handleUpdateFile} className="mt-3 grid gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3 lg:grid-cols-[1fr_1fr_auto_auto]">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">File display name</span>
                      <input
                        value={editingFileName}
                        onChange={(event) => setEditingFileName(event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Replace PDF optional</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) => setReplacementFile(event.target.files?.[0] || null)}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-white"
                      />
                    </label>
                    <button className="rounded-md bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-700">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingFile}
                      className="rounded-md bg-slate-700 px-4 py-2 font-bold text-white transition hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No files in this card yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default StudyCardTreeManager;
