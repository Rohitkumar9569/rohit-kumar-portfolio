import { useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  deleteAdminStudyCard,
  deleteAdminStudyCardFile,
  updateAdminStudyCard,
  updateAdminStudyCardFile,
  type StudyCard,
  type StudyCardFile,
} from '../../studyHubApi';
import { confirmAdminAction } from '../../utils/adminConfirm';
import { requestPremiumTextInput } from '../../utils/premiumPrompt';
import InlineStudyAdminTools from './InlineStudyAdminTools';
import {
  getStudyCardVisual,
  getToneBadgeClass,
  type StudyTone,
} from './StudyVisualCards';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const useStudyAdminRefresh = (onChanged?: () => void | Promise<void>) => {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] }),
    ]);
    await onChanged?.();
  };
};

const cardPayload = (workspaceSlug: string, card: StudyCard, name: string) => ({
  workspaceSlug,
  parentId: card.parentId || null,
  name,
  slug: slugify(name),
  iconKey: card.iconKey,
  iconUrl: card.iconUrl || '',
  tone: card.tone,
  order: card.order,
  status: card.status,
  visibility: card.visibility,
});

const useCardActions = ({
  workspaceSlug,
  onChanged,
  onDeleted,
}: {
  workspaceSlug: string;
  onChanged?: () => void | Promise<void>;
  onDeleted?: (card: StudyCard) => void;
}) => {
  const refresh = useStudyAdminRefresh(onChanged);

  const renameCard = async (card: StudyCard) => {
    const nextName = await requestPremiumTextInput({
      title: 'Rename card',
      message: 'Update the visible card name.',
      initialValue: card.name,
      placeholder: 'Card name',
      confirmLabel: 'Rename',
    });
    if (!nextName || nextName === card.name) return;

    await toast.promise(updateAdminStudyCard(card._id, cardPayload(workspaceSlug, card, nextName)), {
      loading: 'Updating card...',
      success: 'Card updated',
      error: 'Card update failed',
    });
    await refresh();
  };

  const deleteCard = async (card: StudyCard) => {
    const confirmed = await confirmAdminAction({
      title: 'Delete card?',
      message: `Delete "${card.name}" and all nested content? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    await toast.promise(deleteAdminStudyCard(card._id), {
      loading: 'Deleting card...',
      success: 'Card deleted',
      error: 'Delete failed',
    });
    await refresh();
    onDeleted?.(card);
  };

  return { renameCard, deleteCard };
};

const useFileActions = ({
  cardId,
  onChanged,
}: {
  cardId: string;
  onChanged?: () => void | Promise<void>;
}) => {
  const refresh = useStudyAdminRefresh(onChanged);

  const renameFile = async (file: StudyCardFile) => {
    const nextName = await requestPremiumTextInput({
      title: 'Rename file',
      message: 'Update the visible file name.',
      initialValue: file.name,
      placeholder: 'File name',
      confirmLabel: 'Rename',
    });
    if (!nextName || nextName === file.name) return;

    await toast.promise(updateAdminStudyCardFile(cardId, file._id, nextName), {
      loading: 'Updating file...',
      success: 'File updated',
      error: 'File update failed',
    });
    await refresh();
  };

  const replaceFile = async (file: StudyCardFile, nextFile: File) => {
    await toast.promise(updateAdminStudyCardFile(cardId, file._id, file.name, nextFile), {
      loading: 'Replacing file...',
      success: 'File replaced',
      error: 'File replace failed',
    });
    await refresh();
  };

  const deleteFile = async (file: StudyCardFile) => {
    const confirmed = await confirmAdminAction({
      title: 'Delete file?',
      message: `Delete "${file.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    await toast.promise(deleteAdminStudyCardFile(cardId, file._id), {
      loading: 'Deleting file...',
      success: 'File deleted',
      error: 'File delete failed',
    });
    await refresh();
  };

  return { renameFile, replaceFile, deleteFile };
};

export const StudyInlineAdminPanel = ({
  workspaceSlug,
  card,
  title,
  onChanged,
  onDeleted,
}: {
  workspaceSlug: string;
  card: StudyCard | null;
  title: string;
  onChanged?: () => void | Promise<void>;
  onDeleted?: (card: StudyCard) => void;
}) => {
  const refresh = useStudyAdminRefresh(onChanged);
  const { renameCard, deleteCard } = useCardActions({ workspaceSlug, onChanged, onDeleted });
  const files = card?.files || [];

  return (
    <section className="rounded-xl border border-cyan-300/40 bg-cyan-50 p-3 shadow-sm dark:border-cyan-400/20 dark:bg-cyan-400/10">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-200">{title}</p>
          {card && <h3 className="mt-1 truncate text-base font-black text-slate-950 dark:text-white">{card.name}</h3>}
        </div>
        {card && (
          <>
            <button
              type="button"
              onClick={() => renameCard(card)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
            >
              <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => deleteCard(card)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700"
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          </>
        )}
      </div>

      <InlineStudyAdminTools
        workspaceSlug={workspaceSlug}
        parentId={card?._id || null}
        mode={card ? 'child' : 'heading'}
        title={card ? `Add inside ${card.name}` : 'Create homepage heading'}
        allowFileUpload={Boolean(card)}
        onChanged={refresh}
      />

      {card && files.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Files in this card</p>
          {files.map((file) => (
            <StudyAdminFileRow
              key={file._id}
              cardId={card._id}
              file={file}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export const StudyAdminFileRow = ({
  cardId,
  file,
  onChanged,
}: {
  cardId: string;
  file: StudyCardFile;
  onChanged?: () => void | Promise<void>;
}) => {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const { renameFile, replaceFile, deleteFile } = useFileActions({ cardId, onChanged });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 p-2">
      <DocumentTextIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-sm font-black text-slate-200 hover:text-cyan-300"
      >
        {file.name}
      </a>
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          const nextFile = event.target.files?.[0];
          event.target.value = '';
          if (nextFile) await replaceFile(file, nextFile);
        }}
      />
      <button
        type="button"
        onClick={() => renameFile(file)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
        aria-label={`Rename ${file.name}`}
      >
        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => replaceInputRef.current?.click()}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-400"
        aria-label={`Replace ${file.name}`}
      >
        <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => deleteFile(file)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-500"
        aria-label={`Delete ${file.name}`}
      >
        <TrashIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export const StudyAdminCardTile = ({
  card,
  to,
  workspaceSlug,
  onChanged,
  onDeleted,
}: {
  card: StudyCard;
  to: string;
  workspaceSlug: string;
  onChanged?: () => void | Promise<void>;
  onDeleted?: (card: StudyCard) => void;
}) => {
  const { renameCard, deleteCard } = useCardActions({ workspaceSlug, onChanged, onDeleted });
  const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
  const Icon = visual.icon;
  const iconUrl = card.iconUrl || visual.iconUrl;

  return (
    <article className="min-h-[142px] border-b border-r border-slate-200 bg-white px-2.5 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
      <Link to={to} className="block focus:outline-none">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-lg ${iconUrl ? 'bg-white text-slate-950 dark:bg-slate-950' : getToneBadgeClass(visual.tone as StudyTone)}`}>
          {iconUrl ? (
            <img src={iconUrl} alt="" loading="lazy" className="h-8 w-8 object-contain" />
          ) : (
            <Icon className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <h3 className="mx-auto mt-3 line-clamp-2 max-w-[10rem] text-center text-[15px] font-bold leading-snug text-slate-950 dark:text-white sm:text-base">
          {card.name}
        </h3>
      </Link>
      <div className="mt-3 flex justify-center gap-2">
        <Link
          to={to}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          aria-label={`Open ${card.name}`}
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => renameCard(card)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700"
          aria-label={`Rename ${card.name}`}
        >
          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => deleteCard(card)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white transition hover:bg-red-700"
          aria-label={`Delete ${card.name}`}
        >
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};

export const StudyAdminFileTile = ({
  cardId,
  file,
  onChanged,
}: {
  cardId: string;
  file: StudyCardFile;
  onChanged?: () => void | Promise<void>;
}) => {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const { renameFile, replaceFile, deleteFile } = useFileActions({ cardId, onChanged });
  const visual = getStudyCardVisual('download', 'emerald');
  const Icon = visual.icon;

  return (
    <article className="min-h-[142px] border-b border-r border-slate-200 bg-white px-2.5 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
      <a href={file.url} target="_blank" rel="noreferrer" className="block focus:outline-none">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-lg ${visual.iconUrl ? 'bg-white text-slate-950 dark:bg-slate-950' : getToneBadgeClass(visual.tone)}`}>
          {visual.iconUrl ? (
            <img src={visual.iconUrl} alt="" loading="lazy" className="h-8 w-8 object-contain" />
          ) : (
            <Icon className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <h3 className="mx-auto mt-3 line-clamp-2 max-w-[10rem] text-center text-[15px] font-bold leading-snug text-slate-950 dark:text-white sm:text-base">
          {file.name}
        </h3>
      </a>
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          const nextFile = event.target.files?.[0];
          event.target.value = '';
          if (nextFile) await replaceFile(file, nextFile);
        }}
      />
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => renameFile(file)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700"
          aria-label={`Rename ${file.name}`}
        >
          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => replaceInputRef.current?.click()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-white transition hover:bg-amber-600"
          aria-label={`Replace ${file.name}`}
        >
          <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => deleteFile(file)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white transition hover:bg-red-700"
          aria-label={`Delete ${file.name}`}
        >
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};
