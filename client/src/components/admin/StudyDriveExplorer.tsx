import { type DragEvent, type FormEvent, type WheelEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  SparklesIcon,
  Squares2X2Icon,
  ScissorsIcon,
  TableCellsIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  STUDY_QUERY_GC_TIME_MS,
  STUDY_QUERY_STALE_TIME_MS,
  auditAdminStudyLibraryWithAi,
  copyAdminStudyCard,
  copyAdminStudyCardFile,
  createAdminStudyCard,
  deleteAdminStudyCardFile,
  fetchAdminStudyCard,
  fetchAdminStudyCards,
  moveAdminStudyCardFile,
  updateAdminStudyCard,
  updateAdminStudyCardPublication,
  updateAdminStudyCardFile,
  uploadAdminStudyCardFiles,
  type AdminLibraryAiAudit,
  type AdminLibraryAiSuggestion,
  type StudyCard,
  type StudyCardFile,
  type StudyCardFileMetadataPayload,
  type StudyCardPayload,
} from '../../studyHubApi';
import ASSETS from '../../assets';
import { getStudyCardVisual, studyIconOptions } from '../study/StudyVisualCards';
import {
  getNextChildGoalType,
  getStudyGoalTypeDescription,
  getStudyGoalTypeLabel,
  inferStudyGoalType,
  studyGoalTypeOptions,
  type StudyGoalType,
} from '../../utils/studyHierarchy';
import { confirmAdminAction } from '../../utils/adminConfirm';
import {
  getStudyCardListCacheKey,
  readStudyCardListCache,
  writeStudyCardListCache,
} from '../../utils/studyCardCache';
import StudyDocumentStudio from './StudyDocumentStudio';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const ROOT_DISPLAY_LABEL = 'Library';
const objectIdPattern = /^[a-f\d]{24}$/i;

type ExplorerSelection =
  | { type: 'folder'; id: string }
  | { type: 'file'; id: string }
  | null;

type RenameTarget =
  | { type: 'folder'; card: StudyCard }
  | { type: 'file'; file: StudyCardFile; cardId: string }
  | null;

type ViewMode = 'icons' | 'details';
type SortMode = 'manual' | 'name' | 'newest' | 'type';

type ExplorerItem =
  | { key: string; type: 'folder'; id: string; name: string; folder: StudyCard }
  | { key: string; type: 'file'; id: string; name: string; file: StudyCardFile };

type DraggedExplorerItem =
  | { type: 'folder'; id: string; name: string }
  | { type: 'file'; id: string; cardId: string; name: string };

type MoveTarget =
  | { type: 'folder'; folder: StudyCard }
  | { type: 'file'; file: StudyCardFile; cardId: string }
  | null;

type ClipboardAction = 'copy' | 'cut';

type ClipboardItem =
  | { action: ClipboardAction; type: 'folder'; folderId: string; name: string }
  | { action: ClipboardAction; type: 'file'; cardId: string; fileId: string; name: string };

type FileEditorState = {
  file: StudyCardFile;
  cardId: string;
  metadata: StudyCardFileMetadataPayload;
} | null;

type FolderEditorState = {
  mode: 'create' | 'edit';
  card?: StudyCard;
  name: string;
  goalType: StudyGoalType;
  iconKey: string;
  tone: StudyCard['tone'];
} | null;

type UploadDraftState = {
  files: File[];
  metadata: StudyCardFileMetadataPayload[];
} | null;

type QualityCheck = {
  label: string;
  detail: string;
  ok: boolean;
};

type ContextMenuState = {
  kind: 'item';
  x: number;
  y: number;
  item: ExplorerItem;
} | {
  kind: 'folder';
  x: number;
  y: number;
  targetCardId: string | null;
  targetName: string;
} | null;

const getDefaultFolderEditorState = (activeCard: StudyCard | null): Exclude<FolderEditorState, null> => {
  const inferred = activeCard
    ? { iconKey: 'folder', tone: 'blue' as StudyCard['tone'] }
    : { iconKey: 'heading', tone: 'indigo' as StudyCard['tone'] };

  return {
    mode: 'create',
    name: '',
    goalType: getNextChildGoalType(activeCard),
    iconKey: inferred.iconKey,
    tone: inferred.tone,
  };
};

const toolbarButtonClassName =
  'inline-flex h-10 min-w-max items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[13px] font-black text-[#f1f5f3] shadow-sm transition hover:border-cyan-300/30 hover:bg-white/[0.10] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const primaryToolbarButtonClassName =
  'inline-flex h-11 min-w-max items-center justify-center gap-2 rounded-2xl border border-cyan-100/30 bg-[#5fd0ff] px-4 text-[13px] font-black text-[#071014] shadow-[0_16px_34px_rgba(76,194,255,0.22)] transition hover:bg-[#8ddeff] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.055] disabled:text-[#8a8a8a] disabled:shadow-none disabled:active:scale-100';

const dangerToolbarButtonClassName =
  'inline-flex h-10 min-w-max items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-[13px] font-black text-[#f1f5f3] shadow-sm transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-[#ffb7c2] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const viewButtonClassName =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-[#cfcfcf] transition hover:border-white/10 hover:bg-white/[0.08]';

const inlineNameInputClassName =
  'mt-1 w-full rounded-lg border border-[#4cc2ff] bg-[#111111] px-2 py-1.5 text-center text-sm font-semibold text-white outline-none ring-2 ring-[#4cc2ff]/25';

const previewActionButtonClassName =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[13px] font-black text-[#f3f3f3] shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

const modalInputClassName =
  'w-full rounded-xl border border-white/10 bg-[#111111] px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-[#777] focus:border-[#4cc2ff] focus:ring-2 focus:ring-[#4cc2ff]/20';

const modalLabelClassName = 'mb-1 block text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]';

const metadataDefaults: StudyCardFileMetadataPayload = {
  status: 'draft',
  visibility: 'public',
  language: 'hinglish',
  sourceType: 'platform',
};

const toneBarClassName: Record<StudyCard['tone'], string> = {
  blue: 'from-sky-500 to-slate-300',
  violet: 'from-violet-500 to-slate-300',
  emerald: 'from-emerald-500 to-slate-300',
  amber: 'from-amber-500 to-slate-300',
  rose: 'from-rose-500 to-slate-300',
  cyan: 'from-cyan-500 to-slate-300',
  indigo: 'from-indigo-500 to-slate-300',
  slate: 'from-slate-500 to-slate-300',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const inferFolderStyle = (): { iconKey: string; tone: StudyCard['tone'] } => {
  return { iconKey: 'folder', tone: 'blue' };
};

const buildFolderPayload = (
  parentId: string | null,
  name: string,
  order: number,
  overrides: Partial<Pick<StudyCardPayload, 'goalType' | 'iconKey' | 'tone' | 'status' | 'visibility'>> = {},
): StudyCardPayload => {
  const inferred = parentId ? inferFolderStyle() : { iconKey: 'heading', tone: 'indigo' as StudyCard['tone'] };
  return {
    workspaceSlug: PLATFORM_WORKSPACE_SLUG,
    parentId,
    name,
    slug: slugify(name),
    goalType: overrides.goalType || (parentId ? 'resource_folder' : 'exam_category'),
    iconKey: overrides.iconKey || inferred.iconKey,
    tone: overrides.tone || inferred.tone,
    order,
    status: overrides.status || 'draft',
    visibility: overrides.visibility || 'public',
  };
};

const folderPayloadFromCard = (
  card: StudyCard,
  name: string,
  status: StudyCard['status'] = card.status,
  overrides: Partial<Pick<StudyCardPayload, 'goalType' | 'iconKey' | 'tone' | 'visibility'>> = {},
): StudyCardPayload => ({
  workspaceSlug: PLATFORM_WORKSPACE_SLUG,
  parentId: card.parentId || null,
  name,
  slug: slugify(name),
  goalType: overrides.goalType || card.goalType || inferStudyGoalType(card),
  iconKey: overrides.iconKey || card.iconKey,
  iconUrl: card.iconUrl || '',
  tone: overrides.tone || card.tone,
  order: card.order,
  status,
  visibility: overrides.visibility || card.visibility,
});

const formatBytes = (size?: number) => {
  if (!size) return 'PDF';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getCardFileCount = (card?: StudyCard | null) => card?.fileCount ?? card?.files?.length ?? 0;

const formatDate = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileLabel = (file: StudyCardFile) => file.name || 'Untitled file';

const normalizeNameKey = (value: string) => value.trim().toLowerCase();

type LibraryAiAction =
  | 'create_folder'
  | 'rename_folder'
  | 'move_folder'
  | 'archive_folder'
  | 'publish_folder'
  | 'draft_folder'
  | 'rename_pdf'
  | 'move_pdf'
  | 'delete_pdf'
  | 'metadata'
  | 'review';

type LibraryAiFilter = 'all' | 'apply' | 'review' | 'applied';

const normalizeLibraryPath = (value = '') =>
  value
    .replace(new RegExp(`^${ROOT_DISPLAY_LABEL}\\s*/\\s*`, 'i'), '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

const getSuggestionKey = (suggestion: AdminLibraryAiSuggestion) => [
  suggestion.action || suggestion.type,
  suggestion.targetPath,
  suggestion.proposedPath,
  suggestion.newName,
  suggestion.title,
].join('|');

const resolveLibraryAiAction = (suggestion: AdminLibraryAiSuggestion): LibraryAiAction => {
  const raw = `${suggestion.action || suggestion.type}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (raw.includes('create') || raw.includes('add_folder')) return 'create_folder';
  if (raw.includes('rename') && raw.includes('pdf')) return 'rename_pdf';
  if (raw.includes('rename')) return 'rename_folder';
  if (raw.includes('move') && raw.includes('pdf')) return 'move_pdf';
  if (raw.includes('move')) return 'move_folder';
  if (raw.includes('delete') && raw.includes('pdf')) return 'delete_pdf';
  if (raw.includes('archive') || raw.includes('delete') || raw.includes('remove')) return 'archive_folder';
  if (raw.includes('publish')) return 'publish_folder';
  if (raw.includes('draft') || raw.includes('hide')) return 'draft_folder';
  if (raw.includes('metadata')) return 'metadata';
  return 'review';
};

const getLibraryAiActionLabel = (action: LibraryAiAction) => ({
  create_folder: 'Create',
  rename_folder: 'Rename',
  move_folder: 'Move',
  archive_folder: 'Move to Bin',
  publish_folder: 'Publish',
  draft_folder: 'Mark draft',
  rename_pdf: 'Rename PDF',
  move_pdf: 'Move PDF',
  delete_pdf: 'Delete PDF',
  metadata: 'Update details',
  review: 'Review',
}[action]);

const inferAiFolderStyle = (pathParts: string[]): Pick<StudyCardPayload, 'iconKey' | 'tone'> => {
  const label = normalizeNameKey(pathParts.join(' '));
  const iconKey = label.includes('pyq') || label.includes('paper')
    ? 'pyq'
    : label.includes('syllabus')
      ? 'syllabus'
      : label.includes('mock') || label.includes('test')
        ? 'mock'
        : label.includes('current') || label.includes('updates')
          ? 'notes'
          : label.includes('material')
            ? 'material'
            : label.includes('exam')
              ? 'exam'
              : 'folder';
  const visual = getStudyCardVisual(iconKey, undefined, label);
  return { iconKey, tone: visual.tone };
};

const getDuplicateNameGroups = (names: string[]) => {
  const groups = new Map<string, { key: string; name: string; count: number }>();

  names.forEach((name) => {
    const key = normalizeNameKey(name);
    if (!key) return;
    const current = groups.get(key);
    groups.set(key, { key, name: current?.name || name.trim(), count: (current?.count || 0) + 1 });
  });

  return Array.from(groups.values()).filter((group) => group.count > 1);
};

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const getTimeValue = (value?: string) => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
};

const StudyDriveExplorer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const cardParam = searchParams.get('card') || '';
  const activeCardId = objectIdPattern.test(cardParam) ? cardParam : '';
  const requestedAction = searchParams.get('action') || '';
  const [selection, setSelection] = useState<ExplorerSelection>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setSavingRename] = useState(false);
  const [isCreatingFolder, setCreatingFolder] = useState(false);
  const [isUploadingFiles, setUploadingFiles] = useState(false);
  const [isMovingItem, setMovingItem] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setDragOver] = useState(false);
  const [folderEditor, setFolderEditor] = useState<FolderEditorState>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraftState>(null);
  const [isDocumentStudioOpen, setDocumentStudioOpen] = useState(false);
  const [fileEditor, setFileEditor] = useState<FileEditorState>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget>(null);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null);
  const [isPastingItem, setPastingItem] = useState(false);
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(() => new Set());
  const [isMobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [isLibraryAiPanelOpen, setLibraryAiPanelOpen] = useState(false);
  const [libraryAiAudit, setLibraryAiAudit] = useState<AdminLibraryAiAudit | null>(null);
  const [isLibraryAiLoading, setLibraryAiLoading] = useState(false);
  const [libraryAiFilter, setLibraryAiFilter] = useState<LibraryAiFilter>('all');
  const [applyingAiSuggestionKey, setApplyingAiSuggestionKey] = useState('');
  const [appliedAiSuggestionKeys, setAppliedAiSuggestionKeys] = useState<Set<string>>(() => new Set());
  const [draggedItem, setDraggedItem] = useState<DraggedExplorerItem | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const cardsCacheKey = useMemo(
    () => getStudyCardListCacheKey('admin-console', PLATFORM_WORKSPACE_SLUG, 'summary-v2'),
    []
  );
  const cachedCards = useMemo(
    () => readStudyCardListCache(cardsCacheKey),
    [cardsCacheKey]
  );

  const { data: cards = [], isLoading, isError } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, 'summary-v2'],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'all', summary: true }),
    gcTime: STUDY_QUERY_GC_TIME_MS,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData?.length ? previousData : cachedCards.length ? cachedCards : undefined,
    refetchOnMount: (query) => {
      const data = query.state.data as StudyCard[] | undefined;
      return !data?.length;
    },
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });

  const { data: activeCardDetail } = useQuery({
    queryKey: ['admin-study-card', activeCardId],
    queryFn: () => fetchAdminStudyCard(activeCardId),
    enabled: Boolean(activeCardId),
    gcTime: STUDY_QUERY_GC_TIME_MS,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });

  useEffect(() => {
    if (cards.length) {
      writeStudyCardListCache(cardsCacheKey, cards);
    }
  }, [cards, cardsCacheKey]);

  const activeCards = useMemo(() => cards.filter((card) => card.status !== 'archived'), [cards]);
  const cardById = useMemo(() => {
    const map = new Map(activeCards.map((card) => [card._id, card]));

    if (activeCardDetail && activeCardDetail.status !== 'archived') {
      const existing = map.get(activeCardDetail._id);
      map.set(activeCardDetail._id, existing ? { ...existing, ...activeCardDetail } : activeCardDetail);
    }

    return map;
  }, [activeCards, activeCardDetail]);
  const cardPathById = useMemo(() => {
    const cache = new Map<string, StudyCard[]>();

    const resolvePath = (card: StudyCard): StudyCard[] => {
      const cachedPath = cache.get(card._id);
      if (cachedPath) return cachedPath;

      const path: StudyCard[] = [];
      const visited = new Set<string>();
      let current: StudyCard | undefined = card;

      while (current && !visited.has(current._id)) {
        visited.add(current._id);
        path.unshift(current);
        current = current.parentId ? cardById.get(current.parentId) : undefined;
      }

      cache.set(card._id, path);
      return path;
    };

    activeCards.forEach(resolvePath);
    return cache;
  }, [activeCards, cardById]);
  const buildPathForCard = useCallback(
    (card: StudyCard | null) => (card ? cardPathById.get(card._id) || [card] : []),
    [cardPathById]
  );
  const activeCard = activeCardId ? cardById.get(activeCardId) || null : null;
  const childFolders = useMemo(() => activeCards
    .filter((card) => (card.parentId || '') === activeCardId)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)),
    [activeCards, activeCardId]
  );
  const activeFiles = activeCard?.files || [];
  const activeFileNames = useMemo(
    () => new Set(activeFiles.map((file) => normalizeNameKey(getFileLabel(file)))),
    [activeFiles]
  );
  const duplicateFolderGroups = useMemo(
    () => getDuplicateNameGroups(childFolders.map((folder) => folder.name)),
    [childFolders]
  );
  const duplicateFileGroups = useMemo(
    () => getDuplicateNameGroups(activeFiles.map((file) => getFileLabel(file))),
    [activeFiles]
  );
  const uploadDraftDuplicateNames = useMemo(() => {
    if (!uploadDraft) return new Set<string>();

    return new Set(getDuplicateNameGroups(uploadDraft.metadata.map((metadata, index) => (
      metadata.name || uploadDraft.files[index]?.name.replace(/\.[^/.]+$/, '') || ''
    ))).map((group) => group.key));
  }, [uploadDraft]);
  const duplicateSummary = [
    duplicateFolderGroups.length
      ? `${duplicateFolderGroups.length} duplicate folder name${duplicateFolderGroups.length > 1 ? 's' : ''}`
      : '',
    duplicateFileGroups.length
      ? `${duplicateFileGroups.length} duplicate PDF name${duplicateFileGroups.length > 1 ? 's' : ''}`
      : '',
  ].filter(Boolean).join(' / ');

  const selectedFolder = selection?.type === 'folder' ? cardById.get(selection.id) || null : null;
  const selectedFile = selection?.type === 'file'
    ? activeFiles.find((file) => file._id === selection.id) || null
    : null;
  const canPasteIntoTarget = (targetCardId?: string | null) => Boolean(
    clipboardItem && (clipboardItem.type === 'folder' || (clipboardItem.type === 'file' && targetCardId))
  );
  const canPasteClipboard = canPasteIntoTarget(activeCard?._id || null);
  const clipboardLabel = clipboardItem
    ? `${clipboardItem.action === 'copy' ? 'Copied' : 'Cut'} ${clipboardItem.type === 'folder' ? 'folder' : 'PDF'}: ${clipboardItem.name}`
    : '';

  const breadcrumb = useMemo(() => buildPathForCard(activeCard), [activeCard, buildPathForCard]);

  const childrenByParentId = useMemo(() => {
    const grouped = new Map<string, StudyCard[]>();
    activeCards.forEach((card) => {
      const key = card.parentId || 'root';
      const children = grouped.get(key) || [];
      children.push(card);
      grouped.set(key, children);
    });
    grouped.forEach((children) => children.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)));
    return grouped;
  }, [activeCards]);
  const rootFolderCount = childrenByParentId.get('root')?.length || 0;

  useEffect(() => {
    if (!breadcrumb.length) return;

    setExpandedTreeIds((currentIds) => {
      const nextIds = new Set(currentIds);
      let changed = false;
      breadcrumb.forEach((card) => {
        if (!nextIds.has(card._id)) {
          nextIds.add(card._id);
          changed = true;
        }
      });
      return changed ? nextIds : currentIds;
    });
  }, [breadcrumb]);

  const getActiveDescendantFolders = useCallback((rootId: string) => {
    const descendants: StudyCard[] = [];
    const stack = [...(childrenByParentId.get(rootId) || [])];

    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      descendants.push(current);
      stack.push(...(childrenByParentId.get(current._id) || []));
    }

    return descendants;
  }, [childrenByParentId]);

  const getCardPathLabel = useCallback(
    (card: StudyCard) => buildPathForCard(card).map((pathCard) => pathCard.name).join(' / '),
    [buildPathForCard]
  );

  const findFolderByPath = (pathValue = '') => {
    const pathParts = normalizeLibraryPath(pathValue);
    if (!pathParts.length) return null;
    const normalizedPath = normalizeNameKey(pathParts.join(' / '));
    return activeCards.find((card) => normalizeNameKey(getCardPathLabel(card)) === normalizedPath) || null;
  };

  const findPdfByPath = (pathValue = '') => {
    const pathParts = normalizeLibraryPath(pathValue);
    if (pathParts.length < 2) return null;
    const fileName = pathParts[pathParts.length - 1];
    const folder = findFolderByPath(pathParts.slice(0, -1).join(' / '));
    const file = folder?.files?.find((item) => normalizeNameKey(getFileLabel(item)) === normalizeNameKey(fileName)) || null;
    return folder && file ? { folder, file } : null;
  };

  const ensureAiFolderPath = async (pathValue: string) => {
    const pathParts = normalizeLibraryPath(pathValue);
    if (!pathParts.length) throw new Error('Folder path is empty.');

    let parentId: string | null = null;
    let currentCard: StudyCard | null = null;
    const knownCards: StudyCard[] = [...activeCards];
    const createdParentIds = new Set<string>();

    for (const [index, part] of pathParts.entries()) {
      const existing = knownCards.find((card) => (
        (card.parentId || null) === parentId &&
        (card.slug === slugify(part) || normalizeNameKey(card.name) === normalizeNameKey(part))
      ));

      if (existing) {
        currentCard = existing;
        parentId = existing._id;
        continue;
      }

      const siblingCount = knownCards.filter((card) => (card.parentId || null) === parentId).length;
      const created = await createAdminStudyCard(buildFolderPayload(parentId, part, siblingCount + 1, {
        ...inferAiFolderStyle(pathParts.slice(0, index + 1)),
        status: 'draft',
        visibility: 'public',
      }));
      knownCards.push(created);
      currentCard = created;
      parentId = created._id;
      if (created.parentId) createdParentIds.add(created.parentId);
    }

    if (createdParentIds.size) {
      setExpandedTreeIds((currentIds) => {
        const nextIds = new Set(currentIds);
        createdParentIds.forEach((id) => nextIds.add(id));
        return nextIds;
      });
    }

    return currentCard;
  };

  const canAutoApplyLibrarySuggestion = (suggestion: AdminLibraryAiSuggestion) => {
    const action = resolveLibraryAiAction(suggestion);
    if (action === 'review') return false;
    if (action === 'create_folder') return Boolean(suggestion.proposedPath || suggestion.targetPath);
    if (['rename_pdf', 'move_pdf', 'delete_pdf', 'metadata'].includes(action)) return Boolean(findPdfByPath(suggestion.targetPath));
    return Boolean(findFolderByPath(suggestion.targetPath));
  };

  const isSafeBatchLibrarySuggestion = (suggestion: AdminLibraryAiSuggestion) => {
    const action = resolveLibraryAiAction(suggestion);
    const safeActions: LibraryAiAction[] = ['rename_folder', 'publish_folder', 'rename_pdf', 'metadata'];
    const risk = `${suggestion.risk || ''}`.toLowerCase();
    return safeActions.includes(action) && risk.includes('low') && canAutoApplyLibrarySuggestion(suggestion);
  };

  const libraryAiSuggestions = useMemo(() => libraryAiAudit?.suggestions || [], [libraryAiAudit]);
  const pendingLibraryAiSuggestions = useMemo(() => libraryAiSuggestions.filter((suggestion) => {
    const key = getSuggestionKey(suggestion);
    return canAutoApplyLibrarySuggestion(suggestion) && !appliedAiSuggestionKeys.has(key);
  }), [appliedAiSuggestionKeys, libraryAiSuggestions]);
  const safeBatchLibraryAiSuggestions = useMemo(() => libraryAiSuggestions.filter((suggestion) => {
    const key = getSuggestionKey(suggestion);
    return isSafeBatchLibrarySuggestion(suggestion) && !appliedAiSuggestionKeys.has(key);
  }), [appliedAiSuggestionKeys, libraryAiSuggestions]);
  const visibleLibraryAiSuggestions = useMemo(() => libraryAiSuggestions.filter((suggestion) => {
    const key = getSuggestionKey(suggestion);
    const isApplied = appliedAiSuggestionKeys.has(key);
    const canApply = canAutoApplyLibrarySuggestion(suggestion);
    if (libraryAiFilter === 'apply') return canApply && !isApplied;
    if (libraryAiFilter === 'review') return !canApply && !isApplied;
    if (libraryAiFilter === 'applied') return isApplied;
    return true;
  }), [appliedAiSuggestionKeys, libraryAiFilter, libraryAiSuggestions]);

  const inferMetadataFromCurrentPath = (fileName: string): StudyCardFileMetadataPayload => {
    const yearMatch = fileName.match(/\b(19\d{2}|20\d{2})\b/);

    return {
      ...metadataDefaults,
      name: fileName.replace(/\.[^/.]+$/, ''),
      year: yearMatch?.[1] || '',
    };
  };

  const getMoveFolderOptions = useCallback((target: MoveTarget) => {
    if (target?.type !== 'folder') return activeCards;
    const blockedIds = new Set([target.folder._id, ...getActiveDescendantFolders(target.folder._id).map((folder) => folder._id)]);
    return activeCards.filter((card) => !blockedIds.has(card._id));
  }, [activeCards, getActiveDescendantFolders]);

  const toggleTreeNode = (cardId: string) => {
    setExpandedTreeIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(cardId)) nextIds.delete(cardId);
      else nextIds.add(cardId);
      return nextIds;
    });
  };

  const expandAllTreeNodes = () => {
    setExpandedTreeIds(new Set(activeCards.map((card) => card._id)));
  };

  const collapseTreeNodes = () => {
    setExpandedTreeIds(new Set(breadcrumb.map((card) => card._id)));
  };

  const handleTreeWheel = (event: WheelEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollHeight <= element.clientHeight) return;

    const isAtTop = element.scrollTop <= 0;
    const isAtBottom = Math.ceil(element.scrollTop + element.clientHeight) >= element.scrollHeight;
    const canScrollInDirection = (event.deltaY < 0 && !isAtTop) || (event.deltaY > 0 && !isAtBottom);
    if (!canScrollInDirection) return;

    event.preventDefault();
    event.stopPropagation();
    element.scrollTop += event.deltaY;
  };

  const getDraggedItemFromExplorerItem = (item: ExplorerItem): DraggedExplorerItem | null => {
    if (item.type === 'folder') {
      return { type: 'folder', id: item.folder._id, name: item.folder.name };
    }
    if (!activeCard) return null;
    return { type: 'file', id: item.file._id, cardId: activeCard._id, name: getFileLabel(item.file) };
  };

  const startItemDrag = (event: DragEvent<HTMLElement>, item: ExplorerItem) => {
    const nextDraggedItem = getDraggedItemFromExplorerItem(item);
    if (!nextDraggedItem || renameTarget) return;
    setDraggedItem(nextDraggedItem);
    setSelection({ type: item.type, id: item.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-study-drive-item', JSON.stringify(nextDraggedItem));
    event.dataTransfer.setData('text/plain', nextDraggedItem.name);
  };

  const finishItemDrag = () => {
    setDraggedItem(null);
    setDropTargetId(null);
    setDragOver(false);
  };

  const canDropDraggedItemTo = (targetCardId: string | null) => {
    if (!draggedItem) return false;
    if (draggedItem.type === 'file') {
      return Boolean(targetCardId && draggedItem.cardId !== targetCardId);
    }

    const sourceFolder = cardById.get(draggedItem.id);
    if (!sourceFolder) return false;
    if (targetCardId === sourceFolder._id) return false;
    if ((sourceFolder.parentId || null) === targetCardId) return false;
    if (targetCardId && getActiveDescendantFolders(sourceFolder._id).some((folder) => folder._id === targetCardId)) return false;
    return true;
  };

  const moveDraggedItemTo = async (targetCardId: string | null) => {
    if (!draggedItem) return;
    if (!canDropDraggedItemTo(targetCardId)) {
      toast.error('Drop target is not valid');
      finishItemDrag();
      return;
    }

    setMovingItem(true);
    try {
      if (draggedItem.type === 'folder') {
        const sourceFolder = cardById.get(draggedItem.id);
        if (!sourceFolder) {
          toast.error('Folder no longer exists');
          return;
        }
        const hasDuplicateName = activeCards.some((card) => (
          card._id !== sourceFolder._id &&
          (card.parentId || null) === targetCardId &&
          (card.slug === sourceFolder.slug || normalizeNameKey(card.name) === normalizeNameKey(sourceFolder.name))
        ));
        if (hasDuplicateName) {
          toast.error('A folder with this name already exists here');
          return;
        }

        await toast.promise(updateAdminStudyCard(sourceFolder._id, {
          ...folderPayloadFromCard(sourceFolder, sourceFolder.name),
          parentId: targetCardId,
        }), {
          loading: 'Moving folder...',
          success: 'Folder moved',
          error: 'Move failed',
        });
      } else {
        if (!targetCardId) {
          toast.error('PDF must be moved inside a folder');
          return;
        }
        await toast.promise(moveAdminStudyCardFile(draggedItem.cardId, draggedItem.id, targetCardId), {
          loading: 'Moving PDF...',
          success: 'PDF moved',
          error: 'Move failed',
        });
      }

      if (targetCardId) {
        setExpandedTreeIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.add(targetCardId);
          return nextIds;
        });
      }
      setSelection(null);
      await invalidateExplorer();
    } finally {
      setMovingItem(false);
      finishItemDrag();
    }
  };

  const handleDropTargetDragOver = (event: DragEvent<HTMLElement>, targetCardId: string | null) => {
    if (!canDropDraggedItemTo(targetCardId)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetId(targetCardId || 'root');
  };

  const handleDropTargetDrop = (event: DragEvent<HTMLElement>, targetCardId: string | null) => {
    if (!draggedItem) return;
    event.preventDefault();
    event.stopPropagation();
    void moveDraggedItemTo(targetCardId);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredFolders = useMemo(() => (
    normalizedSearch
      ? childFolders.filter((folder) => folder.name.toLowerCase().includes(normalizedSearch))
      : childFolders
  ), [childFolders, normalizedSearch]);
  const filteredFiles = useMemo(() => (
    normalizedSearch
      ? activeFiles.filter((file) => getFileLabel(file).toLowerCase().includes(normalizedSearch))
      : activeFiles
  ), [activeFiles, normalizedSearch]);

  const explorerItems: ExplorerItem[] = useMemo(() => [
    ...filteredFolders.map((folder): ExplorerItem => ({ key: `folder-${folder._id}`, type: 'folder', id: folder._id, name: folder.name, folder })),
    ...filteredFiles.map((file): ExplorerItem => ({ key: `file-${file._id}`, type: 'file', id: file._id, name: getFileLabel(file), file })),
  ].sort((a, b) => {
    if (sortMode === 'manual') return 0;
    if (sortMode === 'type' && a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (sortMode === 'newest') {
      const aTime = a.type === 'folder'
        ? getTimeValue(a.folder.updatedAt || a.folder.createdAt)
        : getTimeValue(a.file.uploadedAt);
      const bTime = b.type === 'folder'
        ? getTimeValue(b.folder.updatedAt || b.folder.createdAt)
        : getTimeValue(b.file.uploadedAt);
      return bTime - aTime || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  }), [filteredFiles, filteredFolders, sortMode]);

  const updateCardParam = (cardId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('panel', 'library');
    if (cardId) params.set('card', cardId);
    else params.delete('card');
    setSearchParams(params);
    setSelection(null);
    setMobileTreeOpen(false);
    if (cardId) {
      setExpandedTreeIds((currentIds) => {
        if (currentIds.has(cardId)) return currentIds;
        const nextIds = new Set(currentIds);
        nextIds.add(cardId);
        return nextIds;
      });
    }
  };

  const goToParentFolder = () => {
    if (!activeCard) return;
    updateCardParam(activeCard.parentId || '');
  };

  const invalidateExplorer = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['study-card'] }),
    ]);
  };

  const openFolderCreator = () => {
    setFolderEditor(getDefaultFolderEditorState(activeCard));
  };

  const openFolderEditor = (card: StudyCard) => {
    setFolderEditor({
      mode: 'edit',
      card,
      name: card.name,
      goalType: card.goalType || inferStudyGoalType(card, buildPathForCard(card)),
      iconKey: card.iconKey || 'folder',
      tone: card.tone || 'blue',
    });
  };

  const commitFolderEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreatingFolder || !folderEditor) return;
    const name = folderEditor.name.trim();
    if (!name) {
      toast.error('Folder name required');
      return;
    }

    setCreatingFolder(true);
    try {
      if (folderEditor.mode === 'edit' && folderEditor.card) {
        const parentId = folderEditor.card.parentId || null;
        const duplicate = activeCards.find((card) => (
          card._id !== folderEditor.card?._id &&
          (card.parentId || null) === parentId &&
          (card.slug === slugify(name) || normalizeNameKey(card.name) === normalizeNameKey(name))
        ));
        if (duplicate) {
          toast.error('Folder name already exists here');
          return;
        }

        const updated = await toast.promise(updateAdminStudyCard(folderEditor.card._id, folderPayloadFromCard(folderEditor.card, name, folderEditor.card.status, {
          goalType: folderEditor.goalType,
          iconKey: folderEditor.iconKey,
          tone: folderEditor.tone,
        })), {
          loading: 'Saving folder...',
          success: 'Folder updated',
          error: 'Folder update failed',
        });
        setSelection({ type: 'folder', id: updated._id });
      } else {
        const parentId = activeCard?._id || null;
        const duplicate = childFolders.find((folder) => (
          folder.slug === slugify(name) || normalizeNameKey(folder.name) === normalizeNameKey(name)
        ));
        if (duplicate) {
          toast.error('Folder already exists here');
          return;
        }

        const archivedMatch = cards.find((card) => (
          card.status === 'archived' &&
          (card.parentId || null) === parentId &&
          (card.slug === slugify(name) || normalizeNameKey(card.name) === normalizeNameKey(name))
        ));
        const createOrRestore = archivedMatch
          ? updateAdminStudyCard(archivedMatch._id, folderPayloadFromCard(archivedMatch, name, 'draft', {
            goalType: folderEditor.goalType,
            iconKey: folderEditor.iconKey,
            tone: folderEditor.tone,
            visibility: 'public',
          }))
          : createAdminStudyCard(buildFolderPayload(parentId, name, childFolders.length + 1, {
            goalType: folderEditor.goalType,
            iconKey: folderEditor.iconKey,
            tone: folderEditor.tone,
            status: 'draft',
            visibility: 'public',
          }));
        const created = await toast.promise(createOrRestore, {
          loading: 'Creating folder...',
          success: archivedMatch ? 'Folder restored' : 'Folder created',
          error: 'Folder create failed',
        });

        if (parentId) {
          setExpandedTreeIds((currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.add(parentId);
            return nextIds;
          });
        }
        setSelection({ type: 'folder', id: created._id });
      }

      setFolderEditor(null);
      await invalidateExplorer();
    } finally {
      setCreatingFolder(false);
    }
  };

  const startRename = (target: RenameTarget) => {
    if (!target) return;
    setRenameTarget(target);
    setRenameValue(target.type === 'folder' ? target.card.name : target.file.name);
  };

  const renameSelected = () => {
    if (selectedFolder) {
      startRename({ type: 'folder', card: selectedFolder });
      return;
    }
    if (selectedFile && activeCard) {
      startRename({ type: 'file', file: selectedFile, cardId: activeCard._id });
    }
  };

  const commitRename = async () => {
    if (isSavingRename) return;
    if (!renameTarget) return;
    const nextName = renameValue.trim();
    const currentName = renameTarget.type === 'folder' ? renameTarget.card.name : renameTarget.file.name;
    if (!nextName) return;
    if (nextName === currentName) {
      setRenameTarget(null);
      setRenameValue('');
      return;
    }

    setSavingRename(true);
    try {
      if (renameTarget.type === 'folder') {
        await toast.promise(updateAdminStudyCard(renameTarget.card._id, folderPayloadFromCard(renameTarget.card, nextName)), {
          loading: 'Renaming folder...',
          success: 'Folder renamed',
          error: 'Rename failed',
        });
      } else {
        const duplicateFile = activeFiles.some((file) => (
          file._id !== renameTarget.file._id &&
          normalizeNameKey(getFileLabel(file)) === normalizeNameKey(nextName)
        ));
        if (duplicateFile) {
          toast.error('A PDF with this name already exists in this folder.');
          return;
        }

        await toast.promise(updateAdminStudyCardFile(renameTarget.cardId, renameTarget.file._id, nextName), {
          loading: 'Renaming file...',
          success: 'File renamed',
          error: 'Rename failed',
        });
      }

      setRenameTarget(null);
      setRenameValue('');
      await invalidateExplorer();
    } finally {
      setSavingRename(false);
    }
  };

  const handleRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void commitRename();
  };

  const cancelRename = () => {
    setRenameTarget(null);
    setRenameValue('');
  };

  const deleteSelected = async () => {
    if (selectedFolder) {
      const descendants = getActiveDescendantFolders(selectedFolder._id);
      const confirmed = await confirmAdminAction({
        title: 'Move folder to Recycle Bin?',
        message: `"${selectedFolder.name}" includes ${descendants.length.toLocaleString('en-IN')} nested folders.`,
        confirmLabel: 'Move',
        tone: 'danger',
      });
      if (!confirmed) return;
      await toast.promise(Promise.all([selectedFolder, ...descendants].map((folder) => (
        updateAdminStudyCard(folder._id, folderPayloadFromCard(folder, folder.name, 'archived'))
      ))), {
        loading: 'Moving folder to Recycle Bin...',
        success: 'Folder moved to Recycle Bin',
        error: 'Move to Recycle Bin failed',
      });
      setSelection(null);
      await invalidateExplorer();
      return;
    }

    if (selectedFile && activeCard) {
      const confirmed = await confirmAdminAction({
        title: 'Delete PDF permanently?',
        message: getFileLabel(selectedFile),
        confirmLabel: 'Delete',
        tone: 'danger',
      });
      if (!confirmed) return;
      await toast.promise(deleteAdminStudyCardFile(activeCard._id, selectedFile._id), {
        loading: 'Deleting PDF...',
        success: 'PDF deleted',
        error: 'Delete failed',
      });
      setSelection(null);
      await invalidateExplorer();
    }
  };

  const updateFolderState = async (folder: StudyCard, status: StudyCard['status'], visibility: StudyCard['visibility'] = folder.visibility) => {
    const action = status === 'published' && visibility === 'public' ? 'publish' : visibility === 'private' ? 'unpublish' : 'draft';
    await toast.promise(updateAdminStudyCardPublication(folder._id, { action, cascade: true }), {
      loading: action === 'publish' ? 'Publishing folder...' : action === 'unpublish' ? 'Hiding folder...' : 'Moving folder to draft...',
      success: (result) => result.message || (action === 'publish' ? 'Folder published' : 'Folder hidden from students'),
      error: (error: any) => error?.response?.data?.message || 'Update failed',
    });
    await invalidateExplorer();
  };

  const updateFileState = async (file: StudyCardFile, status: StudyCard['status'], visibility: StudyCard['visibility'] = file.visibility || 'public') => {
    if (!activeCard) return;
    await toast.promise(updateAdminStudyCardFile(activeCard._id, file._id, {
      name: getFileLabel(file),
      status,
      visibility,
      year: file.year || '',
      stage: file.stage || '',
      paper: file.paper || '',
      subject: file.subject || '',
      topic: file.topic || '',
      language: file.language || 'hinglish',
      sourceType: file.sourceType || 'platform',
      sourceName: file.sourceName || '',
      notes: file.notes || '',
    }), {
      loading: 'Updating PDF state...',
      success: status === 'published' && visibility === 'public' ? 'PDF published' : 'PDF updated',
      error: 'Update failed',
    });
    await invalidateExplorer();
  };

  const publishSelected = async () => {
    if (selectedFolder) {
      await updateFolderState(selectedFolder, 'published', 'public');
      return;
    }
    if (selectedFile) await updateFileState(selectedFile, 'published', 'public');
  };

  const draftSelected = async () => {
    if (selectedFolder) {
      await updateFolderState(selectedFolder, 'draft', selectedFolder.visibility);
      return;
    }
    if (selectedFile) await updateFileState(selectedFile, 'draft', selectedFile.visibility || 'public');
  };

  const unpublishSelected = async () => {
    if (selectedFolder) {
      const confirmed = await confirmAdminAction({
        title: 'Hide from students?',
        message: `"${selectedFolder.name}" and nested content will stop appearing in Study Hub.`,
        confirmLabel: 'Unpublish',
        tone: 'danger',
      });
      if (!confirmed) return;
      await updateFolderState(selectedFolder, 'draft', 'private');
      return;
    }
    if (selectedFile) await updateFileState(selectedFile, 'draft', 'private');
  };

  const openFileEditor = (file: StudyCardFile) => {
    if (!activeCard) return;
    setFileEditor({
      file,
      cardId: activeCard._id,
      metadata: {
        name: getFileLabel(file),
        status: file.status || 'draft',
        visibility: file.visibility || 'public',
        year: file.year || '',
        stage: file.stage || '',
        paper: file.paper || '',
        subject: file.subject || '',
        topic: file.topic || '',
        language: file.language || 'hinglish',
        sourceType: file.sourceType || 'platform',
        sourceName: file.sourceName || '',
        notes: file.notes || '',
      },
    });
  };

  const commitFileEditor = async () => {
    if (!fileEditor) return;
    const nextNameKey = normalizeNameKey(fileEditor.metadata.name || getFileLabel(fileEditor.file));
    const sourceFiles = cardById.get(fileEditor.cardId)?.files || activeFiles;
    const duplicateFile = Boolean(nextNameKey && sourceFiles.some((file) => (
      file._id !== fileEditor.file._id &&
      normalizeNameKey(getFileLabel(file)) === nextNameKey
    )));

    if (duplicateFile) {
      toast.error('A PDF with this name already exists in this folder.');
      return;
    }

    await toast.promise(updateAdminStudyCardFile(fileEditor.cardId, fileEditor.file._id, fileEditor.metadata), {
      loading: 'Saving PDF details...',
      success: 'PDF details saved',
      error: 'Save failed',
    });
    setFileEditor(null);
    await invalidateExplorer();
  };

  const startMove = (target: MoveTarget) => {
    if (!target) return;
    setMoveTarget(target);
    setMoveTargetId(target.type === 'folder' ? target.folder.parentId || '' : activeCard?._id || '');
  };

  const commitMove = async () => {
    if (!moveTarget || isMovingItem) return;
    const targetParentId = moveTargetId || null;
    setMovingItem(true);
    try {
      if (moveTarget.type === 'folder') {
        if (targetParentId === moveTarget.folder.parentId) {
          setMoveTarget(null);
          return;
        }
        const targetChildren = activeCards.filter((card) => (card.parentId || '') === (targetParentId || ''));
        const duplicate = targetChildren.some((card) => (
          card._id !== moveTarget.folder._id &&
          (card.slug === moveTarget.folder.slug || normalizeNameKey(card.name) === normalizeNameKey(moveTarget.folder.name))
        ));
        if (duplicate) {
          toast.error('A folder with this name already exists in the target location.');
          return;
        }
        await toast.promise(updateAdminStudyCard(moveTarget.folder._id, {
          ...folderPayloadFromCard(moveTarget.folder, moveTarget.folder.name),
          parentId: targetParentId,
        }), {
          loading: 'Moving folder...',
          success: 'Folder moved',
          error: 'Move failed',
        });
      } else {
        if (!targetParentId || targetParentId === moveTarget.cardId) {
          setMoveTarget(null);
          return;
        }
        const targetCard = activeCards.find((card) => card._id === targetParentId);
        if (targetCard?.files?.some((file) => normalizeNameKey(getFileLabel(file)) === normalizeNameKey(getFileLabel(moveTarget.file)))) {
          toast.error('A PDF with this name already exists in the target folder.');
          return;
        }
        await toast.promise(moveAdminStudyCardFile(moveTarget.cardId, moveTarget.file._id, targetParentId), {
          loading: 'Moving PDF...',
          success: 'PDF moved',
          error: 'Move failed',
        });
      }
      setMoveTarget(null);
      setSelection(null);
      await invalidateExplorer();
    } finally {
      setMovingItem(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!activeCard) {
      toast.error('Open a folder before uploading files.');
      return;
    }
    if (!files.length) return;

    const pdfFiles = files.filter(isPdfFile);
    if (pdfFiles.length !== files.length) {
      toast.error('Only PDF files are supported here.');
    }
    if (!pdfFiles.length) return;

    setUploadDraft({
      files: pdfFiles,
      metadata: pdfFiles.map((file) => inferMetadataFromCurrentPath(file.name)),
    });
  };

  const openDocumentStudio = () => {
    if (!activeCard) {
      toast.error('Open a folder before creating a document.');
      return;
    }
    setDocumentStudioOpen(true);
  };

  const commitUploadDraft = async () => {
    if (!activeCard || !uploadDraft || isUploadingFiles) return;
    const uploadNames = uploadDraft.metadata.map((metadata, index) => (
      metadata.name || uploadDraft.files[index]?.name.replace(/\.[^/.]+$/, '') || ''
    )).map(normalizeNameKey);
    const seenUploadNames = new Set<string>();
    const duplicateExistingName = uploadNames.find((name) => name && activeFileNames.has(name));
    const duplicateBatchName = uploadNames.find((name) => {
      if (!name) return false;
      if (seenUploadNames.has(name)) return true;
      seenUploadNames.add(name);
      return false;
    });

    if (duplicateExistingName || duplicateBatchName) {
      toast.error(`Duplicate PDF name: ${duplicateExistingName || duplicateBatchName}`);
      return;
    }

    setUploadingFiles(true);
    try {
      const names = uploadDraft.metadata.map((metadata, index) => (
        metadata.name || uploadDraft.files[index]?.name.replace(/\.[^/.]+$/, '') || ''
      ));
      await toast.promise(uploadAdminStudyCardFiles(activeCard._id, uploadDraft.files, names, uploadDraft.metadata), {
      loading: 'Uploading files...',
      success: 'Files uploaded',
      error: 'Upload failed',
      });
      setUploadDraft(null);
      await invalidateExplorer();
    } finally {
      setUploadingFiles(false);
    }
  };

  const openItem = (item: ExplorerItem) => {
    if (item.type === 'folder') {
      updateCardParam(item.folder._id);
      return;
    }
    window.open(item.file.url, '_blank', 'noopener,noreferrer');
  };

  const openSelectedItem = () => {
    if (selectedFolder) {
      updateCardParam(selectedFolder._id);
      return;
    }

    if (selectedFile) {
      window.open(selectedFile.url, '_blank', 'noopener,noreferrer');
    }
  };

  const selectItem = (item: ExplorerItem) => {
    setSelection({ type: item.type, id: item.id });
  };

  const selectExplorerItemByOffset = (offset: number) => {
    if (!explorerItems.length) return;
    const currentIndex = selection
      ? explorerItems.findIndex((item) => item.type === selection.type && item.id === selection.id)
      : -1;
    const fallbackIndex = offset >= 0 ? 0 : explorerItems.length - 1;
    const nextIndex = currentIndex >= 0
      ? (currentIndex + offset + explorerItems.length) % explorerItems.length
      : fallbackIndex;
    selectItem(explorerItems[nextIndex]);
  };

  const startRenameForItem = (item: ExplorerItem) => {
    if (item.type === 'folder') {
      startRename({ type: 'folder', card: item.folder });
      return;
    }
    if (activeCard) {
      startRename({ type: 'file', file: item.file, cardId: activeCard._id });
    }
  };

  const copyOrCutItem = (item: ExplorerItem, action: ClipboardAction) => {
    setSelection({ type: item.type, id: item.id });
    if (item.type === 'file' && !activeCard) {
      toast.error('Open a folder before copying PDF');
      return;
    }
    setClipboardItem(item.type === 'folder'
      ? { action, type: 'folder', folderId: item.folder._id, name: item.folder.name }
      : { action, type: 'file', cardId: activeCard._id, fileId: item.file._id, name: getFileLabel(item.file) });
    toast.success(action === 'copy' ? 'Ready to copy' : 'Ready to move');
  };

  const copyOrCutSelected = (action: ClipboardAction) => {
    if (selectedFolder) {
      setClipboardItem({ action, type: 'folder', folderId: selectedFolder._id, name: selectedFolder.name });
      toast.success(action === 'copy' ? 'Folder copied' : 'Folder cut');
      return;
    }

    if (selectedFile && activeCard) {
      setClipboardItem({ action, type: 'file', cardId: activeCard._id, fileId: selectedFile._id, name: getFileLabel(selectedFile) });
      toast.success(action === 'copy' ? 'PDF copied' : 'PDF cut');
      return;
    }

    toast.error('Select a folder or PDF first');
  };

  const pasteClipboard = async (targetCardId?: string | null) => {
    if (!clipboardItem || isPastingItem) return;

    const targetParentId = typeof targetCardId === 'undefined' ? activeCard?._id || null : targetCardId;
    const targetCardForFile = typeof targetCardId === 'undefined'
      ? activeCard
      : targetCardId
        ? cardById.get(targetCardId) || null
        : null;
    setPastingItem(true);
    try {
      if (clipboardItem.type === 'folder') {
        const sourceFolder = activeCards.find((card) => card._id === clipboardItem.folderId);
        if (!sourceFolder) {
          toast.error('Copied folder no longer exists');
          setClipboardItem(null);
          return;
        }

        if (clipboardItem.action === 'cut') {
          const descendantIds = new Set(getActiveDescendantFolders(sourceFolder._id).map((folder) => folder._id));
          const isSameParent = (sourceFolder.parentId || null) === targetParentId;
          const hasDuplicateName = activeCards.some((card) => (
            card._id !== sourceFolder._id &&
            (card.parentId || null) === targetParentId &&
            (card.slug === sourceFolder.slug || normalizeNameKey(card.name) === normalizeNameKey(sourceFolder.name))
          ));

          if (targetParentId === sourceFolder._id || (targetParentId && descendantIds.has(targetParentId))) {
            toast.error('Folder cannot be moved inside itself');
            return;
          }

          if (isSameParent) {
            toast.success('Folder already exists here');
            setClipboardItem(null);
            return;
          }

          if (hasDuplicateName) {
            toast.error('A folder with this name already exists here');
            return;
          }

          await toast.promise(updateAdminStudyCard(sourceFolder._id, {
            ...folderPayloadFromCard(sourceFolder, sourceFolder.name),
            parentId: targetParentId,
          }), {
            loading: 'Moving folder...',
            success: 'Folder moved',
            error: 'Move failed',
          });
          setClipboardItem(null);
        } else {
          await toast.promise(copyAdminStudyCard(sourceFolder._id, targetParentId), {
            loading: 'Copying folder...',
            success: 'Folder copied',
            error: 'Copy failed',
          });
        }
      } else {
        if (!targetCardForFile) {
          toast.error('Open a folder before pasting PDF');
          return;
        }

        if (clipboardItem.action === 'cut') {
          if (clipboardItem.cardId === targetCardForFile._id) {
            toast.success('PDF already exists here');
            setClipboardItem(null);
            return;
          }

          await toast.promise(moveAdminStudyCardFile(clipboardItem.cardId, clipboardItem.fileId, targetCardForFile._id), {
            loading: 'Moving PDF...',
            success: 'PDF moved',
            error: 'Move failed',
          });
          setClipboardItem(null);
        } else {
          await toast.promise(copyAdminStudyCardFile(clipboardItem.cardId, clipboardItem.fileId, targetCardForFile._id), {
            loading: 'Copying PDF...',
            success: 'PDF copied',
            error: 'Copy failed',
          });
        }
      }

      setSelection(null);
      if (targetParentId) {
        setExpandedTreeIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.add(targetParentId);
          return nextIds;
        });
      }
      await invalidateExplorer();
    } finally {
      setPastingItem(false);
    }
  };

  const openAuditTargetPath = (targetPath: string) => {
    const pdfTarget = findPdfByPath(targetPath);
    if (pdfTarget) {
      updateCardParam(pdfTarget.folder._id);
      setSelection({ type: 'file', id: pdfTarget.file._id });
      setLibraryAiPanelOpen(false);
      return;
    }

    const normalizedTarget = normalizeNameKey(targetPath.replace(new RegExp(`^${ROOT_DISPLAY_LABEL}\\s*/\\s*`, 'i'), ''));
    const targetCard = activeCards.find((card) => {
      const pathLabel = buildPathForCard(card).map((pathCard) => pathCard.name).join(' / ');
      return normalizeNameKey(pathLabel) === normalizedTarget || normalizeNameKey(`${ROOT_DISPLAY_LABEL} / ${pathLabel}`) === normalizeNameKey(targetPath);
    });

    if (!targetCard) {
      toast.error('Target folder is not openable from this suggestion yet');
      return;
    }

    updateCardParam(targetCard._id);
    setLibraryAiPanelOpen(false);
  };

  const runLibraryAiAudit = async () => {
    setLibraryAiPanelOpen(true);
    setLibraryAiLoading(true);
    setLibraryAiFilter('all');
    setAppliedAiSuggestionKeys(new Set());
    try {
      const audit = await toast.promise(auditAdminStudyLibraryWithAi({ focusPath: currentFolderPath }), {
        loading: 'Scanning library...',
        success: 'Library suggestions ready',
        error: 'Library scan failed',
      });
      setLibraryAiAudit(audit);
    } finally {
      setLibraryAiLoading(false);
    }
  };

  const applyLibraryAiSuggestion = async (suggestion: AdminLibraryAiSuggestion) => {
    const action = resolveLibraryAiAction(suggestion);
    const suggestionKey = getSuggestionKey(suggestion);
    if (applyingAiSuggestionKey || appliedAiSuggestionKeys.has(suggestionKey)) return;

    if (action === 'review') {
      if (suggestion.targetPath) openAuditTargetPath(suggestion.targetPath);
      else toast('Review this suggestion manually.');
      return;
    }

    const isDestructive = action === 'archive_folder' || action === 'delete_pdf';
    if (isDestructive) {
      const confirmed = await confirmAdminAction({
        title: 'Apply AI suggestion?',
        message: suggestion.title,
        confirmLabel: 'Apply',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    setApplyingAiSuggestionKey(suggestionKey);
    try {
      await toast.promise((async () => {
        if (action === 'create_folder') {
          const targetPath = suggestion.proposedPath || suggestion.targetPath;
          const created = await ensureAiFolderPath(targetPath);
          if (created) {
            updateCardParam(created._id);
            setSelection({ type: 'folder', id: created._id });
          }
          return;
        }

        if (action === 'rename_pdf' || action === 'move_pdf' || action === 'delete_pdf' || action === 'metadata') {
          const pdfTarget = findPdfByPath(suggestion.targetPath);
          if (!pdfTarget) throw new Error('PDF target was not found.');

          if (action === 'delete_pdf') {
            await deleteAdminStudyCardFile(pdfTarget.folder._id, pdfTarget.file._id);
            setSelection(null);
            return;
          }

          if (action === 'metadata') {
            if (!suggestion.metadata || !Object.keys(suggestion.metadata).length) {
              setFileEditor({
                file: pdfTarget.file,
                cardId: pdfTarget.folder._id,
                metadata: {
                  name: getFileLabel(pdfTarget.file),
                  status: pdfTarget.file.status || 'draft',
                  visibility: pdfTarget.file.visibility || 'public',
                  year: pdfTarget.file.year || '',
                  stage: pdfTarget.file.stage || '',
                  paper: pdfTarget.file.paper || '',
                  subject: pdfTarget.file.subject || '',
                  topic: pdfTarget.file.topic || '',
                  language: pdfTarget.file.language || 'hinglish',
                  sourceType: pdfTarget.file.sourceType || 'platform',
                  sourceName: pdfTarget.file.sourceName || '',
                  notes: pdfTarget.file.notes || '',
                },
              });
              updateCardParam(pdfTarget.folder._id);
              setSelection({ type: 'file', id: pdfTarget.file._id });
              return;
            }
            await updateAdminStudyCardFile(pdfTarget.folder._id, pdfTarget.file._id, {
              name: getFileLabel(pdfTarget.file),
              status: pdfTarget.file.status || 'draft',
              visibility: pdfTarget.file.visibility || 'public',
              language: pdfTarget.file.language || 'hinglish',
              sourceType: pdfTarget.file.sourceType || 'platform',
              sourceName: pdfTarget.file.sourceName || '',
              notes: pdfTarget.file.notes || '',
              ...suggestion.metadata,
            });
            updateCardParam(pdfTarget.folder._id);
            setSelection({ type: 'file', id: pdfTarget.file._id });
            return;
          }

          const proposedParts = normalizeLibraryPath(suggestion.proposedPath);
          const nextName = (suggestion.newName || proposedParts[proposedParts.length - 1] || getFileLabel(pdfTarget.file)).trim();
          if (!nextName) throw new Error('New PDF name is missing.');

          if (action === 'rename_pdf') {
            const duplicate = pdfTarget.folder.files.some((file) => (
              file._id !== pdfTarget.file._id &&
              normalizeNameKey(getFileLabel(file)) === normalizeNameKey(nextName)
            ));
            if (duplicate) throw new Error('A PDF with this name already exists in that folder.');
            await updateAdminStudyCardFile(pdfTarget.folder._id, pdfTarget.file._id, nextName);
            updateCardParam(pdfTarget.folder._id);
            setSelection({ type: 'file', id: pdfTarget.file._id });
            return;
          }

          const targetFolderPath = proposedParts.length > 1
            ? proposedParts.slice(0, -1).join(' / ')
            : suggestion.proposedPath || getCardPathLabel(pdfTarget.folder);
          const targetFolder = await ensureAiFolderPath(targetFolderPath);
          if (!targetFolder) throw new Error('Target folder was not found.');
          const duplicate = targetFolder.files.some((file) => (
            !(targetFolder._id === pdfTarget.folder._id && file._id === pdfTarget.file._id) &&
            normalizeNameKey(getFileLabel(file)) === normalizeNameKey(nextName)
          ));
          if (duplicate) throw new Error('A PDF with this name already exists in target folder.');
          if (targetFolder._id !== pdfTarget.folder._id) {
            await moveAdminStudyCardFile(pdfTarget.folder._id, pdfTarget.file._id, targetFolder._id);
          }
          if (nextName !== getFileLabel(pdfTarget.file)) {
            await updateAdminStudyCardFile(targetFolder._id, pdfTarget.file._id, nextName);
          }
          updateCardParam(targetFolder._id);
          setSelection({ type: 'file', id: pdfTarget.file._id });
          return;
        }

        const targetFolder = findFolderByPath(suggestion.targetPath);
        if (!targetFolder) throw new Error('Folder target was not found.');

        if (action === 'publish_folder' || action === 'draft_folder') {
          const nextStatus: StudyCard['status'] = action === 'publish_folder' ? 'published' : 'draft';
          const nextVisibility: StudyCard['visibility'] = action === 'publish_folder' ? 'public' : targetFolder.visibility;
          await updateAdminStudyCard(targetFolder._id, folderPayloadFromCard(targetFolder, targetFolder.name, nextStatus, { visibility: nextVisibility }));
          setSelection({ type: 'folder', id: targetFolder._id });
          return;
        }

        if (action === 'archive_folder') {
          const descendants = getActiveDescendantFolders(targetFolder._id);
          await Promise.all([targetFolder, ...descendants].map((folder) => (
            updateAdminStudyCard(folder._id, folderPayloadFromCard(folder, folder.name, 'archived'))
          )));
          setSelection(null);
          if (activeCard && [targetFolder, ...descendants].some((folder) => folder._id === activeCard._id)) {
            updateCardParam(targetFolder.parentId || '');
          }
          return;
        }

        if (action === 'rename_folder') {
          const proposedParts = normalizeLibraryPath(suggestion.proposedPath);
          const nextName = (suggestion.newName || proposedParts[proposedParts.length - 1] || '').trim();
          if (!nextName) throw new Error('New folder name is missing.');
          const duplicate = activeCards.some((card) => (
            card._id !== targetFolder._id &&
            (card.parentId || null) === (targetFolder.parentId || null) &&
            (card.slug === slugify(nextName) || normalizeNameKey(card.name) === normalizeNameKey(nextName))
          ));
          if (duplicate) throw new Error('A folder with this name already exists here.');
          await updateAdminStudyCard(targetFolder._id, folderPayloadFromCard(targetFolder, nextName));
          setSelection({ type: 'folder', id: targetFolder._id });
          return;
        }

        if (action === 'move_folder') {
          const proposedParts = normalizeLibraryPath(suggestion.proposedPath);
          if (!proposedParts.length) throw new Error('Move destination is missing.');
          const nextName = (suggestion.newName || proposedParts[proposedParts.length - 1] || targetFolder.name).trim();
          const targetParentPathParts = proposedParts.slice(0, -1);
          const currentTargetPath = normalizeNameKey(getCardPathLabel(targetFolder));
          const requestedParentPath = normalizeNameKey(targetParentPathParts.join(' / '));
          if (requestedParentPath === currentTargetPath || requestedParentPath.startsWith(`${currentTargetPath} / `)) {
            throw new Error('Folder cannot be moved inside itself.');
          }
          const targetParent = targetParentPathParts.length
            ? await ensureAiFolderPath(targetParentPathParts.join(' / '))
            : null;
          const targetParentId = targetParent?._id || null;
          if (targetParentId === targetFolder._id || (targetParentId && getActiveDescendantFolders(targetFolder._id).some((folder) => folder._id === targetParentId))) {
            throw new Error('Folder cannot be moved inside itself.');
          }
          const duplicate = activeCards.some((card) => (
            card._id !== targetFolder._id &&
            (card.parentId || null) === targetParentId &&
            (card.slug === slugify(nextName) || normalizeNameKey(card.name) === normalizeNameKey(nextName))
          ));
          if (duplicate) throw new Error('A folder with this name already exists in target folder.');
          await updateAdminStudyCard(targetFolder._id, {
            ...folderPayloadFromCard(targetFolder, nextName),
            parentId: targetParentId,
          });
          setSelection({ type: 'folder', id: targetFolder._id });
          if (targetParentId) {
            setExpandedTreeIds((currentIds) => {
              const nextIds = new Set(currentIds);
              nextIds.add(targetParentId);
              return nextIds;
            });
          }
        }
      })(), {
        loading: 'Applying AI suggestion...',
        success: 'Suggestion applied',
        error: (error) => error?.message || 'Suggestion could not be applied',
      });

      setAppliedAiSuggestionKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        nextKeys.add(suggestionKey);
        return nextKeys;
      });
      await invalidateExplorer();
    } finally {
      setApplyingAiSuggestionKey('');
    }
  };

  const approveSafeLibraryAiSuggestions = async () => {
    if (!safeBatchLibraryAiSuggestions.length || applyingAiSuggestionKey) return;
    const confirmed = await confirmAdminAction({
      title: 'Apply AI suggestions?',
      message: `${safeBatchLibraryAiSuggestions.length.toLocaleString('en-IN')} low-risk suggestions will be applied.`,
      confirmLabel: 'Apply all',
    });
    if (!confirmed) return;

    for (const suggestion of safeBatchLibraryAiSuggestions) {
      await applyLibraryAiSuggestion(suggestion);
    }
  };

  const copyLibraryAiReport = async () => {
    if (!libraryAiAudit) return;
    const lines = [
      `Library AI report: ${currentFolderPath}`,
      libraryAiAudit.summary,
      '',
      ...libraryAiSuggestions.map((suggestion, index) => {
        const action = getLibraryAiActionLabel(resolveLibraryAiAction(suggestion));
        return [
          `${index + 1}. ${action}: ${suggestion.title}`,
          suggestion.targetPath ? `From: ${suggestion.targetPath}` : '',
          suggestion.proposedPath ? `To: ${suggestion.proposedPath}` : '',
          suggestion.reason ? `Why: ${suggestion.reason}` : '',
          `Risk: ${suggestion.risk || 'medium'} | Confidence: ${Math.round((suggestion.confidence || 0) * 100)}%`,
        ].filter(Boolean).join('\n');
      }),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      toast.success('AI report copied');
    } catch {
      toast.error('Report copy failed');
    }
  };

  useEffect(() => {
    if (!requestedAction) return;

    if (requestedAction === 'new-folder') {
      setFolderEditor(getDefaultFolderEditorState(activeCard));
    }

    if (requestedAction === 'upload-pdf') {
      if (activeCard) uploadInputRef.current?.click();
      else toast.error('Open a folder before uploading PDF');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('action');
    setSearchParams(nextParams, { replace: true });
  }, [activeCard, requestedAction, searchParams, setSearchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcutKey = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !isEditableTarget(event.target)) {
        if (shortcutKey === 'e' || shortcutKey === 'f') {
          event.preventDefault();
          searchInputRef.current?.focus();
          return;
        }

        if (shortcutKey === 'c' && selection) {
          event.preventDefault();
          copyOrCutSelected('copy');
          return;
        }

        if (shortcutKey === 'x' && selection) {
          event.preventDefault();
          copyOrCutSelected('cut');
          return;
        }

        if (shortcutKey === 'v' && clipboardItem) {
          event.preventDefault();
          void pasteClipboard();
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && shortcutKey === 'n' && !isEditableTarget(event.target)) {
        event.preventDefault();
        openFolderCreator();
        return;
      }

      if (event.altKey && event.key === 'ArrowUp' && activeCard) {
        event.preventDefault();
        goToParentFolder();
        return;
      }

      if (!isEditableTarget(event.target) && !renameTarget) {
        if (event.key === 'Enter' && selection) {
          event.preventDefault();
          openSelectedItem();
          return;
        }

        if (event.key === 'Backspace' && activeCard) {
          event.preventDefault();
          goToParentFolder();
          return;
        }

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          selectExplorerItemByOffset(1);
          return;
        }

        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          selectExplorerItemByOffset(-1);
          return;
        }
      }

      if (event.key === 'F2' && selection) {
        event.preventDefault();
        renameSelected();
      }

      if (event.key === 'Delete' && selection && !renameTarget) {
        event.preventDefault();
        void deleteSelected();
      }

      if (event.key === 'Escape' && renameTarget) {
        event.preventDefault();
        cancelRename();
      }

      if (event.key === 'Escape') {
        setContextMenu(null);
        setMoveTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, renameTarget, selectedFolder, selectedFile, activeCard, clipboardItem, isPastingItem, activeCards]);

  useEffect(() => {
    if (!contextMenu) return undefined;

    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, [contextMenu]);

  const renderRenameInput = () => (
    <form onSubmit={handleRename}>
      <input
        value={renameValue}
        onChange={(event) => setRenameValue(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          if (!renameValue.trim()) cancelRename();
          else void commitRename();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelRename();
          }
        }}
        className={inlineNameInputClassName}
        autoFocus
      />
    </form>
  );

  const renderTreeRenameInput = () => (
    <form onSubmit={handleRename} className="min-w-0 flex-1 py-1 pr-2">
      <input
        value={renameValue}
        onChange={(event) => setRenameValue(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          if (!renameValue.trim()) cancelRename();
          else void commitRename();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelRename();
          }
        }}
        className="h-8 w-full rounded-lg border border-[#4cc2ff] bg-[#111411] px-2 text-left text-[13px] font-black text-white outline-none ring-2 ring-[#4cc2ff]/25"
        autoFocus
      />
    </form>
  );

  const renderTree = (parentId: string | null, depth = 0) => {
    const children = childrenByParentId.get(parentId || 'root') || [];
    if (!children.length) return null;

    return (
      <div className="space-y-1">
        {children.map((card) => {
          const isActive = activeCardId === card._id;
          const childCount = (childrenByParentId.get(card._id) || []).length;
          const fileCount = getCardFileCount(card);
          const hasChildren = childCount > 0;
          const isExpanded = expandedTreeIds.has(card._id);
          const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
          const TreeIcon = visual.icon;
          const treeItem: ExplorerItem = { key: `folder-${card._id}`, type: 'folder', id: card._id, name: card.name, folder: card };
          const isRenaming = renameTarget?.type === 'folder' && renameTarget.card._id === card._id;
          return (
            <div key={card._id} className="relative">
              <div
                data-explorer-item="true"
                draggable={!isRenaming}
                onDragStart={(event) => startItemDrag(event, treeItem)}
                onDragEnd={finishItemDrag}
                onDragOver={(event) => handleDropTargetDragOver(event, card._id)}
                onDragLeave={() => setDropTargetId(null)}
                onDrop={(event) => handleDropTargetDrop(event, card._id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectItem(treeItem);
                  setContextMenu({ kind: 'item', x: event.clientX, y: event.clientY, item: treeItem });
                }}
                className={[
                  'group flex min-h-10 w-full items-center rounded-xl border text-[13px] font-semibold transition duration-150',
                  isActive
                    ? 'border-white/10 bg-white/[0.11] text-white shadow-[0_10px_26px_rgba(0,0,0,0.18)]'
                    : 'border-transparent text-[#d0d0d0] hover:border-white/10 hover:bg-white/[0.065] hover:text-white',
                  dropTargetId === card._id ? 'border-[#4cc2ff]/60 bg-cyan-300/[0.12] ring-2 ring-[#4cc2ff]/25' : '',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (hasChildren) toggleTreeNode(card._id);
                  }}
                  disabled={!hasChildren}
                  aria-label={hasChildren ? `${isExpanded ? 'Collapse' : 'Expand'} ${card.name}` : `${card.name} has no child folders`}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  className="flex h-10 w-8 shrink-0 items-center justify-center rounded-l-xl text-[#8d8d8d] transition hover:text-[#dfefff] disabled:cursor-default disabled:opacity-35 disabled:hover:text-[#8d8d8d]"
                >
                  {hasChildren ? (
                    <ChevronRightIcon className={['h-3.5 w-3.5 transition-transform duration-150', isExpanded ? 'rotate-90' : ''].join(' ')} aria-hidden="true" />
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                </button>
                {isRenaming ? (
                  <>
                    {visual.iconUrl ? (
                      <img src={visual.iconUrl} alt="" className="ml-2 h-4 w-4 shrink-0 object-contain" />
                    ) : (
                      <TreeIcon className="ml-2 h-4 w-4 shrink-0 text-[#ffd45d]" aria-hidden="true" />
                    )}
                    {renderTreeRenameInput()}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateCardParam(card._id)}
                    onDoubleClick={() => hasChildren && toggleTreeNode(card._id)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left"
                  >
                    {visual.iconUrl ? (
                      <img src={visual.iconUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
                    ) : isActive || isExpanded ? (
                      <FolderOpenIcon className="h-4 w-4 shrink-0 text-[#ffd45d]" aria-hidden="true" />
                    ) : (
                      <TreeIcon className="h-4 w-4 shrink-0 text-[#ffd45d]" aria-hidden="true" />
                    )}
                    <span className="truncate">{card.name}</span>
                  </button>
                )}
                {(childCount > 0 || fileCount > 0) && (
                  <span className="mr-2 hidden shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black text-[#9fc8d8] group-hover:inline-flex">
                    {childCount > 0 ? childCount : fileCount}
                  </span>
                )}
              </div>
              {hasChildren && isExpanded && (
                <div className={['ml-4 border-l border-white/10 pl-2', depth > 2 ? 'border-white/[0.07]' : ''].join(' ')}>
                  {renderTree(card._id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderIconItem = (item: ExplorerItem) => {
    const isSelected = selection?.type === item.type && selection.id === item.id;
    const isRenaming =
      (item.type === 'folder' && renameTarget?.type === 'folder' && renameTarget.card._id === item.id) ||
      (item.type === 'file' && renameTarget?.type === 'file' && renameTarget.file._id === item.id);
    const isClipboardCut =
      clipboardItem?.action === 'cut' &&
      ((item.type === 'folder' && clipboardItem.type === 'folder' && clipboardItem.folderId === item.id) ||
        (item.type === 'file' && clipboardItem.type === 'file' && clipboardItem.fileId === item.id));
    const visual = item.type === 'folder' ? getStudyCardVisual(item.folder.iconKey, item.folder.tone, item.folder.name) : getStudyCardVisual('pyq', 'violet');
    const Icon = visual.icon;
    const meta = item.type === 'folder'
      ? `${(childrenByParentId.get(item.id) || []).length} folders / ${getCardFileCount(item.folder)} PDFs`
      : formatBytes(item.file.sizeBytes);
    const itemVisible = item.type === 'folder'
      ? item.folder.status === 'published' && item.folder.visibility === 'public'
      : (item.file.status || 'draft') === 'published' && (item.file.visibility || 'public') === 'public';
    const itemStateLabel = itemVisible ? 'Visible' : 'Draft';
    const itemStateClassName = itemVisible
      ? 'border-emerald-300/20 bg-emerald-400/10 text-[#9fe8bb]'
      : 'border-amber-300/20 bg-amber-400/10 text-[#ffd88a]';

    return (
      <article
        key={item.key}
        data-explorer-item="true"
        draggable={!isRenaming}
        onDragStart={(event) => startItemDrag(event, item)}
        onDragEnd={finishItemDrag}
        onDragOver={(event) => {
          if (item.type === 'folder') handleDropTargetDragOver(event, item.folder._id);
        }}
        onDragLeave={() => item.type === 'folder' && setDropTargetId(null)}
        onDrop={(event) => {
          if (item.type === 'folder') handleDropTargetDrop(event, item.folder._id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectItem(item);
          setContextMenu({ kind: 'item', x: event.clientX, y: event.clientY, item });
        }}
        onDoubleClick={() => openItem(item)}
        className={[
          'study-card-surface group relative flex h-44 flex-col overflow-hidden rounded-[1.55rem] border p-3 text-center shadow-[0_20px_46px_rgba(0,0,0,0.34)] ring-1 ring-white/[0.035] transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_68px_rgba(8,145,178,0.16)] sm:h-48',
          isSelected ? 'border-[#4cc2ff] bg-[#233746] ring-[#4cc2ff]/45' : 'border-white/10 bg-[#20231f] hover:border-cyan-300/30 hover:bg-[#252a25]',
          isClipboardCut ? 'opacity-55' : '',
          item.type === 'folder' && dropTargetId === item.folder._id ? 'border-[#4cc2ff]/70 bg-cyan-300/[0.12] ring-[#4cc2ff]/40' : '',
        ].join(' ')}
      >
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneBarClassName[visual.tone]}`} />
        <button type="button" onClick={() => selectItem(item)} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 pt-2">
          <span className="relative flex h-[4.6rem] w-[5rem] items-center justify-center rounded-[1.45rem] border border-white/10 bg-[#111411] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_28px_rgba(0,0,0,0.24)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03] sm:h-[5.2rem] sm:w-[5.6rem]">
            {visual.iconUrl ? (
              <img src={visual.iconUrl} alt="" className="study-icon-asset relative z-10 h-[3.55rem] w-[3.55rem] object-contain transition duration-300 group-hover:scale-105 sm:h-[4.15rem] sm:w-[4.15rem]" />
            ) : (
              <Icon className="relative z-10 h-[3.45rem] w-[3.45rem] text-slate-200 transition duration-300 group-hover:scale-105 sm:h-[4rem] sm:w-[4rem]" aria-hidden="true" />
            )}
          </span>
          {isRenaming ? (
            <div className="w-full px-1">{renderRenameInput()}</div>
          ) : (
            <span className="line-clamp-2 min-h-[2.2rem] break-words text-[13px] font-black leading-tight text-[#f3f3f3] sm:text-sm">
              {item.name}
            </span>
          )}
        </button>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate rounded-xl border border-white/10 bg-[#111111]/85 px-2 py-1 text-[10px] font-black text-[#a8a8a8]">
            {meta}
          </span>
          <span className={['shrink-0 rounded-xl border px-2 py-1 text-[10px] font-black', itemStateClassName].join(' ')}>
            {itemStateLabel}
          </span>
        </div>
      </article>
    );
  };

  const renderDetailsRow = (item: ExplorerItem) => {
    const isSelected = selection?.type === item.type && selection.id === item.id;
    const isRenaming =
      (item.type === 'folder' && renameTarget?.type === 'folder' && renameTarget.card._id === item.id) ||
      (item.type === 'file' && renameTarget?.type === 'file' && renameTarget.file._id === item.id);
    const isClipboardCut =
      clipboardItem?.action === 'cut' &&
      ((item.type === 'folder' && clipboardItem.type === 'folder' && clipboardItem.folderId === item.id) ||
        (item.type === 'file' && clipboardItem.type === 'file' && clipboardItem.fileId === item.id));
    const visual = item.type === 'folder' ? getStudyCardVisual(item.folder.iconKey, item.folder.tone, item.folder.name) : getStudyCardVisual('pyq', 'violet');
    const Icon = visual.icon;
    const itemVisible = item.type === 'folder'
      ? item.folder.status === 'published' && item.folder.visibility === 'public'
      : (item.file.status || 'draft') === 'published' && (item.file.visibility || 'public') === 'public';
    const itemStateClassName = itemVisible
      ? 'border-emerald-300/20 bg-emerald-400/10 text-[#9fe8bb]'
      : 'border-amber-300/20 bg-amber-400/10 text-[#ffd88a]';

    return (
      <tr
        key={item.key}
        data-explorer-item="true"
        draggable={!isRenaming}
        onDragStart={(event) => startItemDrag(event, item)}
        onDragEnd={finishItemDrag}
        onDragOver={(event) => {
          if (item.type === 'folder') handleDropTargetDragOver(event, item.folder._id);
        }}
        onDragLeave={() => item.type === 'folder' && setDropTargetId(null)}
        onDrop={(event) => {
          if (item.type === 'folder') handleDropTargetDrop(event, item.folder._id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectItem(item);
          setContextMenu({ kind: 'item', x: event.clientX, y: event.clientY, item });
        }}
        onClick={() => selectItem(item)}
        onDoubleClick={() => openItem(item)}
        className={[
          'cursor-default border-b border-white/5 text-[13px]',
          isSelected ? 'bg-[#223443] text-white' : 'bg-[#151515] text-[#d6d6d6] hover:bg-white/[0.045]',
          isClipboardCut ? 'opacity-55' : '',
          item.type === 'folder' && dropTargetId === item.folder._id ? 'bg-cyan-300/[0.14] ring-2 ring-inset ring-[#4cc2ff]/30' : '',
        ].join(' ')}
      >
        <td className="px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {visual.iconUrl ? (
              <img src={visual.iconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
            ) : item.type === 'folder' ? (
              <Icon className="h-5 w-5 shrink-0 text-[#ffd45d]" aria-hidden="true" />
            ) : (
              <Icon className="h-5 w-5 shrink-0 text-[#ff7777]" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <form onSubmit={handleRename}>
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={() => {
                      if (!renameValue.trim()) cancelRename();
                      else void commitRename();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="h-7 w-full rounded-sm border border-[#4cc2ff] bg-[#111111] px-2 text-[13px] font-semibold text-white outline-none ring-2 ring-[#4cc2ff]/25"
                    autoFocus
                  />
                </form>
              ) : (
                <span className="block truncate font-semibold">{item.name}</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 text-[#a8a8a8]">{item.type === 'folder' ? 'Folder' : 'PDF document'}</td>
        <td className="px-3 py-2 text-[#a8a8a8]">{item.type === 'folder' ? `${(childrenByParentId.get(item.id) || []).length} folders / ${getCardFileCount(item.folder)} PDFs` : formatBytes(item.file.sizeBytes)}</td>
        <td className="px-3 py-2 text-[#a8a8a8]">
          <span className={['inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black', itemStateClassName].join(' ')}>
            {itemVisible ? 'Visible' : 'Draft'}
          </span>
        </td>
      </tr>
    );
  };

  const hasSelection = Boolean(selectedFolder || selectedFile);
  const selectedTitle = selectedFolder?.name || selectedFile?.name || '';
  const selectedFolderGoalType = selectedFolder
    ? inferStudyGoalType(selectedFolder, buildPathForCard(selectedFolder))
    : undefined;
  const selectedType = selectedFolder ? getStudyGoalTypeLabel(selectedFolderGoalType) : selectedFile ? 'PDF' : '';
  const previewCard = selectedFolder || (selectedFile ? activeCard : null);
  const previewVisual = selectedFile
    ? getStudyCardVisual('pyq', 'violet')
    : previewCard
      ? getStudyCardVisual(previewCard.iconKey, previewCard.tone, previewCard.name)
      : getStudyCardVisual('heading', 'indigo');
  const PreviewIcon = previewVisual.icon;
  const previewPath = selectedFolder
    ? [ROOT_DISPLAY_LABEL, ...buildPathForCard(selectedFolder).map((card) => card.name)].join(' / ')
    : selectedFile && activeCard
      ? [ROOT_DISPLAY_LABEL, ...buildPathForCard(activeCard).map((card) => card.name), getFileLabel(selectedFile)].join(' / ')
      : '';
  const previewFolderCount = selectedFolder ? (childrenByParentId.get(selectedFolder._id) || []).length : 0;
  const previewFileCount = selectedFolder ? getCardFileCount(selectedFolder) : selectedFile ? 1 : 0;
  const isStudentVisible = selectedFile
    ? Boolean(
      activeCard &&
      activeCard.status === 'published' &&
      activeCard.visibility === 'public' &&
      (selectedFile.status || 'draft') === 'published' &&
      (selectedFile.visibility || 'public') === 'public'
    )
    : previewCard
      ? previewCard.status === 'published' && previewCard.visibility === 'public'
      : false;
  const previewCardPath = previewCard ? buildPathForCard(previewCard) : [];
  const hiddenAncestor = selectedFile
    ? previewCardPath.find((card) => card.status !== 'published' || card.visibility !== 'public') || null
    : previewCardPath.slice(0, -1).find((card) => card.status !== 'published' || card.visibility !== 'public') || null;
  const isSelectionStudentReachable = hasSelection && isStudentVisible && !hiddenAncestor;
  const selectedFolderDuplicateName = selectedFolder
    ? activeCards.some((card) => (
      card._id !== selectedFolder._id &&
      (card.parentId || '') === (selectedFolder.parentId || '') &&
      normalizeNameKey(card.name) === normalizeNameKey(selectedFolder.name)
    ))
    : false;
  const selectedFileDuplicateName = selectedFile
    ? activeFiles.some((file) => (
      file._id !== selectedFile._id &&
      normalizeNameKey(getFileLabel(file)) === normalizeNameKey(getFileLabel(selectedFile))
    ))
    : false;
  const selectedFileHasMetadata = Boolean(selectedFile && [
    selectedFile.year,
    selectedFile.stage,
    selectedFile.paper,
    selectedFile.subject,
    selectedFile.topic,
  ].some(Boolean));
  const selectedFolderHasContent = Boolean(selectedFolder && (previewFolderCount + previewFileCount > 0));
  const publishChecks: QualityCheck[] = hasSelection ? [
    {
      label: 'Student path',
      detail: isSelectionStudentReachable
        ? 'Students can open this from Study Hub.'
        : hiddenAncestor
          ? `${hiddenAncestor.name} is draft or private.`
          : 'Publish this item to make it visible.',
      ok: isSelectionStudentReachable,
    },
    selectedFolder
      ? {
        label: 'Folder content',
        detail: selectedFolderHasContent
          ? `${previewFolderCount} folders and ${previewFileCount} PDFs inside.`
          : 'Empty folders feel blank to students.',
        ok: selectedFolderHasContent,
      }
      : {
        label: 'PDF metadata',
        detail: selectedFileHasMetadata
          ? 'Metadata is ready for search and filters.'
          : 'Add year, stage, paper, subject, or topic.',
        ok: selectedFileHasMetadata,
      },
    {
      label: 'Duplicate name',
      detail: selectedFolderDuplicateName || selectedFileDuplicateName
        ? 'Same display name exists at this level.'
        : 'Name is unique in this folder.',
      ok: !(selectedFolderDuplicateName || selectedFileDuplicateName),
    },
    {
      label: selectedFile ? 'PDF link' : 'Folder icon',
      detail: selectedFile
        ? selectedFile.url ? 'PDF file link is available.' : 'PDF file link is missing.'
        : previewCard?.iconKey ? 'Visual icon is selected.' : 'Choose an icon for this folder.',
      ok: selectedFile ? Boolean(selectedFile.url) : Boolean(previewCard?.iconKey),
    },
  ] : [];
  const publishIssueCount = publishChecks.filter((check) => !check.ok).length;
  const visibleItemCount = explorerItems.length;
  const totalItemCount = childFolders.length + activeFiles.length;
  const moveFolderOptions = useMemo(() => getMoveFolderOptions(moveTarget), [getMoveFolderOptions, moveTarget]);
  const statusLabel = hasSelection ? (isSelectionStudentReachable ? 'Visible' : 'Draft') : 'Select item';
  const currentFolderTitle = activeCard?.name || ROOT_DISPLAY_LABEL;
  const currentFolderPath = [ROOT_DISPLAY_LABEL, ...breadcrumb.map((card) => card.name)].join(' / ');
  const currentFolderGoalType = activeCard ? inferStudyGoalType(activeCard, breadcrumb) : 'library_root';
  const currentFolderTypeLabel = activeCard ? getStudyGoalTypeLabel(currentFolderGoalType) : 'Library root';
  const currentFolderVisible = activeCard ? activeCard.status === 'published' && activeCard.visibility === 'public' : true;
  const currentFolderStatusLabel = activeCard ? (currentFolderVisible ? 'Visible' : 'Draft') : 'Home';
  const currentFolderVisual = activeCard
    ? getStudyCardVisual(activeCard.iconKey, activeCard.tone, activeCard.name)
    : getStudyCardVisual('heading', 'indigo');
  const CurrentFolderIcon = currentFolderVisual.icon;
  const currentFolderStatusClassName = currentFolderVisible
    ? 'border-emerald-300/20 bg-emerald-400/10 text-[#95e6b3]'
    : 'border-amber-300/20 bg-amber-400/10 text-[#ffd88a]';
  const selectedStatusClassName = isSelectionStudentReachable
    ? 'border-emerald-300/20 bg-emerald-400/10 text-[#95e6b3]'
    : 'border-amber-300/20 bg-amber-400/10 text-[#ffd88a]';
  const fileEditorSourceCard = fileEditor ? cardById.get(fileEditor.cardId) || null : null;
  const fileEditorNameKey = fileEditor ? normalizeNameKey(fileEditor.metadata.name || getFileLabel(fileEditor.file)) : '';
  const fileEditorHasDuplicateName = Boolean(fileEditor && fileEditorNameKey && (fileEditorSourceCard?.files || []).some((file) => (
    file._id !== fileEditor.file._id &&
    normalizeNameKey(getFileLabel(file)) === fileEditorNameKey
  )));

  const updateUploadMetadata = (index: number, patch: StudyCardFileMetadataPayload) => {
    setUploadDraft((current) => {
      if (!current) return current;
      const metadata = current.metadata.slice();
      metadata[index] = { ...metadata[index], ...patch };
      return { ...current, metadata };
    });
  };

  const updateAllUploadMetadata = (patch: StudyCardFileMetadataPayload) => {
    setUploadDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        metadata: current.metadata.map((metadata) => ({ ...metadata, ...patch })),
      };
    });
  };

  const renderPublishChecklist = (compact = false) => {
    if (!publishChecks.length) return null;

    return (
      <div className={['rounded-[1.5rem] border border-white/10 bg-[#202020] shadow-sm', compact ? 'mt-3 p-3' : 'p-3'].join(' ')}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Publish checklist</p>
            <p className="mt-0.5 text-xs font-semibold text-[#a8a8a8]">Student side readiness</p>
          </div>
          <span className={[
            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black',
            publishIssueCount ? 'border-amber-300/20 bg-amber-400/10 text-[#ffd88a]' : 'border-emerald-300/20 bg-emerald-400/10 text-[#95e6b3]',
          ].join(' ')}>
            {publishIssueCount ? `${publishIssueCount} fix` : 'Ready'}
          </span>
        </div>
        <div className={['mt-3 grid gap-2', compact ? 'sm:grid-cols-2' : ''].join(' ')}>
          {publishChecks.map((check) => (
            <div
              key={check.label}
              className={[
                'flex gap-2 rounded-2xl border p-2.5',
                check.ok ? 'border-emerald-300/20 bg-emerald-400/[0.06]' : 'border-amber-300/20 bg-amber-400/[0.08]',
              ].join(' ')}
            >
              {check.ok ? (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#95e6b3]" aria-hidden="true" />
              ) : (
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#ffd88a]" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-black text-[#f3f3f3]">{check.label}</p>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#a8a8a8]">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-drive-explorer admin-explorer-clean relative min-h-[calc(100dvh-8rem)] overflow-hidden bg-transparent text-[#f3f3f3]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0))]" />
      <div className="admin-drive-header relative border-b border-white/10 bg-transparent px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#101210] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.24)]">
                {currentFolderVisual.iconUrl ? (
                  <img src={currentFolderVisual.iconUrl} alt="" className="h-7 w-7 object-contain" />
                ) : activeCard ? (
                  <CurrentFolderIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
                ) : (
                  <HomeIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-xl font-black leading-tight text-white sm:text-2xl">{currentFolderTitle}</h2>
                  <span className={['shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black', currentFolderStatusClassName].join(' ')}>
                    {currentFolderStatusLabel}
                  </span>
                  <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[11px] font-black text-[#cfcfcf] sm:inline-flex">
                    {currentFolderTypeLabel}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#a8a8a8]">{currentFolderPath}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:justify-end">
              {[
                ['Folders', childFolders.length],
                ['PDFs', activeFiles.length],
                ['Shown', visibleItemCount],
              ].map(([label, value]) => (
                <div key={label} className="min-w-[5.5rem] rounded-2xl border border-white/10 bg-black/20 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#8f8f8f]">{label}</p>
                  <p className="mt-0.5 text-sm font-black text-white">{Number(value).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-command-scroll -mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex w-max min-w-full items-center gap-2">
              <button type="button" onClick={openFolderCreator} disabled={isCreatingFolder} className={primaryToolbarButtonClassName}>
                <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
                {isCreatingFolder ? 'Creating...' : 'New folder'}
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={!activeCard}
                className={primaryToolbarButtonClassName}
                title={activeCard ? 'Upload PDFs to this folder' : 'Open a folder before uploading'}
              >
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                Upload PDF
              </button>
              <button
                type="button"
                onClick={openDocumentStudio}
                disabled={!activeCard}
                className={primaryToolbarButtonClassName}
                title={activeCard ? 'Create a Word-style document and save it as PDF' : 'Open a folder before creating a document'}
              >
                <DocumentPlusIcon className="h-4 w-4" aria-hidden="true" />
                New document
              </button>
              <span className="mx-1 h-8 w-px shrink-0 bg-white/10" />
              <button type="button" onClick={() => copyOrCutSelected('copy')} disabled={!selection} className={toolbarButtonClassName} title="Ctrl+C">
                <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                Copy
              </button>
              <button type="button" onClick={() => copyOrCutSelected('cut')} disabled={!selection} className={toolbarButtonClassName} title="Ctrl+X">
                <ScissorsIcon className="h-4 w-4" aria-hidden="true" />
                Cut
              </button>
              <button type="button" onClick={() => void pasteClipboard()} disabled={!canPasteClipboard || isPastingItem} className={toolbarButtonClassName} title="Ctrl+V">
                <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />
                {isPastingItem ? 'Pasting...' : 'Paste'}
              </button>
              <button type="button" onClick={renameSelected} disabled={!selection} className={toolbarButtonClassName}>
                <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                Rename
              </button>
              <button type="button" onClick={() => selectedFolder && openFolderEditor(selectedFolder)} disabled={!selectedFolder} className={toolbarButtonClassName}>
                Details
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedFolder) startMove({ type: 'folder', folder: selectedFolder });
                  if (selectedFile && activeCard) startMove({ type: 'file', file: selectedFile, cardId: activeCard._id });
                }}
                disabled={!selection}
                className={toolbarButtonClassName}
              >
                Move
              </button>
              <button type="button" onClick={() => selectedFile && openFileEditor(selectedFile)} disabled={!selectedFile} className={toolbarButtonClassName}>
                Edit PDF
              </button>
              <button type="button" onClick={() => void publishSelected()} disabled={!selection} className={toolbarButtonClassName}>
                Publish
              </button>
              <button type="button" onClick={() => void draftSelected()} disabled={!selection} className={toolbarButtonClassName}>
                Draft
              </button>
              <button type="button" onClick={() => void unpublishSelected()} disabled={!selection} className={dangerToolbarButtonClassName}>
                Hide from students
              </button>
              <button type="button" onClick={() => void deleteSelected()} disabled={!selection} className={dangerToolbarButtonClassName}>
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                {selectedFolder ? 'Move to Bin' : selectedFile ? 'Delete PDF' : 'Delete'}
              </button>
              <button type="button" onClick={() => void invalidateExplorer()} className={toolbarButtonClassName}>
                <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                Refresh
              </button>
              <button type="button" onClick={() => void runLibraryAiAudit()} disabled={isLibraryAiLoading} className={toolbarButtonClassName}>
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                {isLibraryAiLoading ? 'Scanning...' : 'AI scan'}
              </button>
            </div>
          </div>
          {clipboardItem && (
            <div className="max-w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-xs font-black text-[#bdefff] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <span className="block truncate">{clipboardLabel}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#9ab8c1]">Open target folder, then press Ctrl+V or Paste.</span>
            </div>
          )}
          {duplicateSummary && (
            <div className="max-w-full rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] px-3 py-2 text-xs font-black text-[#ffd88a] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <span className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Duplicate detector: {duplicateSummary}</span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#ccb98a]">Rename items from right click or Rename before publishing.</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileTreeOpen(true)}
            className={[viewButtonClassName, 'border-white/10 bg-black/15 lg:hidden'].join(' ')}
            title="Folders"
          >
            <FolderOpenIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToParentFolder}
            disabled={!activeCard}
            className={[viewButtonClassName, 'border-white/10 bg-black/15 disabled:cursor-not-allowed disabled:opacity-45'].join(' ')}
            title="Go to parent folder"
          >
            <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex w-max rounded-2xl border border-white/10 bg-black/15 p-1">
            <button
              type="button"
              onClick={() => setViewMode('icons')}
              className={[viewButtonClassName, viewMode === 'icons' ? 'border-white/10 bg-white/[0.10] text-[#9cdcfe] shadow-sm' : ''].join(' ')}
              title="Icons"
            >
              <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('details')}
              className={[viewButtonClassName, viewMode === 'details' ? 'border-white/10 bg-white/[0.10] text-[#9cdcfe] shadow-sm' : ''].join(' ')}
              title="Details"
            >
              <TableCellsIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="h-11 max-w-[8.5rem] rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-[12px] font-black text-[#f3f3f3] outline-none transition focus:border-[#4cc2ff] focus:ring-2 focus:ring-[#4cc2ff]/20"
            title="Sort items"
          >
            <option value="manual">Manual</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
            <option value="type">Type</option>
          </select>
          <label className="relative block min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-[#9a9a9a]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search this folder"
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.055] pl-9 pr-8 text-[13px] font-semibold text-[#f3f3f3] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#4cc2ff] focus:ring-2 focus:ring-[#4cc2ff]/20"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-[#9a9a9a] hover:text-white">
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            void handleFilesSelected(files);
          }}
        />
      </div>

      <div className="admin-drive-layout relative grid min-h-[72vh] lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_21rem]">
        <aside className="admin-drive-tree-pane hidden border-b border-white/10 bg-transparent lg:block lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <span className="text-xs font-black uppercase tracking-wide text-[#9a9a9a]">Folders</span>
            <div className="flex rounded-xl border border-white/10 bg-black/15 p-0.5">
              <button
                type="button"
                onClick={expandAllTreeNodes}
                className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#d6d6d6] transition hover:bg-white/[0.08] hover:text-white"
                title="Expand all folders"
              >
                All
              </button>
              <button
                type="button"
                onClick={collapseTreeNodes}
                className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#d6d6d6] transition hover:bg-white/[0.08] hover:text-white"
                title="Collapse folders"
              >
                Close
              </button>
            </div>
          </div>
          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={() => updateCardParam('')}
              onDragOver={(event) => handleDropTargetDragOver(event, null)}
              onDragLeave={() => setDropTargetId(null)}
              onDrop={(event) => handleDropTargetDrop(event, null)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({ kind: 'folder', x: event.clientX, y: event.clientY, targetCardId: null, targetName: ROOT_DISPLAY_LABEL });
              }}
              className={[
                'mb-2 flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 text-left text-sm font-black transition',
                !activeCard ? 'border-white/10 bg-white/[0.10] text-white shadow-sm' : 'border-transparent text-[#d0d0d0] hover:bg-white/[0.06] hover:text-white',
                dropTargetId === 'root' ? 'border-[#4cc2ff]/60 bg-cyan-300/[0.12] ring-2 ring-[#4cc2ff]/25' : '',
              ].join(' ')}
            >
              <HomeIcon className="h-4 w-4 text-[#9cdcfe]" aria-hidden="true" />
              <span className="truncate font-semibold">{ROOT_DISPLAY_LABEL}</span>
              <span className="ml-auto rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black text-[#9fc8d8]">
                {rootFolderCount}
              </span>
            </button>
            <div
              className="study-scrollbar admin-tree-scroll h-[min(64vh,42rem)] min-h-[28rem] overflow-y-auto overflow-x-hidden pr-1"
              onWheel={handleTreeWheel}
            >
              {renderTree(null) || <p className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-[13px] font-semibold text-[#8f8f8f]">No folders</p>}
            </div>
          </div>
        </aside>

        <section className="admin-drive-main-pane min-w-0 border-b border-white/10 bg-transparent lg:border-b-0 xl:border-r">
          <div className="flex min-h-14 items-center gap-1 border-b border-white/10 bg-transparent px-3 text-[13px] text-[#d6d6d6] sm:px-4">
            <div className="admin-drive-breadcrumb flex min-w-0 flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 shadow-sm">
              <button type="button" onClick={() => updateCardParam('')} className="flex min-w-0 items-center gap-1 rounded-xl px-1.5 py-1 font-black hover:bg-white/[0.08]">
                <HomeIcon className="h-4 w-4 text-[#9cdcfe]" aria-hidden="true" />
                <span className="truncate">{ROOT_DISPLAY_LABEL}</span>
              </button>
              {breadcrumb.map((card) => (
                <span key={card._id} className="hidden min-w-0 items-center gap-1 sm:inline-flex">
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-[#8a8a8a]" aria-hidden="true" />
                  <button type="button" onClick={() => updateCardParam(card._id)} className="max-w-[13rem] truncate rounded-xl px-1.5 py-1 font-semibold hover:bg-white/[0.08]">
                    {card.name}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div
            className={[
              'admin-drive-content min-h-[calc(72vh-3.5rem)] p-3 transition sm:p-4',
              isDragOver ? 'bg-[#1f3342]/40 ring-2 ring-inset ring-[#4cc2ff]/40' : 'bg-transparent',
            ].join(' ')}
            onDragOver={(event) => {
              if (draggedItem) {
                const targetCardId = activeCard?._id || null;
                if (!canDropDraggedItemTo(targetCardId)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTargetId(targetCardId || 'root');
                setDragOver(true);
                return;
              }
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => {
              setDragOver(false);
              setDropTargetId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (draggedItem) {
                void moveDraggedItemTo(activeCard?._id || null);
                return;
              }
              void handleFilesSelected(Array.from(event.dataTransfer.files || []));
            }}
            onContextMenu={(event) => {
              if ((event.target as HTMLElement).closest('[data-explorer-item="true"]')) return;
              event.preventDefault();
              setContextMenu({
                kind: 'folder',
                x: event.clientX,
                y: event.clientY,
                targetCardId: activeCard?._id || null,
                targetName: currentFolderTitle,
              });
            }}
          >
            {isLoading ? (
              <p className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.035] p-8 text-center text-sm font-semibold text-[#a0a0a0]">Loading folders...</p>
            ) : isError ? (
              <div className="flex min-h-[46vh] items-center justify-center rounded-[1.85rem] border border-dashed border-white/10 bg-[#171917] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.22)] sm:p-8">
                <div>
                  <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.055] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
                    <FolderOpenIcon className="h-10 w-10 text-[#ffb7c2]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-[#f3f3f3]">Folder data could not load</h3>
                  <p className="mx-auto mt-1 max-w-xs text-sm font-semibold text-[#a0a0a0]">Refresh the page. If the session expired, sign in to admin again.</p>
                  <div className="mt-4 flex justify-center">
                    <button type="button" onClick={() => void invalidateExplorer()} className={toolbarButtonClassName}>
                      <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : explorerItems.length ? (
              viewMode === 'icons' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(9.25rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] sm:gap-3">
                  {explorerItems.map(renderIconItem)}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#151515] shadow-[0_16px_38px_rgba(0,0,0,0.24)]">
                  <table className="min-w-full table-fixed text-left">
                    <thead className="border-b border-white/10 bg-white/[0.045] text-xs font-black uppercase tracking-wide text-[#a0a0a0]">
                      <tr>
                        <th className="w-[45%] px-3 py-2">Name</th>
                        <th className="w-[18%] px-3 py-2">Type</th>
                        <th className="w-[15%] px-3 py-2">Size</th>
                        <th className="w-[22%] px-3 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>{explorerItems.map(renderDetailsRow)}</tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="flex min-h-[46vh] items-center justify-center rounded-[1.85rem] border border-dashed border-white/10 bg-[#171917] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.22)] sm:p-8">
                <div>
                  <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.055] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
                    <img src={ASSETS.icons.study.folder} alt="" className="h-14 w-14 object-contain opacity-90" />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-[#f3f3f3]">{normalizedSearch ? 'No matching items' : 'No folders yet'}</h3>
                  <p className="mx-auto mt-1 max-w-xs text-sm font-semibold text-[#a0a0a0]">Create a folder card.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={openFolderCreator} disabled={isCreatingFolder} className={toolbarButtonClassName}>
                      <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
                      Create folder
                    </button>
                    {activeCard && <button type="button" onClick={() => uploadInputRef.current?.click()} className={toolbarButtonClassName}>
                      <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                      Upload PDF
                    </button>}
                    {activeCard && (
                      <button type="button" onClick={openDocumentStudio} className={toolbarButtonClassName}>
                        <DocumentPlusIcon className="h-4 w-4" aria-hidden="true" />
                        New document
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {hasSelection && (
          <div className="border-t border-white/10 bg-transparent p-3 lg:col-span-2 xl:hidden">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{selectedTitle}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#9a9a9a]">{selectedType}</p>
                </div>
                <span className={['shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black', selectedStatusClassName].join(' ')}>
                  {statusLabel}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 min-[440px]:grid-cols-3">
                {selectedFolder && (
                  <button type="button" onClick={() => updateCardParam(selectedFolder._id)} className={previewActionButtonClassName}>
                    Open
                  </button>
                )}
                {selectedFile && (
                  <button type="button" onClick={() => window.open(selectedFile.url, '_blank', 'noopener,noreferrer')} className={previewActionButtonClassName}>
                    Open PDF
                  </button>
                )}
                <button type="button" onClick={() => copyOrCutSelected('copy')} className={previewActionButtonClassName}>Copy</button>
                <button type="button" onClick={() => copyOrCutSelected('cut')} className={previewActionButtonClassName}>Cut</button>
                <button type="button" onClick={() => void pasteClipboard()} disabled={!canPasteClipboard || isPastingItem} className={previewActionButtonClassName}>
                  {isPastingItem ? 'Pasting' : 'Paste'}
                </button>
                <button type="button" onClick={renameSelected} className={previewActionButtonClassName}>Rename</button>
                {selectedFolder && <button type="button" onClick={() => openFolderEditor(selectedFolder)} className={previewActionButtonClassName}>Details</button>}
                {selectedFile && <button type="button" onClick={() => openFileEditor(selectedFile)} className={previewActionButtonClassName}>PDF</button>}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFolder) startMove({ type: 'folder', folder: selectedFolder });
                    if (selectedFile && activeCard) startMove({ type: 'file', file: selectedFile, cardId: activeCard._id });
                  }}
                  className={previewActionButtonClassName}
                >
                  Move
                </button>
                <button type="button" onClick={() => void publishSelected()} className={previewActionButtonClassName}>Publish</button>
                <button type="button" onClick={() => void draftSelected()} className={previewActionButtonClassName}>Draft</button>
                <button type="button" onClick={() => void unpublishSelected()} className={previewActionButtonClassName}>Unpublish</button>
                <button type="button" onClick={() => void deleteSelected()} className={previewActionButtonClassName}>
                  {selectedFolder ? 'Bin' : 'Delete'}
                </button>
              </div>
              {renderPublishChecklist(true)}
            </div>
          </div>
        )}

        <aside className="admin-drive-detail-pane hidden bg-transparent xl:block">
          <div className="flex min-h-14 items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-black uppercase tracking-wide text-[#d6d6d6]">Details</span>
            <span className={['rounded-full border px-3 py-1 text-[11px] font-black', hasSelection ? selectedStatusClassName : 'border-white/10 bg-white/[0.055] text-[#a8a8a8]'].join(' ')}>
              {statusLabel}
            </span>
          </div>
          <div className="space-y-4 p-4">
            {hasSelection ? (
              <>
            <div className="admin-drive-preview-card study-card-surface relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#20231f] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.32)]">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneBarClassName[previewVisual.tone]}`} />
              <div className="flex flex-col items-center pt-2 text-center">
                <span className="relative flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-white/10 bg-[#111411]">
                  {previewVisual.iconUrl ? (
                    <img src={previewVisual.iconUrl} alt="" className="relative z-10 h-16 w-16 object-contain" />
                  ) : selectedFile ? (
                    <PreviewIcon className="relative z-10 h-16 w-16 text-[#ff7777]" aria-hidden="true" />
                  ) : (
                    <PreviewIcon className="relative z-10 h-16 w-16 text-[#9cdcfe]" aria-hidden="true" />
                  )}
                </span>
                <h3 className="mt-2 break-words text-base font-black leading-tight text-white">{selectedTitle}</h3>
                <p className="mt-1 text-[13px] font-semibold text-[#a8a8a8]">{selectedType}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Folders</p>
                  <p className="mt-1 text-lg font-black text-white">{previewFolderCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">PDFs</p>
                  <p className="mt-1 text-lg font-black text-white">{previewFileCount}</p>
                </div>
              </div>
            </div>

            {renderPublishChecklist()}

            <dl className="admin-drive-details-list space-y-2 text-[13px]">
              <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Path</dt>
                <dd className="mt-1 break-words font-semibold text-[#f3f3f3]">{previewPath}</dd>
              </div>

              {selectedFolder && (
                <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                  <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Role</dt>
                  <dd className="mt-1 font-semibold text-[#f3f3f3]">{getStudyGoalTypeLabel(selectedFolderGoalType)}</dd>
                  <dd className="mt-1 text-xs font-semibold leading-5 text-[#9a9a9a]">{getStudyGoalTypeDescription(selectedFolderGoalType)}</dd>
                </div>
              )}

              {previewCard && (
                <>
                  <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">{selectedFile ? 'Parent slug' : 'Slug'}</dt>
                    <dd className="mt-1 break-all font-semibold text-[#f3f3f3]">{previewCard.slug}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">{selectedFile ? 'Parent state' : 'Status'}</dt>
                    <dd className="mt-1 font-semibold capitalize text-[#f3f3f3]">{previewCard.status} / {previewCard.visibility}</dd>
                  </div>
                </>
              )}

              {selectedFile && (
                <>
                  <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Size</dt>
                    <dd className="mt-1 font-semibold text-[#f3f3f3]">{formatBytes(selectedFile.sizeBytes)}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Uploaded</dt>
                    <dd className="mt-1 font-semibold text-[#f3f3f3]">{formatDate(selectedFile.uploadedAt)}</dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Metadata</dt>
                    <dd className="mt-1 font-semibold text-[#f3f3f3]">
                      {[selectedFile.year, selectedFile.stage, selectedFile.paper, selectedFile.subject, selectedFile.topic].filter(Boolean).join(' / ') || 'Not set'}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#202020] p-3">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">PDF state</dt>
                    <dd className="mt-1 font-semibold capitalize text-[#f3f3f3]">{selectedFile.status || 'draft'} / {selectedFile.visibility || 'public'}</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="admin-drive-actions-panel rounded-[1.5rem] border border-white/10 bg-[#202020] p-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-[#9a9a9a]">Actions</p>
              <div className="mt-3 grid gap-2">
                {selectedFolder && (
                  <button type="button" onClick={() => updateCardParam(selectedFolder._id)} className={previewActionButtonClassName}>
                    Open folder
                  </button>
                )}
                {selectedFile && (
                  <button type="button" onClick={() => window.open(selectedFile.url, '_blank', 'noopener,noreferrer')} className={previewActionButtonClassName}>
                    Open PDF
                  </button>
                )}
                <button type="button" onClick={() => copyOrCutSelected('copy')} className={previewActionButtonClassName}>Copy</button>
                <button type="button" onClick={() => copyOrCutSelected('cut')} className={previewActionButtonClassName}>Cut</button>
                <button type="button" onClick={() => void pasteClipboard()} disabled={!canPasteClipboard || isPastingItem} className={previewActionButtonClassName}>
                  {isPastingItem ? 'Pasting' : 'Paste here'}
                </button>
                <button type="button" onClick={renameSelected} className={previewActionButtonClassName}>Rename</button>
                {selectedFolder && <button type="button" onClick={() => openFolderEditor(selectedFolder)} className={previewActionButtonClassName}>Details</button>}
                <button type="button" onClick={() => void publishSelected()} className={previewActionButtonClassName}>Publish</button>
                <button type="button" onClick={() => void draftSelected()} className={previewActionButtonClassName}>Draft</button>
                <button type="button" onClick={() => void unpublishSelected()} className={previewActionButtonClassName}>Unpublish</button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFolder) startMove({ type: 'folder', folder: selectedFolder });
                    if (selectedFile && activeCard) startMove({ type: 'file', file: selectedFile, cardId: activeCard._id });
                  }}
                  className={previewActionButtonClassName}
                >
                  Move
                </button>
                {selectedFile && <button type="button" onClick={() => openFileEditor(selectedFile)} className={previewActionButtonClassName}>Edit PDF</button>}
                <button type="button" onClick={() => void deleteSelected()} className={previewActionButtonClassName}>{selectedFolder ? 'Move to Bin' : 'Delete PDF'}</button>
              </div>
            </div>
              </>
            ) : (
              <div className="admin-drive-empty-preview flex min-h-[22rem] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-[#202020] p-6 text-center">
                <div>
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055]">
                    <FolderOpenIcon className="h-8 w-8 text-[#9a9a9a]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-black text-white">Select an item</h3>
                  <p className="mt-1 text-sm font-semibold text-[#9a9a9a]">Details will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="admin-drive-statusbar relative hidden min-h-11 items-center justify-between gap-3 border-t border-white/10 bg-transparent px-4 text-xs font-semibold text-[#a0a0a0] lg:flex">
        <span>{visibleItemCount.toLocaleString('en-IN')} shown / {totalItemCount.toLocaleString('en-IN')} total</span>
        <span className="min-w-0 truncate">{selection ? '1 selected' : 'No selection'} · Drag to move · Enter open · F2 rename · Ctrl+Shift+N new folder</span>
      </div>

      {isMobileTreeOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/68 backdrop-blur-sm"
            aria-label="Close folder drawer"
            onClick={() => setMobileTreeOpen(false)}
          />
          <aside className="absolute inset-x-3 bottom-3 max-h-[82dvh] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#131613] shadow-[0_28px_80px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.04]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Folders</p>
                <h3 className="truncate text-lg font-black text-white">{currentFolderTitle}</h3>
              </div>
              <button type="button" onClick={() => setMobileTreeOpen(false)} className={previewActionButtonClassName}>
                Close
              </button>
            </div>
            <div className="p-3">
              <button
                type="button"
                onClick={() => updateCardParam('')}
                onDragOver={(event) => handleDropTargetDragOver(event, null)}
                onDragLeave={() => setDropTargetId(null)}
                onDrop={(event) => handleDropTargetDrop(event, null)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenu({ kind: 'folder', x: event.clientX, y: event.clientY, targetCardId: null, targetName: ROOT_DISPLAY_LABEL });
                }}
                className={[
                  'mb-2 flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 text-left text-sm font-black transition',
                  !activeCard ? 'border-white/10 bg-white/[0.10] text-white shadow-sm' : 'border-transparent text-[#d0d0d0] hover:bg-white/[0.06] hover:text-white',
                  dropTargetId === 'root' ? 'border-[#4cc2ff]/60 bg-cyan-300/[0.12] ring-2 ring-[#4cc2ff]/25' : '',
                ].join(' ')}
              >
                <HomeIcon className="h-4 w-4 text-[#9cdcfe]" aria-hidden="true" />
                <span className="truncate font-semibold">{ROOT_DISPLAY_LABEL}</span>
                <span className="ml-auto rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black text-[#9fc8d8]">
                  {rootFolderCount}
                </span>
              </button>
              <div className="study-scrollbar admin-tree-scroll max-h-[58dvh] min-h-[18rem] overflow-y-auto overflow-x-hidden pr-1" onWheel={handleTreeWheel}>
                {renderTree(null) || <p className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-[13px] font-semibold text-[#8f8f8f]">No folders</p>}
              </div>
            </div>
          </aside>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 min-w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#202020]/98 p-1 text-sm font-semibold text-[#f3f3f3] shadow-[0_22px_56px_rgba(0,0,0,0.58)] ring-1 ring-white/[0.03] backdrop-blur-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.kind === 'item' ? (() => {
            const item = contextMenu.item;
            const canPasteInsideItem = item.type === 'folder' && canPasteIntoTarget(item.folder._id);
            return (
              <>
                <div className="mb-1 grid grid-cols-4 gap-1 border-b border-white/10 pb-1">
                  <button type="button" onClick={() => { copyOrCutItem(item, 'copy'); setContextMenu(null); }} className="flex h-10 items-center justify-center rounded-xl text-[#d6d6d6] hover:bg-white/[0.08] hover:text-white" title="Copy">
                    <ClipboardDocumentIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => { copyOrCutItem(item, 'cut'); setContextMenu(null); }} className="flex h-10 items-center justify-center rounded-xl text-[#d6d6d6] hover:bg-white/[0.08] hover:text-white" title="Cut">
                    <ScissorsIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.type === 'folder') void pasteClipboard(item.folder._id);
                      setContextMenu(null);
                    }}
                    disabled={!canPasteInsideItem || isPastingItem}
                    className="flex h-10 items-center justify-center rounded-xl text-[#d6d6d6] hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    title="Paste inside"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => { void deleteSelected(); setContextMenu(null); }} className="flex h-10 items-center justify-center rounded-xl text-[#ffb7c2] hover:bg-[#452329]" title={item.type === 'folder' ? 'Move to Recycle Bin' : 'Delete PDF'}>
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <button type="button" onClick={() => { openItem(item); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]">Open</button>
                <button type="button" onClick={() => { startRenameForItem(item); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]">
                  Rename
                </button>
                {item.type === 'folder' ? (
                  <button
                    type="button"
                    onClick={() => {
                      openFolderEditor(item.folder);
                      setContextMenu(null);
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]"
                  >
                    Edit details
                  </button>
                ) : (
                  <button type="button" onClick={() => { openFileEditor(item.file); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]">PDF details</button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (item.type === 'folder') startMove({ type: 'folder', folder: item.folder });
                    else if (activeCard) startMove({ type: 'file', file: item.file, cardId: activeCard._id });
                    setContextMenu(null);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]"
                >
                  Move to...
                </button>
                <button type="button" onClick={() => { void publishSelected(); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]">Publish</button>
                <button type="button" onClick={() => { void draftSelected(); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]">Mark draft</button>
                <button type="button" onClick={() => { void unpublishSelected(); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left text-[#ffb7c2] hover:bg-[#452329]">Hide from students</button>
              </>
            );
          })() : (() => {
            const targetIsCurrentFolder = contextMenu.targetCardId === (activeCard?._id || null);
            return (
              <>
                <p className="mb-1 truncate border-b border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">
                  {contextMenu.targetName}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (targetIsCurrentFolder) openFolderCreator();
                    else updateCardParam(contextMenu.targetCardId || '');
                    setContextMenu(null);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]"
                >
                  {targetIsCurrentFolder ? 'New folder here' : 'Open location'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (targetIsCurrentFolder && activeCard) uploadInputRef.current?.click();
                    setContextMenu(null);
                  }}
                  disabled={!targetIsCurrentFolder || !activeCard}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Upload PDF here
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (targetIsCurrentFolder && activeCard) openDocumentStudio();
                    setContextMenu(null);
                  }}
                  disabled={!targetIsCurrentFolder || !activeCard}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  New document here
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void pasteClipboard(contextMenu.targetCardId);
                    setContextMenu(null);
                  }}
                  disabled={!canPasteIntoTarget(contextMenu.targetCardId) || isPastingItem}
                  className="block w-full rounded-xl px-3 py-2 text-left text-[#bdefff] hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Paste here
                </button>
                <button type="button" onClick={() => { void invalidateExplorer(); setContextMenu(null); }} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]">Refresh</button>
              </>
            );
          })()}
        </div>
      )}

      {isLibraryAiPanelOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#181a18] shadow-[0_28px_80px_rgba(0,0,0,0.62)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[#9cdcfe]">Library AI copilot</p>
                <h3 className="mt-1 truncate text-xl font-black text-white">{currentFolderTitle}</h3>
                <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{libraryAiAudit?.summary || currentFolderPath}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {libraryAiAudit && (
                  <button
                    type="button"
                    onClick={() => void approveSafeLibraryAiSuggestions()}
                    disabled={!safeBatchLibraryAiSuggestions.length || Boolean(applyingAiSuggestionKey)}
                    className={[
                      previewActionButtonClassName,
                      safeBatchLibraryAiSuggestions.length ? 'border-emerald-300/20 bg-emerald-400/10 text-[#95e6b3]' : '',
                    ].join(' ')}
                  >
                    Approve safe
                  </button>
                )}
                {libraryAiAudit && (
                  <button type="button" onClick={() => void copyLibraryAiReport()} className={previewActionButtonClassName}>
                    Copy report
                  </button>
                )}
                <button type="button" onClick={() => void runLibraryAiAudit()} disabled={isLibraryAiLoading} className={previewActionButtonClassName}>
                  {isLibraryAiLoading ? 'Scanning...' : 'Rescan'}
                </button>
                <button type="button" onClick={() => setLibraryAiPanelOpen(false)} className={previewActionButtonClassName}>Close</button>
              </div>
            </div>

            <div className="study-scrollbar max-h-[68vh] overflow-auto p-4">
              {isLibraryAiLoading && !libraryAiAudit ? (
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/15 p-8 text-center text-sm font-semibold text-[#a8a8a8]">
                  Scanning actual folders and PDFs...
                </div>
              ) : libraryAiAudit?.suggestions.length ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ['Suggestions', libraryAiSuggestions.length],
                      ['Ready', pendingLibraryAiSuggestions.length],
                      ['Approved', appliedAiSuggestionKeys.size],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#8f8f8f]">{label}</p>
                        <p className="mt-1 text-xl font-black text-white">{Number(value).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {([
                      ['all', 'All', libraryAiSuggestions.length],
                      ['apply', 'Ready', pendingLibraryAiSuggestions.length],
                      ['review', 'Review', libraryAiSuggestions.length - pendingLibraryAiSuggestions.length - appliedAiSuggestionKeys.size],
                      ['applied', 'Applied', appliedAiSuggestionKeys.size],
                    ] as Array<[LibraryAiFilter, string, number]>).map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLibraryAiFilter(key)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-black transition',
                          libraryAiFilter === key
                            ? 'border-cyan-200/35 bg-cyan-300/[0.13] text-[#bdefff]'
                            : 'border-white/10 bg-white/[0.045] text-[#b8b8b8] hover:bg-white/[0.075]',
                        ].join(' ')}
                      >
                        {label} {Math.max(0, count).toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleLibraryAiSuggestions.map((suggestion) => {
                      const action = resolveLibraryAiAction(suggestion);
                      const suggestionKey = getSuggestionKey(suggestion);
                      const isApplied = appliedAiSuggestionKeys.has(suggestionKey);
                      const isApplying = applyingAiSuggestionKey === suggestionKey;
                      const canApply = canAutoApplyLibrarySuggestion(suggestion);
                      const actionLabel = getLibraryAiActionLabel(action);
                      return (
                        <article key={suggestionKey} className={[
                          'rounded-[1.5rem] border p-3 shadow-sm transition',
                          isApplied ? 'border-emerald-300/25 bg-emerald-400/[0.06]' : 'border-white/10 bg-[#202020]',
                        ].join(' ')}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#9cdcfe]">{actionLabel}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#d6d6d6]">{suggestion.risk} risk</span>
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-[#95e6b3]">{Math.round(suggestion.confidence * 100)}%</span>
                            {isApplied && (
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-[#95e6b3]">Approved</span>
                            )}
                          </div>
                          <h4 className="mt-3 line-clamp-2 text-base font-black text-white">{suggestion.title}</h4>
                          <p className="mt-1 text-sm font-semibold leading-6 text-[#b8b8b8]">{suggestion.reason}</p>
                          <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-black/15 p-2.5 text-xs font-bold text-[#9a9a9a]">
                            {suggestion.targetPath && <p className="truncate">From: {suggestion.targetPath}</p>}
                            {suggestion.proposedPath && <p className="truncate">To: {suggestion.proposedPath}</p>}
                            {suggestion.newName && <p className="truncate">Name: {suggestion.newName}</p>}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => suggestion.targetPath ? openAuditTargetPath(suggestion.targetPath) : toast('No target path found.')}
                              disabled={!suggestion.targetPath}
                              className={previewActionButtonClassName}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => void applyLibraryAiSuggestion(suggestion)}
                              disabled={!canApply || isApplied || Boolean(applyingAiSuggestionKey)}
                              className={[
                                previewActionButtonClassName,
                                canApply && !isApplied ? 'border-cyan-200/25 bg-cyan-300/[0.10] text-[#bdefff]' : '',
                              ].join(' ')}
                              title={canApply ? 'Approve and apply this suggestion' : 'This suggestion needs manual review'}
                            >
                              {isApplying ? 'Applying...' : isApplied ? 'Applied' : canApply ? 'Approve' : 'Review'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {!visibleLibraryAiSuggestions.length && (
                      <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/15 p-6 text-center text-sm font-semibold text-[#8f8f8f] md:col-span-2">
                        No suggestions in this view.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/15 p-8 text-center">
                  <SparklesIcon className="mx-auto h-10 w-10 text-[#9cdcfe]" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-black text-white">No suggestions yet</h3>
                  <p className="mt-1 text-sm font-semibold text-[#8f8f8f]">Run scan to review folder quality, gaps, and organization.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {isDocumentStudioOpen && (
        <StudyDocumentStudio
          activeCard={activeCard}
          activeFileNames={activeFileNames}
          currentFolderPath={currentFolderPath}
          defaultMetadata={metadataDefaults}
          onClose={() => setDocumentStudioOpen(false)}
          onSaved={async () => {
            setDocumentStudioOpen(false);
            await invalidateExplorer();
          }}
        />
      )}

      {folderEditor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={commitFolderEditor}
            className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-[1.5rem] border border-white/10 bg-[#181a18] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#9cdcfe]">
                  {folderEditor.mode === 'create' ? 'New folder' : 'Folder details'}
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {folderEditor.mode === 'create' ? (activeCard?.name || ROOT_DISPLAY_LABEL) : folderEditor.card?.name}
                </h3>
              </div>
              <button type="button" onClick={() => setFolderEditor(null)} className={previewActionButtonClassName}>Close</button>
            </div>

            <label className="block">
              <span className={modalLabelClassName}>Folder name</span>
              <input
                value={folderEditor.name}
                onChange={(event) => setFolderEditor({ ...folderEditor, name: event.target.value })}
                className={modalInputClassName}
                placeholder="Folder name"
                autoFocus
              />
            </label>

            <label className="mt-4 block">
              <span className={modalLabelClassName}>Role</span>
              <select
                value={folderEditor.goalType}
                onChange={(event) => setFolderEditor({ ...folderEditor, goalType: event.target.value as StudyGoalType })}
                className={modalInputClassName}
              >
                {studyGoalTypeOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#9a9a9a]">
                {getStudyGoalTypeDescription(folderEditor.goalType)}
              </p>
            </label>

            <div className="mt-4">
              <span className={modalLabelClassName}>Icon</span>
              <div className="grid max-h-[42vh] grid-cols-2 gap-2 overflow-auto pr-1 sm:grid-cols-3">
                {studyIconOptions.map((option) => {
                  const OptionIcon = option.icon;
                  const isSelected = folderEditor.iconKey === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setFolderEditor({ ...folderEditor, iconKey: option.key, tone: option.tone })}
                      className={[
                        'flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition',
                        isSelected
                          ? 'border-[#4cc2ff] bg-[#223443] ring-1 ring-[#4cc2ff]/40'
                          : 'border-[#303030] bg-[#202020] hover:border-cyan-300/30 hover:bg-[#242424]',
                      ].join(' ')}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111111]">
                        {option.iconUrl ? (
                          <img src={option.iconUrl} alt="" className="h-8 w-8 object-contain" />
                        ) : (
                          <OptionIcon className="h-7 w-7 text-[#e8e8e8]" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white">{option.label}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold capitalize text-[#9a9a9a]">{option.tone}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setFolderEditor(null)} className={previewActionButtonClassName}>Cancel</button>
              <button type="submit" disabled={isCreatingFolder} className={previewActionButtonClassName}>
                {isCreatingFolder ? 'Saving...' : folderEditor.mode === 'create' ? 'Create folder' : 'Save folder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {moveTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void commitMove();
            }}
            className="w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-[#181a18] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#9cdcfe]">Move</p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {moveTarget.type === 'folder' ? moveTarget.folder.name : getFileLabel(moveTarget.file)}
                </h3>
              </div>
              <button type="button" onClick={() => setMoveTarget(null)} className={previewActionButtonClassName}>Close</button>
            </div>
            <label className="block">
              <span className={modalLabelClassName}>Target folder</span>
              <select value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)} className={modalInputClassName} required={moveTarget.type === 'file'}>
                {moveTarget.type === 'folder' && <option value="">Library home</option>}
                {moveFolderOptions.map((folder) => (
                  <option key={folder._id} value={folder._id}>{[ROOT_DISPLAY_LABEL, ...buildPathForCard(folder).map((card) => card.name)].join(' / ')}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setMoveTarget(null)} className={previewActionButtonClassName}>Cancel</button>
              <button type="submit" disabled={isMovingItem} className={previewActionButtonClassName}>{isMovingItem ? 'Moving...' : 'Move here'}</button>
            </div>
          </form>
        </div>
      )}

      {uploadDraft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void commitUploadDraft();
            }}
            className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-[1.5rem] border border-white/10 bg-[#181a18] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#9cdcfe]">Upload PDFs</p>
                <h3 className="mt-1 text-lg font-black text-white">{uploadDraft.files.length} PDF files</h3>
                <p className="mt-1 text-sm font-semibold text-[#a8a8a8]">{currentFolderPath}</p>
              </div>
              <button type="button" onClick={() => setUploadDraft(null)} className={previewActionButtonClassName}>Close</button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className={modalLabelClassName}>Status</span>
                <select value={uploadDraft.metadata[0]?.status || 'draft'} onChange={(event) => updateAllUploadMetadata({ status: event.target.value as StudyCard['status'] })} className={modalInputClassName}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Language</span>
                <select value={uploadDraft.metadata[0]?.language || 'hinglish'} onChange={(event) => updateAllUploadMetadata({ language: event.target.value as StudyCardFileMetadataPayload['language'] })} className={modalInputClassName}>
                  <option value="hinglish">Hinglish</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Source</span>
                <select value={uploadDraft.metadata[0]?.sourceType || 'platform'} onChange={(event) => updateAllUploadMetadata({ sourceType: event.target.value })} className={modalInputClassName}>
                  <option value="official">Official</option>
                  <option value="ncert">NCERT</option>
                  <option value="standard_book">Standard book</option>
                  <option value="faculty">Faculty</option>
                  <option value="creator">Creator</option>
                  <option value="community">Community</option>
                  <option value="platform">Platform</option>
                </select>
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Year</span>
                <input value={uploadDraft.metadata[0]?.year || ''} onChange={(event) => updateAllUploadMetadata({ year: event.target.value })} className={modalInputClassName} placeholder="2024" />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Stage</span>
                <input value={uploadDraft.metadata[0]?.stage || ''} onChange={(event) => updateAllUploadMetadata({ stage: event.target.value })} className={modalInputClassName} placeholder="Stage name" />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Paper</span>
                <input value={uploadDraft.metadata[0]?.paper || ''} onChange={(event) => updateAllUploadMetadata({ paper: event.target.value })} className={modalInputClassName} placeholder="Paper name" />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Subject</span>
                <input value={uploadDraft.metadata[0]?.subject || ''} onChange={(event) => updateAllUploadMetadata({ subject: event.target.value })} className={modalInputClassName} placeholder="Subject name" />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Topic</span>
                <input value={uploadDraft.metadata[0]?.topic || ''} onChange={(event) => updateAllUploadMetadata({ topic: event.target.value })} className={modalInputClassName} placeholder="Topic name" />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Source name</span>
                <input value={uploadDraft.metadata[0]?.sourceName || ''} onChange={(event) => updateAllUploadMetadata({ sourceName: event.target.value })} className={modalInputClassName} placeholder="Source name" />
              </label>
            </div>

            {uploadDraftDuplicateNames.size > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] px-3 py-2 text-xs font-bold text-[#ffd88a]">
                Same display name is used more than once in this upload batch.
              </div>
            )}

            <div className="mt-4 space-y-2">
              {uploadDraft.files.map((file, index) => {
                const draftName = uploadDraft.metadata[index]?.name || '';
                const effectiveDraftName = draftName || file.name.replace(/\.[^/.]+$/, '');
                const draftNameKey = normalizeNameKey(effectiveDraftName);
                const hasExistingDuplicate = Boolean(draftNameKey && activeFileNames.has(draftNameKey));
                const hasBatchDuplicate = Boolean(draftNameKey && uploadDraftDuplicateNames.has(draftNameKey));

                return (
                  <label
                    key={`${file.name}-${index}`}
                    className={[
                      'block rounded-2xl border bg-[#111111] p-3',
                      hasExistingDuplicate || hasBatchDuplicate ? 'border-amber-300/30' : 'border-[#303030]',
                    ].join(' ')}
                  >
                    <span className={modalLabelClassName}>Display name</span>
                    <input
                      value={draftName}
                      onChange={(event) => updateUploadMetadata(index, { name: event.target.value })}
                      className={modalInputClassName}
                    />
                    {hasExistingDuplicate && (
                      <p className="mt-1 text-xs font-semibold text-[#ffb7c2]">Duplicate name already exists in this folder.</p>
                    )}
                    {hasBatchDuplicate && (
                      <p className="mt-1 text-xs font-semibold text-[#ffd88a]">Duplicate name inside this upload batch.</p>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setUploadDraft(null)} className={previewActionButtonClassName}>Cancel</button>
              <button type="submit" disabled={isUploadingFiles} className={previewActionButtonClassName}>{isUploadingFiles ? 'Uploading...' : 'Upload as draft'}</button>
            </div>
          </form>
        </div>
      )}

      {fileEditor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void commitFileEditor();
            }}
            className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-[#181a18] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#9cdcfe]">PDF details</p>
                <h3 className="mt-1 break-words text-lg font-black text-white">{getFileLabel(fileEditor.file)}</h3>
              </div>
              <button type="button" onClick={() => setFileEditor(null)} className={previewActionButtonClassName}>Close</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className={modalLabelClassName}>Display name</span>
                <input value={fileEditor.metadata.name || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, name: event.target.value } })} className={modalInputClassName} />
                {fileEditorHasDuplicateName && (
                  <p className="mt-1 text-xs font-semibold text-[#ffb7c2]">Duplicate PDF name already exists in this folder.</p>
                )}
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Status</span>
                <select value={fileEditor.metadata.status || 'draft'} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, status: event.target.value as StudyCard['status'] } })} className={modalInputClassName}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Visibility</span>
                <select value={fileEditor.metadata.visibility || 'public'} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, visibility: event.target.value as StudyCard['visibility'] } })} className={modalInputClassName}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="invite_only">Invite only</option>
                </select>
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Year</span>
                <input value={fileEditor.metadata.year || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, year: event.target.value } })} className={modalInputClassName} />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Stage</span>
                <input value={fileEditor.metadata.stage || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, stage: event.target.value } })} className={modalInputClassName} />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Paper</span>
                <input value={fileEditor.metadata.paper || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, paper: event.target.value } })} className={modalInputClassName} />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Subject</span>
                <input value={fileEditor.metadata.subject || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, subject: event.target.value } })} className={modalInputClassName} />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Topic</span>
                <input value={fileEditor.metadata.topic || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, topic: event.target.value } })} className={modalInputClassName} />
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Language</span>
                <select value={fileEditor.metadata.language || 'hinglish'} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, language: event.target.value as StudyCardFileMetadataPayload['language'] } })} className={modalInputClassName}>
                  <option value="hinglish">Hinglish</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="block">
                <span className={modalLabelClassName}>Source</span>
                <select value={fileEditor.metadata.sourceType || 'platform'} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, sourceType: event.target.value } })} className={modalInputClassName}>
                  <option value="official">Official</option>
                  <option value="ncert">NCERT</option>
                  <option value="standard_book">Standard book</option>
                  <option value="faculty">Faculty</option>
                  <option value="creator">Creator</option>
                  <option value="community">Community</option>
                  <option value="platform">Platform</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className={modalLabelClassName}>Notes</span>
                <textarea value={fileEditor.metadata.notes || ''} onChange={(event) => setFileEditor({ ...fileEditor, metadata: { ...fileEditor.metadata, notes: event.target.value } })} className={modalInputClassName} rows={3} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setFileEditor(null)} className={previewActionButtonClassName}>Cancel</button>
              <button type="submit" className={previewActionButtonClassName}>Save details</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudyDriveExplorer;
