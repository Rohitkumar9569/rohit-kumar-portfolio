import toast from 'react-hot-toast';

type AdminConfirmTone = 'default' | 'danger';

type AdminConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AdminConfirmTone;
};

export const confirmAdminAction = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
}: AdminConfirmOptions) => new Promise<boolean>((resolve) => {
  let settled = false;
  let toastId = '';

  const settle = (value: boolean) => {
    if (settled) return;
    settled = true;
    toast.dismiss(toastId);
    resolve(value);
  };

  toastId = toast.custom((toastInstance) => (
    <div
      className={[
        'w-[min(92vw,28rem)] rounded-[1.35rem] border border-white/[0.12] bg-[#121412]/96 p-4 text-[#f3f3f3] shadow-[0_28px_80px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition duration-200',
        toastInstance.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
      ].join(' ')}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <p className="text-sm font-black text-white">{title}</p>
      {message && <p className="mt-1 text-xs font-semibold leading-5 text-[#b9b9b9]">{message}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => settle(false)}
          className="min-h-10 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-[#d8d8d8] transition hover:bg-white/[0.10] active:scale-[0.99]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => settle(true)}
          className={[
            'min-h-10 rounded-xl border px-3 text-sm font-black transition active:scale-[0.99]',
            tone === 'danger'
              ? 'border-rose-300/25 bg-rose-400/16 text-[#ffb5c2] hover:bg-rose-400/22'
              : 'border-cyan-200/25 bg-[#5fd0ff] text-[#071014] hover:bg-[#8ddeff]',
          ].join(' ')}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  ), {
    duration: Infinity,
    position: 'top-center',
  });
});
