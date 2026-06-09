import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, BookmarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { StudyResource } from '../../studyHubApi';
import {
  getLocalLibraryItem,
  saveLocalLibraryItem,
  toLocalLibraryItem,
  type LocalLibraryStatus,
} from '../../utils/studyLibrary';

interface SaveResourceButtonProps {
  resource: StudyResource;
  status?: LocalLibraryStatus;
  className?: string;
  label?: string;
  savedLabel?: string;
  icon?: 'bookmark' | 'download';
}

const SaveResourceButton = ({
  resource,
  status = 'saved',
  className = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100',
  label = 'Save',
  savedLabel = 'Saved',
  icon = 'bookmark',
}: SaveResourceButtonProps) => {
  const [isSaved, setSaved] = useState(false);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getLocalLibraryItem(resource.slug)
      .then((item) => {
        if (isMounted) setSaved(Boolean(item));
      })
      .catch(() => {
        if (isMounted) setSaved(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resource.slug]);

  const Icon = isSaved ? CheckIcon : icon === 'download' ? ArrowDownTrayIcon : BookmarkIcon;

  const handleSave = async () => {
    if (isSaving) return;
    setSaving(true);
    try {
      await saveLocalLibraryItem(toLocalLibraryItem(resource, status));
      setSaved(true);
      toast.success(status === 'downloaded' ? 'Added to Offline Vault' : 'Saved to Library');
    } catch (error) {
      toast.error('Could not save this resource');
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
      aria-pressed={isSaved}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {isSaved ? savedLabel : label}
    </button>
  );
};

export default SaveResourceButton;
