import { useEffect, useState, type MouseEvent } from 'react';
import toast from 'react-hot-toast';
import { BookmarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import {
  getLocalLibraryItem,
  removeLocalLibraryItem,
  saveLocalLibraryItem,
  STUDY_LIBRARY_UPDATE_EVENT,
  type LocalLibraryItem,
} from '../../utils/studyLibrary';

interface SaveLibraryItemButtonProps {
  item: LocalLibraryItem;
  className?: string;
  label?: string;
  savedLabel?: string;
  iconOnly?: boolean;
}

const defaultClassName =
  'study-control-surface inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 aria-pressed:border-cyan-200 aria-pressed:bg-cyan-50 aria-pressed:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-cyan-300/30 dark:hover:bg-white/[0.09] dark:aria-pressed:border-cyan-300/30 dark:aria-pressed:bg-cyan-400/15 dark:aria-pressed:text-cyan-100';

const SaveLibraryItemButton = ({
  item,
  className = defaultClassName,
  label = 'Save',
  savedLabel = 'Saved',
  iconOnly = false,
}: SaveLibraryItemButtonProps) => {
  const [isSaved, setSaved] = useState(false);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const refreshSavedState = () => {
      getLocalLibraryItem(item.slug)
      .then((savedItem) => {
        if (isMounted) setSaved(Boolean(savedItem));
      })
      .catch(() => {
        if (isMounted) setSaved(false);
      });
    };

    refreshSavedState();
    window.addEventListener(STUDY_LIBRARY_UPDATE_EVENT, refreshSavedState);

    return () => {
      isMounted = false;
      window.removeEventListener(STUDY_LIBRARY_UPDATE_EVENT, refreshSavedState);
    };
  }, [item.slug]);

  const Icon = isSaved ? CheckIcon : BookmarkIcon;

  const handleSave = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isSaving) return;
    setSaving(true);

    try {
      if (isSaved) {
        await removeLocalLibraryItem(item.slug);
        setSaved(false);
        toast.success('Removed from Library');
        return;
      }

      await saveLocalLibraryItem(item);
      setSaved(true);
      toast.success('Saved to Library');
    } catch {
      toast.error(isSaved ? 'Could not remove this card' : 'Could not save this card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSaving}
      className={className}
      aria-label={isSaved ? savedLabel : label}
      aria-pressed={isSaved}
      title={isSaved ? savedLabel : label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {!iconOnly && <span>{isSaved ? savedLabel : label}</span>}
    </button>
  );
};

export default SaveLibraryItemButton;
