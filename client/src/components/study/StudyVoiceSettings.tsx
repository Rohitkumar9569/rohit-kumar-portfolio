import { useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  LanguageIcon,
  PlayCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import {
  maxStudyVoiceRate,
  minStudyVoiceRate,
  studyVoiceProfiles,
  type StudyVoiceProfileId,
} from '../../utils/studyVoicePreferences';

interface StudyVoiceSettingsProps {
  voiceProfileId: StudyVoiceProfileId;
  voiceRate: number;
  previewingVoiceProfileId?: StudyVoiceProfileId | '';
  defaultOpen?: boolean;
  onVoiceProfileChange: (id: StudyVoiceProfileId) => void;
  onVoiceRateChange: (rate: number) => void;
  onVoicePreview?: (id: StudyVoiceProfileId) => void;
}

const ratePresets = [
  { label: 'Slow', value: 0.85 },
  { label: 'Natural', value: 0.94 },
  { label: 'Fast', value: 1.04 },
];

const StudyVoiceSettings = ({
  voiceProfileId,
  voiceRate,
  previewingVoiceProfileId = '',
  defaultOpen = false,
  onVoiceProfileChange,
  onVoiceRateChange,
  onVoicePreview,
}: StudyVoiceSettingsProps) => {
  const [isOpen, setOpen] = useState(defaultOpen);
  const activeProfile = studyVoiceProfiles.find((profile) => profile.id === voiceProfileId) || studyVoiceProfiles[0];
  const curatedVoiceCount = studyVoiceProfiles.length;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="study-control-surface group flex w-full items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
        aria-expanded={isOpen}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 shadow-sm transition group-hover:scale-105 dark:bg-cyan-300/10 dark:text-cyan-100">
          <SpeakerWaveIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Voice
          </span>
          <span className="mt-0.5 block truncate text-sm font-black text-slate-950 dark:text-white">
            {activeProfile.shortLabel} - {voiceRate.toFixed(2)}x
          </span>
        </span>
        <span className="hidden rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-black text-cyan-700 shadow-sm dark:bg-cyan-300/10 dark:text-cyan-100 sm:inline-flex">
          {curatedVoiceCount} voices
        </span>
        <ChevronDownIcon
          className={['h-5 w-5 shrink-0 transition duration-300', isOpen ? 'rotate-180 text-cyan-700 dark:text-cyan-200' : ''].join(' ')}
          aria-hidden="true"
        />
      </button>

      <div
        className={[
          'grid transition-all duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        ].join(' ')}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="study-panel-surface mt-3 max-w-full overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white/68 p-3 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Voice model
                </p>
                <p className="mt-0.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                  Tap play to test
                </p>
              </div>
              <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-100">
                {curatedVoiceCount} voices
              </span>
            </div>

            <div className="study-scrollbar study-voice-scrollbar grid max-h-[min(42vh,19rem)] max-w-full gap-2 overflow-y-auto overflow-x-hidden pr-1">
              {studyVoiceProfiles.map((profile) => {
                const isSelected = profile.id === voiceProfileId;
                const isPreviewing = previewingVoiceProfileId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className={[
                      'group flex min-h-12 w-full min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-left transition-all duration-200',
                      isSelected
                        ? 'bg-cyan-100/95 text-slate-950 shadow-[0_14px_30px_rgba(8,132,160,0.18)] ring-1 ring-cyan-300/70 dark:bg-[#10323a] dark:text-white dark:shadow-[0_14px_34px_rgba(8,145,178,0.20)] dark:ring-cyan-300/35'
                        : 'bg-white/70 text-slate-700 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:bg-white/[0.055] dark:text-slate-300 dark:hover:bg-white/[0.09] dark:hover:text-white',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => onVoiceProfileChange(profile.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-black">{profile.label}</span>
                      <span className={['mt-0.5 block truncate text-[11px] font-bold', isSelected ? 'text-cyan-800 dark:text-cyan-100' : 'text-slate-400 dark:text-slate-500'].join(' ')}>
                        {profile.description}
                      </span>
                    </button>
                    {onVoicePreview && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onVoicePreview(profile.id);
                        }}
                        className={[
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition',
                          isSelected
                            ? 'bg-cyan-600 text-white shadow-[0_8px_18px_rgba(8,132,160,0.22)] hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200'
                            : 'bg-slate-50 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-cyan-300/10 dark:hover:text-cyan-100',
                        ].join(' ')}
                        aria-label={`${isPreviewing ? 'Stop' : 'Preview'} ${profile.label}`}
                        title={`${isPreviewing ? 'Stop' : 'Preview'} voice`}
                      >
                        {isPreviewing ? (
                          <SpeakerXMarkIcon className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    )}
                    <span
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-cyan-500/40 bg-cyan-600 text-white shadow-[0_8px_18px_rgba(8,132,160,0.18)] dark:border-cyan-200/60 dark:bg-cyan-300 dark:text-slate-950'
                          : 'border-slate-200 bg-slate-50 text-transparent dark:border-white/10 dark:bg-white/[0.04]',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50/80 p-3 dark:bg-white/[0.045]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Speed
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-cyan-700 shadow-sm dark:bg-white/[0.08] dark:text-cyan-100">
                  {voiceRate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={minStudyVoiceRate}
                max={maxStudyVoiceRate}
                step={0.01}
                value={voiceRate}
                onChange={(event) => onVoiceRateChange(Number(event.target.value))}
                onInput={(event) => onVoiceRateChange(Number((event.target as HTMLInputElement).value))}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                onTouchEnd={(event) => event.stopPropagation()}
                className="mt-3 h-3 w-full cursor-pointer touch-pan-y rounded-full accent-cyan-600"
                aria-label="Voice speed"
                style={{ minWidth: 0, width: '100%', touchAction: 'pan-y' }}
              />
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {ratePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onVoiceRateChange(preset.value)}
                    className={[
                      'rounded-xl px-2 py-2 text-[11px] font-black transition',
                      Math.abs(voiceRate - preset.value) < 0.015
                        ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-700/15 dark:bg-cyan-300/18 dark:text-cyan-50 dark:ring-1 dark:ring-cyan-100/10'
                        : 'bg-white/72 text-slate-500 hover:bg-white hover:text-slate-950 dark:bg-white/[0.055] dark:text-slate-400 dark:hover:bg-white/[0.09] dark:hover:text-white',
                    ].join(' ')}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-cyan-50/80 px-3 py-2 text-xs font-bold text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-100">
              <LanguageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">Auto: Hinglish / Hindi / English</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyVoiceSettings;
