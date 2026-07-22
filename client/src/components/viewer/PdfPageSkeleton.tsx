import { memo, useEffect, useState } from 'react';

interface PdfPageSkeletonProps {
  pageWidth?: number;
  pageHeight?: number;
}

const PdfPageSkeleton = memo(({ pageWidth, pageHeight }: PdfPageSkeletonProps) => {
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') return { w: 900, h: 1180 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = pageWidth ?? Math.min(vw - 48, 1180);
    // ✅ Full height — container ki poori vertical space use karo
    const h = pageHeight ?? Math.max(w * 1.414, vh - 90);
    return { w, h };
  });

  useEffect(() => {
    if (pageWidth && pageHeight) {
      setDimensions({ w: pageWidth, h: pageHeight });
      return;
    }
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = vw < 640 ? vw - 16 : Math.min(vw - 48, 1180);
      // ✅ Height = max(A4 ratio, container height) → always fills space
      const h = Math.max(w * 1.414, vh - 90);
      setDimensions({ w, h });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [pageWidth, pageHeight]);

  const { w, h } = dimensions;
  const p = Math.round(w * 0.075);
  const lh = Math.max(11, Math.round(h * 0.012));
  const lg = Math.max(9, Math.round(h * 0.0095));
  const bg = Math.max(18, Math.round(h * 0.024));

  return (
    <div className="flex w-full justify-center px-2 py-2 md:px-6 md:py-4">
      <div
        className="
          relative overflow-hidden rounded-xl sm:rounded-2xl
          border border-slate-200/60
          bg-white/60 backdrop-blur-sm
          shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15),0_8px_20px_-8px_rgba(15,23,42,0.08)]
          dark:border-white/[0.06]
          dark:bg-white/[0.025]
          dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.5),0_10px_24px_-10px_rgba(0,0,0,0.35)]
        "
        style={{ width: w, height: h, maxWidth: '100%' }}
      >
        {/* Top glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-60"
          style={{
            background:
              'radial-gradient(80% 100% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Shimmer */}
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-70 dark:opacity-100"
          style={{
            background:
              'linear-gradient(105deg, transparent 32%, rgba(148,163,184,0.10) 50%, transparent 68%)',
            animation: 'pdfPageShimmer 2.4s ease-in-out infinite',
          }}
        />

        <style>{`
          @keyframes pdfPageShimmer {
            0%   { transform: translateX(-100%) skewX(-8deg); opacity: 0; }
            25%  { opacity: 1; }
            75%  { opacity: 1; }
            100% { transform: translateX(220%) skewX(-8deg); opacity: 0; }
          }
          @keyframes pdfPagePulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.55; }
          }
          .ppsk-pulse { animation: pdfPagePulse 1.8s ease-in-out infinite; }
        `}</style>

        <div style={{ padding: p }}>
          {/* ── Title ── */}
          <div style={{ marginBottom: bg }}>
            <div
              className="ppsk-pulse rounded-md bg-slate-200/70 dark:bg-white/[0.09]"
              style={{ height: Math.round(lh * 2.1), width: '62%', marginBottom: Math.round(lg * 1.4) }}
            />
            <div
              className="ppsk-pulse rounded bg-slate-200/60 dark:bg-white/[0.07]"
              style={{ height: Math.round(lh * 1.1), width: '38%', marginBottom: Math.round(bg * 0.9), animationDelay: '0.1s' }}
            />
            <div
              className="rounded-full bg-gradient-to-r from-transparent via-slate-300/60 to-transparent dark:via-white/[0.10]"
              style={{ height: 1, width: '100%' }}
            />
          </div>

          {/* ── Paragraph 1 ── */}
          <div style={{ marginBottom: bg }}>
            {[96, 90, 94, 92, 87, 91, 44].map((pct, i) => (
              <div
                key={i}
                className="ppsk-pulse rounded-full bg-slate-200/70 dark:bg-white/[0.08]"
                style={{
                  height: lh,
                  width: `${pct}%`,
                  marginBottom: i < 6 ? lg : 0,
                  animationDelay: `${i * 0.07}s`,
                }}
              />
            ))}
          </div>

          {/* ── Two columns ── */}
          <div className="flex gap-4" style={{ marginBottom: bg }}>
            {[[90, 94, 86, 92, 54], [93, 87, 95, 89, 48]].map((lines, ci) => (
              <div key={ci} style={{ flex: 1 }}>
                {lines.map((pct, li) => (
                  <div
                    key={li}
                    className="ppsk-pulse rounded-full bg-slate-200/60 dark:bg-white/[0.07]"
                    style={{
                      height: lh,
                      width: `${pct}%`,
                      marginBottom: li < lines.length - 1 ? lg : 0,
                      animationDelay: `${(ci * 5 + li) * 0.06 + 0.3}s`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* ── Figure ── */}
          <div
            className="ppsk-pulse relative mx-auto overflow-hidden rounded-xl border border-slate-200/50 bg-slate-100/50 dark:border-white/[0.06] dark:bg-white/[0.04]"
            style={{
              height: Math.round(h * 0.14),
              width: '68%',
              marginBottom: bg,
              animationDelay: '0.5s',
            }}
          >
            <div className="flex h-full items-center justify-center">
              <svg
                aria-hidden="true"
                className="text-slate-300/70 dark:text-white/[0.12]"
                style={{ width: Math.round(w * 0.055), height: Math.round(w * 0.055) }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.1}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 4.5h16.5A.75.75 0 0121 5.25v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18.75V5.25A.75.75 0 013.75 4.5z"
                />
              </svg>
            </div>
          </div>

          {/* ── Paragraph 2 ── */}
          <div style={{ marginBottom: bg }}>
            {[94, 88, 96, 91, 40].map((pct, i) => (
              <div
                key={i}
                className="ppsk-pulse rounded-full bg-slate-200/60 dark:bg-white/[0.07]"
                style={{
                  height: lh,
                  width: `${pct}%`,
                  marginBottom: i < 4 ? lg : 0,
                  animationDelay: `${i * 0.08 + 0.6}s`,
                }}
              />
            ))}
          </div>

          {/* ── Pills ── */}
          <div className="flex flex-wrap gap-2" style={{ marginBottom: bg }}>
            {[22, 30, 18, 26].map((pct, i) => (
              <div
                key={i}
                className="ppsk-pulse rounded-full bg-slate-200/60 dark:bg-white/[0.07]"
                style={{
                  height: Math.round(lh * 1.8),
                  width: `${pct}%`,
                  animationDelay: `${i * 0.09 + 0.8}s`,
                }}
              />
            ))}
          </div>

          {/* ── Paragraph 3 (NEW — fills middle) ── */}
          <div style={{ marginBottom: bg }}>
            {[95, 89, 93, 87, 91, 84, 58].map((pct, i) => (
              <div
                key={i}
                className="ppsk-pulse rounded-full bg-slate-200/60 dark:bg-white/[0.07]"
                style={{
                  height: lh,
                  width: `${pct}%`,
                  marginBottom: i < 6 ? lg : 0,
                  animationDelay: `${i * 0.07 + 1}s`,
                }}
              />
            ))}
          </div>

          {/* ── Second figure / table block (NEW) ── */}
          <div
            className="ppsk-pulse relative mx-auto overflow-hidden rounded-xl border border-slate-200/50 bg-slate-100/40 dark:border-white/[0.06] dark:bg-white/[0.035]"
            style={{
              height: Math.round(h * 0.12),
              width: '82%',
              marginBottom: bg,
              animationDelay: '1.3s',
            }}
          >
            {/* Fake table rows */}
            <div className="flex h-full flex-col justify-around p-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-300/50 dark:bg-white/[0.09]" />
                  <div className="h-2 flex-1 rounded-full bg-slate-300/40 dark:bg-white/[0.07]" />
                  <div className="h-2 flex-1 rounded-full bg-slate-300/50 dark:bg-white/[0.09]" />
                  <div className="h-2 flex-1 rounded-full bg-slate-300/40 dark:bg-white/[0.07]" />
                </div>
              ))}
            </div>
          </div>

          {/* ── Paragraph 4 (NEW) ── */}
          <div style={{ marginBottom: bg }}>
            {[92, 96, 88, 94, 90, 46].map((pct, i) => (
              <div
                key={i}
                className="ppsk-pulse rounded-full bg-slate-200/55 dark:bg-white/[0.06]"
                style={{
                  height: lh,
                  width: `${pct}%`,
                  marginBottom: i < 5 ? lg : 0,
                  animationDelay: `${i * 0.08 + 1.6}s`,
                }}
              />
            ))}
          </div>

          {/* ── Footer lines ── */}
          {[88, 74, 62].map((pct, i) => (
            <div
              key={i}
              className="ppsk-pulse rounded-full bg-slate-200/50 dark:bg-white/[0.05]"
              style={{
                height: lh,
                width: `${pct}%`,
                marginBottom: i < 2 ? lg : 0,
                animationDelay: `${i * 0.1 + 2}s`,
              }}
            />
          ))}
        </div>

        {/* Page number footer */}
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center">
          <div className="ppsk-pulse flex items-center gap-1.5 rounded-full bg-slate-100/60 px-3 py-1 dark:bg-white/[0.05]">
            <div className="rounded-full bg-slate-300/70 dark:bg-white/[0.15]" style={{ height: 6, width: 6 }} />
            <div className="rounded-full bg-slate-300/70 dark:bg-white/[0.15]" style={{ height: 8, width: 24 }} />
          </div>
        </div>
      </div>
    </div>
  );
});

PdfPageSkeleton.displayName = 'PdfPageSkeleton';

export default PdfPageSkeleton;