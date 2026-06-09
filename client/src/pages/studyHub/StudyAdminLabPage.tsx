import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  PhotoIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StudyAdminFileRow } from '../../components/study/StudyAdminControls';
import {
  getStudyCardVisual,
  getToneBadgeClass,
  studyIconOptions,
  type StudyIcon,
  type StudyTone,
} from '../../components/study/StudyVisualCards';
import {
  createAdminStudyCard,
  deleteAdminStudyIcon,
  deleteAdminStudyCard,
  fetchAdminStudyCard,
  fetchAdminStudyCards,
  fetchAdminStudyIcons,
  updateAdminStudyCard,
  uploadAdminStudyIcon,
  uploadAdminStudyCardFiles,
  type StudyCard,
  type StudyCardPayload,
  type StudyIconAsset,
} from '../../studyHubApi';
import { confirmAdminAction } from '../../utils/adminConfirm';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const ROOT_PARENT_VALUE = '__root__';
const objectIdPattern = /^[a-f\d]{24}$/i;

const cardStatusOptions: Array<StudyCard['status']> = ['published', 'draft', 'archived'];
const cardVisibilityOptions: Array<StudyCard['visibility']> = ['public', 'private', 'invite_only'];
const cardToneOptions: StudyTone[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'indigo', 'slate'];

type CardEditForm = {
  name: string;
  slug: string;
  parentId: string;
  logoValue: string;
  iconUrl: string;
  tone: StudyTone;
  order: string;
  status: StudyCard['status'];
  visibility: StudyCard['visibility'];
};

const panelClassName =
  'rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/5';

const inputClassName =
  'w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10';

const buttonClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-300 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-100';

type LogoOption = {
  value: string;
  key: string;
  label: string;
  tone: StudyTone;
  icon: StudyIcon;
  iconUrl?: string;
  source: 'built-in' | 'custom';
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const splitCardPath = (value: string) =>
  value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

const inferCardStyle = (name: string, mode: 'heading' | 'folder'): { iconKey: string; tone: StudyTone } => {
  if (mode === 'heading') return { iconKey: 'heading', tone: 'indigo' };

  const lower = name.toLowerCase();
  if (lower.includes('physics')) return { iconKey: 'physics', tone: 'blue' };
  if (lower.includes('chemistry')) return { iconKey: 'chemistry', tone: 'amber' };
  if (lower.includes('biology')) return { iconKey: 'biology', tone: 'emerald' };
  if (lower.includes('math')) return { iconKey: 'maths', tone: 'violet' };
  if (lower.includes('pyq') || lower.includes('paper')) return { iconKey: 'pyq', tone: 'violet' };
  if (lower.includes('note')) return { iconKey: 'notes', tone: 'blue' };
  if (lower.includes('book') || lower.includes('ncert')) return { iconKey: 'book', tone: 'emerald' };
  if (lower.includes('syllabus')) return { iconKey: 'syllabus', tone: 'amber' };
  if (lower.includes('practice') || lower.includes('mock') || lower.includes('dpp')) return { iconKey: 'practice', tone: 'indigo' };
  if (lower.includes('question') || lower.includes('interview')) return { iconKey: 'qa', tone: 'rose' };
  if (lower.includes('formula')) return { iconKey: 'formula', tone: 'violet' };
  if (lower.includes('mind')) return { iconKey: 'mindmap', tone: 'cyan' };
  return { iconKey: 'folder', tone: 'blue' };
};

const buildCardPayload = ({
  parentId,
  name,
  mode,
  logo,
}: {
  parentId: string | null;
  name: string;
  mode: 'heading' | 'folder';
  logo?: LogoOption;
}): StudyCardPayload => {
  const style = inferCardStyle(name, mode);
  return {
    workspaceSlug: PLATFORM_WORKSPACE_SLUG,
    parentId,
    name,
    slug: slugify(name),
    iconKey: logo?.key || style.iconKey,
    iconUrl: logo?.source === 'custom' ? logo.iconUrl || '' : '',
    tone: logo?.tone || style.tone,
    order: 0,
    status: 'published',
    visibility: 'public',
  };
};

const formatCount = (count: number, singular: string, plural = `${singular}s`) =>
  `${count.toLocaleString('en-IN')} ${count === 1 ? singular : plural}`;

const formatBytes = (sizeBytes?: number) => {
  if (!sizeBytes) return 'PDF';
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AdminActionPanel = ({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <section className={panelClassName}>
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const LogoPreview = ({ option, size = 'md' }: { option: LogoOption; size?: 'sm' | 'md' }) => {
  const Icon = option.icon;
  const sizeClass = size === 'sm' ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl';
  const iconClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const imageClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <span className={`flex shrink-0 items-center justify-center shadow-sm ${sizeClass} ${option.iconUrl ? 'bg-white text-slate-950 dark:bg-slate-950' : getToneBadgeClass(option.tone)}`}>
      {option.iconUrl ? (
        <img src={option.iconUrl} alt="" loading="lazy" className={`${imageClass} object-contain`} />
      ) : (
        <Icon className={iconClass} aria-hidden="true" />
      )}
    </span>
  );
};

const IconPicker = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: LogoOption[];
  disabled?: boolean;
}) => {
  const selected = (options.find((option) => option.value === value) || options[0]) as LogoOption;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-center gap-3">
        <LogoPreview option={selected} />
        <label className="min-w-0 flex-1">
          <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
          <select
            value={selected.value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-black text-white outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10 disabled:opacity-50"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};

const StudyAdminLabPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cardParam = searchParams.get('card') || '';
  const activeCardId = objectIdPattern.test(cardParam) ? cardParam : '';

  const [headingName, setHeadingName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [fileName, setFileName] = useState('');
  const [headingLogoValue, setHeadingLogoValue] = useState('built-in:heading');
  const [folderLogoValue, setFolderLogoValue] = useState('built-in:folder');
  const [iconLabel, setIconLabel] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconInputKey, setIconInputKey] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingCard, setEditingCard] = useState<StudyCard | null>(null);
  const [editForm, setEditForm] = useState<CardEditForm | null>(null);
  const [isCreatingHeading, setCreatingHeading] = useState(false);
  const [isCreatingFolder, setCreatingFolder] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isUploadingIcon, setUploadingIcon] = useState(false);
  const [isSavingEdit, setSavingEdit] = useState(false);

  const { data: rootCards = [] } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, 'root', 'lab-page'],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'root' }),
    placeholderData: [],
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const { data: activeCard } = useQuery({
    queryKey: ['admin-study-card', activeCardId],
    queryFn: () => fetchAdminStudyCard(activeCardId),
    enabled: Boolean(activeCardId),
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const { data: childCards = [] } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, activeCardId || 'root', 'lab-children'],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: activeCardId || 'root' }),
    placeholderData: [],
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const { data: allCards = [] } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, 'all', 'lab-page'],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'all' }),
    placeholderData: [],
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const { data: customIcons = [] } = useQuery({
    queryKey: ['admin-study-icons'],
    queryFn: fetchAdminStudyIcons,
    placeholderData: [],
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const logoOptions = useMemo<LogoOption[]>(() => {
    const builtIn = studyIconOptions.map((option) => ({
      value: `built-in:${option.key}`,
      key: option.key,
      label: option.label,
      tone: option.tone,
      icon: option.icon,
      iconUrl: option.iconUrl,
      source: 'built-in' as const,
    }));

    const custom = customIcons.map((asset: StudyIconAsset) => ({
      value: `custom:${asset.key}`,
      key: 'custom',
      label: asset.label,
      tone: 'cyan' as StudyTone,
      icon: PhotoIcon,
      iconUrl: asset.url,
      source: 'custom' as const,
    }));

    return [...builtIn, ...custom];
  }, [customIcons]);

  const selectedHeadingLogo = (logoOptions.find((option) => option.value === headingLogoValue) || logoOptions[0]) as LogoOption;
  const selectedFolderLogo = (logoOptions.find((option) => option.value === folderLogoValue) || logoOptions[1] || logoOptions[0]) as LogoOption;

  const cardById = useMemo(() => new Map(allCards.map((card) => [card._id, card])), [allCards]);

  const childCountByParentId = useMemo(() => {
    const counts = new Map<string, number>();
    allCards.forEach((card) => {
      const parentKey = card.parentId || ROOT_PARENT_VALUE;
      counts.set(parentKey, (counts.get(parentKey) || 0) + 1);
    });
    return counts;
  }, [allCards]);

  const getCardPath = (card: StudyCard | null | undefined) => {
    const path: StudyCard[] = [];
    const visited = new Set<string>();
    let current: StudyCard | null | undefined = card;

    while (current && !visited.has(current._id)) {
      visited.add(current._id);
      path.unshift(current);
      current = current.parentId ? cardById.get(current.parentId) : null;
    }

    return path;
  };

  const getCardPathLabel = (card: StudyCard) =>
    getCardPath(card).map((pathCard) => pathCard.name).join(' / ') || card.name;

  const sortedAllCards = allCards
    .slice()
    .sort((a, b) => getCardPathLabel(a).localeCompare(getCardPathLabel(b)) || a.name.localeCompare(b.name));

  const editingDescendantIds = useMemo(() => {
    if (!editingCard) return new Set<string>();

    const descendantIds = new Set<string>();
    let didAdd = true;
    while (didAdd) {
      didAdd = false;
      allCards.forEach((card) => {
        if (!card.parentId || descendantIds.has(card._id)) return;
        if (card.parentId === editingCard._id || descendantIds.has(card.parentId)) {
          descendantIds.add(card._id);
          didAdd = true;
        }
      });
    }

    return descendantIds;
  }, [allCards, editingCard]);

  const editableParentCards = sortedAllCards.filter(
    (card) => card._id !== editingCard?._id && !editingDescendantIds.has(card._id)
  );

  const editLogoOptions = useMemo(() => {
    if (!editingCard?.iconUrl) return logoOptions;
    const existingLogo = logoOptions.find((option) => option.iconUrl === editingCard.iconUrl);
    if (existingLogo) return logoOptions;

    const visual = getStudyCardVisual(editingCard.iconKey, editingCard.tone, editingCard.name);
    return [
      {
        value: `current:${editingCard._id}`,
        key: editingCard.iconKey || 'custom',
        label: 'Current custom image',
        tone: visual.tone,
        icon: PhotoIcon,
        iconUrl: editingCard.iconUrl,
        source: 'custom' as const,
      },
      ...logoOptions,
    ];
  }, [editingCard, logoOptions]);

  const refreshCards = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-icons'] }),
    ]);
  };

  const sortedRootCards = rootCards
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  const sortedChildCards = activeCard
    ? childCards.slice().sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
    : [];
  const files = activeCard?.files || [];

  const findOrCreateCard = async ({
    parentId,
    name,
    mode,
    logo,
  }: {
    parentId: string | null;
    name: string;
    mode: 'heading' | 'folder';
    logo?: LogoOption;
  }) => {
    const children = await fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: parentId || 'root' });
    const slug = slugify(name);
    const existing = children.find((card) => card.slug === slug || card.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    return createAdminStudyCard({
      ...buildCardPayload({ parentId, name, mode, logo }),
      order: children.length + 1,
    });
  };

  const handleCreateHeading = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = headingName.trim();
    if (!name || isCreatingHeading) return;

    setCreatingHeading(true);
    try {
      const created = await toast.promise(
        createAdminStudyCard(buildCardPayload({ parentId: null, name, mode: 'heading', logo: selectedHeadingLogo })),
        {
          loading: 'Creating heading...',
          success: 'Heading created',
          error: 'Heading create failed',
        }
      );
      setHeadingName('');
      setHeadingLogoValue('built-in:heading');
      await refreshCards();
      navigate(`/admin?card=${created._id}`, { replace: true });
    } finally {
      setCreatingHeading(false);
    }
  };

  const handleCreateFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pathParts = splitCardPath(folderName);
    if (!pathParts.length || isCreatingFolder) return;

    setCreatingFolder(true);
    try {
      const created = await toast.promise((async () => {
        let parentId = activeCard?._id || null;
        let targetCard: StudyCard | null = null;

        for (let index = 0; index < pathParts.length; index += 1) {
          const name = pathParts[index];
          const mode = parentId ? 'folder' : 'heading';
          const isLast = index === pathParts.length - 1;
          const logo = isLast ? (mode === 'heading' ? selectedHeadingLogo : selectedFolderLogo) : undefined;

          targetCard = await findOrCreateCard({ parentId, name, mode, logo });
          parentId = targetCard._id;
        }

        if (!targetCard) {
          throw new Error('No folder path was created.');
        }

        return targetCard;
      })(), {
        loading: activeCard ? 'Creating nested path...' : 'Creating heading path...',
        success: 'Path ready',
        error: 'Path create failed',
      });
      setFolderName('');
      setFolderLogoValue('built-in:folder');
      await refreshCards();
      navigate(`/admin?card=${created._id}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUploadFiles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCard) {
      toast.error('Select a heading or folder first.');
      return;
    }
    if (!selectedFiles.length || isUploading) {
      toast.error('Select at least one PDF file.');
      return;
    }

    setUploading(true);
    try {
      const names = selectedFiles.map((file, index) => (index === 0 ? fileName.trim() : '') || file.name.replace(/\.[^/.]+$/, ''));
      await toast.promise(uploadAdminStudyCardFiles(activeCard._id, selectedFiles, names), {
        loading: 'Uploading files...',
        success: 'Files uploaded',
        error: 'Upload failed',
      });
      setFileName('');
      setSelectedFiles([]);
      setFileInputKey((current) => current + 1);
      await refreshCards();
    } finally {
      setUploading(false);
    }
  };

  const handleUploadIcon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = iconLabel.trim();
    if (!label || !iconFile || isUploadingIcon) {
      toast.error('Add icon name and file.');
      return;
    }

    setUploadingIcon(true);
    try {
      const created = await toast.promise(uploadAdminStudyIcon(label, iconFile), {
        loading: 'Uploading logo...',
        success: 'Logo added',
        error: 'Logo upload failed',
      });
      setIconLabel('');
      setIconFile(null);
      setIconInputKey((current) => current + 1);
      setFolderLogoValue(`custom:${created.key}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-study-icons'] });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleDeleteIcon = async (asset: StudyIconAsset) => {
    const confirmed = await confirmAdminAction({
      title: 'Delete logo?',
      message: `Delete "${asset.label}" logo? Existing cards will keep the saved image URL.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    await toast.promise(deleteAdminStudyIcon(asset._id), {
      loading: 'Deleting logo...',
      success: 'Logo deleted',
      error: 'Delete failed',
    });
    if (headingLogoValue === `custom:${asset.key}`) setHeadingLogoValue('built-in:heading');
    if (folderLogoValue === `custom:${asset.key}`) setFolderLogoValue('built-in:folder');
    await queryClient.invalidateQueries({ queryKey: ['admin-study-icons'] });
  };

  const startEditingCard = (card: StudyCard) => {
    const matchingLogo = card.iconUrl
      ? logoOptions.find((option) => option.iconUrl === card.iconUrl)
      : logoOptions.find((option) => option.key === card.iconKey && option.source === 'built-in');

    setEditingCard(card);
    setEditForm({
      name: card.name,
      slug: card.slug || slugify(card.name),
      parentId: card.parentId || ROOT_PARENT_VALUE,
      logoValue: matchingLogo?.value || (card.iconUrl ? `current:${card._id}` : 'built-in:folder'),
      iconUrl: card.iconUrl || '',
      tone: card.tone || 'blue',
      order: String(card.order || 0),
      status: card.status || 'published',
      visibility: card.visibility || 'public',
    });
  };

  const handleEditLogoChange = (value: string) => {
    const selected = editLogoOptions.find((option) => option.value === value);
    setEditForm((current) => current
      ? {
        ...current,
        logoValue: value,
        iconUrl: selected?.source === 'custom' ? selected.iconUrl || '' : '',
        tone: selected?.tone || current.tone,
      }
      : current);
  };

  const handleSaveCardEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCard || !editForm || isSavingEdit) return;

    const name = editForm.name.trim();
    if (!name) {
      toast.error('Card name is required.');
      return;
    }

    const selectedLogo = editLogoOptions.find((option) => option.value === editForm.logoValue);
    const nextParentId = editForm.parentId === ROOT_PARENT_VALUE ? null : editForm.parentId;
    const cleanIconUrl = editForm.iconUrl.trim();
    const inferred = inferCardStyle(name, nextParentId ? 'folder' : 'heading');
    const iconKey = cleanIconUrl ? 'custom' : selectedLogo?.key || inferred.iconKey;

    setSavingEdit(true);
    try {
      await toast.promise(updateAdminStudyCard(editingCard._id, {
        workspaceSlug: PLATFORM_WORKSPACE_SLUG,
        parentId: nextParentId,
        name,
        slug: slugify(editForm.slug || name),
        iconKey,
        iconUrl: cleanIconUrl,
        tone: editForm.tone || selectedLogo?.tone || inferred.tone,
        order: Math.max(0, Number(editForm.order) || 0),
        status: editForm.status,
        visibility: editForm.visibility,
      }), {
        loading: 'Saving card...',
        success: 'Card updated',
        error: 'Card update failed',
      });
      setEditingCard(null);
      setEditForm(null);
      await refreshCards();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCard = async (card: StudyCard) => {
    const confirmed = await confirmAdminAction({
      title: 'Delete card?',
      message: `Delete "${card.name}" and all nested content? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    await toast.promise(deleteAdminStudyCard(card._id), {
      loading: 'Deleting...',
      success: 'Deleted',
      error: 'Delete failed',
    });
    if (editingCard?._id === card._id) {
      setEditingCard(null);
      setEditForm(null);
    }
    await refreshCards();

    if (activeCardId === card._id) {
      navigate(card.parentId ? `/admin?card=${card.parentId}` : '/admin', { replace: true });
    }
  };

  return (
    <div className="space-y-5">
      <section className={panelClassName}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Content Builder</p>
            <h1 className="mt-1 text-2xl font-black text-white">Cards, folders, and files</h1>
          </div>
          <Link
            to="/app"
            className={secondaryButtonClassName}
          >
            Student view
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className={panelClassName}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Headings</p>
              <h2 className="text-lg font-black text-white">{formatCount(sortedRootCards.length, 'heading')}</h2>
            </div>
            <Squares2X2Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            {sortedRootCards.length ? (
              sortedRootCards.map((card) => {
                const isActive = activeCardId === card._id;
                const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
                const option: LogoOption = {
                  value: card.iconUrl ? `custom:${card._id}` : `built-in:${card.iconKey}`,
                  key: card.iconKey || 'folder',
                  label: card.name,
                  tone: visual.tone,
                  icon: visual.icon,
                  iconUrl: card.iconUrl || visual.iconUrl,
                  source: card.iconUrl ? 'custom' : 'built-in',
                };
                return (
                  <Link
                    key={card._id}
                    to={`/admin?card=${card._id}`}
                    className={[
                      'flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-sm font-black transition',
                      isActive
                        ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                        : 'border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white',
                    ].join(' ')}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <LogoPreview option={option} size="sm" />
                      <span className="truncate">{card.name}</span>
                    </span>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm font-semibold text-slate-500">
                No headings yet.
              </p>
            )}
          </div>
        </aside>

        <div className="space-y-5">
          <section className={panelClassName}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Selected location</p>
                <h2 className="mt-1 truncate text-2xl font-black text-white">
                  {activeCard?.name || 'Select a heading'}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  {activeCard ? `${formatCount(sortedChildCards.length, 'folder')} / ${formatCount(files.length, 'file')}` : 'Create a heading or choose one from the left.'}
                </p>
                {activeCard && (
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-cyan-200/80">
                    {getCardPath(activeCard).map((card) => card.name).join(' / ')}
                  </p>
                )}
              </div>

              {activeCard && (
                <div className="flex flex-wrap gap-2">
                  {activeCard.parentId && (
                    <Link to={`/admin?card=${activeCard.parentId}`} className={secondaryButtonClassName}>
                      <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                      Parent
                    </Link>
                  )}
                  <Link
                    to={`/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${activeCard._id}`}
                    className={secondaryButtonClassName}
                  >
                    Preview
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEditingCard(activeCard)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-500"
                    aria-label={`Edit ${activeCard.name}`}
                  >
                    <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(activeCard)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white transition hover:bg-red-500"
                    aria-label={`Delete ${activeCard.name}`}
                  >
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Jump to any level</span>
              <select
                value={activeCardId}
                onChange={(event) => {
                  const nextCardId = event.target.value;
                  navigate(nextCardId ? `/admin?card=${nextCardId}` : '/admin');
                }}
                className={inputClassName}
              >
                <option value="">Study Hub home</option>
                {sortedAllCards.map((card) => (
                  <option key={card._id} value={card._id}>
                    {getCardPathLabel(card)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <AdminActionPanel
              icon={<PlusIcon className="h-5 w-5" aria-hidden="true" />}
              title="Create heading"
              subtitle="Top-level catalog section"
            >
              <form onSubmit={handleCreateHeading} className="space-y-3">
                <input
                  value={headingName}
                  onChange={(event) => setHeadingName(event.target.value)}
                  placeholder="GATE CSE"
                  className={inputClassName}
                  maxLength={180}
                />
                <IconPicker
                  label="Logo"
                  value={selectedHeadingLogo.value}
                  onChange={setHeadingLogoValue}
                  options={logoOptions}
                />
                <button type="submit" disabled={!headingName.trim() || isCreatingHeading} className={buttonClassName}>
                  {isCreatingHeading ? 'Creating...' : 'Create heading'}
                </button>
              </form>
            </AdminActionPanel>

            <AdminActionPanel
              icon={<FolderPlusIcon className="h-5 w-5" aria-hidden="true" />}
              title="Create folder path"
              subtitle={activeCard ? `Inside ${activeCard.name}` : 'Start from Study Hub home'}
            >
              <form onSubmit={handleCreateFolder} className="space-y-3">
                <input
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder={activeCard ? 'Prelims / GS / Polity' : 'UPSC CSE / Prelims / GS'}
                  className={inputClassName}
                  maxLength={700}
                />
                <IconPicker
                  label="Last folder logo"
                  value={selectedFolderLogo.value}
                  onChange={setFolderLogoValue}
                  options={logoOptions}
                />
                <button type="submit" disabled={!folderName.trim() || isCreatingFolder} className={buttonClassName}>
                  {isCreatingFolder ? 'Creating...' : 'Create path'}
                </button>
              </form>
            </AdminActionPanel>

            <AdminActionPanel
              icon={<ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />}
              title="Upload PDFs"
              subtitle={activeCard ? `Upload to ${activeCard.name}` : 'Select a location first'}
            >
              <form onSubmit={handleUploadFiles} className="space-y-3">
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="Display name"
                  className={inputClassName}
                  disabled={!activeCard}
                  maxLength={180}
                />
                <input
                  key={fileInputKey}
                  type="file"
                  multiple
                  accept="application/pdf"
                  disabled={!activeCard}
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-bold text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white disabled:opacity-50"
                />
                {selectedFiles.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    {selectedFiles.slice(0, 4).map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-slate-500">{formatBytes(file.size)}</span>
                      </div>
                    ))}
                    {selectedFiles.length > 4 && (
                      <p className="text-xs font-bold text-slate-500">+{selectedFiles.length - 4} more</p>
                    )}
                  </div>
                )}
                <button type="submit" disabled={!activeCard || !selectedFiles.length || isUploading} className={buttonClassName}>
                  {isUploading ? 'Uploading...' : selectedFiles.length ? `Upload ${selectedFiles.length}` : 'Upload files'}
                </button>
              </form>
            </AdminActionPanel>
          </div>

          {editingCard && editForm && (
            <section className={panelClassName}>
              <form onSubmit={handleSaveCardEdit} className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-cyan-300">Full access editor</p>
                    <h2 className="mt-1 text-lg font-black text-white">Edit {editingCard.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Move, rename, publish, hide, reorder, or change logo for this folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCard(null);
                      setEditForm(null);
                    }}
                    className={secondaryButtonClassName}
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Name</span>
                    <input
                      value={editForm.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setEditForm((current) => current
                          ? { ...current, name, slug: current.slug || slugify(name) }
                          : current);
                      }}
                      className={inputClassName}
                      maxLength={140}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Slug</span>
                    <input
                      value={editForm.slug}
                      onChange={(event) => setEditForm((current) => current ? { ...current, slug: slugify(event.target.value) } : current)}
                      className={inputClassName}
                      maxLength={90}
                      required
                    />
                  </label>

                  <label className="block lg:col-span-2">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Parent location</span>
                    <select
                      value={editForm.parentId}
                      onChange={(event) => setEditForm((current) => current ? { ...current, parentId: event.target.value } : current)}
                      className={inputClassName}
                    >
                      <option value={ROOT_PARENT_VALUE}>Study Hub home</option>
                      {editableParentCards.map((card) => (
                        <option key={card._id} value={card._id}>
                          {getCardPathLabel(card)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <IconPicker
                    label="Logo"
                    value={editForm.logoValue}
                    onChange={handleEditLogoChange}
                    options={editLogoOptions}
                  />

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Custom logo URL</span>
                    <input
                      value={editForm.iconUrl}
                      onChange={(event) => setEditForm((current) => current ? { ...current, iconUrl: event.target.value } : current)}
                      placeholder="https://..."
                      className={inputClassName}
                      maxLength={900}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Tone</span>
                    <select
                      value={editForm.tone}
                      onChange={(event) => setEditForm((current) => current ? { ...current, tone: event.target.value as StudyTone } : current)}
                      className={inputClassName}
                    >
                      {cardToneOptions.map((tone) => (
                        <option key={tone} value={tone}>{tone}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Order</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.order}
                      onChange={(event) => setEditForm((current) => current ? { ...current, order: event.target.value } : current)}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Status</span>
                    <select
                      value={editForm.status}
                      onChange={(event) => setEditForm((current) => current ? { ...current, status: event.target.value as StudyCard['status'] } : current)}
                      className={inputClassName}
                    >
                      {cardStatusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Visibility</span>
                    <select
                      value={editForm.visibility}
                      onChange={(event) => setEditForm((current) => current ? { ...current, visibility: event.target.value as StudyCard['visibility'] } : current)}
                      className={inputClassName}
                    >
                      {cardVisibilityOptions.map((visibility) => (
                        <option key={visibility} value={visibility}>{visibility}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={isSavingEdit || !editForm.name.trim()} className={buttonClassName}>
                    {isSavingEdit ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(editingCard)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-500"
                  >
                    <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    Delete tree
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className={panelClassName}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <PhotoIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">Logo library</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Upload licensed SVG, PNG, JPG, or WebP icons.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
              <form onSubmit={handleUploadIcon} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
                <input
                  value={iconLabel}
                  onChange={(event) => setIconLabel(event.target.value)}
                  placeholder="Logo name"
                  className={inputClassName}
                  maxLength={80}
                />
                <input
                  key={iconInputKey}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  onChange={(event) => setIconFile(event.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-bold text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
                />
                {iconFile && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-300">
                    <span className="truncate">{iconFile.name}</span>
                    <span className="shrink-0 text-slate-500">{formatBytes(iconFile.size)}</span>
                  </div>
                )}
                <button type="submit" disabled={!iconLabel.trim() || !iconFile || isUploadingIcon} className={buttonClassName}>
                  <CloudArrowUpIcon className="h-4 w-4" aria-hidden="true" />
                  {isUploadingIcon ? 'Uploading...' : 'Add logo'}
                </button>
              </form>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
                {customIcons.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {customIcons.map((asset) => {
                      const option: LogoOption = {
                        value: `custom:${asset.key}`,
                        key: 'custom',
                        label: asset.label,
                        tone: 'cyan',
                        icon: PhotoIcon,
                        iconUrl: asset.url,
                        source: 'custom',
                      };

                      return (
                        <article key={asset._id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                          <LogoPreview option={option} size="sm" />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-black text-white">{asset.label}</h3>
                            <p className="text-xs font-bold text-slate-500">Custom logo</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteIcon(asset)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-500"
                            aria-label={`Delete ${asset.label}`}
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-700 p-6 text-center">
                    <PhotoIcon className="mx-auto h-9 w-9 text-slate-500" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      Built-in logos are ready. Custom logos will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className={panelClassName}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Folders</p>
                  <h2 className="text-lg font-black text-white">{activeCard?.name || 'No location selected'}</h2>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">
                  {sortedChildCards.length}
                </span>
              </div>

              {sortedChildCards.length ? (
                <div className="space-y-3">
                  {sortedChildCards.map((card) => {
                    const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
                    const option: LogoOption = {
                      value: card.iconUrl ? `custom:${card._id}` : `built-in:${card.iconKey}`,
                      key: card.iconKey || 'folder',
                      label: card.name,
                      tone: visual.tone,
                      icon: visual.icon,
                      iconUrl: card.iconUrl || visual.iconUrl,
                      source: card.iconUrl ? 'custom' : 'built-in',
                    };
                    return (
                      <article key={card._id} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-start gap-3">
                          <LogoPreview option={option} />
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-sm font-black text-white">{card.name}</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {formatCount(childCountByParentId.get(card._id) || card.childCount || 0, 'folder')} / {formatCount(card.files?.length || 0, 'file')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link to={`/admin?card=${card._id}`} className={buttonClassName}>
                            Manage
                          </Link>
                          <button
                            type="button"
                            onClick={() => startEditingCard(card)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-500"
                            aria-label={`Edit ${card.name}`}
                          >
                            <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white transition hover:bg-red-500"
                            aria-label={`Delete ${card.name}`}
                          >
                            <TrashIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 p-6 text-center">
                  <FolderOpenIcon className="mx-auto h-9 w-9 text-slate-500" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {activeCard ? 'No folders here.' : 'Select a heading first.'}
                  </p>
                </div>
              )}
            </section>

            <section className={panelClassName}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Files</p>
                  <h2 className="text-lg font-black text-white">{activeCard?.name || 'No location selected'}</h2>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">
                  {files.length}
                </span>
              </div>

              {activeCard && files.length ? (
                <div className="space-y-2">
                  {files.map((file) => (
                    <StudyAdminFileRow
                      key={file._id}
                      cardId={activeCard._id}
                      file={file}
                      onChanged={refreshCards}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 p-6 text-center">
                  <DocumentTextIcon className="mx-auto h-9 w-9 text-slate-500" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {activeCard ? 'No files here.' : 'Select a heading or folder first.'}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyAdminLabPage;
