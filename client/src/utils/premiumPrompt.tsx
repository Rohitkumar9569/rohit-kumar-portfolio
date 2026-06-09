import toast from 'react-hot-toast';

type PremiumTextPromptOptions = {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
};

export const requestPremiumTextInput = ({
  title,
  message,
  initialValue = '',
  placeholder = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  maxLength = 160,
}: PremiumTextPromptOptions): Promise<string | null> => new Promise((resolve) => {
  let nextValue = initialValue;
  let toastId = '';

  const settle = (value: string | null) => {
    toast.dismiss(toastId);
    resolve(value);
  };

  toastId = toast.custom(
    (toastState) => (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-text-prompt-title"
        className={[
          'w-[min(calc(100vw-2rem),24rem)] rounded-3xl border p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl',
          'border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white',
          toastState.visible ? 'animate-in fade-in zoom-in-95' : 'animate-out fade-out zoom-out-95',
        ].join(' ')}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            settle(nextValue.trim());
          }}
        >
          <div className="space-y-1">
            <h2 id="premium-text-prompt-title" className="text-base font-black">
              {title}
            </h2>
            {message ? (
              <p className="text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {message}
              </p>
            ) : null}
          </div>

          <input
            autoFocus
            defaultValue={initialValue}
            placeholder={placeholder}
            maxLength={maxLength}
            onChange={(event) => {
              nextValue = event.currentTarget.value;
            }}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => settle(null)}
              className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-black text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    ),
    { duration: Infinity }
  );
});
