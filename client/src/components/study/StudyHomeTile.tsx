import {
  getStudyTileMetaChips,
  StudyTileMetaChipRow,
  type StudyIcon,
  type StudyTileMetaInput,
  type StudyTone,
} from './StudyVisualCards';

const studyHomeToneAccents: Record<StudyTone, { bar: string; text: string }> = {
  blue: {
    bar: 'from-sky-500 via-cyan-300 to-slate-200',
    text: 'text-sky-950 dark:text-sky-50',
  },
  violet: {
    bar: 'from-violet-500 via-fuchsia-300 to-slate-200',
    text: 'text-violet-950 dark:text-violet-50',
  },
  emerald: {
    bar: 'from-emerald-500 via-teal-300 to-slate-200',
    text: 'text-emerald-950 dark:text-emerald-50',
  },
  amber: {
    bar: 'from-amber-500 via-orange-300 to-slate-200',
    text: 'text-amber-950 dark:text-amber-50',
  },
  rose: {
    bar: 'from-rose-500 via-pink-300 to-slate-200',
    text: 'text-rose-950 dark:text-rose-50',
  },
  cyan: {
    bar: 'from-cyan-500 via-sky-300 to-slate-200',
    text: 'text-cyan-950 dark:text-cyan-50',
  },
  indigo: {
    bar: 'from-indigo-500 via-blue-300 to-slate-200',
    text: 'text-indigo-950 dark:text-indigo-50',
  },
  slate: {
    bar: 'from-slate-600 via-slate-300 to-white',
    text: 'text-slate-950 dark:text-slate-50',
  },
};

export const studyHomeTileClassName =
  'study-card-surface group relative flex h-40 w-full flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white p-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.095)] ring-1 ring-slate-950/[0.035] focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_42px_rgba(0,0,0,0.38)] dark:ring-white/5 sm:h-[10.25rem] sm:p-3 lg:h-[10.5rem]';

export const studyHomeFloatingActionClassName =
  'study-save-action absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/80 bg-white/85 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.16)] backdrop-blur-md aria-pressed:border-cyan-200 aria-pressed:bg-cyan-50 aria-pressed:text-cyan-800 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-100 dark:hover:border-cyan-300/30 dark:hover:bg-cyan-400/15 dark:aria-pressed:border-cyan-300/35 dark:aria-pressed:bg-cyan-400/20 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8';

export const StudyHomeTileContent = ({
  icon: Icon,
  tone,
  title,
  meta,
  showMeta = false,
  iconUrl,
  sourceName,
  sourceType,
  year,
  stage,
  paper,
}: {
  icon: StudyIcon;
  tone: StudyTone;
  title: string;
  meta: string;
  showMeta?: boolean;
  iconUrl?: string;
} & StudyTileMetaInput) => {
  const accent = studyHomeToneAccents[tone] || studyHomeToneAccents.slate;
  const metaChips = getStudyTileMetaChips({ sourceName, sourceType, year, stage, paper }).slice(0, 1);

  return (
    <>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
      <StudyTileMetaChipRow
        chips={metaChips}
        className="absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)]"
      />
      <div className="flex flex-1 flex-col items-center justify-center pb-4 pt-2 text-center sm:pb-3">
        <span className="relative flex h-[6rem] w-[6.35rem] items-center justify-center sm:h-[6.25rem] sm:w-[6.65rem] lg:h-[6.45rem] lg:w-[6.85rem]">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              loading="lazy"
              className="study-icon-asset study-tile-icon-asset relative z-10 h-[5.25rem] w-[5.25rem] object-contain sm:h-[5.55rem] sm:w-[5.55rem] lg:h-[5.85rem] lg:w-[5.85rem]"
            />
          ) : (
            <Icon
              className="relative z-10 h-[3.9rem] w-[3.9rem] text-slate-700 dark:text-slate-200 sm:h-[4.25rem] sm:w-[4.25rem] lg:h-[4.45rem] lg:w-[4.45rem]"
              aria-hidden="true"
            />
          )}
        </span>
        <h3 className={`mt-0 line-clamp-2 break-words text-center text-[13px] font-black leading-tight sm:text-sm ${accent.text}`}>
          {title}
        </h3>
        {showMeta && meta && (
          <p className="mt-1 max-w-full truncate text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-[11px]">
            {meta}
          </p>
        )}
      </div>
    </>
  );
};
